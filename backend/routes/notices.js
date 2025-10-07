const express = require('express');
const router = express.Router();
const {
  submitNotice,
  getNotices,
  getActiveNotices,
  getPendingNotices,
  reviewNotice,
  editNotice,
  publishNotice,
  assignBoardsAndSchedule,
  createSequencedPlaylist,
  updatePlaylistSequence,
  createAdvancedSchedule,
  getBoardSchedules,
  updateBoardSettings,
  updateNotice,
  deleteNotice,
  getNoticeStats,
  searchNotices,
  upload,
  getOfflineStatus,
  triggerBoardSync,
  handleBoardOffline,
  handleBoardOnline,
  initializeBoardOffline,
  queueContentForOffline,
  downloadContent,
  getDrafts,
  deleteDraft
} = require('../controllers/noticeController');
const offlineCleanupService = require('../services/offlineCleanupService');
const { auth, authorize } = require('../middleware/auth');
const { body, param, query } = require('express-validator');

// Validation middleware
const noticeValidation = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Content must be 1-2000 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('category').optional().isIn(['general', 'academic', 'administrative', 'event', 'emergency', 'maintenance']).withMessage('Invalid category'),
  body('expiryDate').optional().isISO8601().withMessage('Invalid expiry date'),
  body('targetAudience').optional().isJSON().withMessage('Invalid target audience format'),
  body('selectedBoards').optional().custom((value) => {
    if (!value) return true; // Optional field
    try {
      // Handle both JSON string and array formats
      const boards = typeof value === 'string' ? JSON.parse(value) : value;
      if (!Array.isArray(boards)) {
        throw new Error('Selected boards must be an array');
      }
      if (boards.length > 5) {
        throw new Error('Selected boards must be an array with max 5 boards');
      }
      // Validate each board ID is a valid MongoDB ObjectId
      boards.forEach(boardId => {
        if (!/^[0-9a-fA-F]{24}$/.test(boardId)) {
          throw new Error('Each selected board must be a valid ID');
        }
      });
      return true;
    } catch (error) {
      throw new Error(error.message);
    }
  })
];

const reviewValidation = [
  body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
  body('rejectionReason').optional().trim().isLength({ min: 1 }).withMessage('Rejection reason is required')
];

// Routes

// Submit a new notice (any authenticated user)
router.post('/submit',
  auth,
  upload.array('attachments', 5), // Allow up to 5 files
  noticeValidation,
  submitNotice
);

// Get notices (filtered by user permissions)
router.get('/',
  auth,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'published', 'archived']).withMessage('Invalid status'),
    query('category').optional().isIn(['general', 'academic', 'administrative', 'event', 'emergency', 'maintenance']).withMessage('Invalid category'),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
  ],
  getNotices
);

// Get active notices for current user
router.get('/active', auth, getActiveNotices);

// Get pending notices (admin only)
router.get('/pending',
  auth,
  authorize('admin', 'super-admin'),
  getPendingNotices
);

// Review notice (approve/reject) - admin only
router.patch('/:id/review',
  auth,
  authorize('admin', 'super-admin'),
  param('id').isMongoId().withMessage('Invalid notice ID'),
  reviewValidation,
  reviewNotice
);

