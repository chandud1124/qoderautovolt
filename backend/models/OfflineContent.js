const mongoose = require('mongoose');

const offlineContentSchema = new mongoose.Schema({
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notice',
    required: true
  },
  contentType: {
    type: String,
    enum: ['notice', 'scheduled_content', 'emergency'],
    default: 'notice'
  },
  localPath: {
    type: String,
    required: true // Path on the local board storage
  },
  originalPath: {
    type: String,
    required: true // Original server path
  },
  fileSize: {
    type: Number,
    required: true
  },
  checksum: {
    type: String // MD5 or SHA256 hash for integrity checking
  },
  downloadStatus: {
    type: String,
    enum: ['pending', 'downloading', 'completed', 'failed'],
    default: 'pending'
  },
  downloadProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  downloadedAt: Date,
  expiresAt: Date,
  lastAccessed: Date,
  accessCount: {
    type: Number,
    default: 0
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 10 // Higher number = higher priority for retention
  },
  isExpired: {
    type: Boolean,
    default: false
  },
  deletionScheduled: {
    type: Boolean,
    default: false
  },
  metadata: {
    duration: Number, // For videos/audio
    dimensions: {
      width: Number,
      height: Number
    },
    format: String,
    encoding: String
  }
}, {
  timestamps: true
});

// Indexes for performance
offlineContentSchema.index({ boardId: 1, contentId: 1 });
offlineContentSchema.index({ boardId: 1, expiresAt: 1 });
offlineContentSchema.index({ boardId: 1, priority: -1 });
offlineContentSchema.index({ boardId: 1, lastAccessed: -1 });
offlineContentSchema.index({ downloadStatus: 1 });

// Virtual for checking if content should be deleted
offlineContentSchema.virtual('shouldDelete').get(function() {
  return this.isExpired || this.deletionScheduled ||
         (this.expiresAt && this.expiresAt < new Date());
});

// Method to mark as accessed
offlineContentSchema.methods.markAccessed = function() {
  this.lastAccessed = new Date();
  this.accessCount += 1;
  return this.save();
};

// Method to schedule deletion
offlineContentSchema.methods.scheduleDeletion = function() {
  this.deletionScheduled = true;
  return this.save();
};

// Static method to get expired content for a board
offlineContentSchema.statics.getExpiredContent = function(boardId) {
  return this.find({
    boardId,
    $or: [
      { isExpired: true },
      { expiresAt: { $lt: new Date() } },
      { deletionScheduled: true }
    ]
  });
};

// Static method to get content by priority for cleanup
offlineContentSchema.statics.getLowPriorityContent = function(boardId, minPriority = 3) {
  return this.find({
    boardId,
    priority: { $lt: minPriority },
    downloadStatus: 'completed'
  }).sort({ lastAccessed: 1, priority: 1 });
};

// Static method to calculate total storage used by board
offlineContentSchema.statics.getStorageUsage = function(boardId) {
  return this.aggregate([
    { $match: { boardId: mongoose.Types.ObjectId(boardId) } },
    { $group: { _id: null, totalSize: { $sum: '$fileSize' } } }
  ]);
};

module.exports = mongoose.model('OfflineContent', offlineContentSchema);