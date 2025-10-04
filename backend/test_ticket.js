const http = require('http');

function testHealth() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/health',
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

async function testTicketCreation() {
  try {
    console.log('Testing health endpoint...');
    const health = await testHealth();
    console.log('Health check passed:', health);

    console.log('Testing ticket creation...');
    const response = await new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        title: 'Test Ticket',
        description: 'Testing ticket creation',
        category: 'technical_issue',
        priority: 'high',
        department: 'IT'
      });

      const req = http.request({
        hostname: 'localhost',
        port: 3001,
        path: '/api/tickets',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({ status: res.statusCode, data: json });
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      req.write(postData);
      req.end();
    });

    console.log('Ticket creation response:', response);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testTicketCreation();