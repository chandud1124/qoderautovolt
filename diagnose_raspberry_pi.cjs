const axios = require('axios');

async function diagnoseRaspberryPiIssue() {
  console.log('=== RASPBERRY PI CONTENT DIAGNOSTIC ===\n');
  
  const boardId = '68db7ae19949ee755662473a';
  
  try {
    // Test the API
    console.log('1. Testing Server API...');
    console.log(`   URL: http://localhost:3001/api/boards/${boardId}/content\n`);
    
    const response = await axios.get(`http://localhost:3001/api/boards/${boardId}/content`);
    
    if (response.data.success) {
      const content = response.data.content;
      
      console.log('✅ API Response Structure:');
      console.log('   - success:', response.data.success);
      console.log('   - content.scheduledContent:', content.scheduledContent?.length || 0, 'items');
      console.log('   - content.boardNotices:', content.boardNotices?.length || 0, 'items');
      console.log('   - content.groupContent:', content.groupContent?.length || 0, 'items');
      console.log('   - content.board:', content.board ? 'present' : 'missing');
      console.log('');
      
      // Check scheduledContent details
      if (content.scheduledContent && content.scheduledContent.length > 0) {
        console.log('✅ Scheduled Content Details:\n');
        content.scheduledContent.forEach((item, i) => {
          console.log(`   ${i + 1}. ${item.title}`);
          console.log(`      _id: ${item._id}`);
          console.log(`      isActive: ${item.isActive}`);
          console.log(`      type: ${item.type}`);
          console.log(`      contentType: ${item.contentType || 'not set'}`);
          console.log(`      priority: ${item.priority}`);
          console.log(`      content: "${item.content?.substring(0, 50)}${item.content?.length > 50 ? '...' : ''}"`);
          console.log(`      attachments: ${item.attachments?.length || 0} files`);
          console.log(`      schedule.type: ${item.schedule?.type}`);
          console.log(`      schedule.startDate: ${item.schedule?.startDate || 'not set'}`);
          console.log(`      schedule.endDate: ${item.schedule?.endDate || 'not set'}`);
          console.log(`      schedule.startTime: ${item.schedule?.startTime}`);
          console.log(`      schedule.endTime: ${item.schedule?.endTime}`);
          console.log(`      schedule.daysOfWeek: ${item.schedule?.daysOfWeek}`);
          console.log(`      duration: ${item.duration || item.schedule?.duration || 'not set'}`);
          console.log('');
        });
      } else {
        console.log('⚠️  scheduledContent array is EMPTY!\n');
      }
      
      console.log('2. Checking what Raspberry Pi expects:\n');
      console.log('   The Raspberry Pi display_client.py looks for:');
      console.log('   - content_data.get("scheduledContent", [])');
      console.log('   - content_data.get("boardNotices", [])');
      console.log('   - content_data.get("groupContent", [])');
      console.log('');
      console.log('   Each item should have:');
      console.log('   - _id (required)');
      console.log('   - title');
      console.log('   - content');
      console.log('   - contentType or type');
      console.log('   - priority (number)');
      console.log('   - schedule.type');
      console.log('   - schedule.startDate (optional)');
      console.log('   - schedule.endDate (optional)');
      console.log('   - duration or schedule.duration');
      console.log('   - attachments array');
      console.log('');
      
      console.log('3. Raspberry Pi Storage Logic:\n');
      console.log('   The Pi stores content in SQLite with:');
      console.log('   - is_active = 1 (by default)');
      console.log('   - schedule filtering based on startDate/endDate');
      console.log('');
      console.log('   ⚠️  POTENTIAL ISSUE FOUND:');
      console.log('   The INSERT OR REPLACE statement doesn\'t explicitly set is_active');
      console.log('   This might cause content to have is_active = NULL or 0');
      console.log('');
      
      console.log('4. Recommended Raspberry Pi Commands:\n');
      console.log('   SSH to Raspberry Pi and run:');
      console.log('   ');
      console.log('   # Check if service is running');
      console.log('   sudo systemctl status display-client');
      console.log('');
      console.log('   # View logs');
      console.log('   sudo journalctl -u display-client -n 50');
      console.log('');
      console.log('   # Check database');
      console.log('   sudo sqlite3 /var/lib/raspberry-display/content.db');
      console.log('   SELECT id, title, is_active, schedule_start, schedule_end FROM content;');
      console.log('   .quit');
      console.log('');
      console.log('   # Fix is_active issue');
      console.log('   sudo sqlite3 /var/lib/raspberry-display/content.db');
      console.log('   UPDATE content SET is_active = 1;');
      console.log('   SELECT id, title, is_active FROM content;');
      console.log('   .quit');
      console.log('');
      console.log('   # Restart service');
      console.log('   sudo systemctl restart display-client');
      console.log('');
      
      console.log('5. Alternative Quick Fix:\n');
      console.log('   If updating the database doesn\'t work:');
      console.log('   ');
      console.log('   # Clear the database completely');
      console.log('   sudo rm /var/lib/raspberry-display/content.db');
      console.log('   ');
      console.log('   # Restart service (will recreate DB and fetch content)');
      console.log('   sudo systemctl restart display-client');
      console.log('');
      
    } else {
      console.log('❌ API returned error:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

diagnoseRaspberryPiIssue();