const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

// The original server.js doesn't use Express (app.post doesn't exist). It uses a native Node.js HTTP server routing pattern (if (req.method === 'POST' && urlPath === '...')).
// So appending "app.post" at the end of the file will fail if 'app' is not defined, or it will just be dead code if executed outside the main server loop.
// Let's replace the appended app.post block with native routing.

// Strip out the appended block
s = s.replace(/app\.post\('\/api\/v1\/admin\/toggle-withdrawal-engine'[\s\S]*?\}\);/g, '');
s = s.replace(/\/\/ MODULE 3: AUTONOMOUS DOUBLE-SECURITY USDT ENGINE[\s\S]*?\}\);/g, '');

// Insert it into the native HTTP routing logic
const routingPoint = /if \(req\.method === 'POST' && urlPath === '\/api\/v1\/bank-transactions'\) \{/;
const injection = `
    if (req.method === 'POST' && urlPath === '/api/v1/admin/toggle-withdrawal-engine') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const parsed = JSON.parse(body);
                const engineStatus = parsed.engineStatus;
                const isEngineOpen = (engineStatus === true || engineStatus === 'true' || engineStatus === 'ON');
                await firebaseRequest('system_config/withdrawal_engine_open', 'PUT', isEngineOpen);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, isEngineOpen, message: \`Engine turned \${isEngineOpen ? 'ON' : 'OFF'}\` }));
            } catch (e) {
                res.writeHead(500);
                res.end(JSON.stringify({ success: false }));
            }
        });
        return;
    }

    if (req.method === 'POST' && urlPath === '/api/v1/usdt/webhook') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const parsed = JSON.parse(body);
                const { tx_hash, to_address, amount, network } = parsed;
                const txRef = \`usdt_transactions/\${tx_hash}\`;
                const existing = await firebaseRequest(txRef, 'GET');
                if (existing) {
                    res.writeHead(409);
                    return res.end(JSON.stringify({ error: "Transaction already processed" }));
                }
                await firebaseRequest(txRef, 'PUT', { tx_hash, to_address, amount, network, status: "SUCCESS" });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: "USDT Payment verified and swept." }));
            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: "USDT Webhook Error" }));
            }
        });
        return;
    }
`;

s = s.replace(routingPoint, injection + '\n    if (req.method === \'POST\' && urlPath === \'/api/v1/bank-transactions\') {');
fs.writeFileSync('server.js', s);
