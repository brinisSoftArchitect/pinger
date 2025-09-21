const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG_FILE = './redirects.json';
const PORT = 4004;

// Load redirects from JSON file
function loadRedirects() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      // Create default config file
      const defaultConfig = {
        "old-site.com": "https://new-site.com",
        "blog.old-site.com": "https://new-site.com/blog", 
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
  
  // Find redirect
  const redirectUrl = findRedirect(host, redirects);
  
  if (redirectUrl) {
    // Redirect found
    console.log(`Redirecting ${host} -> ${redirectUrl}`);
    
    res.writeHead(302, {
      'Location': redirectUrl,
      'Content-Type': 'text/html'
    });
    
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Redirecting...</title>
        <meta http-equiv="refresh" content="0; url=${redirectUrl}">
      </head>
      <body>
        <h1>Redirecting to ${redirectUrl}</h1>
        <p><a href="${redirectUrl}">Click here if not redirected</a></p>
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
  
  console.log(`\nTest with: curl -H "Host: old-site.com" http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});