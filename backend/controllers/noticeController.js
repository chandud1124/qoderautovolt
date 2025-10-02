const Notice = require('../models/Notice');
const User = require('../models/User');
const ScheduledContent = require('../models/ScheduledContent');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/notices/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'notice-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow images, documents, and PDFs
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per notice
  }
});

// Create uploads/notices directory if it doesn't exist
const ensureUploadDir = async () => {
  const uploadDir = path.join(__dirname, '../uploads/notices/');
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
};

// Initialize upload directory
ensureUploadDir();

// Submit a new notice
const submitNotice = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, content, contentType, tags, priority, category, expiryDate, targetAudience, driveLink } = req.body;
    const submittedBy = req.user.id;

    // Process file attachments
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: `/uploads/notices/${file.filename}`
      }));
    }

    // Parse target audience
    let parsedTargetAudience = {};
    if (targetAudience) {
      try {
        parsedTargetAudience = JSON.parse(targetAudience);
      } catch (error) {
        // If parsing fails, use default (all users)
        parsedTargetAudience = {};
      }
    }

    // Parse tags
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = JSON.parse(tags);
        // Ensure tags are strings and filter out empty ones
        parsedTags = parsedTags.filter(tag => typeof tag === 'string' && tag.trim().length > 0).map(tag => tag.trim().toLowerCase());
        // Limit to 10 tags
        parsedTags = parsedTags.slice(0, 10);
      } catch (error) {
        console.warn('Failed to parse tags:', error.message);
        parsedTags = [];
      }
    }

    const notice = new Notice({
      title,
      content,
      contentType: contentType || 'text',
      tags: parsedTags,
      priority: priority || 'medium',
      category: category || 'general',
      submittedBy,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      attachments,
      targetAudience: parsedTargetAudience,
      targetBoards: [],
      driveLink: driveLink || null
    });

    await notice.save();

    // Populate submittedBy for response
    await notice.populate('submittedBy', 'name email role');

    // Emit real-time notification via MQTT
    if (global.mqttClient && global.mqttClient.connected) {
      const noticeData = {
        notice: {
          _id: notice._id,
          title: notice.title,
          content: notice.content,
          priority: notice.priority,
          category: notice.category,
          submittedBy: notice.submittedBy,
          createdAt: notice.createdAt
        },
        message: 'New notice submitted for approval',
        timestamp: new Date().toISOString()
      };

      global.mqttClient.publish('notices/submitted', JSON.stringify(noticeData), { qos: 1 });

      // Notify admins via MQTT
      const adminNotification = {
        type: 'notice_pending_approval',
        noticeId: notice._id,
        title: notice.title,
        submittedBy: notice.submittedBy.name,
        message: 'A new notice is pending approval',
        timestamp: new Date().toISOString()
      };

      global.mqttClient.publish('notices/admin', JSON.stringify(adminNotification), { qos: 1 });
    }

    res.status(201).json({
      success: true,
      message: 'Notice submitted successfully',
      notice
    });

  } catch (error) {
    console.error('Error submitting notice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit notice',
      error: error.message
    });
  }
};

// Get all notices (with filtering)
const getNotices = async (req, res) => {
  try {
    const {
      status,
      category,
      priority,
      submittedBy,
      search,
      dateFrom,
      dateTo,
      page = 1,
      limit = 25,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Text search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Add filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (submittedBy) query.submittedBy = submittedBy;

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    // Role-based access control
    if (req.user.role !== 'super-admin' && req.user.role !== 'admin') {
      // Non-admin users can only see their own notices
      query.submittedBy = req.user.id;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      populate: [
        { path: 'submittedBy', select: 'name email role department' },
        { path: 'approvedBy', select: 'name email role' },
        { path: 'targetBoards.boardId', select: 'name location department isActive' }
      ]
    };

    const notices = await Notice.find(query)
      .sort(options.sort)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .populate(options.populate);

    const total = await Notice.countDocuments(query);

    res.json({
      success: true,
      notices,
      page: options.page,
      limit: options.limit,
      totalItems: total,
      totalPages: Math.ceil(total / options.limit)
    });

  } catch (error) {
    console.error('Error fetching notices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notices',
      error: error.message
    });
  }
};

