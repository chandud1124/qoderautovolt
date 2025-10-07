const RSSService = require('../services/rssService');
const SocialMediaService = require('../services/socialMediaService');
const WeatherService = require('../services/weatherService');
const WebhookService = require('../services/webhookService');
const DatabaseService = require('../services/databaseService');
const ContentFeed = require('../models/ContentFeed');

class IntegrationsController {
  // RSS Feed Management

  // Create RSS feed
  async createRSSFeed(req, res) {
    try {
      const result = await RSSService.addFeed(req.body);
      res.json(result);
    } catch (error) {
      console.error('Error creating RSS feed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create RSS feed',
        error: error.message
      });
    }
  }

  // Get all RSS feeds
  async getRSSFeeds(req, res) {
    try {
      const feeds = await RSSService.getActiveFeeds();
      res.json({
        success: true,
        feeds
      });
    } catch (error) {
      console.error('Error getting RSS feeds:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get RSS feeds',
        error: error.message
      });
    }
  }

  // Update RSS feed
  async updateRSSFeed(req, res) {
    try {
      const { feedId } = req.params;
      const result = await RSSService.updateFeed(feedId, req.body);
      res.json(result);
    } catch (error) {
      console.error('Error updating RSS feed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update RSS feed',
        error: error.message
      });
    }
  }

  // Delete RSS feed
  async deleteRSSFeed(req, res) {
    try {
      const { feedId } = req.params;
      const result = await RSSService.deleteFeed(feedId);
      res.json(result);
    } catch (error) {
      console.error('Error deleting RSS feed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete RSS feed',
        error: error.message
      });
    }
  }

  // Fetch RSS feed content
  async fetchRSSContent(req, res) {
    try {
      const { feedId } = req.params;
      const result = await RSSService.fetchFeed(feedId);
      res.json(result);
    } catch (error) {
      console.error('Error fetching RSS content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch RSS content',
        error: error.message
      });
    }
  }

  // Social Media Management

  // Create social media feed
  async createSocialMediaFeed(req, res) {
    try {
      const result = await SocialMediaService.addFeed(req.body);
      res.json(result);
    } catch (error) {
      console.error('Error creating social media feed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create social media feed',
        error: error.message
      });
    }
  }

  // Get all social media feeds
  async getSocialMediaFeeds(req, res) {
    try {
      const feeds = await SocialMediaService.getActiveFeeds();
      res.json({
        success: true,
        feeds
      });
    } catch (error) {
      console.error('Error getting social media feeds:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get social media feeds',
        error: error.message
      });
    }
  }

  // Update social media feed
  async updateSocialMediaFeed(req, res) {
    try {
      const { feedId } = req.params;
      const result = await SocialMediaService.updateFeed(feedId, req.body);
      res.json(result);
    } catch (error) {
      console.error('Error updating social media feed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update social media feed',
        error: error.message
      });
    }
  }

  // Delete social media feed
  async deleteSocialMediaFeed(req, res) {
    try {
      const { feedId } = req.params;
      const result = await SocialMediaService.deleteFeed(feedId);
      res.json(result);
    } catch (error) {
      console.error('Error deleting social media feed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete social media feed',
        error: error.message
      });
    }
  }

  // Fetch social media content
  async fetchSocialMediaContent(req, res) {
    try {
      const { feedId } = req.params;
      const result = await SocialMediaService.fetchFeed(feedId);
      res.json(result);
    } catch (error) {
      console.error('Error fetching social media content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch social media content',
        error: error.message
      });
    }
  }

  // Weather Integration

  // Create weather feed
  async createWeatherFeed(req, res) {
    try {
      const result = await WeatherService.addFeed(req.body);
      res.json(result);
    } catch (error) {
      console.error('Error creating weather feed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create weather feed',
        error: error.message
      });
    }
  }

  // Get all weather feeds
  async getWeatherFeeds(req, res) {
    try {
      const feeds = await WeatherService.getActiveFeeds();
      res.json({
        success: true,
        feeds
      });
    } catch (error) {
      console.error('Error getting weather feeds:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get weather feeds',
        error: error.message
      });
    }
  }

  // Update weather feed
  async updateWeatherFeed(req, res) {
    try {
      const { feedId } = req.params;
      const result = await WeatherService.updateFeed(feedId, req.body);
      res.json(result);
    } catch (error) {
      console.error('Error updating weather feed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update weather feed',
        error: error.message
      });
    }
  }

  // Delete weather feed
  async deleteWeatherFeed(req, res) {
    try {
      const { feedId } = req.params;
      const result = await WeatherService.deleteFeed(feedId);
      res.json(result);
    } catch (error) {
      console.error('Error deleting weather feed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete weather feed',
        error: error.message
      });
    }
  }

  // Fetch weather data
  async fetchWeatherData(req, res) {
    try {
      const { feedId } = req.params;
      const result = await WeatherService.fetchWeather(feedId);
      res.json(result);
    } catch (error) {
      console.error('Error fetching weather data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch weather data',
        error: error.message
      });
    }
  }

  // Webhook Management

  // Create webhook
  async createWebhook(req, res) {
    try {
      const result = await WebhookService.createWebhook(req.body);
      res.json(result);
    } catch (error) {
      console.error('Error creating webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create webhook',
        error: error.message
      });
    }
  }

  // Get all webhooks
  async getWebhooks(req, res) {
    try {
      const webhooks = await WebhookService.getActiveWebhooks();
      res.json({
        success: true,
        webhooks
      });
    } catch (error) {
      console.error('Error getting webhooks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get webhooks',
        error: error.message
      });
    }
  }

  // Get webhook details
  async getWebhookDetails(req, res) {
    try {
      const { feedId } = req.params;
      const details = await WebhookService.getWebhookDetails(feedId);
      res.json({
        success: true,
        webhook: details
      });
    } catch (error) {
      console.error('Error getting webhook details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get webhook details',
        error: error.message
      });
    }
  }

  // Update webhook
  async updateWebhook(req, res) {
    try {
      const { feedId } = req.params;
      const result = await WebhookService.updateWebhook(feedId, req.body);
      res.json(result);
    } catch (error) {
      console.error('Error updating webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update webhook',
        error: error.message
      });
    }
  }

  // Delete webhook
  async deleteWebhook(req, res) {
    try {
      const { feedId } = req.params;
      const result = await WebhookService.deleteWebhook(feedId);
      res.json(result);
    } catch (error) {
      console.error('Error deleting webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete webhook',
        error: error.message
      });
    }
  }

  // Test webhook
  async testWebhook(req, res) {
    try {
      const { feedId } = req.params;
      const { testData } = req.body;
      const result = await WebhookService.testWebhook(feedId, testData);
      res.json(result);
    } catch (error) {
      console.error('Error testing webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test webhook',
        error: error.message
      });
    }
  }

  // Get webhook stats
  async getWebhookStats(req, res) {
    try {
      const { feedId } = req.params;
      const stats = await WebhookService.getWebhookStats(feedId);
      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Error getting webhook stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get webhook stats',
        error: error.message
      });
    }
  }

  // Database Integration

  // Create database feed
  async createDatabaseFeed(req, res) {
    try {
      const result = await DatabaseService.addFeed(req.body);
      res.json(result);
    } catch (error) {
      console.error('Error creating database feed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create database feed',
        error: error.message
      });
    }
  }

  // Get all database feeds
  async getDatabaseFeeds(req, res) {
    try {
      const feeds = await DatabaseService.getActiveFeeds();
      res.json({
        success: true,
        feeds
      });
    } catch (error) {
      console.error('Error getting database feeds:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get database feeds',
        error: error.message
      });
    }
  }

  // Update database feed
  async updateDatabaseFeed(req, res) {
    try {
      const { feedId } = req.params;
      const result = await DatabaseService.updateFeed(feedId, req.body);
      res.json(result);
    } catch (error) {
      console.error('Error updating database feed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update database feed',
        error: error.message
      });
    }
  }

  // Delete database feed
  async deleteDatabaseFeed(req, res) {
    try {
      const { feedId } = req.params;
      const result = await DatabaseService.deleteFeed(feedId);
      res.json(result);
    } catch (error) {
      console.error('Error deleting database feed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete database feed',
        error: error.message
      });
    }
  }

  // Fetch database content
  async fetchDatabaseContent(req, res) {
    try {
      const { feedId } = req.params;
      const result = await DatabaseService.fetchData(feedId);
      res.json(result);
    } catch (error) {
      console.error('Error fetching database content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch database content',
        error: error.message
      });
    }
  }

  // Test database configuration
  async testDatabaseConfig(req, res) {
    try {
      const result = await DatabaseService.testFeedConfig(req.body);
      res.json(result);
    } catch (error) {
      console.error('Error testing database config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test database configuration',
        error: error.message
      });
    }
  }

  // General Integration Management

  // Get all integrations
  async getAllIntegrations(req, res) {
    try {
      const rssFeeds = await RSSService.getActiveFeeds();
      const socialFeeds = await SocialMediaService.getActiveFeeds();
      const weatherFeeds = await WeatherService.getActiveFeeds();
      const webhooks = await WebhookService.getActiveWebhooks();
      const dbFeeds = await DatabaseService.getActiveFeeds();

      res.json({
        success: true,
        integrations: {
          rss: rssFeeds,
          social_media: socialFeeds,
          weather: weatherFeeds,
          webhooks: webhooks,
          database: dbFeeds
        },
        summary: {
          rss: rssFeeds.length,
          social_media: socialFeeds.length,
          weather: weatherFeeds.length,
          webhooks: webhooks.length,
          database: dbFeeds.length,
          total: rssFeeds.length + socialFeeds.length + weatherFeeds.length + webhooks.length + dbFeeds.length
        }
      });
    } catch (error) {
      console.error('Error getting all integrations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get integrations',
        error: error.message
      });
    }
  }

  // Get integration by ID
  async getIntegration(req, res) {
    try {
      const { id } = req.params;
      const feed = await ContentFeed.findById(id);

      if (!feed) {
        return res.status(404).json({
          success: false,
          message: 'Integration not found'
        });
      }

      res.json({
        success: true,
        integration: feed
      });
    } catch (error) {
      console.error('Error getting integration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get integration',
        error: error.message
      });
    }
  }

  // Delete integration
  async deleteIntegration(req, res) {
    try {
      const { id } = req.params;
      const feed = await ContentFeed.findById(id);

      if (!feed) {
        return res.status(404).json({
          success: false,
          message: 'Integration not found'
        });
      }

      let result;
      switch (feed.type) {
        case 'rss':
          result = await RSSService.deleteFeed(id);
          break;
        case 'social_media':
          result = await SocialMediaService.deleteFeed(id);
          break;
        case 'weather':
          result = await WeatherService.deleteFeed(id);
          break;
        case 'webhook':
          result = await WebhookService.deleteWebhook(id);
          break;
        case 'database':
          result = await DatabaseService.deleteFeed(id);
          break;
        default:
          throw new Error('Unknown integration type');
      }

      res.json(result);
    } catch (error) {
      console.error('Error deleting integration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete integration',
        error: error.message
      });
    }
  }
}

module.exports = new IntegrationsController();