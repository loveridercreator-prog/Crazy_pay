/**
 * historyController.js
 * Production History & Sale Ledger Query Controller
 * Fetches all orders for the user regardless of status (PENDING, SUCCESS, FAILED)
 */

async function handleGetHistoryAndLedger(req, res, parsedUrl, firebaseRequest) {
    try {
        const parsedQuery = new URLSearchParams(parsedUrl.query || '');
        let userId = parsedQuery.get('user_id') || parsedQuery.get('phone') || parsedQuery.get('userId');

        if (!userId && req.method === 'POST') {
            let body = '';
            await new Promise(resolve => {
                req.on('data', chunk => body += chunk);
                req.on('end', resolve);
            });
            try {
                const payload = JSON.parse(body || '{}');
                userId = payload.user_id || payload.phone || payload.userId;
            } catch (e) {}
        }

        if (!userId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, error: "Missing required parameter: user_id or phone" }));
        }

        const cleanPhone = userId.toString().replace(/[^0-9]/g, '');

        // Fetch user's stored transactions and global p2p_orders
        const [userTxMap, allP2pOrdersMap] = await Promise.all([
            firebaseRequest(`users/${cleanPhone}/transactions`, 'GET') || {},
            firebaseRequest('p2p_orders', 'GET') || {}
        ]);

        // Process all P2P orders for this user regardless of status (PENDING, SUCCESS, FAILED)
        const userP2pOrders = [];
        if (allP2pOrdersMap) {
            Object.keys(allP2pOrdersMap).forEach(key => {
                const order = allP2pOrdersMap[key];
                if (!order) return;
                const sellerPhone = (order.sellerPhone || order.seller_id || order.phone || "").replace(/[^0-9]/g, '');
                const buyerPhone = (order.buyerPhone || order.buyer_id || "").replace(/[^0-9]/g, '');

                if (sellerPhone === cleanPhone || buyerPhone === cleanPhone) {
                    const isSell = sellerPhone === cleanPhone;
                    userP2pOrders.push({
                        order_id: key,
                        id: key,
                        amount: parseFloat(order.amount || order.displayAmount || 0),
                        order_amount: parseFloat(order.displayAmount || order.amount || 0),
                        status: (order.status || "PENDING").toUpperCase(),
                        createdAt: order.createdAt || order.timestamp || Date.now(),
                        type: isSell ? "P2P Sell Order" : "P2P Buy Order",
                        upi_id: order.upi_id || order.sellerUpi || "",
                        sellerPhone,
                        buyerPhone
                    });
                }
            });
        }

        // Process stored transactions
        const storedTxList = [];
        if (userTxMap) {
            Object.keys(userTxMap).forEach(k => {
                const tx = userTxMap[k];
                if (tx) {
                    storedTxList.push({
                        ...tx,
                        status: (tx.status || "PENDING").toUpperCase(),
                        createdAt: tx.createdAt || tx.timestamp || Date.now()
                    });
                }
            });
        }

        // Combine and sort by timestamp descending
        const combinedLedger = [...userP2pOrders, ...storedTxList];
        const seenIds = new Set();
        const uniqueLedger = [];
        for (const item of combinedLedger) {
            const itemId = item.id || item.order_id || item.utrOrId;
            if (itemId && !seenIds.has(itemId)) {
                seenIds.add(itemId);
                uniqueLedger.push(item);
            } else if (!itemId) {
                uniqueLedger.push(item);
            }
        }
        uniqueLedger.sort((a, b) => (b.createdAt || b.timestamp || 0) - (a.createdAt || a.timestamp || 0));

        // Start of today timestamp filter (CURRENT_DATE filter)
        const startOfToday = new Date().setHours(0, 0, 0, 0);

        const todayHistory = uniqueLedger.filter(item => {
            const itemTime = item.createdAt || item.timestamp || 0;
            return itemTime >= startOfToday;
        });

        const buyLedger = uniqueLedger.filter(item => {
            const typeStr = (item.type || "").toLowerCase();
            return typeStr.includes("buy") || typeStr.includes("deposit") || item.amount >= 0 || item.buyerPhone === cleanPhone;
        });

        const saleLedger = uniqueLedger.filter(item => {
            const typeStr = (item.type || "").toLowerCase();
            return typeStr.includes("sell") || typeStr.includes("withdraw") || item.amount < 0 || item.sellerPhone === cleanPhone;
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            success: true,
            user_id: cleanPhone,
            total_records: uniqueLedger.length,
            history: uniqueLedger,
            today_history: todayHistory,
            buy_ledger: buyLedger,
            sale_ledger: saleLedger,
            sales_ledger: saleLedger
        }));
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: err.message }));
    }
}

module.exports = {
    handleGetHistoryAndLedger
};
