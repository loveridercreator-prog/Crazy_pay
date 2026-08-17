const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

const regex = /async function createOrder\(userId, amount, upi, userObj = null, overrideAmount = null, precisePayableAmount = null\) \{([\s\S]*?)return \{ activeWithdrawal: activeWithdrawal, p2pOrder: p2pOrder \};\n\}/;

const match = s.match(regex);

if (match) {
    const newCreateOrder = `
async function createOrder(userId, amount, upi, userObj = null, overrideAmount = null, precisePayableAmount = null) {
    const cleanPhone = userId.replace(/[^0-9]/g, '');
    await acquireLock(cleanPhone);

    try {
        const systemConfig = await firebaseRequest('system_config', 'GET') || {};
        const isEngineOpen = systemConfig.withdrawal_engine_open !== false && systemConfig.withdrawal_engine_open !== "false";
        if (!isEngineOpen) {
            console.warn(\`[createOrder] Blocked order creation for \${cleanPhone}. Withdrawal Engine is OFF globally.\`);
            releaseLock(cleanPhone);
            return null;
        }

        const user = userObj || await firebaseRequest(\`users/\${cleanPhone}\`, 'GET');
        if (!user) {
            releaseLock(cleanPhone);
            return null;
        }

        let selectedAmount = overrideAmount !== null ? overrideAmount : parseFloat(amount);
        
        // Ensure max order does not exceed wallet balance (MODULE 2: Balance Capping Rule)
        const walletBalance = parseFloat(user.walletBalance || user.balance || 0);
        
        const activeWithdrawalSnap = await firebaseRequest(\`users/\${cleanPhone}/active_withdrawal\`, 'GET') || {};
        let totalActiveAmount = 0;
        for (const k in activeWithdrawalSnap) {
            totalActiveAmount += (activeWithdrawalSnap[k].display_amount || activeWithdrawalSnap[k].amount || 0);
        }
        
        if (totalActiveAmount + selectedAmount > walletBalance) {
            console.log(\`[createOrder] Blocked: Order amount (\${selectedAmount}) + Active (\${totalActiveAmount}) exceeds balance (\${walletBalance})\`);
            releaseLock(cleanPhone);
            return null; // Exceeds balance
        }

        const trxId = "TRX" + Date.now() + Math.floor(Math.random() * 1000);
        
        // --- MODULE 3: Dynamic Paisa Discount Engine ---
        const activeP2pOrders = await firebaseRequest('p2p_orders', 'GET') || {};
        const sameBaseOrders = Object.values(activeP2pOrders).filter(o => 
            Math.floor(o.amount || o.display_amount || 0) === Math.floor(selectedAmount) && 
            o.status !== "SUCCESS" && o.status !== "CANCELLED"
        );
        
        let discountPaisa = 0;
        let payableAmount = precisePayableAmount;
        
        if (payableAmount == null) {
            for (let i = 1; i <= 99; i++) {
                const potentialDiscount = i / 100.0;
                const potentialPayable = selectedAmount - potentialDiscount;
                
                const isUsed = sameBaseOrders.some(o => 
                    Math.abs((o.payable_amount || o.amount) - potentialPayable) < 0.001
                );
                
                if (!isUsed) {
                    discountPaisa = potentialDiscount;
                    break;
                }
            }
            payableAmount = selectedAmount - discountPaisa;
        }

        const reward = parseFloat(systemConfig.agent_reward_rate || 0.20);
        const feeAmount = payableAmount * reward;
        const itokenAmount = payableAmount + feeAmount;

        const generatedUpiKey = "upi_" + Date.now();

        const activeWithdrawal = {
            trxId: trxId,
            status: "Waiting for P2P matched",
            amount: selectedAmount,
            display_amount: selectedAmount,
            payable_amount: payableAmount,
            timestamp: Date.now(),
            sellerName: user.name || "Crazy Trader",
            sellerPhone: cleanPhone,
            upiId: upi || user.upiId || "crazy@upi",
            upiHandleKey: generatedUpiKey,
            expiresAt: Date.now() + (15 * 60 * 1000)
        };

        const p2pOrder = {
            orderNo: trxId,
            tradeType: "BUY",
            amount: selectedAmount,
            display_amount: selectedAmount,
            payable_amount: payableAmount,
            reward: feeAmount,
            itoken: itokenAmount,
            fee: 0,
            paymentMethod: "UPI",
            status: "Waiting",
            sellerUserId: user.referralCode || cleanPhone,
            buyerUserId: "",
            upiId: upi || user.upiId || "crazy@upi",
            generatedTime: Date.now(),
            completedTime: 0,
            sellerName: user.name || "Crazy Trader",
            buyerName: "",
            paymentApp: "UPI Intent",
            upiHandleKey: generatedUpiKey,
            expiresAt: Date.now() + (15 * 60 * 1000)
        };

        // Write directly here to ensure atomicity 
        await firebaseRequest(\`users/\${cleanPhone}/active_withdrawal/\${trxId}\`, 'PUT', activeWithdrawal);
        await firebaseRequest(\`p2p_orders/\${trxId}\`, 'PUT', p2pOrder);
        
        releaseLock(cleanPhone);
        return { activeWithdrawal, p2pOrder };

    } catch (e) {
        console.error("Error creating order:", e);
        releaseLock(cleanPhone);
        return null;
    }
}
`;
    s = s.replace(match[0], newCreateOrder);
    
    fs.writeFileSync('server.js', s);
    console.log("Patched server.js createOrder successfully.");
} else {
    console.log("Could not match createOrder regex.");
}

