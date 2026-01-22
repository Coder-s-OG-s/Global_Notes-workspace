const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
    console.log(`request: ${req.url}`);

    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                fs.readFile('./404.html', (error, content) => {
                    if (error) {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end('<h1>404 Not Found</h1>', 'utf-8');
                    } else {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end(content, 'utf-8');
                    }
                });
            } else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

function getAllLocalIPs() {
    const ips = [];
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (non-127.0.0.1) and non-ipv4 addresses
            if ('IPv4' !== iface.family || iface.internal) {
                continue;
            }
            ips.push({ name, address: iface.address });
        }
    }
    return ips;
}

server.listen(PORT, HOST, () => {
    const ips = getAllLocalIPs();
    console.log(`\n=======================================================`);
    console.log(`✅ Server running at http://${HOST}:${PORT}/`);
    console.log(`\n📱 Available Network Addresses (Use one of these):`);

    if (ips.length > 0) {
        ips.forEach(ip => {
            console.log(`   - ${ip.name}: http://${ip.address}:${PORT}`);
        });
        console.log(`\n👉 Enter one of the IPs above in the "Server IP" box.`);
    } else {
        console.log(`   (No external network interfaces found. You may be offline.)`);
    }

    console.log(`\n⚠️  Keep this terminal open while sharing.`);
    console.log(`=======================================================\n`);
});