// Get active notices for current user
const getActiveNotices = async (req, res) => {
  try {
    const notices = await Notice.getActiveNoticesForUser(req.user);

    res.json({
      success: true,
      notices
    });

  } catch (error) {
    console.error('Error fetching active notices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active notices',
      error: error.message
    });
  }
};

// Get pending notices (for admin approval)
const getPendingNotices = async (req, res) => {
  try {
    const notices = await Notice.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('submittedBy', 'name email role department')
      .populate('approvedBy', 'name email role')
      .populate('targetBoards.boardId', 'name location department isActive');

    res.json({
      success: true,
      notices
    });

  } catch (error) {
    console.error('Error fetching pending notices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending notices',
      error: error.message
    });
  }
};

// Approve or reject notice
const reviewNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body;
    const reviewedBy = req.user.id;

    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    if (notice.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Notice has already been reviewed'
      });
    }

    let scheduledContentId = null;

    if (action === 'approve') {
      notice.status = 'approved';
      notice.approvedBy = reviewedBy;
      notice.approvedAt = new Date();

      // Create a ScheduledContent entry from the approved notice
      const scheduledContent = new ScheduledContent({
        title: notice.title,
        content: notice.content,
        type: notice.priority === 'high' ? 'emergency' : 'user',
        priority: notice.priority === 'high' ? 8 : notice.priority === 'medium' ? 5 : 3,
        duration: 60, // Default 60 seconds
        schedule: {
          type: 'always', // Default to always available
          startTime: '00:00',
          endTime: '23:59',
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          frequency: 'daily'
        },
        assignedBoards: [], // Will be assigned in Content Scheduler
        createdBy: notice.submittedBy,
        isActive: false, // Inactive until boards are assigned
        attachments: (notice.attachments || []).map(attachment => ({
          type: attachment.mimetype?.startsWith('image/') ? 'image' :
                attachment.mimetype?.startsWith('video/') ? 'video' :
                attachment.mimetype?.startsWith('audio/') ? 'audio' : 'document',
          filename: attachment.filename,
          originalName: attachment.originalName,
          mimeType: attachment.mimetype,
          size: attachment.size,
          url: attachment.url
        })),
        display: {
          template: 'default'
        }
      });

      try {
        console.log('[NOTICE-APPROVAL] Attempting to create ScheduledContent for notice:', notice._id);
        console.log('[NOTICE-APPROVAL] ScheduledContent data:', {
          title: notice.title,
          type: notice.priority === 'high' ? 'emergency' : 'user',
          priority: notice.priority === 'high' ? 8 : notice.priority === 'medium' ? 5 : 3,
          createdBy: notice.submittedBy,
          attachmentsCount: (notice.attachments || []).length
        });
        
        await scheduledContent.save();
        scheduledContentId = scheduledContent._id.toString();
        console.log(`[NOTICE-APPROVAL] Successfully created ScheduledContent: ${scheduledContentId} from notice: ${notice._id}`);
      } catch (saveError) {
        console.error('[NOTICE-APPROVAL] Error creating ScheduledContent:', saveError);
        console.error('[NOTICE-APPROVAL] Error details:', {
          message: saveError.message,
          name: saveError.name,
          errors: saveError.errors
        });
        console.error('[NOTICE-APPROVAL] ScheduledContent data that failed:', JSON.stringify({
          title: notice.title,
          content: notice.content.substring(0, 100) + '...',
          type: notice.priority === 'high' ? 'emergency' : 'user',
          priority: notice.priority === 'high' ? 8 : notice.priority === 'medium' ? 5 : 3,
          createdBy: notice.submittedBy,
          attachments: (notice.attachments || []).map(att => ({
            filename: att.filename,
            mimetype: att.mimetype
          }))
        }, null, 2));
        // Continue with notice approval even if ScheduledContent creation fails
      }
    } else if (action === 'reject') {
      notice.status = 'rejected';
      notice.approvedBy = reviewedBy;
      notice.approvedAt = new Date();
      notice.rejectionReason = rejectionReason;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "approve" or "reject"'
      });
    }

    await notice.save();
    await notice.populate('submittedBy', 'name email role');
    await notice.populate('approvedBy', 'name email role');

    // Emit real-time notification via MQTT
    if (global.mqttClient && global.mqttClient.connected) {
      const reviewData = {
        notice: {
          _id: notice._id,
          title: notice.title,
          status: notice.status,
          approvedBy: notice.approvedBy,
          approvedAt: notice.approvedAt,
          rejectionReason: notice.rejectionReason
        },
        action: action,
        reviewedBy: req.user.name,
        message: `Notice "${notice.title}" has been ${action === 'approve' ? 'approved' : 'rejected'}`,
        timestamp: new Date().toISOString()
      };

      global.mqttClient.publish('notices/reviewed', JSON.stringify(reviewData), { qos: 1 });

      // Notify the submitter via MQTT
      const personalNotification = {
        type: 'notice_review_result',
        noticeId: notice._id,
        title: notice.title,
        action: action,
        reviewedBy: req.user.name,
        message: `Your notice "${notice.title}" has been ${action === 'approve' ? 'approved' : 'rejected'}`,
        timestamp: new Date().toISOString()
      };

      global.mqttClient.publish(`notices/user/${notice.submittedBy._id}`, JSON.stringify(personalNotification), { qos: 1 });
    }

    res.json({
      success: true,
      message: `Notice ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      notice,
      scheduledContentId // Include the ID of created scheduled content
    });

  } catch (error) {
    console.error('Error reviewing notice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review notice',
      error: error.message
    });
  }
};

// Edit notice content (admin only)
const editNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, contentType, tags } = req.body;
    const editedBy = req.user.id;

    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    if (notice.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending notices can be edited'
      });
    }

    // Store previous values before updating
    const previousValues = {
      title: notice.title,
      content: notice.content,
      contentType: notice.contentType,
      tags: notice.tags
    };

    // Update the notice fields
    notice.title = title;
    notice.content = content;
    if (contentType) notice.contentType = contentType;
    
    // Process tags (ensure they are strings and filter out empty ones)
    if (tags !== undefined) {
      let processedTags = [];
      if (Array.isArray(tags)) {
        processedTags = tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0).map(tag => tag.trim().toLowerCase());
      }
      // Limit to 10 tags
      notice.tags = processedTags.slice(0, 10);
    }

    // Add edit history
    notice.editHistory = notice.editHistory || [];
    notice.editHistory.push({
      editedBy,
      editedAt: new Date(),
      previousTitle: previousValues.title,
      previousContent: previousValues.content,
      previousContentType: previousValues.contentType,
      previousTags: previousValues.tags
    });

    await notice.save();
    await notice.populate('submittedBy', 'name email role');
    await notice.populate('approvedBy', 'name email role');

    // Emit real-time notification via MQTT
    if (global.mqttClient && global.mqttClient.connected) {
      const editData = {
        notice: {
          _id: notice._id,
          title: notice.title,
          content: notice.content,
          contentType: notice.contentType,
          tags: notice.tags,
          status: notice.status
        },
        editedBy: req.user.name,
        message: `Notice "${notice.title}" has been edited by admin`,
        timestamp: new Date().toISOString()
      };

      global.mqttClient.publish('notices/edited', JSON.stringify(editData), { qos: 1 });

      // Notify the submitter via MQTT
      const personalNotification = {
        type: 'notice_edited',
        noticeId: notice._id,
        title: notice.title,
        editedBy: req.user.name,
        message: `Your notice "${notice.title}" has been edited by an admin`,
        timestamp: new Date().toISOString()
      };

      global.mqttClient.publish(`notices/user/${notice.submittedBy._id}`, JSON.stringify(personalNotification), { qos: 1 });
    }

    res.json({
      success: true,
      message: 'Notice updated successfully',
      notice
    });

  } catch (error) {
    console.error('Error editing notice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to edit notice',
      error: error.message
    });
  }
};

// Publish approved notice
const publishNotice = async (req, res) => {
  try {
    const { id } = req.params;

    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    if (notice.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved notices can be published'
      });
    }

    notice.status = 'published';
    notice.publishedAt = new Date();
    await notice.save();

    // Emit real-time notification via MQTT
    if (global.mqttClient && global.mqttClient.connected) {
      const publishData = {
        notice: {
          _id: notice._id,
          title: notice.title,
          content: notice.content,
          priority: notice.priority,
          category: notice.category,
          publishedAt: notice.publishedAt,
          targetAudience: notice.targetAudience
        },
        message: `Notice "${notice.title}" has been published`,
        timestamp: new Date().toISOString()
      };

      global.mqttClient.publish('notices/published', JSON.stringify(publishData), { qos: 1 });
    }

    res.json({
      success: true,
      message: 'Notice published successfully',
      notice
    });

  } catch (error) {
    console.error('Error publishing notice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish notice',
      error: error.message
    });
  }
};

// Schedule and publish notice (admin only)
const scheduleAndPublishNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      duration,
      scheduleType,
      selectedDays,
      startTime,
      endTime,
      assignedBoards,
      skipScheduling
    } = req.body;

    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    if (notice.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved notices can be scheduled and published'
      });
    }

    // Find the associated ScheduledContent
    const scheduledContent = await ScheduledContent.findOne({ title: notice.title, createdBy: notice.submittedBy });
    if (!scheduledContent) {
      return res.status(404).json({
        success: false,
        message: 'Associated scheduled content not found'
      });
    }

    if (!skipScheduling) {
      // Update the scheduled content with user preferences
      scheduledContent.duration = duration || 60;
      scheduledContent.schedule = {
        type: scheduleType || 'always',
        startTime: startTime || '00:00',
        endTime: endTime || '23:59',
        daysOfWeek: selectedDays || [0, 1, 2, 3, 4, 5, 6],
        frequency: 'daily'
      };
      scheduledContent.assignedBoards = assignedBoards || [];
      scheduledContent.isActive = true;

      await scheduledContent.save();
    }

    // Publish the notice
    notice.status = 'published';
    notice.publishedAt = new Date();
    await notice.save();

    // Emit real-time notification via MQTT
    if (global.mqttClient && global.mqttClient.connected) {
      const publishData = {
        notice: {
          _id: notice._id,
          title: notice.title,
          content: notice.content,
          priority: notice.priority,
          category: notice.category,
          publishedAt: notice.publishedAt,
          targetAudience: notice.targetAudience
        },
        message: `Notice "${notice.title}" has been published`,
        timestamp: new Date().toISOString()
      };

      global.mqttClient.publish('notices/published', JSON.stringify(publishData), { qos: 1 });
    }

    res.json({
      success: true,
      message: skipScheduling ? 'Notice published successfully' : 'Notice scheduled and published successfully',
      notice,
      scheduledContent: skipScheduling ? null : scheduledContent
    });

  } catch (error) {
    console.error('Error scheduling and publishing notice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule and publish notice',
      error: error.message
    });
  }
};

// Update notice
const updateNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'super-admin' && req.user.role !== 'admin' && notice.submittedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own notices'
      });
    }

    // Prevent updates to approved/published notices by non-admins
    if (notice.status !== 'pending' && req.user.role !== 'super-admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot update approved or published notices'
      });
    }

    // Update fields
    const allowedFields = ['title', 'content', 'priority', 'category', 'expiryDate', 'targetAudience', 'selectedBoards'];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        if (field === 'selectedBoards') {
          // Handle board assignment updates
          try {
            const parsedBoards = typeof updates.selectedBoards === 'string' ? JSON.parse(updates.selectedBoards) : updates.selectedBoards;
            if (Array.isArray(parsedBoards)) {
              notice.targetBoards = parsedBoards.map(boardId => ({
                boardId: boardId,
                assignedAt: new Date(),
                assignedBy: req.user.id,
                priority: 0,
                displayOrder: 0
              }));
            }
          } catch (error) {
            console.warn('Failed to parse selectedBoards for update:', error.message);
          }
        } else {
          notice[field] = updates[field];
        }
      }
    });

    await notice.save();
    await notice.populate('submittedBy', 'name email role');
    await notice.populate('approvedBy', 'name email role');
    await notice.populate('targetBoards.boardId', 'name location department isActive');

    res.json({
      success: true,
      message: 'Notice updated successfully',
      notice
    });

  } catch (error) {
    console.error('Error updating notice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notice',
      error: error.message
    });
  }
};

// Delete notice
const deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;

    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'super-admin' && req.user.role !== 'admin' && notice.submittedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own notices'
      });
    }

    // Delete associated files
    if (notice.attachments && notice.attachments.length > 0) {
      for (const attachment of notice.attachments) {
        try {
          const filePath = path.join(__dirname, '../uploads/notices/', attachment.filename);
          await fs.unlink(filePath);
        } catch (fileError) {
          console.warn('Failed to delete attachment:', fileError.message);
        }
      }
    }

    await notice.deleteOne();

    res.json({
      success: true,
      message: 'Notice deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting notice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notice',
      error: error.message
    });
  }
};

// Get notice statistics
const getNoticeStats = async (req, res) => {
  try {
    const stats = await Notice.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalNotices = await Notice.countDocuments();
    const pendingCount = await Notice.countDocuments({ status: 'pending' });
    const publishedCount = await Notice.countDocuments({ status: 'published' });
    const rejectedCount = await Notice.countDocuments({ status: 'rejected' });

    res.json({
      success: true,
      stats: {
        total: totalNotices,
        pending: pendingCount,
        published: publishedCount,
        rejected: rejectedCount,
        breakdown: stats
      }
    });

  } catch (error) {
    console.error('Error fetching notice stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notice statistics',
      error: error.message
    });
  }
};

// Enhanced search with filters
const searchNotices = async (req, res) => {
  try {
    const {
      search,
      status,
      category,
      priority,
      dateFrom,
      dateTo,
      page = 1,
      limit = 25,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Text search across title, content, and tags
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    // Role-based access
    if (req.user.role !== 'super-admin' && req.user.role !== 'admin') {
      query.submittedBy = req.user.id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortObj = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [notices, totalItems] = await Promise.all([
      Notice.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('submittedBy', 'name email role')
        .populate('approvedBy', 'name email role'),
      Notice.countDocuments(query)
    ]);

    res.json({
      success: true,
      notices,
      page: parseInt(page),
      limit: parseInt(limit),
      totalItems,
      totalPages: Math.ceil(totalItems / parseInt(limit))
    });
  } catch (error) {
    console.error('Error searching notices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search notices',
      error: error.message
    });
  }
};

// Bulk approve notices
const bulkApprove = async (req, res) => {
  try {
    const { noticeIds } = req.body;

    if (!noticeIds || !Array.isArray(noticeIds) || noticeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Notice IDs are required'
      });
    }

    const results = await Promise.allSettled(
      noticeIds.map(async (noticeId) => {
        const notice = await Notice.findById(noticeId);
        if (!notice) throw new Error(`Notice ${noticeId} not found`);
        
        notice.status = 'approved';
        notice.approvedBy = req.user.id;
        notice.approvedAt = new Date();
        await notice.save();

        // Create scheduled content
        const ScheduledContent = require('../models/ScheduledContent');
        await ScheduledContent.create({
          title: notice.title,
          content: notice.content,
          type: notice.priority === 'urgent' || notice.priority === 'high' ? 'emergency' : 'user',
          priority: notice.priority === 'urgent' ? 10 : notice.priority === 'high' ? 7 : notice.priority === 'medium' ? 5 : 3,
          duration: 60,
          schedule: {
            type: 'recurring',
            startTime: '09:00',
            endTime: '17:00',
            daysOfWeek: [1, 2, 3, 4, 5],
            frequency: 'daily'
          },
          isActive: false,
          assignedBoards: []
        });

        return noticeId;
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({
      success: true,
      message: `Approved ${successful} notice(s)${failed > 0 ? `, ${failed} failed` : ''}`,
      successful,
      failed
    });
  } catch (error) {
    console.error('Error bulk approving notices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk approve notices',
      error: error.message
    });
  }
};

// Bulk reject notices
const bulkReject = async (req, res) => {
  try {
    const { noticeIds, rejectionReason } = req.body;

    if (!noticeIds || !Array.isArray(noticeIds) || noticeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Notice IDs are required'
      });
    }

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const results = await Promise.allSettled(
      noticeIds.map(async (noticeId) => {
        const notice = await Notice.findById(noticeId);
        if (!notice) throw new Error(`Notice ${noticeId} not found`);
        
        notice.status = 'rejected';
        notice.rejectionReason = rejectionReason;
        notice.approvedBy = req.user.id;
        notice.approvedAt = new Date();
        await notice.save();

        return noticeId;
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({
      success: true,
      message: `Rejected ${successful} notice(s)${failed > 0 ? `, ${failed} failed` : ''}`,
      successful,
      failed
    });
  } catch (error) {
    console.error('Error bulk rejecting notices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk reject notices',
      error: error.message
    });
  }
};

// Bulk archive notices
const bulkArchive = async (req, res) => {
  try {
    const { noticeIds } = req.body;

    if (!noticeIds || !Array.isArray(noticeIds) || noticeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Notice IDs are required'
      });
    }

    const result = await Notice.updateMany(
      { _id: { $in: noticeIds } },
      { $set: { status: 'archived', isActive: false } }
    );

    res.json({
      success: true,
      message: `Archived ${result.modifiedCount} notice(s)`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk archiving notices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk archive notices',
      error: error.message
    });
  }
};

// Bulk delete notices
const bulkDelete = async (req, res) => {
  try {
    const { noticeIds } = req.body;

    if (!noticeIds || !Array.isArray(noticeIds) || noticeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Notice IDs are required'
      });
    }

    // Delete associated files
    const notices = await Notice.find({ _id: { $in: noticeIds } });
    for (const notice of notices) {
      if (notice.attachments && notice.attachments.length > 0) {
        for (const attachment of notice.attachments) {
          try {
            const filePath = path.join(__dirname, '../', attachment.url);
            await fs.unlink(filePath);
          } catch (err) {
            console.error('Error deleting file:', err);
          }
        }
      }
    }

    const result = await Notice.deleteMany({ _id: { $in: noticeIds } });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} notice(s)`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error bulk deleting notices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk delete notices',
      error: error.message
    });
  }
};

