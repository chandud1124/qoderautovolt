const Notice = require('../models/Notice');
const User = require('../models/User');
const ScheduledContent = require('../models/ScheduledContent');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const PiSignageService = require('../services/piSignageService');
const OfflineService = require('../services/offlineService');

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
  // Allow images, videos, documents, and PDFs
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, videos, PDFs, and documents are allowed.'), false);
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

      // Note: PiSignage integration will happen during publishing
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
      notice
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

    const notice = await Notice.findById(id).populate('targetBoards.boardId');
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

    // If notice has attachments, upload them to PiSignage
    let piSignageAssets = [];
    if (notice.attachments && notice.attachments.length > 0) {
      try {
        for (const attachment of notice.attachments) {
          const filePath = path.join(__dirname, '../uploads/notices/', attachment.filename);
          const asset = await PiSignageService.uploadAsset(filePath, attachment.originalName);
          piSignageAssets.push({
            _id: asset._id,
            duration: attachment.mimetype?.startsWith('video/') ? 30 : 10, // Videos 30s, others 10s
            name: asset.name
          });
        }
      } catch (uploadError) {
        console.error('Error uploading assets to PiSignage:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload assets to PiSignage',
          error: uploadError.message
        });
      }
    }

    // Create playlist in PiSignage
    let playlistId = null;
    try {
      const playlist = await PiSignageService.createPlaylist(`${notice.title} - ${notice._id}`, piSignageAssets);
      playlistId = playlist._id;
    } catch (playlistError) {
      console.error('Error creating playlist in PiSignage:', playlistError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create playlist in PiSignage',
        error: playlistError.message
      });
    }

    // Schedule playlist on assigned boards
    if (notice.targetBoards && notice.targetBoards.length > 0) {
      try {
        for (const targetBoard of notice.targetBoards) {
          if (targetBoard.boardId && targetBoard.boardId.piSignageGroupId) {
            await PiSignageService.schedulePlaylist(
              playlistId, 
              targetBoard.boardId.piSignageGroupId, 
              {
                startDate: new Date().toISOString().split('T')[0],
                endDate: notice.expiryDate ? notice.expiryDate.toISOString().split('T')[0] : null,
                startTime: '00:00',
                endTime: '23:59',
                daysOfWeek: [0,1,2,3,4,5,6]
              }
            );
          }
        }
      } catch (scheduleError) {
        console.error('Error scheduling playlist in PiSignage:', scheduleError);
        // Continue with publishing even if scheduling fails
      }
    }

    notice.status = 'published';
    notice.publishedAt = new Date();
    notice.piSignagePlaylistId = playlistId;
    await notice.save();

    // Queue content for offline storage on assigned boards
    if (notice.targetBoards && notice.targetBoards.length > 0) {
      try {
        for (const targetBoard of notice.targetBoards) {
          if (targetBoard.boardId && targetBoard.boardId.offlineSettings?.enabled) {
            await OfflineService.queueContentForOffline(
              targetBoard.boardId._id,
              notice._id,
              notice.priority === 'high' ? 2 : notice.priority === 'medium' ? 1 : 0
            );
          }
        }
      } catch (offlineError) {
        console.error('Error queuing content for offline storage:', offlineError);
        // Continue with publishing even if offline queuing fails
      }
    }

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
      message: 'Notice published successfully to PiSignage',
      notice,
      playlistId
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

// Assign boards and schedule notice
const assignBoardsAndSchedule = async (req, res) => {
  try {
    const { noticeId, boardIds, schedule } = req.body;

    const notice = await Notice.findById(noticeId);
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    // Update notice with board assignments
    notice.targetBoards = boardIds.map(boardId => ({
      boardId,
      assignedAt: new Date(),
      assignedBy: req.user.id
    }));

    if (schedule) {
      notice.schedule = schedule;
    }

    await notice.save();

    res.json({
      success: true,
      message: 'Boards assigned and notice scheduled successfully',
      notice
    });

  } catch (error) {
    console.error('Error assigning boards and scheduling:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign boards and schedule notice',
      error: error.message
    });
  }
};

