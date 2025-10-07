const mongoose = require('mongoose');
const OfflineService = require('./services/offlineService');
const offlineCleanupService = require('./services/offlineCleanupService');
const Board = require('./models/Board');
const Notice = require('./models/Notice');
require('dotenv').config();

async function testOfflineOperations() {
  try {
    console.log('Testing Offline Operations...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_class');
    console.log('✓ Connected to database');

    // Get test board and notice
    const testBoard = await Board.findOne({ offlineSettings: { $exists: true } });
    const testNotice = await Notice.findOne({ status: 'published' });

    if (!testBoard) {
      console.log('❌ No board with offline settings found. Please create one first.');
      return;
    }

    if (!testNotice) {
      console.log('❌ No published notice found. Please publish a notice first.');
      return;
    }

    console.log(`Using board: ${testBoard.name} (${testBoard._id})`);
    console.log(`Using notice: ${testNotice.title} (${testNotice._id})\n`);

    // Test 1: Initialize board offline
    console.log('1. Testing board offline initialization...');
    const initResult = await OfflineService.initializeBoardOffline(testBoard._id);
    console.log('✓ Initialization result:', initResult);

    // Test 2: Queue content for offline
    console.log('\n2. Testing content queuing for offline...');
    const queueResult = await OfflineService.queueContentForOffline(testBoard._id, testNotice._id, 1);
    console.log('✓ Queue result:', queueResult);

    // Test 3: Get offline status
    console.log('\n3. Testing offline status retrieval...');
    const statusResult = await OfflineService.getOfflineStatus(testBoard._id);
    console.log('✓ Status result:', JSON.stringify(statusResult, null, 2));

    // Test 4: Download content
    console.log('\n4. Testing content download...');
    const downloadResult = await OfflineService.downloadContent(testBoard._id, testNotice._id);
    console.log('✓ Download result:', downloadResult);

    // Test 5: Sync with board
    console.log('\n5. Testing board sync...');
    const syncResult = await OfflineService.syncWithBoard(testBoard._id);
    console.log('✓ Sync result:', syncResult);

    // Test 6: Cleanup expired content
    console.log('\n6. Testing expired content cleanup...');
    const cleanupResult = await offlineCleanupService.runCleanup();
    console.log('✓ Cleanup completed');

    // Test 7: Get cleanup stats
    console.log('\n7. Testing cleanup statistics...');
    const statsResult = await offlineCleanupService.getCleanupStats();
    console.log('✓ Cleanup stats:', JSON.stringify(statsResult, null, 2));

    // Test 8: Handle board offline/online
    console.log('\n8. Testing board offline/online handling...');
    const offlineResult = await OfflineService.handleBoardOffline(testBoard._id);
    console.log('✓ Board offline result:', offlineResult);

    const onlineResult = await OfflineService.handleBoardOnline(testBoard._id);
    console.log('✓ Board online result:', onlineResult);

    console.log('\n🎉 All offline operations tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

// Run tests if called directly
if (require.main === module) {
  testOfflineOperations();
}

module.exports = { testOfflineOperations };