// Edit notice content - admin only
router.patch('/:id/edit',
  auth,
  authorize('admin', 'super-admin'),
  param('id').isMongoId().withMessage('Invalid notice ID'),
  [
    body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
    body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Content must be 1-2000 characters'),
    body('contentType').optional().isIn(['announcement', 'event', 'news', 'alert', 'information', 'reminder']).withMessage('Invalid content type'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('tags.*').optional().isString().trim().isLength({ min: 1, max: 50 }).withMessage('Each tag must be 1-50 characters')
  ],
  editNotice
);

// Publish approved notice - admin only
router.patch('/:id/publish',
  auth,
  authorize('admin', 'super-admin'),
  param('id').isMongoId().withMessage('Invalid notice ID'),
  publishNotice
);

// Assign boards and schedule on PiSignage - admin only
router.patch('/:id/assign-boards',
  auth,
  authorize('admin', 'super-admin'),
  param('id').isMongoId().withMessage('Invalid notice ID'),
  [
    body('assignedBoards').optional().isArray().withMessage('Assigned boards must be an array'),
    body('assignedBoards.*').optional().isMongoId().withMessage('Invalid board ID'),
    body('scheduleType').optional().isIn(['fixed', 'recurring', 'always']).withMessage('Invalid schedule type'),
    body('selectedDays').optional().isArray().withMessage('Selected days must be an array'),
    body('selectedDays.*').optional().isInt({ min: 0, max: 6 }).withMessage('Day must be 0-6'),
    body('startTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid start time format (HH:MM)'),
    body('endTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid end time format (HH:MM)'),
    body('startDate').optional().isISO8601().withMessage('Invalid start date'),
    body('endDate').optional().isISO8601().withMessage('Invalid end date')
  ],
  assignBoardsAndSchedule
);

// Update notice
router.patch('/:id',
  auth,
  param('id').isMongoId().withMessage('Invalid notice ID'),
  noticeValidation,
  updateNotice
);

// Delete notice
router.delete('/:id',
  auth,
  param('id').isMongoId().withMessage('Invalid notice ID'),
  deleteNotice
);

// Get drafts for current user
router.get('/drafts',
  auth,
  getDrafts
);

// Delete a draft
router.delete('/drafts/:id',
  auth,
  param('id').isMongoId().withMessage('Invalid draft ID'),
  deleteDraft
);

// Get notice statistics (admin only)
router.get('/stats/admin',
  auth,
  authorize('admin', 'super-admin'),
  getNoticeStats
);

// Search notices with advanced filters
router.get('/search',
  auth,
  searchNotices
);

// Advanced Scheduling Routes (admin only)

// Create sequenced playlist from multiple notices
router.post('/sequenced-playlist',
  auth,
  authorize('admin', 'super-admin'),
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Playlist name is required'),
    body('sequence').isArray({ min: 1 }).withMessage('Sequence array is required'),
    body('sequence.*.noticeId').isMongoId().withMessage('Valid notice ID required'),
    body('sequence.*.duration').optional().isInt({ min: 1, max: 3600 }).withMessage('Duration must be 1-3600 seconds'),
    body('targetBoards').optional().isArray().withMessage('Target boards must be an array'),
    body('targetBoards.*').optional().isMongoId().withMessage('Invalid board ID'),
    body('schedule').optional().isObject().withMessage('Schedule must be an object')
  ],
  createSequencedPlaylist
);

// Update playlist sequence/order
router.patch('/playlist/:playlistId/sequence',
  auth,
  authorize('admin', 'super-admin'),
  param('playlistId').isString().withMessage('Playlist ID is required'),
  [
    body('assets').optional().isArray().withMessage('Assets must be an array'),
    body('settings').optional().isObject().withMessage('Settings must be an object')
  ],
  updatePlaylistSequence
);

// Create advanced schedule with multiple playlists
router.post('/advanced-schedule',
  auth,
  authorize('admin', 'super-admin'),
  [
    body('boardId').isMongoId().withMessage('Valid board ID is required'),
    body('schedules').isArray({ min: 1 }).withMessage('Schedules array is required'),
    body('schedules.*.playlistId').isString().withMessage('Playlist ID is required'),
    body('schedules.*.priority').optional().isInt({ min: 1 }).withMessage('Priority must be positive integer'),
    body('schedules.*.startTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid start time'),
    body('schedules.*.endTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid end time'),
    body('schedules.*.daysOfWeek').optional().isArray().withMessage('Days of week must be an array'),
    body('schedules.*.startDate').optional().isISO8601().withMessage('Invalid start date'),
    body('schedules.*.endDate').optional().isISO8601().withMessage('Invalid end date')
  ],
  createAdvancedSchedule
);

// Get current schedules for a board
router.get('/board/:boardId/schedules',
  auth,
  authorize('admin', 'super-admin'),
  param('boardId').isMongoId().withMessage('Valid board ID is required'),
  getBoardSchedules
);

