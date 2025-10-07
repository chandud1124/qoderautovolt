const OfflineService = require('./offlineService');
const cron = require('node-cron');

class OfflineCleanupService {
  constructor() {
    this.isRunning = false;
  }

  // Start the cleanup service with cron scheduling
  startCleanupSchedule() {
    // Run cleanup every hour
    cron.schedule('0 * * * *', async () => {
      await this.runCleanup();
    });

    console.log('Offline cleanup service started - runs every hour');
  }

  // Run manual cleanup
  async runCleanup() {
    if (this.isRunning) {
      console.log('Cleanup already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('Starting offline content cleanup...');

    try {
      // Get all boards with offline enabled
      const Board = require('../models/Board');
      const boards = await Board.find({ 'offlineSettings.enabled': true });

      let totalCleaned = 0;

      for (const board of boards) {
        try {
          const result = await OfflineService.cleanupExpiredContent(board._id);
          totalCleaned += result.cleanedCount;

          if (result.cleanedCount > 0) {
            console.log(`Cleaned ${result.cleanedCount} expired items from board ${board.name}`);
          }
        } catch (boardError) {
          console.error(`Error cleaning board ${board._id}:`, boardError);
        }
      }

      console.log(`Cleanup completed. Total items cleaned: ${totalCleaned}`);

    } catch (error) {
      console.error('Error during cleanup:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Run storage management for all boards
  async runStorageManagement() {
    if (this.isRunning) {
      console.log('Storage management already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('Starting storage management...');

    try {
      const Board = require('../models/Board');
      const boards = await Board.find({ 'offlineSettings.enabled': true });

      for (const board of boards) {
        try {
          const result = await OfflineService.manageStorageSpace(board._id);
          if (result.message !== 'Storage usage is within limits') {
            console.log(`Storage management for board ${board.name}: ${result.message}`);
          }
        } catch (boardError) {
          console.error(`Error managing storage for board ${board._id}:`, boardError);
        }
      }

      console.log('Storage management completed.');

    } catch (error) {
      console.error('Error during storage management:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Get cleanup statistics
  async getCleanupStats() {
    try {
      const OfflineContent = require('../models/OfflineContent');

      const expiredStats = await OfflineContent.aggregate([
        {
          $match: {
            $or: [
              { isExpired: true },
              { expiresAt: { $lt: new Date() } }
            ]
          }
        },
        {
          $group: {
            _id: null,
            totalExpired: { $sum: 1 },
            totalExpiredSize: { $sum: '$fileSize' }
          }
        }
      ]);

      const storageStats = await OfflineContent.aggregate([
        {
          $group: {
            _id: '$boardId',
            totalSize: { $sum: '$fileSize' },
            itemCount: { $sum: 1 }
          }
        }
      ]);

      return {
        expiredContent: expiredStats[0] || { totalExpired: 0, totalExpiredSize: 0 },
        storageByBoard: storageStats,
        lastCleanup: new Date()
      };

    } catch (error) {
      console.error('Error getting cleanup stats:', error);
      throw error;
    }
  }

  // Force cleanup for a specific board
  async forceCleanup(boardId) {
    try {
      console.log(`Forcing cleanup for board ${boardId}...`);

      const cleanupResult = await OfflineService.cleanupExpiredContent(boardId);
      const storageResult = await OfflineService.manageStorageSpace(boardId);

      return {
        cleanup: cleanupResult,
        storage: storageResult
      };

    } catch (error) {
      console.error(`Error forcing cleanup for board ${boardId}:`, error);
      throw error;
    }
  }
}

module.exports = new OfflineCleanupService();