const mongoose = require('mongoose');

const telegramUserSchema = new mongoose.Schema({
  // Reference to the system user
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  // Telegram-specific information
  telegramId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  chatId: {
    type: String,
    required: true,
    index: true
  },

  username: {
    type: String,
    trim: true,
    index: true
  },

  firstName: {
    type: String,
    trim: true
  },

  lastName: {
    type: String,
    trim: true
  },

  // User status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  isVerified: {
    type: Boolean,
    default: false,
    index: true
  },

  // Notification preferences - which alerts to receive
  notificationPreferences: {
    deviceOffline: { type: Boolean, default: true },
    switchesOnAfter5PM: { type: Boolean, default: true },
    securityAlerts: { type: Boolean, default: false },
    systemAlerts: { type: Boolean, default: false },
    energyAlerts: { type: Boolean, default: true },
    maintenanceAlerts: { type: Boolean, default: false },
    criticalAlerts: { type: Boolean, default: true },
    warningAlerts: { type: Boolean, default: true },
    infoAlerts: { type: Boolean, default: false }
  },

  // Role-based alert subscriptions
  roleSubscriptions: [{
    type: String,
    enum: [
      'admin_alerts',      // All alerts for admins
      'security_alerts',   // Security-related alerts
      'maintenance_alerts', // Device maintenance alerts
      'energy_alerts',     // Energy conservation alerts
      'system_alerts',     // System health alerts
      'user_alerts'        // User-related notifications
    ]
  }],

  // Bot interaction tracking
  lastInteraction: {
    type: Date,
    default: Date.now
  },

  commandHistory: [{
    command: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    response: String
  }],

  // Registration and verification
  registrationToken: {
    type: String,
    unique: true,
    sparse: true
  },

  tokenExpires: {
    type: Date
  },

  verifiedAt: {
    type: Date
  },

  // Statistics
  messagesReceived: {
    type: Number,
    default: 0
  },

  alertsReceived: {
    type: Number,
    default: 0
  },

  lastAlertReceived: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for performance
telegramUserSchema.index({ user: 1, isActive: 1 });
telegramUserSchema.index({ telegramId: 1, isActive: 1 });
telegramUserSchema.index({ chatId: 1, isActive: 1 });
telegramUserSchema.index({ 'roleSubscriptions': 1 });

// Pre-save middleware to set role-based subscriptions based on user role
telegramUserSchema.pre('save', async function(next) {
  if (this.isNew && this.user) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(this.user);

      if (user) {
        // Set role-based subscriptions
        const roleSubscriptions = [];

        switch (user.role) {
          case 'super-admin':
          case 'admin':
            roleSubscriptions.push('admin_alerts', 'security_alerts', 'maintenance_alerts', 'energy_alerts', 'system_alerts', 'user_alerts');
            break;
          case 'security':
            roleSubscriptions.push('security_alerts', 'energy_alerts');
            break;
          case 'faculty':
          case 'teacher':
            roleSubscriptions.push('energy_alerts', 'maintenance_alerts');
            break;
          case 'student':
            roleSubscriptions.push('energy_alerts');
            break;
          default:
            roleSubscriptions.push('energy_alerts');
        }

        this.roleSubscriptions = roleSubscriptions;
      }
    } catch (error) {
      console.error('Error setting role subscriptions:', error);
    }
  }
  next();
});

// Instance methods
telegramUserSchema.methods.generateRegistrationToken = function() {
  this.registrationToken = crypto.randomBytes(32).toString('hex');
  this.tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return this.registrationToken;
};

telegramUserSchema.methods.verifyToken = function(token) {
  return this.registrationToken === token && this.tokenExpires > new Date();
};

telegramUserSchema.methods.clearToken = function() {
  this.registrationToken = undefined;
  this.tokenExpires = undefined;
  this.isVerified = true;
  this.verifiedAt = new Date();
};

telegramUserSchema.methods.shouldReceiveAlert = function(alertType, alertLabels = {}) {
  // Check notification preferences
  if (this.notificationPreferences[alertType] === false) {
    return false;
  }

  // Check role-based subscriptions
  const roleBasedChecks = {
    deviceOffline: ['admin_alerts', 'maintenance_alerts'],
    switchesOnAfter5PM: ['admin_alerts', 'energy_alerts', 'security_alerts'],
    securityAlerts: ['admin_alerts', 'security_alerts'],
    systemAlerts: ['admin_alerts', 'system_alerts'],
    energyAlerts: ['admin_alerts', 'energy_alerts'],
    maintenanceAlerts: ['admin_alerts', 'maintenance_alerts'],
    criticalAlerts: ['admin_alerts', 'security_alerts', 'system_alerts'],
    warningAlerts: ['admin_alerts', 'security_alerts', 'maintenance_alerts'],
    infoAlerts: ['admin_alerts']
  };

  if (roleBasedChecks[alertType]) {
    return roleBasedChecks[alertType].some(subscription =>
      this.roleSubscriptions.includes(subscription)
    );
  }

  return true;
};

telegramUserSchema.methods.recordAlert = function(alertType) {
  this.alertsReceived += 1;
  this.lastAlertReceived = new Date();
  return this.save();
};

// Static methods
telegramUserSchema.statics.findByTelegramId = function(telegramId) {
  return this.findOne({ telegramId, isActive: true });
};

telegramUserSchema.statics.findByChatId = function(chatId) {
  return this.findOne({ chatId, isActive: true });
};

telegramUserSchema.statics.getActiveSubscribers = function(alertType, alertLabels = {}) {
  return this.find({
    isActive: true,
    isVerified: true
  }).populate('user').then(users => {
    return users.filter(user => user.shouldReceiveAlert(alertType, alertLabels));
  });
};

telegramUserSchema.statics.cleanupExpiredTokens = function() {
  return this.updateMany(
    { tokenExpires: { $lt: new Date() } },
    { $unset: { registrationToken: 1, tokenExpires: 1 } }
  );
};

module.exports = mongoose.model('TelegramUser', telegramUserSchema);