// Get user's drafts
const getDrafts = async (req, res) => {
  try {
    const drafts = await Notice.find({
      submittedBy: req.user.id,
      isDraft: true
    })
      .sort({ updatedAt: -1 })
      .populate('submittedBy', 'name email role');

    res.json({
      success: true,
      drafts
    });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch drafts',
      error: error.message
    });
  }
};

// Save draft
const saveDraft = async (req, res) => {
  try {
    const {
      title,
      content,
      contentType,
      tags,
      priority,
      category
    } = req.body;

    const draft = new Notice({
      title,
      content,
      contentType: contentType || 'text',
      tags: tags || [],
      priority: priority || 'medium',
      category: category || 'general',
      submittedBy: req.user.id,
      isDraft: true,
      status: 'pending'
    });

    await draft.save();
    await draft.populate('submittedBy', 'name email role');

    res.status(201).json({
      success: true,
      message: 'Draft saved successfully',
      draft
    });
  } catch (error) {
    console.error('Error saving draft:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save draft',
      error: error.message
    });
  }
};

// Update draft
const updateDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const draft = await Notice.findOne({
      _id: id,
      submittedBy: req.user.id,
      isDraft: true
    });

    if (!draft) {
      return res.status(404).json({
        success: false,
        message: 'Draft not found'
      });
    }

    Object.assign(draft, req.body);
    await draft.save();
    await draft.populate('submittedBy', 'name email role');

    res.json({
      success: true,
      message: 'Draft updated successfully',
      draft
    });
  } catch (error) {
    console.error('Error updating draft:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update draft',
      error: error.message
    });
  }
};

// Delete draft
const deleteDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const draft = await Notice.findOneAndDelete({
      _id: id,
      submittedBy: req.user.id,
      isDraft: true
    });

    if (!draft) {
      return res.status(404).json({
        success: false,
        message: 'Draft not found'
      });
    }

    res.json({
      success: true,
      message: 'Draft deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting draft:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete draft',
      error: error.message
    });
  }
};

module.exports = {
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
};