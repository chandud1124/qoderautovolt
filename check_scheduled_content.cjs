const { MongoClient } = require('mongodb');

async function checkScheduledContent() {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('autovolt');

    // Check scheduled content in detail
    const scheduledContent = db.collection('scheduledcontents');
    const allScheduled = await scheduledContent.find({}).toArray();

    console.log(`\n=== ALL SCHEDULED CONTENT (${allScheduled.length} items) ===`);
    allScheduled.forEach((content, index) => {
      console.log(`${index + 1}. ID: ${content._id}`);
      console.log(`   Title: ${content.title || 'No title'}`);
      console.log(`   Content: ${content.content || 'No content'}`);
      console.log(`   Assigned Boards: ${JSON.stringify(content.assignedBoards || [])}`);
      console.log(`   Schedule: ${JSON.stringify(content.schedule || {})}`);
      console.log(`   Is Active: ${content.isActive}`);
      console.log(`   Priority: ${content.priority}`);
      console.log(`   Created: ${content.createdAt}`);
      console.log('   ---');
    });

    // Check boards
    const boards = db.collection('boards');
    const allBoards = await boards.find({}).toArray();

    console.log(`\n=== ALL BOARDS (${allBoards.length} items) ===`);
    allBoards.forEach((board, index) => {
      console.log(`${index + 1}. ID: ${board._id}`);
      console.log(`   Name: ${board.name}`);
      console.log(`   MAC: ${board.macAddress}`);
      console.log(`   Status: ${board.status}`);
      console.log('   ---');
    });

  } catch (error) {
    console.error('Database connection error:', error.message);
  } finally {
    await client.close();
  }
}

checkScheduledContent();