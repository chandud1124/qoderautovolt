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
  scheduleAndPublishNotice,
  updateNotice,
  deleteNotice,
  getNoticeStats,
  searchNotices,
  bulkApprove,
  bulkReject,
  bulkArchive,
  bulkDelete,
  getDrafts,
  saveDraft,
  updateDraft,
  deleteDraft,
  upload
} = require('../controllers/noticeController');
const { auth, authorize } = require('../middleware/auth');
const { body, param, query } = require('express-validator');

// Validation middleware
const noticeValidation = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Content must be 1-2000 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('category').optional().isIn(['general', 'academic', 'administrative', 'event', 'emergency', 'maintenance']).withMessage('Invalid category'),
  body('expiryDate').optional().isISO8601().withMessage('Invalid expiry date'),
  body('targetAudience').optional().isJSON().withMessage('Invalid target audience format')
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

// Schedule and publish approved notice - admin only
router.patch('/:id/schedule-publish',
  auth,
  authorize('admin', 'super-admin'),
  param('id').isMongoId().withMessage('Invalid notice ID'),
  [
    body('duration').optional().isInt({ min: 5, max: 3600 }).withMessage('Duration must be 5-3600 seconds'),
    body('scheduleType').optional().isIn(['fixed', 'recurring', 'always']).withMessage('Invalid schedule type'),
    body('selectedDays').optional().isArray().withMessage('Selected days must be an array'),
    body('selectedDays.*').optional().isInt({ min: 0, max: 6 }).withMessage('Day must be 0-6'),
    body('startTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid start time format (HH:MM)'),
    body('endTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid end time format (HH:MM)'),
    body('assignedBoards').optional().isArray().withMessage('Assigned boards must be an array'),
    body('assignedBoards.*').optional().isMongoId().withMessage('Invalid board ID'),
    body('skipScheduling').optional().isBoolean().withMessage('Skip scheduling must be boolean')
  ],
  scheduleAndPublishNotice
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

// Draft management routes
router.get('/drafts',
  auth,
  getDrafts
);

router.post('/drafts',
  auth,
  saveDraft
);

router.put('/drafts/:id',
  auth,
  param('id').isMongoId().withMessage('Invalid draft ID'),
  updateDraft
);

router.delete('/drafts/:id',
  auth,
  param('id').isMongoId().withMessage('Invalid draft ID'),
  deleteDraft
);

// Bulk operations (admin only)
router.post('/bulk-approve',
  auth,
  authorize('admin', 'super-admin'),
  [
    body('noticeIds').isArray({ min: 1 }).withMessage('Notice IDs array is required'),
    body('noticeIds.*').isMongoId().withMessage('Invalid notice ID format')
  ],
  bulkApprove
);

router.post('/bulk-reject',
  auth,
  authorize('admin', 'super-admin'),
  [
    body('noticeIds').isArray({ min: 1 }).withMessage('Notice IDs array is required'),
    body('noticeIds.*').isMongoId().withMessage('Invalid notice ID format'),
    body('rejectionReason').trim().isLength({ min: 1 }).withMessage('Rejection reason is required')
  ],
  bulkReject
);

router.post('/bulk-archive',
  auth,
  authorize('admin', 'super-admin'),
  [
    body('noticeIds').isArray({ min: 1 }).withMessage('Notice IDs array is required'),
    body('noticeIds.*').isMongoId().withMessage('Invalid notice ID format')
  ],
  bulkArchive
);

router.post('/bulk-delete',
  auth,
  authorize('admin', 'super-admin'),
  [
    body('noticeIds').isArray({ min: 1 }).withMessage('Notice IDs array is required'),
    body('noticeIds.*').isMongoId().withMessage('Invalid notice ID format')
  ],
  bulkDelete
);

module.exports = router;