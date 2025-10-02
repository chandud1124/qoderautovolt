const cron = require('node-cron');
const ScheduledContent = require('../models/ScheduledContent');
const Device = require('../models/Device');
const ActivityLog = require('../models/ActivityLog');

class ContentSchedulerService {
  constructor() {
    this.jobs = new Map();
    this.initialized = false;
  }

  // Public method to initialize the service
  async initialize() {
    if (this.initialized) return;
    await this.init();
    this.initialized = true;
  }

  async init() {
    console.log('Initializing Content Scheduler Service...');
    try {
      await this.loadScheduledContent();
    } catch (error) {
      console.log('Content Scheduler Service initialization failed (database not ready), will retry later:', error.message);
      // Retry initialization after 10 seconds
      setTimeout(() => {
        this.init().catch(err => console.error('Content Scheduler Service retry failed:', err.message));
      }, 10000);
    }
  }

  async loadScheduledContent() {
    try {
      // Check if mongoose is connected
      if (!require('mongoose').connection.readyState) {
        throw new Error('Database not connected');
      }

      const scheduledContent = await ScheduledContent.find({
        isActive: true,
        $or: [
          { 'schedule.type': 'fixed' },
          { 'schedule.type': 'recurring' },
          { 'schedule.type': 'always' }
        ]
      });

      for (const content of scheduledContent) {
        this.createCronJob(content);
      }

      console.log(`Loaded ${scheduledContent.length} active scheduled content items`);
    } catch (error) {
      console.error('Error loading scheduled content:', error.message);
      throw error;
    }
  }

  createCronJob(content) {
    try {
      // For now, we'll create a job that runs every minute to check if content should be executed
      // This is a simple implementation - could be optimized with proper cron patterns
      const cronPattern = '* * * * *'; // Every minute

      if (this.jobs.has(content._id.toString())) {
        const existing = this.jobs.get(content._id.toString());
        try { if (existing && typeof existing.stop === 'function') existing.stop(); } catch { }
        try { if (existing && typeof existing.destroy === 'function') existing.destroy(); } catch { }
      }

      const job = cron.schedule(cronPattern, async () => {
        await this.checkAndExecuteContent(content);
      }, {
        scheduled: true,
        timezone: 'Asia/Kolkata'
      });

      this.jobs.set(content._id.toString(), job);
      console.log(`Created cron job for scheduled content: ${content.title}`);
    } catch (error) {
      console.error(`Error creating cron job for content ${content.title}:`, error);
    }
  }

  async checkAndExecuteContent(content) {
    try {
      // Refresh content from database
      const currentContent = await ScheduledContent.findById(content._id);
      if (!currentContent || !currentContent.isActive) {
        this.removeJob(content._id.toString());
        return;
      }

      const now = new Date();
      const shouldExecute = this.shouldExecuteContent(currentContent, now);

      if (shouldExecute) {
        console.log(`Executing scheduled content: ${currentContent.title}`);
        await this.executeScheduledContent(currentContent);

        // Update last played time
        await ScheduledContent.findByIdAndUpdate(currentContent._id, {
          lastPlayed: now
        });
      }
    } catch (error) {
      console.error(`Error checking/executing scheduled content ${content.title}:`, error);
    }
  }

  shouldExecuteContent(content, now) {
    const schedule = content.schedule;

    // For 'always' type, execute every time the cron runs (every minute)
    if (schedule.type === 'always') {
      return true;
    }

    // For 'fixed' and 'recurring' types, check time-based conditions
    if (schedule.type === 'fixed' || schedule.type === 'recurring') {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Check if current time matches schedule
      const scheduleHour = parseInt(schedule.startTime.split(':')[0]);
      const scheduleMinute = parseInt(schedule.startTime.split(':')[1]);

      if (currentHour !== scheduleHour || currentMinute !== scheduleMinute) {
        return false;
      }

      // For recurring schedules, check days of week
      if (schedule.type === 'recurring' && schedule.daysOfWeek) {
        return schedule.daysOfWeek.includes(currentDay);
      }

      // For fixed schedules, execute once at the specified time
      if (schedule.type === 'fixed') {
        // Check if we haven't played it today
        if (content.lastPlayed) {
          const lastPlayedDate = new Date(content.lastPlayed);
          const today = new Date(now);
          today.setHours(0, 0, 0, 0);
          lastPlayedDate.setHours(0, 0, 0, 0);
          return lastPlayedDate < today;
        }
        return true;
      }
    }

    return false;
  }

  async executeScheduledContent(content) {
    try {
      // For now, we'll just log the execution and emit a socket event
      // In a full implementation, this would send commands to ESP32 devices
      // based on the content's assigned boards and actions

      console.log(`[CONTENT-SCHEDULER] Executing content: ${content.title}`);

      // Log activity
      await ActivityLog.create({
        action: 'content_scheduled',
        triggeredBy: 'content_scheduler',
        details: `Scheduled content "${content.title}" executed`,
        metadata: {
          contentId: content._id.toString(),
          contentTitle: content.title,
          scheduleType: content.schedule.type
        }
      });

      // Emit real-time notification
      if (global.io) {
        global.io.emit('scheduled_content_executed', {
          contentId: content._id.toString(),
          title: content.title,
          executedAt: new Date(),
          schedule: content.schedule
        });
      }

      // TODO: Implement actual ESP32 command sending based on content type and assigned boards
      // This would involve:
      // 1. Determining which devices/boards to control
      // 2. Sending appropriate MQTT commands to ESP32 devices
      // 3. Handling different content types (images, videos, etc.)

    } catch (error) {
      console.error('Error executing scheduled content:', error);
    }
  }

  removeJob(contentId) {
    const job = this.jobs.get(contentId);
    if (job) {
      try { if (typeof job.stop === 'function') job.stop(); } catch { }
      try { if (typeof job.destroy === 'function') job.destroy(); } catch { }
      this.jobs.delete(contentId);
    }
  }

  // Method to manually trigger content execution (for testing)
  async triggerContentExecution(contentId) {
    try {
      const content = await ScheduledContent.findById(contentId);
      if (content) {
        await this.executeScheduledContent(content);
        return { success: true, message: 'Content execution triggered' };
      } else {
        return { success: false, message: 'Content not found' };
      }
    } catch (error) {
      console.error('Error triggering content execution:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = new ContentSchedulerService();