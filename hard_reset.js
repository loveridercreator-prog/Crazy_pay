const https = require('https');
const crypto = require('crypto');

// Firebase RTDB REST configuration
const dbUrl = "https://studio-423535862-617fb-default-rtdb.asia-southeast1.firebasedatabase.app/";

const firebaseRequest = (path, method, data = null) => {
    return new Promise((resolve, reject) => {
        const url = `${dbUrl}${path}.json`;
        const requestBody = data !== null ? JSON.stringify(data) : '';
        const reqOpts = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        if (requestBody) {
            reqOpts.headers['Content-Length'] = Buffer.byteLength(requestBody);
        }
        const reqClient = https.request(url, reqOpts, (fRes) => {
            let fBody = '';
            fRes.on('data', chunk => fBody += chunk);
            fRes.on('end', () => {
                if (fRes.statusCode >= 200 && fRes.statusCode < 300) {
                    try {
                        resolve(fBody ? JSON.parse(fBody) : null);
                    } catch (e) {
                        resolve(fBody);
                    }
                } else {
                    reject(new Error(`Firebase REST Failed: ${method} ${path} - Status ${fRes.statusCode} - ${fBody}`));
                }
            });
        });
        reqClient.on('error', reject);
        if (requestBody) {
            reqClient.write(requestBody);
        }
        reqClient.end();
    });
};

const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

async function runHardReset() {
    console.log("=================================================");
    console.log("🔥 STARTING ZERO-BASE HARD RESET & DATA SCRUB 🔥");
    console.log("=================================================");

    try {
        // 1. Purge all operational database paths
        console.log("🧹 Purging orders, telemetry, and error logs...");
        await firebaseRequest('p2p_orders', 'DELETE');
        await firebaseRequest('system_errors', 'DELETE');
        await firebaseRequest('security_telemetry', 'DELETE');
        await firebaseRequest('active_autosell_jobs', 'DELETE');
        await firebaseRequest('Sell_Ledger', 'DELETE');
        await firebaseRequest('active_counter', 'PUT', 0);
        
        console.log("🧹 Purging users...");
        await firebaseRequest('users', 'DELETE');

        // 2. Compute Admin Passwords and PIN Hashes
        const admin1Phone = "9708634584";
        const admin2Phone = "9608949462";
        
        const adminPassword = "BROTHERFF123";
        const admin1Pin = "9708";
        const admin2Pin = "9608";
        
        const admin1Hash = hashPassword(adminPassword);
        const admin1PinHash = hashPassword(admin1Pin);
        
        const admin2Hash = hashPassword(adminPassword);
        const admin2PinHash = hashPassword(admin2Pin);

        // 3. Create Admin Payloads
        const admin1Data = {
            userId: "USR-970863",
            phone: "+91 9708634584",
            name: "Admin Principal",
            maskedPhone: "******",
            passwordHash: admin1Hash,
            securityPinHash: admin1PinHash,
            balance: 0,
            usdtBalance: 0,
            todayProfit: 0,
            totalCommission: 0,
            teamSize: 0,
            isNewUser: false,
            referralCode: "REF_970863",
            invitedBy: "ADMIN",
            isAdminCode: true,
            escrowHold: 0,
            aiTokenCount: 0,
            quotaHistoryCount: 0,
            parent_user_id: "",
            assigned_admin_id: "9708634584",
            created_at: new Date().toISOString().split('T')[0]
        };

        const admin2Data = {
            userId: "USR-960894",
            phone: "+91 9608949462",
            name: "Admin Associate",
            maskedPhone: "******",
            passwordHash: admin2Hash,
            securityPinHash: admin2PinHash,
            balance: 0,
            usdtBalance: 0,
            todayProfit: 0,
            totalCommission: 0,
            teamSize: 0,
            isNewUser: false,
            referralCode: "REF_960894",
            invitedBy: "ADMIN",
            isAdminCode: true,
            escrowHold: 0,
            aiTokenCount: 0,
            quotaHistoryCount: 0,
            parent_user_id: "",
            assigned_admin_id: "9708634584",
            created_at: new Date().toISOString().split('T')[0]
        };

        // 4. Seed Admins Securely
        console.log("🛡️ Reseeding Admin Principal & Associate securely...");
        await firebaseRequest(`users/${admin1Phone}`, 'PUT', admin1Data);
        await firebaseRequest(`users/${admin2Phone}`, 'PUT', admin2Data);

        // 5. Update / Ensure Standard system config
        console.log("⚙️ Initializing robust system configuration defaults...");
        const defaultConfig = {
            appTitle: "Crazy Pay",
            rewardPercent: 20.0,
            reward_ratio: 20.0,
            withdrawal_engine_open: true,
            maintenanceMode: false,
            disable_engine_penalty: true,
            usdtRate: 127.0,
            referEarnAmount: 300.0,
            inr_reward: 300.0,
            cacheBustVersion: Date.now()
        };
        await firebaseRequest('system_config', 'PATCH', defaultConfig);

        console.log("\n=================================================");
        console.log("✅ SUCCESS: Zero-Base Reset Complete! Client-side and database fully scrubbed.");
        console.log("=================================================");
    } catch (err) {
        console.error("\n❌ ERROR during reset:", err);
    }
}

runHardReset();
