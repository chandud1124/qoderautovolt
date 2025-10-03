const { MongoClient } = require('mongodb');

async function analyzeSystem() {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    console.log('=== SYSTEM ANALYSIS ===\n');

    const db = client.db('autovolt');

    // Check Scheduled Content
    const scheduledContent = db.collection('scheduledcontents');
    const contentCount = await scheduledContent.countDocuments();
    const activeContent = await scheduledContent.countDocuments({ isActive: true });
    
    console.log('1. SCHEDULED CONTENT (New System):');
    console.log(`   Total: ${contentCount}`);
    console.log(`   Active: ${activeContent}`);
    
    if (contentCount > 0) {
      const items = await scheduledContent.find({}).toArray();
      items.forEach((item, i) => {
        console.log(`   ${i + 1}. "${item.title}" - ${item.isActive ? 'ACTIVE' : 'INACTIVE'}`);
        console.log(`      Boards: ${item.assignedBoards.length}`);
        console.log(`      Attachments: ${item.attachments ? item.attachments.length : 0}`);
      });
    }

    // Check Notices (Old System)
    const notices = db.collection('notices');
    const noticeCount = await notices.countDocuments();
    const publishedNotices = await notices.countDocuments({ status: 'published' });
    
    console.log('\n2. NOTICES (Old System):');
    console.log(`   Total: ${noticeCount}`);
    console.log(`   Published: ${publishedNotices}`);
    
    if (noticeCount > 0) {
      const noticeItems = await notices.find({}).toArray();
      noticeItems.forEach((notice, i) => {
        console.log(`   ${i + 1}. "${notice.title}" - ${notice.status}`);
        console.log(`      Target Boards: ${notice.targetBoards ? notice.targetBoards.length : 0}`);
      });
    }

    // Check Boards
    const boards = db.collection('boards');
    const boardCount = await boards.countDocuments();
    
    console.log('\n3. BOARDS:');
    console.log(`   Total: ${boardCount}`);
    
    const boardItems = await boards.find({}).toArray();
    boardItems.forEach((board, i) => {
      console.log(`   ${i + 1}. "${board.name}" - ${board.location}`);
      console.log(`      ID: ${board._id}`);
      console.log(`      Status: ${board.status}, Online: ${board.isOnline}`);
    });

    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`✓ Scheduled Content System: ${contentCount} items (${activeContent} active)`);
    console.log(`✓ Old Notice System: ${noticeCount} items (${publishedNotices} published)`);
    console.log(`✓ Boards: ${boardCount}`);
    
    console.log('\n=== RECOMMENDATIONS ===');
    if (noticeCount > 0) {
      console.log('⚠ Old notice system still has data - consider migrating or cleaning up');
    }
    if (activeContent === 0) {
      console.log('⚠ No active scheduled content - Raspberry Pi will show "No Content"');
    }
    if (activeContent > 0) {
      console.log('✓ Active content available for Raspberry Pi display');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

analyzeSystem();