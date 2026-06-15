const http = require('http');

// Get owner login token
const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const responseData = JSON.parse(data);
    if (!responseData.token) {
        console.log("Login failed:", data);
        return;
    }
    const token = responseData.token;
    
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

req.write(JSON.stringify({ email: 'mohanmanishankar01@gmail.com', password: 'owner123' }));
req.end();
