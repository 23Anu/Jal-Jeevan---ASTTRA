/**
 * Test script to simulate ESP32 HTTP POST requests to the Node.js / MongoDB API
 * Usage: node scripts/testEsp32Post.js
 */

const http = require('http');

const testPayloads = [
  {
    name: '1. Standard Safe Drinking Water Reading',
    data: {
      device_id: 'ESP32_001',
      ph: 7.24,
      tds: 195,
      turbidity: 0.28,
      temperature: 25.4
    }
  },
  {
    name: '2. High TDS Warning Reading',
    data: {
      device_id: 'ESP32_001',
      ph: 7.45,
      tds: 580,
      turbidity: 0.85,
      temperature: 26.1
    }
  },
  {
    name: '3. Critical Unsafe Turbidity & Acidic pH Reading',
    data: {
      device_id: 'ESP32_002',
      ph: 5.80,
      tds: 720,
      turbidity: 6.40,
      temperature: 27.8
    }
  }
];

function sendPostRequest(payload) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(payload.data);

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/water-data',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      }
    };

    console.log(`\n📤 [Test Sending] ${payload.name}...`);
    console.log('📄 Payload:', JSON.stringify(payload.data));

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`📥 [Response ${res.statusCode}]:`, body);
        resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
      });
    });

    req.on('error', (err) => {
      console.error('❌ Request error:', err.message);
      reject(err);
    });

    req.write(dataString);
    req.end();
  });
}

function fetchLatest() {
  return new Promise((resolve, reject) => {
    console.log('\n🔍 [Fetching Latest Data]: GET http://localhost:5000/api/water-data/latest');
    http.get('http://localhost:5000/api/water-data/latest', (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`📥 [Latest Response ${res.statusCode}]:`, body);
        resolve(JSON.parse(body));
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 Starting ESP32 IoT API Integration Test Suite');
  console.log('================================================================');

  try {
    for (const test of testPayloads) {
      await sendPostRequest(test);
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log('\n------------------------------------------------');
    await fetchLatest();
    console.log('\n================================================================');
    console.log('✅ All ESP32 IoT API Tests Completed Successfully!');
    console.log('================================================================');
  } catch (e) {
    console.error('❌ Test suite failed:', e.message);
  }
}

runTests();
