const axios = require('axios');
const FormData = require('form-data');

async function testNoticeSubmission() {
  const form = new FormData();
  form.append('title', 'Test Notice from Script');
  form.append('content', 'This is a test notice to verify the validation fix works');
  form.append('priority', 'medium');
  form.append('category', 'general');
  form.append('selectedBoards', JSON.stringify(['68db7ae19949ee755662473a'])); // Raspberry Pi board ID

  console.log('Sending request to: http://localhost:3001/api/notices/submit');
  console.log('Form data:', {
    title: 'Test Notice from Script',
    content: 'This is a test notice to verify the validation fix works',
    priority: 'medium',
    category: 'general',
    selectedBoards: ['68db7ae19949ee755662473a']
  });

  try {
    const response = await axios.post('http://localhost:3001/api/notices/submit', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZGE0MTg5YmQyNDJmYjk0NGMyYTJmOCIsImlhdCI6MTc1OTIxMjYyNywiZXhwIjoxNzU5ODE3NDI3fQ.-pB9gVjsRNL1wHhFTFfkUDta8e1mWrrse5AD5_dseC0'
      }
    });
    console.log('✅ Notice submission successful!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Notice submission failed!');
    console.log('Error details:');
    console.log('- Status:', error.response?.status);
    console.log('- Status Text:', error.response?.statusText);
    console.log('- Data:', error.response?.data);
    console.log('- Message:', error.message);
    console.log('- Code:', error.code);
  }
}

testNoticeSubmission();