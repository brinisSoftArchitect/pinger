const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Configuration
const CONFIG_FILE = './redirector/redirects.json';
const PORT = 4004;

// Load redirects from JSON file
function loadRedirects() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      // Create default config file
      const defaultConfig = {
        "ai.wallah.pro": "https://ai.brimind.pro",
        "ai.brimind.pro": "https://chat.brimind.pro",
        "test.wallah.pro": "https://ai.brimind.pro",
        "www.example.com": "https://newexample.com",
        "legacy-domain.com": "https://modern-domain.com"
      };
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
      console.log(`Created ${CONFIG_FILE} with default redirects`);
    }
    
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading redirects:', error.message);
    return {};
  }
}

// Find redirect URL
function findRedirect(host, redirects) {
  // Try exact match first
  if (redirects[host]) {
    return redirects[host];
  }
  
  // Try without www
  const hostWithoutWww = host.replace(/^www\./, '');
  if (redirects[hostWithoutWww]) {
    return redirects[hostWithoutWww];
  }
  
  // Try with www
  const hostWithWww = `www.${host}`;
  if (redirects[hostWithWww]) {
    return redirects[hostWithWww];
  }
  
  return null;
}

// Build full redirect URL with path and query params
function buildRedirectUrl(baseUrl, originalUrl) {
  const parsedOriginal = url.parse(originalUrl);
  const parsedBase = url.parse(baseUrl);
  
  // Combine base URL with original path and query
  let fullUrl = baseUrl;
  
  // Remove trailing slash from base URL if present
  if (fullUrl.endsWith('/')) {
    fullUrl = fullUrl.slice(0, -1);
  }
  
  // Add path if it exists and isn't just "/"
  if (parsedOriginal.pathname && parsedOriginal.pathname !== '/') {
    fullUrl += parsedOriginal.pathname;
  }
  
  // Add query string if it exists
  if (parsedOriginal.search) {
    fullUrl += parsedOriginal.search;
  }
  
  // Add hash if it exists
  if (parsedOriginal.hash) {
    fullUrl += parsedOriginal.hash;
  }
  
  return fullUrl;
}

// Create server
const server = http.createServer((req, res) => {
  const host = req.headers.host;
  const redirects = loadRedirects();
  
  console.log(`Request from: ${host}${req.url}`);
  
  // Skip favicon
  if (req.url === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Find redirect base URL
  const redirectBaseUrl = findRedirect(host, redirects);
  
  if (redirectBaseUrl) {
    // Build full redirect URL with path and params
    const fullRedirectUrl = buildRedirectUrl(redirectBaseUrl, req.url);
    
    console.log(`Redirecting ${host}${req.url} -> ${fullRedirectUrl}`);
    
    res.writeHead(301, {
      'Location': fullRedirectUrl,
      'Content-Type': 'text/html'
    });
    
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Redirecting...</title>
        <meta http-equiv="refresh" content="0; url=${fullRedirectUrl}">
      </head>
      <body>
        <h1>Redirecting to ${fullRedirectUrl}</h1>
        <p><a href="${fullRedirectUrl}">Click here if not redirected</a></p>
      </body>
      </html>
    `);
  } else {
    // No redirect found
    console.log(`No redirect found for: ${host}`);
    
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>Not Found</title></head>
      <body>
        <h1>No redirect configured for: ${host}</h1>
        <p>Add "${host}": "https://your-target.com" to ${CONFIG_FILE}</p>
      </body>
      </html>
    `);
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`\nURL Redirector running on port ${PORT}`);
  console.log(`Config file: ${CONFIG_FILE}`);
  
  const redirects = loadRedirects();
  console.log('\nConfigured redirects:');
  Object.entries(redirects).forEach(([from, to]) => {
    console.log(`  ${from} -> ${to}`);
  });
  
  console.log(`\nTest with: curl -H "Host: ai.brimind.pro" http://localhost:${PORT}/signup?ref=67375D40`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});