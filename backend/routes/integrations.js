const express = require('express');
const router = express.Router();
const integrationsController = require('../controllers/integrationsController');
const { auth, authorize } = require('../middleware/auth');
const { body, param, query } = require('express-validator');
const WebhookService = require('../services/webhookService');

// RSS Feed Routes
router.post('/rss',
  auth,
  authorize('admin', 'super-admin'),
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
    body('url').isURL().withMessage('Valid RSS URL is required'),
    body('updateInterval').optional().isInt({ min: 5, max: 1440 }).withMessage('Update interval must be 5-1440 minutes'),
    body('maxItems').optional().isInt({ min: 1, max: 50 }).withMessage('Max items must be 1-50'),
    body('autoPublish').optional().isBoolean().withMessage('Auto-publish must be boolean')
  ],
  integrationsController.createRSSFeed
);

router.get('/rss',
  auth,
  authorize('admin', 'super-admin'),
  integrationsController.getRSSFeeds
);

router.patch('/rss/:feedId',
  auth,
  authorize('admin', 'super-admin'),
  param('feedId').isMongoId().withMessage('Valid feed ID is required'),
  integrationsController.updateRSSFeed
);

router.delete('/rss/:feedId',
  auth,
  authorize('admin', 'super-admin'),
  param('feedId').isMongoId().withMessage('Valid feed ID is required'),
  integrationsController.deleteRSSFeed
);

router.post('/rss/:feedId/fetch',
  auth,
  authorize('admin', 'super-admin'),
  param('feedId').isMongoId().withMessage('Valid feed ID is required'),
  integrationsController.fetchRSSContent
);

// Social Media Routes
router.post('/social-media',
  auth,
  authorize('admin', 'super-admin'),
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
    body('platform').isIn(['instagram', 'twitter', 'facebook']).withMessage('Valid platform required'),
    body('accessToken').trim().isLength({ min: 1 }).withMessage('Access token is required'),
    body('accounts').optional().isArray().withMessage('Accounts must be an array'),
    body('hashtags').optional().isArray().withMessage('Hashtags must be an array'),
    body('updateInterval').optional().isInt({ min: 5, max: 1440 }).withMessage('Update interval must be 5-1440 minutes'),
    body('autoPublish').optional().isBoolean().withMessage('Auto-publish must be boolean')
  ],
  integrationsController.createSocialMediaFeed
);

router.get('/social-media',
  auth,
  authorize('admin', 'super-admin'),
  integrationsController.getSocialMediaFeeds
);

router.patch('/social-media/:feedId',
  auth,
  authorize('admin', 'super-admin'),
  param('feedId').isMongoId().withMessage('Valid feed ID is required'),
  integrationsController.updateSocialMediaFeed
);

router.delete('/social-media/:feedId',
  auth,
  authorize('admin', 'super-admin'),
  param('feedId').isMongoId().withMessage('Valid feed ID is required'),
  integrationsController.deleteSocialMediaFeed
);

router.post('/social-media/:feedId/fetch',
  auth,
  authorize('admin', 'super-admin'),
  param('feedId').isMongoId().withMessage('Valid feed ID is required'),
  integrationsController.fetchSocialMediaContent
);

// Weather Routes
router.post('/weather',
  auth,
  authorize('admin', 'super-admin'),
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
    body('apiKey').trim().isLength({ min: 1 }).withMessage('OpenWeatherMap API key is required'),
    body('location').trim().isLength({ min: 1 }).withMessage('Location is required'),
    body('units').optional().isIn(['metric', 'imperial']).withMessage('Units must be metric or imperial'),
    body('updateInterval').optional().isInt({ min: 30, max: 1440 }).withMessage('Update interval must be 30-1440 minutes'),
    body('autoPublish').optional().isBoolean().withMessage('Auto-publish must be boolean')
  ],
  integrationsController.createWeatherFeed
);

router.get('/weather',
  auth,
  authorize('admin', 'super-admin'),
  integrationsController.getWeatherFeeds
);

router.patch('/weather/:feedId',
  auth,
  authorize('admin', 'super-admin'),
  param('feedId').isMongoId().withMessage('Valid feed ID is required'),
  integrationsController.updateWeatherFeed
);

