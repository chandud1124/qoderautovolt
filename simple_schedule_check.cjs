const { MongoClient } = require('mongodb');

async function checkScheduleSettings() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('autovolt');
    
    const content = await db.collection('scheduledcontents').find({ isActive: true }).toArray();
    
    console.log('=== SCHEDULE SETTINGS ===\n');
    
    content.forEach((item, i) => {
      console.log(`${i+1}. ${item.title}`);
      console.log(`   Boards: ${JSON.stringify(item.assignedBoards)}`);
      console.log(`   Schedule Type: ${item.schedule?.type || 'NOT SET'}`);
      console.log(`   Days of Week: ${JSON.stringify(item.schedule?.daysOfWeek || [])}`);
      console.log(`   Start Time: ${item.schedule?.startTime || 'NOT SET'}`);
      console.log(`   End Time: ${item.schedule?.endTime || 'NOT SET'}`);
      console.log('');
    });
    
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);
    
    console.log('Current Time Info:');
    console.log(`   Day: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDay]} (${currentDay})`);
    console.log(`   Time: ${currentTime}`);
    
  } finally {
    await client.close();
  }
}

checkScheduleSettings();