// Create sequenced playlist from multiple notices
const createSequencedPlaylist = async (req, res) => {
  try {
    const { name, sequence, targetBoards, schedule } = req.body;

    if (!sequence || !Array.isArray(sequence) || sequence.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Sequence array is required'
      });
    }

    // Build the sequence with assets from notices
    const sequencedAssets = [];
    const noticeIds = [];

    for (let i = 0; i < sequence.length; i++) {
      const item = sequence[i];
      const notice = await Notice.findById(item.noticeId).populate('targetBoards.boardId');

      if (!notice) {
        return res.status(404).json({
          success: false,
          message: `Notice ${item.noticeId} not found`
        });
      }

      noticeIds.push(notice._id);

      // Add notice attachments
      if (notice.attachments && notice.attachments.length > 0) {
        for (const attachment of notice.attachments) {
          const filePath = path.join(__dirname, '../uploads/notices/', attachment.filename);
          try {
            const asset = await PiSignageService.uploadAsset(filePath, attachment.originalName);
            sequencedAssets.push({
              _id: asset._id,
              duration: item.duration || attachment.mimetype?.startsWith('video/') ? 30 : 10,
              order: sequencedAssets.length
            });
          } catch (uploadError) {
            console.error('Error uploading asset for sequence:', uploadError);
            continue;
          }
        }
      } else {
        // Add text content as asset
        sequencedAssets.push({
          _id: `text_${notice._id}_${i}`,
          duration: item.duration || 15,
          order: sequencedAssets.length,
          content: notice.content,
          type: 'text'
        });
      }
    }

    // Create sequenced playlist
    const playlist = await PiSignageService.createSequencedPlaylist(name, sequencedAssets);

    // Schedule on target boards with priority
    if (targetBoards && targetBoards.length > 0) {
      for (const boardId of targetBoards) {
        const board = await require('../models/Board').findById(boardId);
        if (board && board.piSignageGroupId) {
          await PiSignageService.schedulePlaylistWithPriority(
            playlist._id,
            board.piSignageGroupId,
            schedule || {
              startDate: new Date().toISOString().split('T')[0],
              endDate: null,
              startTime: '00:00',
              endTime: '23:59',
              daysOfWeek: [0,1,2,3,4,5,6]
            },
            1 // High priority for sequenced playlists
          );
        }
      }
    }

    res.json({
      success: true,
      message: 'Sequenced playlist created and scheduled successfully',
      playlist,
      noticeIds
    });

  } catch (error) {
    console.error('Error creating sequenced playlist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create sequenced playlist',
      error: error.message
    });
  }
};

// Update playlist sequence/order
const updatePlaylistSequence = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { assets, settings } = req.body;

    const updates = {};
    if (assets) {
      updates.assets = assets.map((asset, index) => ({
        _id: asset._id,
        duration: asset.duration,
        order: index
      }));
    }

    if (settings) {
      updates.settings = settings;
    }

    const updatedPlaylist = await PiSignageService.updatePlaylist(playlistId, updates);

    res.json({
      success: true,
      message: 'Playlist sequence updated successfully',
      playlist: updatedPlaylist
    });

  } catch (error) {
    console.error('Error updating playlist sequence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update playlist sequence',
      error: error.message
    });
  }
};

// Advanced scheduling with multiple playlists and priorities
const createAdvancedSchedule = async (req, res) => {
  try {
    const { boardId, schedules } = req.body;

    if (!boardId || !schedules || !Array.isArray(schedules)) {
      return res.status(400).json({
        success: false,
        message: 'Board ID and schedules array are required'
      });
    }

    const board = await require('../models/Board').findById(boardId);
    if (!board || !board.piSignageGroupId) {
      return res.status(404).json({
        success: false,
        message: 'Board not found or not linked to PiSignage group'
      });
    }

    // Validate and prepare schedules
    const validatedSchedules = schedules.map(schedule => ({
      playlistId: schedule.playlistId,
      priority: schedule.priority || 1,
      startTime: schedule.startTime || '00:00',
      endTime: schedule.endTime || '23:59',
      daysOfWeek: schedule.daysOfWeek || [0,1,2,3,4,5,6],
      startDate: schedule.startDate,
      endDate: schedule.endDate
    }));

    const result = await PiSignageService.createAdvancedSchedule(board.piSignageGroupId, validatedSchedules);

    res.json({
      success: true,
      message: 'Advanced schedule created successfully',
      schedule: result
    });

  } catch (error) {
    console.error('Error creating advanced schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create advanced schedule',
      error: error.message
    });
  }
};

