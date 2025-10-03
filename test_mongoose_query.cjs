const mongoose = require('mongoose');
const ScheduledContent = require('./backend/models/ScheduledContent');

async function testQuery() {
  try {
    await mongoose.connect('mongodb://localhost:27017/autovolt');
    
    const boardId = '68db7ae19949ee755662473a';
    
    console.log('=== TESTING DIFFERENT QUERY FORMATS ===\n');
    
    // Test 1: String query
    console.log('Test 1: Query with string');
    const result1 = await ScheduledContent.find({
      assignedBoards: boardId,
      isActive: true
    });
    console.log(`   Found: ${result1.length} items`);
    
    // Test 2: ObjectId query
    console.log('\nTest 2: Query with ObjectId');
    const result2 = await ScheduledContent.find({
      assignedBoards: new mongoose.Types.ObjectId(boardId),
      isActive: true
    });
    console.log(`   Found: ${result2.length} items`);
    
    // Test 3: $in with string
    console.log('\nTest 3: Query with $in and string');
    const result3 = await ScheduledContent.find({
      assignedBoards: { $in: [boardId] },
      isActive: true
    });
    console.log(`   Found: ${result3.length} items`);
    
    // Test 4: All active content
    console.log('\nTest 4: All active content (no board filter)');
    const result4 = await ScheduledContent.find({ isActive: true });
    console.log(`   Found: ${result4.length} items`);
    if (result4.length > 0) {
      result4.forEach(item => {
        console.log(`   - ${item.title}: boards = ${JSON.stringify(item.assignedBoards)}`);
      });
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
  }
}

testQuery();