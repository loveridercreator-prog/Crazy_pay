const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const regex = /if \(activeOrder && activeOrder\.amount > 0\) \{[\s\S]*?container\.innerHTML = `[\s\S]*?<h3 class="text-xl font-black text-gray-900 dark:text-white">₹\$\{amt\.toLocaleString\('en-IN', \{minimumFractionDigits: 2\}\)\}<\/h3>[\s\S]*?<button onclick="confirmAndPayNow\('\$\{orderId\}', \$\{amt\}, '\$\{provider\}'\)"[\s\S]*?<\/button>\s*<\/div>\s*`;/m;

const replacement = `if (activeOrder && (activeOrder.amount > 0 || activeOrder.displayAmount > 0)) {
                const orderId = activeOrder.id || activeOrder.orderId || "PAY1001";
                const payableAmt = parseFloat(activeOrder.amount || activeOrder.executionAmount || 0);
                const displayAmt = parseFloat(activeOrder.displayAmount !== undefined ? activeOrder.displayAmount : payableAmt);
                const provider = activeOrder.provider || activeOrder.channel || "MobiKwik";
                
                container.className = "block bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-rose-500/10 p-4 rounded-3xl border border-amber-500/30 text-left space-y-3 shadow-lg relative overflow-hidden transition-all";
                container.innerHTML = \`
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                            <span class="text-[10px] font-black uppercase tracking-widest text-amber-500">Active Payment Order</span>
                        </div>
                        <span class="text-[10px] font-mono font-bold text-gray-400">Match #\${orderId}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-xs text-gray-400 font-medium">Payment Amount</p>
                            <h3 class="text-xl font-black text-gray-900 dark:text-white">₹\${displayAmt.toLocaleString('en-IN', {minimumFractionDigits: 2})}</h3>
                            <p class="text-[10px] font-bold text-indigo-400">\${provider} Gateway</p>
                        </div>
                        <button onclick="confirmAndPayNow('\${orderId}', \${payableAmt}, '\${provider}')" class="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-orange-500/20 flex items-center gap-1.5 transition-all">
                            <i class="fa-solid fa-bolt animate-pulse text-yellow-300"></i>
                            <span>PAY NOW</span>
                        </button>
                    </div>
                \`;`;

if (regex.test(html)) {
    html = html.replace(regex, replacement);
    fs.writeFileSync('index.html', html);
    console.log("Regex replace successful!");
} else {
    console.log("Regex not matched.");
}
