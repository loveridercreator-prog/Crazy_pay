const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const targetStr = \`    // Fallback static files serving
    let ext = path.extname(urlPath);\`;

const replacement = \`    // Dynamic UPI Intent URI Generator Endpoint
    if (req.method === 'POST' && urlPath === '/api/generate_intent_uri') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const { provider, targetUpiId, sellerName, amtVal, orderId } = payload;
                if (!targetUpiId || !amtVal || !orderId) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: false, error: 'Missing required parameters: targetUpiId, amtVal, orderId' }));
                }
                const { generateUpiIntentUri } = require('./backendUriGenerator.js');
                const intentUri = generateUpiIntentUri(provider, targetUpiId, sellerName, amtVal, orderId);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, intentUri }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // Fallback static files serving
    let ext = path.extname(urlPath);\`;

const targetRegex = new RegExp(targetStr.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&').replace(/\\s+/g, '\\\\s+'));
if (targetRegex.test(code)) {
    code = code.replace(targetRegex, replacement);
    fs.writeFileSync('server.js', code);
    console.log("Replaced server.js intent logic successfully!");
} else {
    console.log("Target server.js intent logic not found!");
}
