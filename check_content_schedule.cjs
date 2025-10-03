const mongoose = require('mongoose');
const ScheduledContent = require('./backend/models/ScheduledContent');

async function checkSchedule() {
  try {
    await mongoose.connect('mongodb://localhost:27017/autovolt');
    
    const content = await ScheduledContent.find({ isActive: true });
    
    console.log('=== CONTENT SCHEDULE DETAILS ===\n');
    
    content.forEach((item, i) => {
      console.log(`${i+1}. Title: ${item.title}`);
      console.log(`   Assigned Boards: ${JSON.stringify(item.assignedBoards)}`);
      console.log(`   Is Active: ${item.isActive}`);
      console.log(`   Schedule Type: ${item.schedule.type}`);
      console.log(`   Days of Week: ${JSON.stringify(item.schedule.daysOfWeek)}`);
      console.log(`   Start Time: ${item.schedule.startTime}`);
      console.log(`   End Time: ${item.schedule.endTime}`);
      console.log(`   Visibility: Start ${item.visibility.startDate}, End ${item.visibility.endDate}`);
      console.log('');
    });
    
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.toTimeString().slice(0, 5);
    
    console.log('Current Status:');
    console.log(`   Today is: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDay]} (${currentDay})`);
    console.log(`   Current Time: ${currentTime}`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
  }
}

checkSchedule();