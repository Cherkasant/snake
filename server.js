const http = require('http');
const path = require('path');
const fs = require('fs');

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const root = __dirname;

const contentTypes = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.map': 'application/json; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/'))
        .replace(/\?.*$/, '')
        .replace(/#.*$/, '');

    let filePath = path.join(root, urlPath);
    if (urlPath === '/' || urlPath === '') {
        filePath = path.join(root, 'index.html');
    }

    fs.stat(filePath, (err, stat) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        if (stat.isDirectory()) {
            filePath = path.join(filePath, 'index.html');
        }
        const ext = path.extname(filePath).toLowerCase();
        const type = contentTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', type);
        fs.createReadStream(filePath)
            .on('error', () => { res.writeHead(404); res.end('Not found'); })
            .pipe(res);
    });
});

server.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});



