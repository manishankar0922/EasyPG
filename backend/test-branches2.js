const http = require('http');

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
    const token = JSON.parse(data).token;
    
    const req2 = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/branches',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (res2) => {
      let data2 = '';
      res2.on('data', (chunk) => data2 += chunk);
      res2.on('end', () => {
          console.log(data2);
      });
    });
    req2.end();
  });
});

req.write(JSON.stringify({ email: 'admin@gmail.com', password: 'admin123' }));
req.end();
