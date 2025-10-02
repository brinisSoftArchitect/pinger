// ping-monitor.js
const https = require('https');
const http = require('http');

const config = {
    urls: [
        'https://buy100lowmarketcap.onrender.com/dashboard.html',
        'https://licenseserver-o5cw.onrender.com',
        'https://stackoverflow.com',
        'http://example.com',
        // Add your URLs here
    ],
    interval: 60000, // 1 minute in milliseconds
    timeout: 10000 // 10 seconds timeout
};

function pingUrl(url) {
    return new Promise((resolve) => {
        const protocol = url.startsWith('https') ? https : http;
        const startTime = Date.now();
        
        const req = protocol.get(url, {
            timeout: config.timeout
        }, (res) => {
            const responseTime = Date.now() - startTime;
            resolve({
                url,
                status: res.statusCode,
                responseTime,
                success: true,
                error: null
            });
        });
        
        req.on('error', (err) => {
            const responseTime = Date.now() - startTime;
            resolve({
                url,
                status: null,
                responseTime,
                success: false,
                error: err.message
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            const responseTime = Date.now() - startTime;
            resolve({
                url,
                status: null,
                responseTime,
                success: false,
                error: 'Timeout'
            });
        });
    });
}

async function pingAllUrls() {
    const timestamp = new Date().toISOString();
    console.log(`\n--- Ping check started at ${timestamp} ---`);
    
    const promises = config.urls.map(url => pingUrl(url));
    const results = await Promise.all(promises);
    
    results.forEach(result => {
        let logEntry;
        if (result.success) {
            logEntry = `✅ ${result.url} - Status: ${result.status} - ${result.responseTime}ms`;
        } else {
            logEntry = `❌ ${result.url} - ERROR: ${result.error} - ${result.responseTime}ms`;
        }
        
        console.log(logEntry);
    });
    
    // Summary
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    console.log(`Summary: ${successCount} up, ${failCount} down`);
}

// Run immediately, then every interval
pingAllUrls();
const interval = setInterval(pingAllUrls, config.interval);

console.log(`Starting URL monitor for ${config.urls.length} URLs every ${config.interval/1000} seconds`);
console.log('URLs being monitored:');
config.urls.forEach((url, index) => {
    console.log(`  ${index + 1}. ${url}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    clearInterval(interval);
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    clearInterval(interval);
    process.exit(0);
});