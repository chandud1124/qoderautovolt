const { MongoClient } = require('mongodb');

async function checkContentStatus() {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('autovolt');

    // Check boards
    const boards = db.collection('boards');
    const boardsCount = await boards.countDocuments();
    console.log(`\n=== BOARDS ===`);
    console.log(`Total boards: ${boardsCount}`);

    if (boardsCount > 0) {
      const boardList = await boards.find({}).toArray();
      boardList.forEach((board, index) => {
        console.log(`${index + 1}. ${board.name} (${board.macAddress}) - Status: ${board.status}`);
      });
    }

    // Check scheduled content
    const scheduledContent = db.collection('scheduledcontents');
    const scheduledCount = await scheduledContent.countDocuments();
    console.log(`\n=== SCHEDULED CONTENT ===`);
    console.log(`Total scheduled content items: ${scheduledCount}`);

    if (scheduledCount > 0) {
      const contentList = await scheduledContent.find({}).sort({ createdAt: -1 }).limit(10).toArray();
      contentList.forEach((content, index) => {
        console.log(`${index + 1}. Board: ${content.boardId}, Content: ${content.content?.title || 'No title'}, Status: ${content.status}, Scheduled: ${content.scheduledTime ? new Date(content.scheduledTime).toLocaleString() : 'No schedule'}`);
      });
    }

    // Check notices (should be 0 now)
    const notices = db.collection('notices');
    const noticesCount = await notices.countDocuments();
    console.log(`\n=== NOTICES ===`);
    console.log(`Total notices: ${noticesCount}`);

  } catch (error) {
    console.error('Database connection error:', error.message);
  } finally {
    await client.close();
  }
}

checkContentStatus();