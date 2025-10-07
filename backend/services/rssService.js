const axios = require('axios');
const Parser = require('rss-parser');
const cron = require('node-cron');
const ContentFeed = require('../models/ContentFeed');
const Notice = require('../models/Notice');

class RSSService {
  constructor() {
    this.parser = new Parser({
      customFields: {
        item: [
          ['media:content', 'media:content'],
          ['media:thumbnail', 'media:thumbnail'],
          ['enclosure', 'enclosure']
        ]
      }
    });
    this.feedCache = new Map();
    this.updateIntervals = new Map();
  }

  // Add or update an RSS feed
  async addFeed(feedConfig) {
    try {
      const {
        name,
        url,
        updateInterval = 30, // minutes
        maxItems = 10,
        categories = [],
        autoPublish = false,
        filters = {}
      } = feedConfig;

      // Validate RSS feed URL
      const isValid = await this.validateFeed(url);
      if (!isValid) {
        throw new Error('Invalid RSS feed URL or feed is not accessible');
      }

      const feed = new ContentFeed({
        name,
        type: 'rss',
        source: url,
        config: {
          updateInterval,
          maxItems,
          categories,
          autoPublish,
          filters
        },
        status: 'active',
        lastUpdated: new Date()
      });

      await feed.save();

      // Start periodic updates
      this.startFeedUpdates(feed._id, updateInterval);

      return { success: true, feed };
    } catch (error) {
      console.error('Error adding RSS feed:', error);
      throw error;
    }
  }

