const axios = require('axios');

async function checkContentForRaspberryPi() {
  try {
    const boardId = '68db7ae19949ee755662473a'; // berry board
    console.log('=== RASPBERRY PI CONTENT CHECK ===\n');
    console.log(`Testing API: http://localhost:3001/api/boards/${boardId}/content\n`);
    
    const response = await axios.get(`http://localhost:3001/api/boards/${boardId}/content`);
    
    console.log('✅ API Response Successful!\n');
    console.log('Response Status:', response.status);
    console.log('Success:', response.data.success);
    
    const scheduledContent = response.data.content?.scheduledContent || [];
    console.log('\n📊 CONTENT SUMMARY:');
    console.log('═══════════════════════════════════');
    console.log(`Total Content Items: ${scheduledContent.length}`);
    
    if (scheduledContent.length > 0) {
      console.log('\n📝 CONTENT DETAILS:\n');
      scheduledContent.forEach((item, index) => {
        console.log(`${index + 1}. "${item.title}"`);
        console.log(`   ID: ${item._id}`);
        console.log(`   Type: ${item.type}`);
        console.log(`   Priority: ${item.priority}`);
        console.log(`   Active: ${item.isActive}`);
        console.log(`   Schedule: ${item.schedule?.type} (${item.schedule?.startTime} - ${item.schedule?.endTime})`);
        console.log(`   Days: ${item.schedule?.daysOfWeek?.join(', ')}`);
        console.log(`   Content: ${item.content?.substring(0, 100)}${item.content?.length > 100 ? '...' : ''}`);
        console.log(`   Attachments: ${item.attachments?.length || 0} file(s)`);
        if (item.attachments?.length > 0) {
          item.attachments.forEach((att, i) => {
            console.log(`      ${i + 1}. ${att.type}: ${att.filename}`);
          });
        }
        console.log('');
      });
      
      console.log('✅ STATUS: Content is ready for Raspberry Pi!');
      console.log('\n🔄 RASPBERRY PI WILL:');
      console.log('   - Poll this API every 30 seconds');
      console.log('   - Receive these content items');
      console.log('   - Display them on the screen');
      console.log('\n💡 TIP: If Raspberry Pi is not showing content:');
      console.log('   1. Check Raspberry Pi is powered on');
      console.log('   2. Verify network connection');
      console.log('   3. Check display_client service: sudo systemctl status display-client');
      console.log('   4. View logs: sudo journalctl -u display-client -f');
      
    } else {
      console.log('\n⚠️  WARNING: API returned 0 content items!');
      console.log('   This means the content is being filtered out.');
      console.log('\n🔍 TROUBLESHOOTING:');
      console.log('   1. Check if content is assigned to correct board ID');
      console.log('   2. Verify schedule settings (time/days)');
      console.log('   3. Check if content is active (isActive: true)');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Backend server is not running!');
      console.error('   Start it with: cd backend && npm start');
    }
  }
}

checkContentForRaspberryPi();