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
    console.log('Login Response:', data);
    const token = JSON.parse(data).token;
    
    // Now test /subscription/status
    const req2 = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/subscription/status',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (res2) => {
      let data2 = '';
      res2.on('data', (chunk) => data2 += chunk);
      res2.on('end', () => console.log('Status Response:', res2.statusCode, data2));
    });
    req2.end();
  });
});

req.write(JSON.stringify({ email: 'admin@gmail.com', password: 'admin123' }));
req.end();
