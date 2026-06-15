const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const token = JSON.parse(data).token;
    
    // Test POST /subscription/request
    const payload = JSON.stringify({
      plan: "STARTER",
      amount: 499,
      upiRefNumber: "1234567890",
      screenshotUrl: "https://example.com/img.jpg"
    });

    const req2 = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/subscription/request',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': payload.length
      }
    }, (res2) => {
      let data2 = '';
      res2.on('data', (chunk) => data2 += chunk);
      res2.on('end', () => console.log('Request Response:', res2.statusCode, data2));
    });
    req2.write(payload);
    req2.end();
  });
});

req.write(JSON.stringify({ email: 'admin@gmail.com', password: 'admin123' }));
req.end();
