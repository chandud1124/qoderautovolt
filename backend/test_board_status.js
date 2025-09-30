const axios = require('axios');

async function testBoardStatusUpdate() {
  try {
    console.log('Testing board status update endpoint...');
    const response = await axios.patch('http://localhost:3001/api/boards/68db7ae19949ee755662473a/status', {
      status: 'active',
      lastSeen: new Date().toISOString(),
      isOnline: true
    });
    console.log('Status update response:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error details:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received');
    } else {
      console.error('Error:', error.message);
    }
  }
}

testBoardStatusUpdate();