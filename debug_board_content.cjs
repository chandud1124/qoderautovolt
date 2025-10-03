const { MongoClient, ObjectId } = require('mongodb');

async function debugBoardContent() {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    const db = client.db('autovolt');
    
    const boardId = '68db7ae19949ee755662473a';
    console.log('=== DEBUGGING BOARD CONTENT ===\n');
    console.log('Board ID:', boardId);
    console.log('Board ID type:', typeof boardId);
    console.log('Board ID as ObjectId:', new ObjectId(boardId));
    
    // Check scheduled content
    const scheduledContent = db.collection('scheduledcontents');
    
    console.log('\n1. ALL SCHEDULED CONTENT:');
    const allContent = await scheduledContent.find({}).toArray();
    allContent.forEach((item, i) => {
      console.log(`\n${i+1}. "${item.title}"`);
      console.log(`   _id: ${item._id}`);
      console.log(`   isActive: ${item.isActive}`);
      console.log(`   assignedBoards (${item.assignedBoards.length}):`);
      item.assignedBoards.forEach((board, j) => {
        console.log(`     ${j+1}. ${board} (type: ${typeof board})`);
        console.log(`        Equals boardId: ${board == boardId}`);
        console.log(`        Strict equals: ${board === boardId}`);
      });
    });
    
    // Try different queries
    console.log('\n2. QUERY TEST - String match:');
    const stringMatch = await scheduledContent.find({
      assignedBoards: boardId,
      isActive: true
    }).toArray();
    console.log(`   Found: ${stringMatch.length} items`);
    
    console.log('\n3. QUERY TEST - ObjectId match:');
    const objectIdMatch = await scheduledContent.find({
      assignedBoards: new ObjectId(boardId),
      isActive: true
    }).toArray();
    console.log(`   Found: ${objectIdMatch.length} items`);
    
    console.log('\n4. QUERY TEST - $in with string:');
    const inMatch = await scheduledContent.find({
      assignedBoards: { $in: [boardId] },
      isActive: true
    }).toArray();
    console.log(`   Found: ${inMatch.length} items`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

debugBoardContent();