const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const oldToggleMaster = `        function toggleOrderCreationMaster(active) {
            try {
                if (!window.systemConfig) window.systemConfig = {};
                window.systemConfig.orderCreationEnabled = active;
                window.systemConfig.withdrawal_engine_open = active;
                window.systemConfig.backend_controller_active = active;
                
                if (typeof Backend_Controller !== 'undefined') {
                    Backend_Controller.active = active;
                }

                if (database) {
                    database.ref('system_config').update({
                        orderCreationEnabled: active,
                        withdrawal_engine_open: active,
                        backend_controller_active: active
                    }).catch(e => console.warn('Database config update error:', e));
                }`;

const newToggleMaster = `        async function toggleOrderCreationMaster(active) {
            try {
                if (!window.systemConfig) window.systemConfig = {};
                window.systemConfig.orderCreationEnabled = active;
                window.systemConfig.withdrawal_engine_open = active;
                window.systemConfig.backend_controller_active = active;
                
                if (typeof Backend_Controller !== 'undefined') {
                    Backend_Controller.active = active;
                }

                if (database) {
                    database.ref('system_config').update({
                        orderCreationEnabled: active,
                        withdrawal_engine_open: active,
                        backend_controller_active: active
                    }).catch(e => console.warn('Database config update error:', e));
                }

                // Call Backend API to enforce PostgreSQL / Redis Cache Lock
                await fetch('/api/toggle_master_switch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ active: active })
                });`;

if (html.includes(oldToggleMaster)) {
    html = html.replace(oldToggleMaster, newToggleMaster);
} else {
    console.log("Could not find toggleOrderCreationMaster");
}

const oldToggleWeb = `        function toggleWebWithdrawalEngine(active) {
            if (database) {
                database.ref('system_config/withdrawal_engine_open').set(active);
                database.ref('system_config/orderCreationEnabled').set(active);
                if (!window.systemConfig) window.systemConfig = {};
                window.systemConfig.withdrawal_engine_open = active;
                window.systemConfig.orderCreationEnabled = active;`;

const newToggleWeb = `        async function toggleWebWithdrawalEngine(active) {
            if (database) {
                database.ref('system_config/withdrawal_engine_open').set(active);
                database.ref('system_config/orderCreationEnabled').set(active);
                if (!window.systemConfig) window.systemConfig = {};
                window.systemConfig.withdrawal_engine_open = active;
                window.systemConfig.orderCreationEnabled = active;
                
                await fetch('/api/toggle_master_switch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ active: active })
                });`;

if (html.includes(oldToggleWeb)) {
    html = html.replace(oldToggleWeb, newToggleWeb);
} else {
    console.log("Could not find toggleWebWithdrawalEngine");
}

fs.writeFileSync('index.html', html);
console.log("index.html patched");
