const { MongoClient, ObjectId } = require('mongodb');

async function testQueryFormats() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('autovolt');
    const collection = db.collection('scheduledcontents');
    
    const boardId = '68db7ae19949ee755662473a';
    
    console.log('=== TESTING QUERY FORMATS WITH NATIVE DRIVER ===\n');
    
    // Test 1: String query
    console.log('Test 1: Query with string');
    const result1 = await collection.find({
      assignedBoards: boardId,
      isActive: true
    }).toArray();
    console.log(`   Found: ${result1.length} items`);
    
    // Test 2: ObjectId query
    console.log('\nTest 2: Query with ObjectId');
    const result2 = await collection.find({
      assignedBoards: new ObjectId(boardId),
      isActive: true
    }).toArray();
    console.log(`   Found: ${result2.length} items`);
    
    // Test 3: $in with string array
    console.log('\nTest 3: Query with $in and string');
    const result3 = await collection.find({
      assignedBoards: { $in: [boardId] },
      isActive: true
    }).toArray();
    console.log(`   Found: ${result3.length} items`);
    
    // Test 4: Exact array match
    console.log('\nTest 4: Query with exact array match');
    const result4 = await collection.find({
      assignedBoards: [boardId],
      isActive: true
    }).toArray();
    console.log(`   Found: ${result4.length} items`);
    
    // Test 5: Check all active content
    console.log('\nTest 5: All active content');
    const all = await collection.find({ isActive: true }).toArray();
    console.log(`   Total: ${all.length} items`);
    all.forEach(item => {
      console.log(`   - ${item.title}`);
      console.log(`     assignedBoards: ${JSON.stringify(item.assignedBoards)}`);
      console.log(`     assignedBoards type: ${Array.isArray(item.assignedBoards) ? 'array' : typeof item.assignedBoards}`);
      if (Array.isArray(item.assignedBoards) && item.assignedBoards.length > 0) {
        console.log(`     first element type: ${typeof item.assignedBoards[0]}`);
      }
    });
    
  } finally {
    await client.close();
  }
}

testQueryFormats();