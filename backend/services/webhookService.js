const crypto = require('crypto');
const ContentFeed = require('../models/ContentFeed');
const Notice = require('../models/Notice');

class WebhookService {
  constructor() {
    this.activeWebhooks = new Map();
  }

  // Create a webhook endpoint
  async createWebhook(webhookConfig) {
    try {
      const {
        name,
        secret,
        headers = {},
        autoPublish = true,
        contentMapping = {},
        validationRules = {}
      } = webhookConfig;

      // Generate webhook ID and secret if not provided
      const webhookId = crypto.randomUUID();
      const webhookSecret = secret || crypto.randomBytes(32).toString('hex');

      const feed = new ContentFeed({
        name,
        type: 'webhook',
        source: `webhook_${webhookId}`,
        config: {
          webhookId,
          secret: webhookSecret,
          headers,
          autoPublish,
          contentMapping,
          validationRules
        },
        status: 'active',
        lastUpdated: new Date()
      });

      await feed.save();

      // Register webhook
      this.activeWebhooks.set(webhookId, feed._id);

      return {
        success: true,
        feed,
        webhookUrl: `/api/webhooks/${webhookId}`,
        secret: webhookSecret
      };
    } catch (error) {
      console.error('Error creating webhook:', error);
      throw error;
    }
  }

