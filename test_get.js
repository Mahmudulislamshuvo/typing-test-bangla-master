const http = require('http'); http.get('http://localhost:3000/api/reports', res => { console.log(res.headers); res.on('data', () => {}); });
