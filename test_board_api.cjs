const axios = require('axios');

async function testBoardContent() {
  try {
    const response = await axios.get('http://localhost:3001/api/boards/68db7ae19949ee755662473a/content');
    console.log('=== BOARD CONTENT API RESPONSE ===\n');
    console.log('Success:', response.data.success);
    console.log('Scheduled Content:', response.data.content.scheduledContent.length, 'items');
    console.log('Board Notices (old):', response.data.content.boardNotices.length, 'items');
    console.log('\nScheduled Content Details:');
    response.data.content.scheduledContent.forEach((item, i) => {
      console.log(`${i+1}. ${item.title}`);
      console.log(`   Active: ${item.isActive}`);
      console.log(`   Priority: ${item.priority}`);
      console.log(`   Attachments: ${item.attachments ? item.attachments.length : 0}`);
      if (item.attachments && item.attachments.length > 0) {
        item.attachments.forEach(att => {
          console.log(`     - ${att.originalName} (${att.type})`);
          console.log(`       URL: ${att.url}`);
        });
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testBoardContent();