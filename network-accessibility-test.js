#!/usr/bin/env node

// Network Accessibility Test for AutoVolt Web Application
// Tests if the application is accessible from other devices on the same network

import http from 'http';
import os from 'os';

console.log('🌐 NETWORK ACCESSIBILITY TEST');
console.log('=============================\n');

// Get network interfaces
const interfaces = os.networkInterfaces();
const networkIPs = [];

console.log('📋 Your Network Interfaces:');
Object.keys(interfaces).forEach((interfaceName) => {
  const addresses = interfaces[interfaceName];
  addresses.forEach((address) => {
    if (address.family === 'IPv4' && !address.internal) {
      networkIPs.push(address.address);
      console.log(`  ${interfaceName}: ${address.address}`);
    }
  });
});

if (networkIPs.length === 0) {
  console.log('❌ No network interfaces found!');
  process.exit(1);
}

console.log('\n🔍 Testing Application Accessibility...\n');

// Test URLs to check
const testUrls = [
  { name: 'Frontend (Vite)', url: 'http://172.16.3.171:5174', port: 5174 },
  { name: 'Backend API', url: 'http://172.16.3.171:3001/api/health', port: 3001 },
  { name: 'Backend Health', url: 'http://172.16.3.171:3001/health', port: 3001 },
];

// Test each URL
const testPromises = testUrls.map((test) => {
  return new Promise((resolve) => {
    const url = new URL(test.url);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          name: test.name,
          url: test.url,
          status: res.statusCode,
          accessible: res.statusCode < 400,
          data: data.length > 100 ? data.substring(0, 100) + '...' : data
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        name: test.name,
        url: test.url,
        status: null,
        accessible: false,
        error: err.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: test.name,
        url: test.url,
        status: null,
        accessible: false,
        error: 'Timeout'
      });
    });

    req.end();
  });
});

Promise.all(testPromises).then((results) => {
  console.log('📊 Test Results:');
  console.log('================');

  let allAccessible = true;
  results.forEach((result) => {
    const status = result.accessible ? '✅ ACCESSIBLE' : '❌ NOT ACCESSIBLE';
    console.log(`${status} - ${result.name}`);
    console.log(`   URL: ${result.url}`);
    if (result.status) {
      console.log(`   Status: ${result.status}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.data && result.accessible) {
      console.log(`   Response: ${result.data}`);
    }
    console.log('');

    if (!result.accessible) allAccessible = false;
  });

  console.log('📱 MOBILE & NETWORK ACCESS INSTRUCTIONS:');
  console.log('==========================================');

  if (allAccessible) {
    console.log('✅ Your application is accessible from any device on the same WiFi network!');
    console.log('');
    console.log('📱 From Mobile/Phone:');
    networkIPs.forEach((ip) => {
      console.log(`   • Frontend: http://${ip}:5174`);
      console.log(`   • Backend:  http://${ip}:3001`);
    });
    console.log('');
    console.log('💻 From Another Computer:');
    console.log(`   • Frontend: http://172.16.3.171:5174`);
    console.log(`   • Backend:  http://172.16.3.171:3001`);
    console.log('');
    console.log('🔧 Make sure:');
    console.log('   • Firewall allows ports 3001 and 5174');
    console.log('   • Both devices are on the same WiFi network');
    console.log('   • No VPN is interfering with local network access');
  } else {
    console.log('❌ Some services are not accessible. Check:');
    console.log('   • Are both frontend and backend servers running?');
    console.log('   • Is the firewall blocking the ports?');
    console.log('   • Are you using the correct IP address?');
    console.log('   • Try running this test from another device on the network');
  }

  console.log('\n🔍 Network Troubleshooting:');
  console.log('===========================');
  console.log('If mobile access doesn\'t work:');
  console.log('1. Check if both devices are on the same WiFi network');
  console.log('2. Try using your computer\'s IP instead of 172.16.3.171');
  console.log('3. Disable any VPN or proxy settings on mobile');
  console.log('4. Check firewall settings on Windows');
  console.log('5. Try accessing from another computer first');

  process.exit(allAccessible ? 0 : 1);
});