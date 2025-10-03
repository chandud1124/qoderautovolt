const axios = require('axios');

async function debugScheduleFilter() {
  try {
    const boardId = '68db7ae19949ee755662473a';
    const response = await axios.get(`http://localhost:3001/api/boards/${boardId}/content`);
    
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);
    
    console.log('=== SCHEDULE FILTER DEBUG ===\n');
    console.log('Current Time:', now.toLocaleString());
    console.log('Current Day:', currentDay, ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][currentDay]);
    console.log('Current Time (HH:MM):', currentTime);
    
    console.log('\nAPI Response:');
    console.log('Success:', response.data.success);
    console.log('Scheduled Content Count:', response.data.content.scheduledContent.length);
    
    if (response.data.content.scheduledContent.length > 0) {
      response.data.content.scheduledContent.forEach((item, i) => {
        console.log(`\n${i+1}. ${item.title}`);
        console.log(`   Schedule Type: ${item.schedule.type}`);
        console.log(`   Days: ${item.schedule.daysOfWeek}`);
        console.log(`   Time: ${item.schedule.startTime} - ${item.schedule.endTime}`);
      });
    } else {
      console.log('\n⚠ NO CONTENT RETURNED!');
      console.log('This means the content was filtered out by schedule logic.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

debugScheduleFilter();