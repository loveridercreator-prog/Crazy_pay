const fs = require('fs');

const code = `
/**
 * orderController.js
 * Production Order Controller for P2P Asset Selling Engine
 * DISCOUNTED DYNAMIC AMOUNT ENGINE (1 to 99 Paisa Discount)
 */

async function handleCreateOrder(req, res, firebaseRequest, createOrderFn) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
        try {
            const payload = JSON.parse(body || '{}');
            const phone = payload.phone || payload.user_id || payload.userId || payload.seller_id;
            const requestedAmt = parseFloat(payload.amount || payload.order_amount || payload.requestedAmount || 0);

            if (!phone || isNaN(requestedAmt) || requestedAmt <= 0) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: false,
                    error: "Missing or invalid parameters. Phone number and valid positive amount are required."
                }));
            }

            const cleanPhone = phone.toString().replace(/[^0-9]/g, '');

            const sysConfig = await firebaseRequest('system_config', 'GET') || {};
            const isGlobalSwitchOn = sysConfig.orderCreationEnabled !== false && sysConfig.withdrawal_engine_open !== false;

            if (!isGlobalSwitchOn) {
                console.log("[Master Switch Lock] Order creation rejected. PostgreSQL & Redis Cache lock active: Switch=OFF.");
                res.writeHead(403, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: false,
                    error: "Master order creation switch is OFF. Order generation frozen by admin lock."
                }));
            }

            const userObj = await firebaseRequest(\`users/\${cleanPhone}\`, 'GET');
            if (!userObj) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, error: \`User with phone \${cleanPhone} not found.\` }));
            }

            const userStatus = (userObj.status || "").toUpperCase();
            const engineStatus = (userObj.engineStatus || "").toUpperCase();
            if (userStatus === "STOPPED" || userStatus === "OFF" || userStatus === "INACTIVE" || engineStatus === "OFF") {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: false,
                    error: "Seller transaction status is set to OFF/STOPPED. Order creation refused."
                }));
            }

            let upiTool = userObj.upiTool || userObj.upi_handles || {};
            let upis = Array.isArray(upiTool) ? upiTool : (typeof upiTool === 'object' ? Object.values(upiTool) : []);
            let activeUpi = upis.find(u => u && (u.status === 'Active' || u.status === 'ACTIVE' || u.isActive !== false) && (u.upiId || u.upi_id || u.id)) || upis[0];
            
            if (!activeUpi || activeUpi.isActive === false || activeUpi.status === 'STOPPED' || activeUpi.status === 'OFF') {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: false,
                    error: "Active seller UPI handle is STOPPED or missing. Order creation refused."
                }));
            }

            const order_amount = Math.round(requestedAmt); // Ensure base amount is an integer

            // Fetch existing active pending orders for this base amount to assign a UNIQUE discount
            const allOrders = await firebaseRequest('p2p_orders', 'GET') || {};
            
            const now = Date.now();
            const usedDiscounts = new Set();
            
            // Order expiry timer = 15 minutes (15 * 60 * 1000)
            const expiryTimeMs = 15 * 60 * 1000;

            for (const orderId in allOrders) {
                const o = allOrders[orderId];
                if (o.status === "PENDING" && o.order_amount === order_amount) {
                    if (now - o.timestamp < expiryTimeMs) {
                        const discount = Math.round((o.order_amount - o.payable_amount) * 100);
                        if (discount >= 1 && discount <= 99) {
                            usedDiscounts.add(discount);
                        }
                    }
                }
            }

            if (usedDiscounts.size >= 99) {
                res.writeHead(429, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: false,
                    error: "Max active orders (99) for this exact base amount reached. Please wait for expiry or choose a different amount."
                }));
            }

            // Find an available unique discount (1 to 99 paisa)
            let uniqueDiscountPaisa = 1;
            while (usedDiscounts.has(uniqueDiscountPaisa) && uniqueDiscountPaisa <= 99) {
                uniqueDiscountPaisa++;
            }

            const discountAmount = uniqueDiscountPaisa / 100.0;
            const precisePayable = parseFloat((order_amount - discountAmount).toFixed(2));

            const orderResult = await createOrderFn(cleanPhone, order_amount, activeUpi, userObj, order_amount, precisePayable);
            
            if (orderResult && orderResult.success) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: true,
                    order_amount: order_amount,
                    payable_amount: precisePayable,
                    discount_paisa: uniqueDiscountPaisa,
                    orders: [orderResult.activeWithdrawal],
                    message: \`Order created for base amount ₹\${order_amount.toFixed(2)} with \${uniqueDiscountPaisa} paisa discount.\`
                }));
            } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: false,
                    error: "Failed to create order. Check balance or locks."
                }));
            }

        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, error: err.message }));
        }
    });
}

async function handleToggleStatus(req, res, firebaseRequest) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
        try {
            const payload = JSON.parse(body || '{}');
            const phone = payload.phone || payload.user_id || payload.seller_id;
            const key = payload.key || payload.upi_key;
            const isActive = payload.isActive !== false && payload.status !== "STOPPED" && payload.status !== "OFF";

            if (!phone) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, error: "Missing required parameter: phone" }));
            }

            const cleanPhone = phone.toString().replace(/[^0-9]/g, '');
            const updates = {};
            const newStatusStr = isActive ? "ACTIVE" : "STOPPED";

            if (key) {
                updates[\`users/\${cleanPhone}/upi_handles/\${key}/isActive\`] = isActive;
                updates[\`users/\${cleanPhone}/upi_handles/\${key}/status\`] = newStatusStr;
            } else {
                updates[\`users/\${cleanPhone}/status\`] = newStatusStr;
                updates[\`users/\${cleanPhone}/engineStatus\`] = isActive ? "ON" : "OFF";
            }

            await firebaseRequest('', 'PATCH', updates);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                success: true,
                message: \`Status updated successfully to \${newStatusStr}.\`,
                phone: cleanPhone,
                isActive: isActive,
                status: newStatusStr
            }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, error: err.message }));
        }
    });
}

module.exports = {
    handleCreateOrder,
    handleToggleStatus
};
`;

fs.writeFileSync('orderController.js', code);
console.log("orderController.js patched.");
