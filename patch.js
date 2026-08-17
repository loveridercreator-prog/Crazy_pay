const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetStr = `                    // Run as a single atomic Firebase transaction
                    globalOrderQueue.enqueue(async () => {
                        return new Promise((resolve, reject) => {
                            const userRef = database.ref('users/' + cleanPhone);
                            userRef.transaction((userObj) => {
                                if (!userObj) return userObj;
                                const liveBal = parseFloat(userObj.balance || 0);
                                if (amt > liveBal) {
                                    return; // abort transaction due to insufficient balance
                                }
                                const curEngineStatus = userObj.engineStatus || 'ON';
                                const curEngineOffUntil = parseInt(userObj.engineOffUntil || 0);
                                if (curEngineStatus === 'OFF' && Date.now() < curEngineOffUntil) {
                                    return; // abort due to penalty block
                                }

                                // Lock order session atomically inside user node (supports simultaneous multi-orders)
                                userObj.active_withdrawals = userObj.active_withdrawals || {};
                                userObj.active_withdrawals[trxId] = activeWithdrawalSession;
                                userObj.active_withdrawal = activeWithdrawalSession;

                                return userObj;
                            }, (error, committed, snapshot) => {
                                if (error) {
                                    reject(new Error("Transaction database error: " + error.message));
                                } else if (!committed) {
                                    // Transaction aborted on server (either insufficient balance, penalty, or duplicate)
                                    reject(new Error("VALIDATION_FAILED"));
                                } else {
                                    // Step 2: Now register order on the global ledger path
                                    database.ref('p2p_orders/' + trxId).set(p2pOrderPayload)
                                    .then(() => {
                                        const sellTxRecord = {
                                            id: trxId,
                                            type: "Sell Order Lock",
                                            amount: -displayAmount,
                                            status: "Pending",
                                            utrOrId: \`SELL-\${trxId}\`,
                                            provider: activeHandle.upiName || "MobiKwik",
                                            upiId: finalSelectVal,
                                            timeStr: new Date().toLocaleTimeString(),
                                            timestamp: Date.now()
                                        };
                                        database.ref('users/' + cleanPhone + '/transactions/tx_' + trxId).set(sellTxRecord);
                                        if (window.allTxRecords) window.allTxRecords.push(sellTxRecord);
                                        
                                        renderHistoryLedgerItems();
                                        resolve({ source: "Atomic-Handshake-Transaction" });
                                    })
                                    .catch(err => {
                                        // Rollback active_withdrawal on user node
                                        userRef.child('active_withdrawal').remove();
                                        reject(new Error("Global ledger registration failed: " + err.message));
                                    });
                                }
                            });
                        });
                    })
                    .then((result) => {
                        const endTime = performance.now();
                        const duration = (endTime - startTime).toFixed(2);
                        console.timeEnd("Sell-to-Buy Handshake");
                        completeSuccessfulWrite(result.source, duration);
                    })
                    .catch((err) => {
                        console.timeEnd("Sell-to-Buy Handshake");
                        if (err.message === "VALIDATION_FAILED") {
                            // Fetch user state to determine specific error message
                            database.ref('users/' + cleanPhone).once('value').then(snap => {
                                const userObj = snap.val() || {};
                                const liveBal = parseFloat(userObj.balance || 0);
                                if (amt > liveBal) {
                                    alert("⚠️ Insufficient balance: Your available wallet balance is lower than the requested amount.");
                                } else if ((userObj.engineStatus || 'ON') === 'OFF' && Date.now() < parseInt(userObj.engineOffUntil || 0)) {
                                    alert("⚠️ Order Creation Blocked: You are currently on a penalty break.");
                                } else if (userObj.active_withdrawal) {
                                    alert("⚠️ Duplicate Order: You already have an active withdrawal in progress.");
                                } else {
                                    alert("⚠️ Order Creation Denied: Multi-layer validation rejected your request.");
                                }
                            }).finally(() => {
                                if (submitBtn) {
                                    submitBtn.disabled = false;
                                    submitBtn.innerHTML = originalBtnHtml;
                                }
                            });
                        } else {
                            handleWriteError(err.message);
                        }
                    });`;

const replacement = `                    // Run via /api/order/create endpoint for batch processing support
                    const quantityEl = document.getElementById('withdraw-input-quantity');
                    const batchCount = parseInt(quantityEl ? quantityEl.value : 1) || 1;

                    fetch('/api/order/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            phone: cleanPhone,
                            amount: displayAmount,
                            count: batchCount
                        })
                    })
                    .then(res => res.json())
                    .then(data => {
                        const endTime = performance.now();
                        const duration = (endTime - startTime).toFixed(2);
                        console.timeEnd("Sell-to-Buy Handshake");
                        
                        if (data.success) {
                            showNotificationBroadcast(\`✅ \${data.orders ? data.orders.length : 1} Order(s) generated successfully.\`);
                            completeSuccessfulWrite("API-Batch-Engine", duration);
                        } else {
                            throw new Error(data.error || "VALIDATION_FAILED");
                        }
                    })
                    .catch((err) => {
                        console.timeEnd("Sell-to-Buy Handshake");
                        if (err.message === "VALIDATION_FAILED" || err.message.includes("status")) {
                            database.ref('users/' + cleanPhone).once('value').then(snap => {
                                const userObj = snap.val() || {};
                                const liveBal = parseFloat(userObj.balance || 0);
                                if (amt > liveBal) {
                                    alert("⚠️ Insufficient balance: Your available wallet balance is lower than the requested amount.");
                                } else if ((userObj.engineStatus || 'ON') === 'OFF' && Date.now() < parseInt(userObj.engineOffUntil || 0)) {
                                    alert("⚠️ Order Creation Blocked: You are currently on a penalty break.");
                                } else {
                                    alert("⚠️ Order Creation Denied: Multi-layer validation rejected your request.");
                                }
                            }).finally(() => {
                                if (submitBtn) {
                                    submitBtn.disabled = false;
                                    submitBtn.innerHTML = originalBtnHtml;
                                }
                            });
                        } else {
                            handleWriteError(err.message);
                        }
                    });`;

// Replace ignoring whitespace
const targetRegex = new RegExp(targetStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'));
if (targetRegex.test(html)) {
    html = html.replace(targetRegex, replacement);
    fs.writeFileSync('index.html', html);
    console.log("Replaced successfully!");
} else {
    console.log("Target not found!");
}