// Update board playback settings
router.patch('/board/:boardId/settings',
  auth,
  authorize('admin', 'super-admin'),
  param('boardId').isMongoId().withMessage('Valid board ID is required'),
  [
    body('playbackMode').optional().isIn(['sequential', 'random', 'priority']).withMessage('Invalid playback mode'),
    body('defaultDuration').optional().isInt({ min: 1, max: 3600 }).withMessage('Duration must be 1-3600 seconds'),
    body('enableTransitions').optional().isBoolean().withMessage('Enable transitions must be boolean')
  ],
  updateBoardSettings
);

// Offline Content Management Routes (admin only)

// Get offline status for a board
router.get('/board/:boardId/offline-status',
  auth,
  authorize('admin', 'super-admin'),
  param('boardId').isMongoId().withMessage('Valid board ID is required'),
  getOfflineStatus
);

// Initialize offline content for a board
router.post('/board/:boardId/initialize-offline',
  auth,
  authorize('admin', 'super-admin'),
  param('boardId').isMongoId().withMessage('Valid board ID is required'),
  initializeBoardOffline
);

// Trigger manual sync for a board
router.post('/board/:boardId/sync',
  auth,
  authorize('admin', 'super-admin'),
  param('boardId').isMongoId().withMessage('Valid board ID is required'),
  triggerBoardSync
);

// Handle board going offline
router.post('/board/:boardId/offline',
  auth,
  authorize('admin', 'super-admin'),
  param('boardId').isMongoId().withMessage('Valid board ID is required'),
  handleBoardOffline
);

// Handle board coming back online
router.post('/board/:boardId/online',
  auth,
  authorize('admin', 'super-admin'),
  param('boardId').isMongoId().withMessage('Valid board ID is required'),
  handleBoardOnline
);

// Queue specific content for offline storage
router.post('/board/:boardId/content/:contentId/queue-offline',
  auth,
  authorize('admin', 'super-admin'),
  param('boardId').isMongoId().withMessage('Valid board ID is required'),
  param('contentId').isMongoId().withMessage('Valid content ID is required'),
  [
    body('priority').optional().isInt({ min: 0, max: 10 }).withMessage('Priority must be 0-10')
  ],
  queueContentForOffline
);

// Download specific content
router.post('/board/:boardId/content/:contentId/download',
  auth,
  authorize('admin', 'super-admin'),
  param('boardId').isMongoId().withMessage('Valid board ID is required'),
  param('contentId').isMongoId().withMessage('Valid content ID is required'),
  downloadContent
);

// Offline Cleanup Service Routes (admin only)

// Get cleanup statistics
router.get('/cleanup/stats',
  auth,
  authorize('admin', 'super-admin'),
  async (req, res) => {
    try {
      const stats = await offlineCleanupService.getCleanupStats();
      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Error getting cleanup stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get cleanup stats',
        error: error.message
      });
    }
  }
);

// Run manual cleanup
router.post('/cleanup/run',
  auth,
  authorize('admin', 'super-admin'),
  async (req, res) => {
    try {
      await offlineCleanupService.runCleanup();
      res.json({
        success: true,
        message: 'Cleanup completed successfully'
      });
    } catch (error) {
      console.error('Error running cleanup:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to run cleanup',
        error: error.message
      });
    }
  }
);

// Run storage management
router.post('/cleanup/storage',
  auth,
  authorize('admin', 'super-admin'),
  async (req, res) => {
    try {
      await offlineCleanupService.runStorageManagement();
      res.json({
        success: true,
        message: 'Storage management completed successfully'
      });
    } catch (error) {
      console.error('Error running storage management:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to run storage management',
        error: error.message
      });
    }
  }
);

// Force cleanup for specific board
router.post('/cleanup/board/:boardId',
  auth,
  authorize('admin', 'super-admin'),
  param('boardId').isMongoId().withMessage('Valid board ID is required'),
  async (req, res) => {
    try {
      const result = await offlineCleanupService.forceCleanup(req.params.boardId);
      res.json({
        success: true,
        result
      });
    } catch (error) {
      console.error('Error forcing cleanup:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to force cleanup',
        error: error.message
      });
    }
  }
);

module.exports = router;