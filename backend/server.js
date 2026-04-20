require('dotenv').config();
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
  console.error('\n❌  ERROR: GEMINI_API_KEY is not set in your .env file!');
  console.error('   Copy .env.example to .env and add your API key.\n');
  process.exit(1);
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

const MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
];

function proxyGemini(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let parsed;
    try { parsed = JSON.parse(body); } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      return;
    }

    tryModels(parsed, MODEL_CANDIDATES, res);
  });
}

function tryModels(bodyObj, models, res) {
  if (models.length === 0) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'All Gemini model candidates failed.' }));
    return;
  }

  const [model, ...rest] = models;
  const apiPath = `/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const payload = JSON.stringify(bodyObj);

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: apiPath,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  };

  const apiReq = https.request(options, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => { data += chunk; });
    apiRes.on('end', () => {
      // If model not found, try next
      if (apiRes.statusCode === 404 || apiRes.statusCode === 400) {
        try {
          const err = JSON.parse(data);
          const msg = (err?.error?.message || '').toLowerCase();
          if (msg.includes('not found') || msg.includes('not supported') || msg.includes('model')) {
            console.log(`  ↳ Model "${model}" not available, trying next...`);
            return tryModels(bodyObj, rest, res);
          }
        } catch (e) {}
      }

      res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
      res.end(data);
    });
  });

  apiReq.on('error', (e) => {
    console.error('Gemini API request error:', e.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  });

  apiReq.write(payload);
  apiReq.end();
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname;

  // CORS headers for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Proxy endpoint — frontend POSTs here instead of directly to Google
  if (pathname === '/api/gemini' && req.method === 'POST') {
    console.log(`[${new Date().toISOString()}] Gemini proxy request received`);
    proxyGemini(req, res);
    return;
  }

  // Block config.js so the key is never exposed
  if (pathname === '/config.js') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n🔥  THE KINETIC PULP is running!`);
  console.log(`   Open: http://localhost:${PORT}\n`);
});
