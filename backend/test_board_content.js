const axios = require('axios');

async function testBoardContent() {
  try {
    console.log('Testing board content endpoint...');
    const response = await axios.get('http://localhost:3001/api/boards/68db7ae19949ee755662473a/content');
    console.log('Board content response:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error details:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testBoardContent();