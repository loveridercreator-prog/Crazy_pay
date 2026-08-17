const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

if (!s.includes('handleBankIngestion')) {
    s = s.replace(/const \{ handleUtrVerification, handleUsdtStatusCheck \} = require\('\.\/utrController'\);/, "const { handleUtrVerification, handleUsdtStatusCheck, handleBankIngestion } = require('./utrController');");
    
    // Add endpoint for it
    const endpointCode = `
    if (req.method === 'POST' && urlPath === '/api/v1/bank-transactions') {
        return handleBankIngestion(req, res, parsedUrl, firebaseRequest);
    }
`;
    
    s = s.replace(/if \(\(req\.method === 'GET' \|\| req\.method === 'POST'\) && urlPath === '\/api\/utr_engine_pipeline'\) \{/, endpointCode + "\n    if ((req.method === 'GET' || req.method === 'POST') && urlPath === '/api/utr_engine_pipeline') {");
}
fs.writeFileSync('server.js', s);