// Get current schedules for a board
const getBoardSchedules = async (req, res) => {
  try {
    const { boardId } = req.params;

    const board = await require('../models/Board').findById(boardId);
    if (!board || !board.piSignageGroupId) {
      return res.status(404).json({
        success: false,
        message: 'Board not found or not linked to PiSignage group'
      });
    }

    const schedules = await PiSignageService.getGroupSchedules(board.piSignageGroupId);

    res.json({
      success: true,
      schedules
    });

  } catch (error) {
    console.error('Error getting board schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get board schedules',
      error: error.message
    });
  }
};

// Update board playback settings
const updateBoardSettings = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { playbackMode, defaultDuration, enableTransitions, settings } = req.body;

    const board = await require('../models/Board').findById(boardId);
    if (!board || !board.piSignageGroupId) {
      return res.status(404).json({
        success: false,
        message: 'Board not found or not linked to PiSignage group'
      });
    }

    const updatedSettings = await PiSignageService.updateGroupSettings(board.piSignageGroupId, {
      playbackMode: playbackMode || 'sequential',
      defaultDuration: defaultDuration || 10,
      enableTransitions: enableTransitions !== false,
      ...settings
    });

    res.json({
      success: true,
      message: 'Board settings updated successfully',
      settings: updatedSettings
    });

  } catch (error) {
    console.error('Error updating board settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update board settings',
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

// Get offline status for a board
const getOfflineStatus = async (req, res) => {
  try {
    const { boardId } = req.params;

    const status = await OfflineService.getOfflineStatus(boardId);

    res.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('Error getting offline status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get offline status',
      error: error.message
    });
  }
};

// Trigger manual sync for a board
const triggerBoardSync = async (req, res) => {
  try {
    const { boardId } = req.params;

    const result = await OfflineService.syncWithBoard(boardId);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error triggering board sync:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger board sync',
      error: error.message
    });
  }
};

// Handle board going offline
const handleBoardOffline = async (req, res) => {
  try {
    const { boardId } = req.params;

    const result = await OfflineService.handleBoardOffline(boardId);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error handling board offline:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle board offline',
      error: error.message
    });
  }
};

// Handle board coming back online
const handleBoardOnline = async (req, res) => {
  try {
    const { boardId } = req.params;

    const result = await OfflineService.handleBoardOnline(boardId);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error handling board online:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle board online',
      error: error.message
    });
  }
};

// Initialize offline content for a board
const initializeBoardOffline = async (req, res) => {
  try {
    const { boardId } = req.params;

    const result = await OfflineService.initializeBoardOffline(boardId);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error initializing board offline:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize board offline',
      error: error.message
    });
  }
};

// Queue specific content for offline storage
const queueContentForOffline = async (req, res) => {
  try {
    const { boardId, contentId } = req.params;
    const { priority } = req.body;

    const result = await OfflineService.queueContentForOffline(boardId, contentId, priority);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error queuing content for offline:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to queue content for offline',
      error: error.message
    });
  }
};

// Download specific content
const downloadContent = async (req, res) => {
  try {
    const { boardId, contentId } = req.params;

    const result = await OfflineService.downloadContent(boardId, contentId);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error downloading content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download content',
      error: error.message
    });
  }
};

// Get drafts for current user
const getDrafts = async (req, res) => {
  try {
    const userId = req.user.id;

    const drafts = await Notice.find({
      submittedBy: userId,
      isDraft: true
    })
    .populate('submittedBy', 'name email')
    .sort({ updatedAt: -1 });

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

// Delete a draft
const deleteDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const draft = await Notice.findOneAndDelete({
      _id: id,
      submittedBy: userId,
      isDraft: true
    });

    if (!draft) {
      return res.status(404).json({
        success: false,
        message: 'Draft not found or access denied'
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
};