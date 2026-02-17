/* eslint-env node */
const http = require('http');

const testEndpoint = () => {
  const postData = JSON.stringify({
    email: 'admin@example.com',
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/forgot-password/send-code',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  const req = http.request(options, (res) => {
    let data = '';

    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS:`, res.headers);

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('RESPONSE BODY:');
      console.log(data);
      process.exit(0);
    });
  });

  req.on('error', (e) => {
    console.error(`PROBLEM WITH REQUEST: ${e.message}`);
    process.exit(1);
  });

  req.write(postData);
  req.end();
};

console.log('Testing forgot password endpoint...\n');
testEndpoint();
