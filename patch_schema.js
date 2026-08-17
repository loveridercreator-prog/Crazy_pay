const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

const regex = /Orders: \{/;
const injection = `UsdtOrders: {
                    tableName: "usdt_orders",
                    primaryKey: "id",
                    columns: {
                        id: "VARCHAR(64) PRIMARY KEY",
                        user_id: "VARCHAR(64) NOT NULL",
                        network: "VARCHAR(10) NOT NULL",
                        temp_address: "VARCHAR(128) NOT NULL",
                        expected_amount: "DECIMAL(18,6) NOT NULL",
                        received_amount: "DECIMAL(18,6) DEFAULT 0",
                        status: "ENUM('PENDING', 'SUCCESS', 'EXPIRED')",
                        tx_hash: "VARCHAR(128) UNIQUE",
                        master_wallet: "VARCHAR(128) NOT NULL"
                    },
                    raceConditionSafety: "UNIQUE INDEX (tx_hash) TO PREVENT DOUBLE SPENDING"
                },
                UsdtClaimedTxs: {
                    tableName: "usdt_claimed_txs",
                    primaryKey: "tx_hash",
                    columns: {
                        tx_hash: "VARCHAR(128) PRIMARY KEY",
                        orderId: "VARCHAR(64) NOT NULL",
                        amount: "DECIMAL(18,6)",
                        claimedAt: "BIGINT NOT NULL"
                    },
                    raceConditionSafety: "PRIMARY KEY (tx_hash) ENFORCES UNIQUE DB CONSTRAINT"
                },
                Orders: {`;

if (regex.test(s)) {
    s = s.replace(regex, injection);
    fs.writeFileSync('server.js', s);
    console.log("Schema patched.");
} else {
    console.log("Could not find schema block");
}
