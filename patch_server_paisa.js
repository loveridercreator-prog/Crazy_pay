const fs = require('fs');

let s = fs.readFileSync('server.js', 'utf8');

// We need to inject the "MODULE 1: DISCOUNTED DYNAMIC AMOUNT ENGINE" inside the processUserWithdrawalBatch / createOrder logic.

// Let's replace the old order logic.
const createOrderRegex = /async function createOrder\(cleanPhone, user, activeP2pOrders, baseAmount\) \{([\s\S]*?)return \{ activeWithdrawal: activeWithdrawal, p2pOrder: p2pOrder \};\n\}/;

const match = s.match(createOrderRegex);
if (match) {
    const newCreateOrder = `
async function createOrder(cleanPhone, user, activeP2pOrders, baseAmount) {
    try {
        const globalEngineState = await firebaseRequest('system_config/withdrawal_engine_open', 'GET');
        if (globalEngineState === false || globalEngineState === "false") {
            console.warn(\`[createOrder] Blocked order creation for \${cleanPhone}. Withdrawal Engine is OFF globally.\`);
            return null;
        }

        const trxId = "TRX" + Date.now() + Math.floor(Math.random() * 1000);
        
        // --- Dynamic Paisa Discount Engine (0.01 to 0.99) ---
        // Find existing orders with this baseAmount
        const existingSameBaseOrders = activeP2pOrders.filter(o => 
            Math.floor(o.amount || o.display_amount || o.payable_amount || 0) === Math.floor(baseAmount)
        );
        
        let discountPaisa = 0;
        let discountFound = false;
        
        // Find an available discount slot from 0.01 to 0.99
        for (let i = 1; i <= 99; i++) {
            const potentialDiscount = i / 100.0;
            const potentialPayable = baseAmount - potentialDiscount;
            
            const isUsed = existingSameBaseOrders.some(o => 
                Math.abs((o.payable_amount || o.amount) - potentialPayable) < 0.001
            );
            
            if (!isUsed) {
                discountPaisa = potentialDiscount;
                discountFound = true;
                break;
            }
        }
        
        // If all 99 slots are used, we fallback to exactly base amount, or we can reject.
        // For safety, we will just use 0 if >99 orders exist for the same base amount simultaneously.
        const payableAmount = baseAmount - discountPaisa;

        const exactAmount = payableAmount;
        const feeAmount = exactAmount * 0.20;
        const itokenAmount = exactAmount + feeAmount;
        
        const generatedUpiKey = "upi_" + Date.now();
        const sellerUpiId = user.upiId || "crazy@upi";

        const activeWithdrawal = {
            trxId: trxId,
            status: "Waiting for P2P matched",
            amount: exactAmount,
            display_amount: baseAmount,
            payable_amount: payableAmount,
            timestamp: Date.now(),
            sellerName: user.name || "Crazy Trader",
            sellerPhone: cleanPhone,
            upiId: sellerUpiId,
            upiHandleKey: generatedUpiKey,
            expiresAt: Date.now() + (15 * 60 * 1000) // 15 min expiry
        };

        const p2pOrder = {
            orderNo: trxId,
            tradeType: "BUY",
            amount: exactAmount,
            display_amount: baseAmount,
            payable_amount: payableAmount,
            reward: feeAmount,
            itoken: itokenAmount,
            fee: 0,
            paymentMethod: "UPI",
            status: "Waiting",
            sellerUserId: user.referralCode || cleanPhone,
            buyerUserId: "",
            upiId: sellerUpiId,
            generatedTime: Date.now(),
            completedTime: 0,
            sellerName: user.name || "Crazy Trader",
            buyerName: "",
            paymentApp: "UPI Intent",
            upiHandleKey: generatedUpiKey,
            expiresAt: Date.now() + (15 * 60 * 1000)
        };

        return { activeWithdrawal: activeWithdrawal, p2pOrder: p2pOrder };
    } catch (e) {
        console.error("Error creating order:", e);
        return null;
    }
}
`;

    s = s.replace(match[0], newCreateOrder);
    
    // Also patch processUserWithdrawalBatch for dynamic chunking
    const chunkingRegex = /const availableBalance = withdrawalWallet;\n\s*if \(availableBalance < 50\) \{\n\s*return \{ success: false, reason: "Insufficient balance \(Min 50\)" \};\n\s*\}/;
    
    s = s.replace(chunkingRegex, `const availableBalance = withdrawalWallet;
        if (availableBalance < 50) {
            return { success: false, reason: "Insufficient balance (Min 50)" };
        }`);
        
    s = s.replace(/const totalOrders = 1;\s*\/\/.*\n\s*let currentRemainingBalance = availableBalance;/g, '');
    
    // We need to just create ONE order for the full balance (up to some max, e.g., if balance > 0, make 1 order of that balance)
    // Find the loop for totalOrders and replace it.
    
    const chunkLoopRegex = /for \(let i = 0; i < totalOrders; i\+\+\) \{[\s\S]*?createdOrders\.push\(orderResult\.activeWithdrawal\);\n\s*\}/g;
    
    s = s.replace(chunkLoopRegex, `
        // MODULE 2: DYNAMIC FLEXIBLE CHUNKING
        // 1. Create EXACTLY 1 order for the full available balance. No 10-order splits.
        // 2. Max balance capped by available.
        const baseAmount = availableBalance; 
        if (baseAmount > 0) {
            const orderResult = await createOrder(cleanPhone, user, p2pOrdersList, baseAmount);
            if (orderResult) {
                try {
                    await firebaseRequest(\`users/\${cleanPhone}/active_withdrawal/\${orderResult.activeWithdrawal.trxId}\`, 'PUT', orderResult.activeWithdrawal);
                    await firebaseRequest(\`p2p_orders/\${orderResult.p2pOrder.orderNo}\`, 'PUT', orderResult.p2pOrder);
                    await firebaseRequest(\`users/\${cleanPhone}/active_upi_keys/\${orderResult.activeWithdrawal.upiHandleKey}\`, 'PUT', { orderNo: orderResult.p2pOrder.orderNo });
                    createdOrders.push(orderResult.activeWithdrawal);
                } catch(e) { console.error("Error writing created order", e); }
            }
        }
    `);

    fs.writeFileSync('server.js', s);
    console.log("Patched server.js with Paisa Discount and Flexible Chunking");
} else {
    console.log("Could not find createOrder regex match.");
}