  // Validate RSS feed URL
  async validateFeed(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Digital Signage RSS Reader/1.0'
        }
      });

      const feed = await this.parser.parseString(response.data);
      return feed && feed.items && feed.items.length > 0;
    } catch (error) {
      console.error('Error validating RSS feed:', error);
      return false;
    }
  }

  // Fetch content from RSS feed
  async fetchFeed(feedId) {
    try {
      const feed = await ContentFeed.findById(feedId);
      if (!feed || feed.type !== 'rss') {
        throw new Error('Feed not found or not an RSS feed');
      }

      const response = await axios.get(feed.source, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Digital Signage RSS Reader/1.0'
        }
      });

      const parsedFeed = await this.parser.parseString(response.data);

      // Apply filters
      let items = this.applyFilters(parsedFeed.items, feed.config.filters);

      // Limit items
      items = items.slice(0, feed.config.maxItems);

      // Process items
      const processedItems = items.map(item => this.processRSSItem(item, feed));

      // Cache the results
      this.feedCache.set(feedId.toString(), {
        items: processedItems,
        lastFetched: new Date(),
        feedInfo: {
          title: parsedFeed.title,
          description: parsedFeed.description,
          link: parsedFeed.link,
          lastBuildDate: parsedFeed.lastBuildDate
        }
      });

      // Update feed metadata
      feed.lastUpdated = new Date();
      feed.metadata = {
        itemCount: processedItems.length,
        lastFetchStatus: 'success',
        feedTitle: parsedFeed.title,
        feedDescription: parsedFeed.description
      };
      await feed.save();

      return {
        success: true,
        items: processedItems,
        feedInfo: this.feedCache.get(feedId.toString()).feedInfo
      };
    } catch (error) {
      console.error('Error fetching RSS feed:', error);

      // Update feed status on error
      await ContentFeed.findByIdAndUpdate(feedId, {
        'metadata.lastFetchStatus': 'error',
        'metadata.lastError': error.message
      });

      throw error;
    }
  }

  // Apply filters to RSS items
  applyFilters(items, filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return items;
    }

    return items.filter(item => {
      // Keyword filter
      if (filters.keywords && filters.keywords.length > 0) {
        const titleMatch = filters.keywords.some(keyword =>
          item.title?.toLowerCase().includes(keyword.toLowerCase())
        );
        const contentMatch = filters.keywords.some(keyword =>
          item.content?.toLowerCase().includes(keyword.toLowerCase()) ||
          item.contentSnippet?.toLowerCase().includes(keyword.toLowerCase())
        );

        if (!titleMatch && !contentMatch) return false;
      }

      // Category filter
      if (filters.categories && filters.categories.length > 0) {
        const itemCategories = item.categories || [];
        const hasMatchingCategory = filters.categories.some(filterCat =>
          itemCategories.some(itemCat =>
            itemCat.toLowerCase().includes(filterCat.toLowerCase())
          )
        );

        if (!hasMatchingCategory) return false;
      }

      // Date filter
      if (filters.maxAgeHours) {
        const itemDate = new Date(item.pubDate || item.isoDate);
        const maxAge = new Date(Date.now() - (filters.maxAgeHours * 60 * 60 * 1000));

        if (itemDate < maxAge) return false;
      }

      return true;
    });
  }

  // Process RSS item into standardized format
  processRSSItem(item, feed) {
    const processedItem = {
      id: item.guid || item.link,
      title: item.title,
      content: item.content || item.contentSnippet,
      summary: item.contentSnippet || item.content?.substring(0, 200),
      link: item.link,
      publishedAt: new Date(item.pubDate || item.isoDate),
      author: item.creator || item.author,
      categories: item.categories || [],
      feedId: feed._id,
      feedName: feed.name,
      type: 'rss'
    };

    // Extract media content
    if (item.enclosure && item.enclosure.url) {
      processedItem.media = {
        url: item.enclosure.url,
        type: item.enclosure.type,
        length: item.enclosure.length
      };
    } else if (item['media:content'] && item['media:content'].$.url) {
      processedItem.media = {
        url: item['media:content'].$.url,
        type: item['media:content'].$.type,
        width: item['media:content'].$.width,
        height: item['media:content'].$.height
      };
    }

    // Extract thumbnail
    if (item['media:thumbnail'] && item['media:thumbnail'].$.url) {
      processedItem.thumbnail = item['media:thumbnail'].$.url;
    }

    return processedItem;
  }

  // Convert RSS items to notices for auto-publishing
  async createNoticesFromFeed(feedId, items = null) {
    try {
      const feed = await ContentFeed.findById(feedId);
      if (!feed || !feed.config.autoPublish) {
        return { success: false, message: 'Auto-publish not enabled for this feed' };
      }

      if (!items) {
        const fetchResult = await this.fetchFeed(feedId);
        items = fetchResult.items;
      }

      const createdNotices = [];

      for (const item of items) {
        // Check if notice already exists
        const existingNotice = await Notice.findOne({
          'metadata.rssGuid': item.id,
          'metadata.feedId': feedId
        });

        if (existingNotice) continue;

        // Create notice from RSS item
        const notice = new Notice({
          title: item.title,
          content: item.content,
          contentType: item.media ? 'media' : 'text',
          priority: 'medium',
          category: 'news',
          submittedBy: null, // System generated
          status: 'approved', // Auto-approved for RSS feeds
          attachments: item.media ? [{
            filename: this.generateMediaFilename(item.media.url),
            originalName: item.title,
            mimetype: item.media.type,
            size: item.media.length || 0,
            url: item.media.url
          }] : [],
          tags: ['rss', 'auto-generated', ...feed.config.categories],
          expiryDate: new Date(Date.now() + (feed.config.contentRetentionDays || 7) * 24 * 60 * 60 * 1000),
          metadata: {
            rssGuid: item.id,
            feedId: feedId,
            rssLink: item.link,
            rssPublishedAt: item.publishedAt,
            rssAuthor: item.author
          },
          targetBoards: [], // Will be assigned based on feed configuration
          driveLink: item.link
        });

        await notice.save();
        createdNotices.push(notice);
      }

      return {
        success: true,
        createdCount: createdNotices.length,
        notices: createdNotices
      };
    } catch (error) {
      console.error('Error creating notices from RSS feed:', error);
      throw error;
    }
  }

  // Generate filename for media attachments
  generateMediaFilename(url) {
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    const timestamp = Date.now();
    return `rss_${timestamp}_${filename}`;
  }

  // Start periodic updates for a feed
  startFeedUpdates(feedId, intervalMinutes) {
    if (this.updateIntervals.has(feedId.toString())) {
      clearInterval(this.updateIntervals.get(feedId.toString()));
    }

    const interval = setInterval(async () => {
      try {
        await this.fetchFeed(feedId);

        // Auto-publish if enabled
        const feed = await ContentFeed.findById(feedId);
        if (feed && feed.config.autoPublish) {
          await this.createNoticesFromFeed(feedId);
        }
      } catch (error) {
        console.error(`Error updating RSS feed ${feedId}:`, error);
      }
    }, intervalMinutes * 60 * 1000);

    this.updateIntervals.set(feedId.toString(), interval);
  }

  // Stop periodic updates for a feed
  stopFeedUpdates(feedId) {
    if (this.updateIntervals.has(feedId.toString())) {
      clearInterval(this.updateIntervals.get(feedId.toString()));
      this.updateIntervals.delete(feedId.toString());
    }
  }

  // Get cached feed content
  getCachedFeed(feedId) {
    return this.feedCache.get(feedId.toString());
  }

  // Get all active RSS feeds
  async getActiveFeeds() {
    try {
      const feeds = await ContentFeed.find({
        type: 'rss',
        status: 'active'
      }).sort({ lastUpdated: -1 });

      return feeds.map(feed => ({
        id: feed._id,
        name: feed.name,
        url: feed.source,
        config: feed.config,
        lastUpdated: feed.lastUpdated,
        metadata: feed.metadata,
        cachedItems: this.feedCache.get(feed._id.toString())?.items || []
      }));
    } catch (error) {
      console.error('Error getting active RSS feeds:', error);
      throw error;
    }
  }

  // Update feed configuration
  async updateFeed(feedId, updates) {
    try {
      const feed = await ContentFeed.findById(feedId);
      if (!feed) {
        throw new Error('Feed not found');
      }

      // Update configuration
      if (updates.config) {
        Object.assign(feed.config, updates.config);
      }

      // Update other fields
      if (updates.name) feed.name = updates.name;
      if (updates.status) feed.status = updates.status;

      await feed.save();

      // Restart updates if interval changed
      if (updates.config?.updateInterval) {
        this.stopFeedUpdates(feedId);
        if (feed.status === 'active') {
          this.startFeedUpdates(feedId, updates.config.updateInterval);
        }
      }

      return { success: true, feed };
    } catch (error) {
      console.error('Error updating RSS feed:', error);
      throw error;
    }
  }

  // Delete RSS feed
  async deleteFeed(feedId) {
    try {
      this.stopFeedUpdates(feedId);
      this.feedCache.delete(feedId.toString());

      await ContentFeed.findByIdAndDelete(feedId);

      return { success: true, message: 'RSS feed deleted successfully' };
    } catch (error) {
      console.error('Error deleting RSS feed:', error);
      throw error;
    }
  }

  // Initialize all active feeds on startup
  async initializeFeeds() {
    try {
      const feeds = await ContentFeed.find({
        type: 'rss',
        status: 'active'
      });

      for (const feed of feeds) {
        this.startFeedUpdates(feed._id, feed.config.updateInterval);
      }

      console.log(`Initialized ${feeds.length} RSS feeds`);
    } catch (error) {
      console.error('Error initializing RSS feeds:', error);
    }
  }
}

module.exports = new RSSService();