  // Process incoming webhook
  async processWebhook(webhookId, requestData) {
    try {
      const feedId = this.activeWebhooks.get(webhookId);
      if (!feedId) {
        throw new Error('Webhook not found');
      }

      const feed = await ContentFeed.findById(feedId);
      if (!feed || feed.status !== 'active') {
        throw new Error('Webhook feed not active');
      }

      // Validate webhook signature if configured
      if (feed.config.secret) {
        const isValid = this.validateWebhookSignature(requestData, feed.config.secret);
        if (!isValid) {
          throw new Error('Invalid webhook signature');
        }
      }

      // Validate request data
      const validationResult = this.validateWebhookData(requestData.body, feed.config.validationRules);
      if (!validationResult.valid) {
        throw new Error(`Webhook validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Map webhook data to notice format
      const noticeData = this.mapWebhookToNotice(requestData.body, feed.config.contentMapping);

      // Create notice if auto-publish is enabled
      let createdNotice = null;
      if (feed.config.autoPublish) {
        createdNotice = await this.createNoticeFromWebhook(noticeData, feed);
      }

      // Update feed metadata
      feed.lastUpdated = new Date();
      feed.metadata = {
        lastWebhookReceived: new Date(),
        lastWebhookData: JSON.stringify(requestData.body).substring(0, 1000),
        totalWebhooksReceived: (feed.metadata.totalWebhooksReceived || 0) + 1,
        lastNoticeCreated: createdNotice ? createdNotice._id : null
      };
      await feed.save();

      return {
        success: true,
        feedId: feed._id,
        noticeCreated: !!createdNotice,
        noticeId: createdNotice?._id,
        data: noticeData
      };
    } catch (error) {
      console.error('Error processing webhook:', error);
      throw error;
    }
  }

  // Validate webhook signature
  validateWebhookSignature(requestData, secret) {
    // Common webhook signature validation methods
    const signature = requestData.headers['x-hub-signature-256'] ||
                     requestData.headers['x-signature'] ||
                     requestData.headers['signature'];

    if (!signature) {
      return true; // No signature to validate
    }

    // GitHub-style signature validation
    if (signature.startsWith('sha256=')) {
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(requestData.body))
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    }

    // Generic HMAC validation
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(requestData.body))
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      console.error('Error validating webhook signature:', error);
      return false;
    }
  }

  // Validate webhook data against rules
  validateWebhookData(data, rules) {
    const errors = [];

    if (!rules || Object.keys(rules).length === 0) {
      return { valid: true, errors: [] };
    }

    // Check required fields
    if (rules.required && Array.isArray(rules.required)) {
      for (const field of rules.required) {
        if (!this.getNestedValue(data, field)) {
          errors.push(`Required field '${field}' is missing`);
        }
      }
    }

    // Check field types
    if (rules.types) {
      for (const [field, expectedType] of Object.entries(rules.types)) {
        const value = this.getNestedValue(data, field);
        if (value !== undefined && typeof value !== expectedType) {
          errors.push(`Field '${field}' must be of type ${expectedType}`);
        }
      }
    }

    // Check field patterns
    if (rules.patterns) {
      for (const [field, pattern] of Object.entries(rules.patterns)) {
        const value = this.getNestedValue(data, field);
        if (value !== undefined && !new RegExp(pattern).test(value)) {
          errors.push(`Field '${field}' does not match required pattern`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Get nested value from object using dot notation
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Map webhook data to notice format
  mapWebhookToNotice(webhookData, mapping) {
    const defaultMapping = {
      title: webhookData.title || webhookData.subject || webhookData.name || 'Webhook Notice',
      content: webhookData.content || webhookData.message || webhookData.description || JSON.stringify(webhookData),
      priority: webhookData.priority || 'medium',
      category: webhookData.category || 'webhook',
      tags: webhookData.tags || ['webhook', 'auto-generated'],
      expiryDate: webhookData.expiryDate ? new Date(webhookData.expiryDate) : null
    };

    // Apply custom mapping if provided
    if (mapping && Object.keys(mapping).length > 0) {
      Object.assign(defaultMapping, mapping);
    }

    // Process dynamic mappings
    for (const [key, value] of Object.entries(defaultMapping)) {
      if (typeof value === 'string' && value.startsWith('data.')) {
        defaultMapping[key] = this.getNestedValue(webhookData, value.substring(5));
      }
    }

    return defaultMapping;
  }

  // Create notice from webhook data
  async createNoticeFromWebhook(noticeData, feed) {
    try {
      // Check for duplicate prevention
      const duplicateCheck = await Notice.findOne({
        'metadata.webhookId': noticeData.id || noticeData.title,
        'metadata.feedId': feed._id,
        createdAt: { $gte: new Date(Date.now() - 60000) } // Within last minute
      });

      if (duplicateCheck) {
        console.log('Duplicate webhook notice prevented');
        return duplicateCheck;
      }

      const notice = new Notice({
        title: noticeData.title,
        content: noticeData.content,
        contentType: 'text',
        priority: noticeData.priority,
        category: noticeData.category,
        submittedBy: null, // System generated
        status: 'approved', // Auto-approved for webhooks
        attachments: [],
        tags: noticeData.tags,
        expiryDate: noticeData.expiryDate || new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
        metadata: {
          webhookId: noticeData.id || noticeData.title,
          feedId: feed._id,
          webhookData: JSON.stringify(noticeData).substring(0, 1000),
          source: 'webhook'
        },
        targetBoards: [], // Will be assigned based on webhook configuration
        driveLink: noticeData.link || null
      });

      await notice.save();
      return notice;
    } catch (error) {
      console.error('Error creating notice from webhook:', error);
      throw error;
    }
  }

  // Get webhook feed details
  async getWebhookDetails(feedId) {
    try {
      const feed = await ContentFeed.findById(feedId);
      if (!feed || feed.type !== 'webhook') {
        throw new Error('Webhook feed not found');
      }

      return {
        id: feed._id,
        name: feed.name,
        webhookId: feed.config.webhookId,
        webhookUrl: `/api/webhooks/${feed.config.webhookId}`,
        status: feed.status,
        config: {
          headers: feed.config.headers,
          autoPublish: feed.config.autoPublish,
          contentMapping: feed.config.contentMapping,
          validationRules: feed.config.validationRules
        },
        metadata: feed.metadata,
        createdAt: feed.createdAt,
        lastUpdated: feed.lastUpdated
      };
    } catch (error) {
      console.error('Error getting webhook details:', error);
      throw error;
    }
  }

  // Update webhook configuration
  async updateWebhook(feedId, updates) {
    try {
      const feed = await ContentFeed.findById(feedId);
      if (!feed || feed.type !== 'webhook') {
        throw new Error('Webhook feed not found');
      }

      // Update configuration
      if (updates.config) {
        Object.assign(feed.config, updates.config);
      }

      // Update other fields
      if (updates.name) feed.name = updates.name;
      if (updates.status) feed.status = updates.status;

      await feed.save();

      // Update active webhooks map
      if (feed.status === 'active') {
        this.activeWebhooks.set(feed.config.webhookId, feed._id);
      } else {
        this.activeWebhooks.delete(feed.config.webhookId);
      }

      return { success: true, feed };
    } catch (error) {
      console.error('Error updating webhook:', error);
      throw error;
    }
  }

  // Delete webhook
  async deleteWebhook(feedId) {
    try {
      const feed = await ContentFeed.findById(feedId);
      if (!feed || feed.type !== 'webhook') {
        throw new Error('Webhook feed not found');
      }

      // Remove from active webhooks
      this.activeWebhooks.delete(feed.config.webhookId);

      await ContentFeed.findByIdAndDelete(feedId);

      return { success: true, message: 'Webhook deleted successfully' };
    } catch (error) {
      console.error('Error deleting webhook:', error);
      throw error;
    }
  }

  // Get all active webhooks
  async getActiveWebhooks() {
    try {
      const feeds = await ContentFeed.find({
        type: 'webhook',
        status: 'active'
      }).sort({ lastUpdated: -1 });

      return feeds.map(feed => ({
        id: feed._id,
        name: feed.name,
        webhookId: feed.config.webhookId,
        webhookUrl: `/api/webhooks/${feed.config.webhookId}`,
        config: feed.config,
        metadata: feed.metadata,
        lastUpdated: feed.lastUpdated
      }));
    } catch (error) {
      console.error('Error getting active webhooks:', error);
      throw error;
    }
  }

  // Test webhook with sample data
  async testWebhook(feedId, testData) {
    try {
      const feed = await ContentFeed.findById(feedId);
      if (!feed || feed.type !== 'webhook') {
        throw new Error('Webhook feed not found');
      }

      // Create mock request data
      const mockRequest = {
        headers: {},
        body: testData
      };

      // Process the webhook
      const result = await this.processWebhook(feed.config.webhookId, mockRequest);

      return {
        success: true,
        testResult: result,
        mappedData: this.mapWebhookToNotice(testData, feed.config.contentMapping),
        validation: this.validateWebhookData(testData, feed.config.validationRules)
      };
    } catch (error) {
      console.error('Error testing webhook:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Initialize webhooks on startup
  async initializeWebhooks() {
    try {
      const feeds = await ContentFeed.find({
        type: 'webhook',
        status: 'active'
      });

      for (const feed of feeds) {
        this.activeWebhooks.set(feed.config.webhookId, feed._id);
      }

      console.log(`Initialized ${feeds.length} webhooks`);
    } catch (error) {
      console.error('Error initializing webhooks:', error);
    }
  }

  // Get webhook logs/statistics
  async getWebhookStats(feedId) {
    try {
      const feed = await ContentFeed.findById(feedId);
      if (!feed || feed.type !== 'webhook') {
        throw new Error('Webhook feed not found');
      }

      // Get notices created by this webhook
      const noticesCreated = await Notice.countDocuments({
        'metadata.feedId': feedId,
        'metadata.source': 'webhook'
      });

      return {
        feedId: feed._id,
        webhookId: feed.config.webhookId,
        totalWebhooksReceived: feed.metadata.totalWebhooksReceived || 0,
        noticesCreated,
        lastWebhookReceived: feed.metadata.lastWebhookReceived,
        lastNoticeCreated: feed.metadata.lastNoticeCreated,
        status: feed.status
      };
    } catch (error) {
      console.error('Error getting webhook stats:', error);
      throw error;
    }
  }
}

module.exports = new WebhookService();