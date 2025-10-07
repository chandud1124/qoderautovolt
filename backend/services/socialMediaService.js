const axios = require('axios');
const cron = require('node-cron');
const ContentFeed = require('../models/ContentFeed');
const Notice = require('../models/Notice');

class SocialMediaService {
  constructor() {
    this.platforms = {
      instagram: {
        baseUrl: 'https://graph.instagram.com',
        apiVersion: 'v18.0'
      },
      twitter: {
        baseUrl: 'https://api.twitter.com/2',
        apiVersion: '2'
      },
      facebook: {
        baseUrl: 'https://graph.facebook.com',
        apiVersion: 'v18.0'
      }
    };
    this.feedCache = new Map();
    this.updateIntervals = new Map();
  }

  // Add social media feed
  async addFeed(feedConfig) {
    try {
      const {
        name,
        platform,
        accessToken,
        accounts = [],
        hashtags = [],
        updateInterval = 30,
        maxItems = 10,
        autoPublish = false,
        contentTypes = ['image', 'video', 'text']
      } = feedConfig;

      // Validate platform
      if (!this.platforms[platform]) {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      // Validate access token
      const isValid = await this.validateToken(platform, accessToken);
      if (!isValid) {
        throw new Error('Invalid access token or insufficient permissions');
      }

      const feed = new ContentFeed({
        name,
        type: 'social_media',
        source: `${platform}_feed`,
        config: {
          platform,
          accessToken,
          accounts,
          hashtags,
          updateInterval,
          maxItems,
          autoPublish,
          contentTypes
        },
        status: 'active',
        lastUpdated: new Date()
      });

      await feed.save();

      // Start periodic updates
      this.startFeedUpdates(feed._id, updateInterval);

      return { success: true, feed };
    } catch (error) {
      console.error('Error adding social media feed:', error);
      throw error;
    }
  }

  // Validate access token for platform
  async validateToken(platform, accessToken) {
    try {
      switch (platform) {
        case 'instagram':
          const igResponse = await axios.get(`${this.platforms.instagram.baseUrl}/${this.platforms.instagram.apiVersion}/me`, {
            params: { access_token: accessToken, fields: 'id,username' }
          });
          return igResponse.data && igResponse.data.id;

        case 'twitter':
          const twResponse = await axios.get(`${this.platforms.twitter.baseUrl}/users/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          return twResponse.data && twResponse.data.data;

        case 'facebook':
          const fbResponse = await axios.get(`${this.platforms.facebook.baseUrl}/${this.platforms.facebook.apiVersion}/me`, {
            params: { access_token: accessToken, fields: 'id,name' }
          });
          return fbResponse.data && fbResponse.data.id;

        default:
          return false;
      }
    } catch (error) {
      console.error(`Error validating ${platform} token:`, error);
      return false;
    }
  }

  // Fetch content from social media platform
  async fetchFeed(feedId) {
    try {
      const feed = await ContentFeed.findById(feedId);
      if (!feed || feed.type !== 'social_media') {
        throw new Error('Feed not found or not a social media feed');
      }

      const { platform, accessToken, accounts, hashtags, maxItems, contentTypes } = feed.config;

      let allItems = [];

      // Fetch from accounts
      if (accounts && accounts.length > 0) {
        for (const account of accounts) {
          try {
            const accountItems = await this.fetchFromAccount(platform, accessToken, account, contentTypes);
            allItems = allItems.concat(accountItems);
          } catch (error) {
            console.error(`Error fetching from ${platform} account ${account}:`, error);
          }
        }
      }

      // Fetch by hashtags
      if (hashtags && hashtags.length > 0) {
        for (const hashtag of hashtags) {
          try {
            const hashtagItems = await this.fetchByHashtag(platform, accessToken, hashtag, contentTypes);
            allItems = allItems.concat(hashtagItems);
          } catch (error) {
            console.error(`Error fetching ${platform} hashtag ${hashtag}:`, error);
          }
        }
      }

      // Remove duplicates and sort by date
      const uniqueItems = this.deduplicateItems(allItems);
      uniqueItems.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

      // Limit items
      const items = uniqueItems.slice(0, maxItems);

      // Process items
      const processedItems = items.map(item => this.processSocialItem(item, feed));

      // Cache the results
      this.feedCache.set(feedId.toString(), {
        items: processedItems,
        lastFetched: new Date()
      });

      // Update feed metadata
      feed.lastUpdated = new Date();
      feed.metadata = {
        itemCount: processedItems.length,
        lastFetchStatus: 'success',
        platform: platform,
        accountsCount: accounts?.length || 0,
        hashtagsCount: hashtags?.length || 0
      };
      await feed.save();

      return { success: true, items: processedItems };
    } catch (error) {
      console.error('Error fetching social media feed:', error);

      await ContentFeed.findByIdAndUpdate(feedId, {
        'metadata.lastFetchStatus': 'error',
        'metadata.lastError': error.message
      });

      throw error;
    }
  }

  // Fetch content from specific account
  async fetchFromAccount(platform, accessToken, account, contentTypes) {
    switch (platform) {
      case 'instagram':
        return await this.fetchInstagramAccount(accessToken, account, contentTypes);

      case 'twitter':
        return await this.fetchTwitterAccount(accessToken, account, contentTypes);

      case 'facebook':
        return await this.fetchFacebookAccount(accessToken, account, contentTypes);

      default:
        return [];
    }
  }

  // Fetch Instagram account content
  async fetchInstagramAccount(accessToken, account, contentTypes) {
    try {
      // First get user ID from username
      const userResponse = await axios.get(`${this.platforms.instagram.baseUrl}/${this.platforms.instagram.apiVersion}/${account}`, {
        params: {
          access_token: accessToken,
          fields: 'id,username'
        }
      });

      const userId = userResponse.data.id;

      // Get media
      const mediaResponse = await axios.get(`${this.platforms.instagram.baseUrl}/${this.platforms.instagram.apiVersion}/${userId}/media`, {
        params: {
          access_token: accessToken,
          fields: 'id,media_type,media_url,thumbnail_url,permalink,caption,timestamp'
        }
      });

      return mediaResponse.data.data
        .filter(item => contentTypes.includes(this.mapInstagramType(item.media_type)))
        .map(item => ({
          id: item.id,
          platform: 'instagram',
          type: this.mapInstagramType(item.media_type),
          content: item.caption,
          mediaUrl: item.media_url,
          thumbnailUrl: item.thumbnail_url,
          link: item.permalink,
          publishedAt: new Date(item.timestamp),
          author: account
        }));
    } catch (error) {
      console.error('Error fetching Instagram account:', error);
      return [];
    }
  }

  // Fetch Twitter account content
  async fetchTwitterAccount(accessToken, account, contentTypes) {
    try {
      const response = await axios.get(`${this.platforms.twitter.baseUrl}/users/by/username/${account}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      const userId = response.data.data.id;

      const tweetsResponse = await axios.get(`${this.platforms.twitter.baseUrl}/users/${userId}/tweets`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: {
          max_results: 10,
          'tweet.fields': 'created_at,text,attachments,entities',
          'media.fields': 'url,preview_image_url,type',
          'expansions': 'attachments.media_keys'
        }
      });

      return tweetsResponse.data.data
        .filter(tweet => this.hasSupportedContent(tweet, contentTypes))
        .map(tweet => ({
          id: tweet.id,
          platform: 'twitter',
          type: this.getTweetContentType(tweet),
          content: tweet.text,
          mediaUrl: this.getTweetMediaUrl(tweet, tweetsResponse.data.includes),
          link: `https://twitter.com/${account}/status/${tweet.id}`,
          publishedAt: new Date(tweet.created_at),
          author: account
        }));
    } catch (error) {
      console.error('Error fetching Twitter account:', error);
      return [];
    }
  }

  // Fetch Facebook account content
  async fetchFacebookAccount(accessToken, account, contentTypes) {
    try {
      const response = await axios.get(`${this.platforms.facebook.baseUrl}/${this.platforms.facebook.apiVersion}/${account}/posts`, {
        params: {
          access_token: accessToken,
          fields: 'id,message,created_time,attachments{url,type,title},permalink_url',
          limit: 10
        }
      });

      return response.data.data
        .filter(post => this.hasSupportedContent(post, contentTypes))
        .map(post => ({
          id: post.id,
          platform: 'facebook',
          type: this.getFacebookContentType(post),
          content: post.message,
          mediaUrl: this.getFacebookMediaUrl(post),
          link: post.permalink_url,
          publishedAt: new Date(post.created_time),
          author: account
        }));
    } catch (error) {
      console.error('Error fetching Facebook account:', error);
      return [];
    }
  }

  // Fetch content by hashtag
  async fetchByHashtag(platform, accessToken, hashtag, contentTypes) {
    // Implementation would depend on platform APIs
    // For now, return empty array as hashtag search requires different API endpoints
    console.log(`Hashtag search for ${platform} not implemented yet`);
    return [];
  }

  // Helper methods for content type mapping
  mapInstagramType(mediaType) {
    switch (mediaType) {
      case 'IMAGE': return 'image';
      case 'VIDEO': return 'video';
      case 'CAROUSEL_ALBUM': return 'album';
      default: return 'text';
    }
  }

  hasSupportedContent(item, contentTypes) {
    // Check if item has supported content types
    if (contentTypes.includes('text') && item.text) return true;
    if (contentTypes.includes('image') && this.getTweetMediaUrl(item)) return true;
    if (contentTypes.includes('video') && this.getTweetMediaUrl(item)) return true;
    return false;
  }

  getTweetContentType(tweet) {
    if (tweet.attachments?.media_keys?.length > 0) {
      // Would need to check media type from includes
      return 'media';
    }
    return 'text';
  }

  getTweetMediaUrl(tweet, includes) {
    if (!tweet.attachments?.media_keys?.length) return null;
    // Would need to find media from includes
    return null; // Placeholder
  }

  getFacebookContentType(post) {
    if (post.attachments?.data?.[0]) {
      const type = post.attachments.data[0].type;
      if (type === 'photo') return 'image';
      if (type === 'video') return 'video';
    }
    return 'text';
  }

  getFacebookMediaUrl(post) {
    return post.attachments?.data?.[0]?.url || null;
  }

  // Remove duplicate items
  deduplicateItems(items) {
    const seen = new Set();
    return items.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  // Process social media item into standardized format
  processSocialItem(item, feed) {
    return {
      id: item.id,
      title: `${feed.config.platform} Post`,
      content: item.content,
      summary: item.content?.substring(0, 200),
      link: item.link,
      publishedAt: item.publishedAt,
      author: item.author,
      platform: item.platform,
      type: item.type,
      mediaUrl: item.mediaUrl,
      thumbnailUrl: item.thumbnailUrl,
      feedId: feed._id,
      feedName: feed.name,
      tags: ['social-media', item.platform, 'auto-generated']
    };
  }

  // Convert social media items to notices
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
          'metadata.socialId': item.id,
          'metadata.feedId': feedId
        });

        if (existingNotice) continue;

        // Create notice from social media item
        const notice = new Notice({
          title: item.title,
          content: item.content,
          contentType: item.type === 'text' ? 'text' : 'media',
          priority: 'low',
          category: 'social',
          submittedBy: null, // System generated
          status: 'approved', // Auto-approved for social feeds
          attachments: item.mediaUrl ? [{
            filename: this.generateMediaFilename(item.mediaUrl),
            originalName: item.title,
            mimetype: item.type === 'video' ? 'video/mp4' : 'image/jpeg',
            size: 0, // Unknown
            url: item.mediaUrl
          }] : [],
          tags: item.tags,
          expiryDate: new Date(Date.now() + (feed.config.contentRetentionDays || 1) * 24 * 60 * 60 * 1000),
          metadata: {
            socialId: item.id,
            feedId: feedId,
            platform: item.platform,
            socialLink: item.link,
            socialPublishedAt: item.publishedAt,
            socialAuthor: item.author
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
      console.error('Error creating notices from social media feed:', error);
      throw error;
    }
  }

  // Generate filename for media attachments
  generateMediaFilename(url) {
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    const timestamp = Date.now();
    return `social_${timestamp}_${filename}`;
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
        console.error(`Error updating social media feed ${feedId}:`, error);
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

  // Get all active social media feeds
  async getActiveFeeds() {
    try {
      const feeds = await ContentFeed.find({
        type: 'social_media',
        status: 'active'
      }).sort({ lastUpdated: -1 });

      return feeds.map(feed => ({
        id: feed._id,
        name: feed.name,
        platform: feed.config.platform,
        config: feed.config,
        lastUpdated: feed.lastUpdated,
        metadata: feed.metadata,
        cachedItems: this.feedCache.get(feed._id.toString())?.items || []
      }));
    } catch (error) {
      console.error('Error getting active social media feeds:', error);
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
      console.error('Error updating social media feed:', error);
      throw error;
    }
  }

  // Delete social media feed
  async deleteFeed(feedId) {
    try {
      this.stopFeedUpdates(feedId);
      this.feedCache.delete(feedId.toString());

      await ContentFeed.findByIdAndDelete(feedId);

      return { success: true, message: 'Social media feed deleted successfully' };
    } catch (error) {
      console.error('Error deleting social media feed:', error);
      throw error;
    }
  }

  // Initialize all active feeds on startup
  async initializeFeeds() {
    try {
      const feeds = await ContentFeed.find({
        type: 'social_media',
        status: 'active'
      });

      for (const feed of feeds) {
        this.startFeedUpdates(feed._id, feed.config.updateInterval);
      }

      console.log(`Initialized ${feeds.length} social media feeds`);
    } catch (error) {
      console.error('Error initializing social media feeds:', error);
    }
  }
}

module.exports = new SocialMediaService();