router.delete('/weather/:feedId',
  auth,
  authorize('admin', 'super-admin'),
  param('feedId').isMongoId().withMessage('Valid feed ID is required'),
  integrationsController.deleteWeatherFeed
);

router.post('/weather/:feedId/fetch',
  auth,
  authorize('admin', 'super-admin'),
  param('feedId').isMongoId().withMessage('Valid feed ID is required'),
  integrationsController.fetchWeatherData
);

// Webhook Routes
router.post('/webhooks',
  auth,
  authorize('admin', 'super-admin'),
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
    body('autoPublish').optional().isBoolean().withMessage('Auto-publish must be boolean')
  ],
  integrationsController.createWebhook
);

router.get('/webhooks',
  auth,
  authorize('admin', 'super-admin'),
  integrationsController.getWebhooks
);

router.get('/webhooks/:feedId',
  auth,
  authorize('admin', 'super-admin'),
  param('feedId').isMongoId().withMessage('Valid webhook ID is required'),
  integrationsController.getWebhookDetails
);

router.patch('/webhooks/:feedId',
  auth,
  authorize('admin', 'super-admin'),
  param('feedId').isMongoId().withMessage('Valid webhook ID is required'),
  integrationsController.updateWebhook
);

router.delete('/webhooks/:feedId',
  auth,
  authorize('admin', 'super-admin'),
  param('feedId').isMongoId().withMessage('Valid webhook ID is required'),
  integrationsController.deleteWebhook
);

router.post('/webhooks/:feedId/test',
  auth,
  authorize('admin', 'super-admin'),
  param('feedId').isMongoId().withMessage('Valid webhook ID is required'),
  integrationsController.testWebhook
);

router.get('/webhooks/:feedId/stats',
  auth,
  authorize('admin', 'super-admin'),
  param('feedId').isMongoId().withMessage('Valid webhook ID is required'),
  integrationsController.getWebhookStats
);

// Database Routes
router.post('/database',
  auth,
  authorize('admin', 'super-admin'),
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
    body('dbType').isIn(['mysql', 'postgres', 'mssql']).withMessage('Valid database type required'),
    body('connectionString').trim().isLength({ min: 1 }).withMessage('Connection string is required'),
    body('query').trim().isLength({ min: 1 }).withMessage('Query is required'),
    body('updateInterval').optional().isInt({ min: 5, max: 1440 }).withMessage('Update interval must be 5-1440 minutes'),
    body('autoPublish').optional().isBoolean().withMessage('Auto-publish must be boolean')
  ],
  integrationsController.createDatabaseFeed
);

router.get('/database',
  auth,
  authorize('admin', 'super-admin'),
  integrationsController.getDatabaseFeeds
);

router.patch('/database/:feedId',
  auth,
  authorize('admin', 'super-admin'),
  param('feedId').isMongoId().withMessage('Valid feed ID is required'),
  integrationsController.updateDatabaseFeed
);

router.delete('/database/:feedId',
  auth,
  authorize('admin', 'super-admin'),
  param('feedId').isMongoId().withMessage('Valid feed ID is required'),
  integrationsController.deleteDatabaseFeed
);

router.post('/database/:feedId/fetch',
  auth,
  authorize('admin', 'super-admin'),
  param('feedId').isMongoId().withMessage('Valid feed ID is required'),
  integrationsController.fetchDatabaseContent
);

router.post('/database/test',
  auth,
  authorize('admin', 'super-admin'),
  integrationsController.testDatabaseConfig
);

// General Integration Routes
router.get('/',
  auth,
  authorize('admin', 'super-admin'),
  integrationsController.getAllIntegrations
);

router.get('/:id',
  auth,
  authorize('admin', 'super-admin'),
  param('id').isMongoId().withMessage('Valid integration ID is required'),
  integrationsController.getIntegration
);

router.delete('/:id',
  auth,
  authorize('admin', 'super-admin'),
  param('id').isMongoId().withMessage('Valid integration ID is required'),
  integrationsController.deleteIntegration
);

module.exports = router;