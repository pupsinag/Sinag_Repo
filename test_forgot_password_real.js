/* eslint-env node */
const http = require('http');

const testForgotPassword = (email) => {
  const postData = JSON.stringify({ email });

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

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('\n✅ SUCCESSFUL RESPONSE:');
        console.log(`  Status: ${res.statusCode}`);
        console.log(`  Message: ${response.message}`);
        if (response.error) {
          console.log(`  Error: ${response.error}`);
        }
      } catch (e) {
        console.log('\n❌ RESPONSE:');
        console.log(`  Status: ${res.statusCode}`);
        console.log(`  Body: ${data}`);
      }
      process.exit(0);
    });
  });

  req.on('error', (e) => {
    console.error(`\n❌ REQUEST ERROR: ${e.message}`);
    process.exit(1);
  });

  req.write(postData);
  req.end();
};

console.log('Testing forgot password with: pupsinag@gmail.com\n');
testForgotPassword('pupsinag@gmail.com');
