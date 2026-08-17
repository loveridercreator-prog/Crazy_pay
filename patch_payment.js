const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetStr = `                    <div class="flex justify-between items-center">
                        <span id="terminal-counterparty-role" class="text-white/60 font-medium">Seller's UPI ID:</span>
                        <span id="terminal-upi-id" class="font-mono font-extrabold text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">crazypaymerchant@ybl</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-white/60 font-medium">Trading Volume Value:</span>
                        <span id="terminal-amount" class="font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-200 text-lg">₹5,000.00</span>
                    </div>`;

const replacement = `                    <div class="flex justify-between items-center">
                        <span id="terminal-counterparty-role" class="text-white/60 font-medium">Seller's UPI ID:</span>
                        <div class="flex items-center gap-2">
                            <span id="terminal-upi-id" class="font-mono font-extrabold text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">crazypaymerchant@ybl</span>
                            <button onclick="navigator.clipboard.writeText(document.getElementById('terminal-upi-id').innerText); showNotificationBroadcast('📋 Seller UPI ID Copied!')" class="text-gray-400 hover:text-white transition-colors bg-white/5 p-1.5 rounded-lg border border-white/10 active:scale-95"><i class="fa-regular fa-copy"></i></button>
                        </div>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-white/60 font-medium">Trading Volume Value:</span>
                        <div class="flex items-center gap-2">
                            <span id="terminal-amount" class="font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-200 text-lg">₹5,000.00</span>
                            <button onclick="navigator.clipboard.writeText(currentTerminalAmount); showNotificationBroadcast('📋 Amount Copied!')" class="text-gray-400 hover:text-white transition-colors bg-white/5 p-1.5 rounded-lg border border-white/10 active:scale-95"><i class="fa-regular fa-copy"></i></button>
                        </div>
                    </div>`;

const targetRegex = new RegExp(targetStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'));
if (targetRegex.test(html)) {
    html = html.replace(targetRegex, replacement);
    fs.writeFileSync('index.html', html);
    console.log("Replaced successfully!");
} else {
    console.log("Target not found!");
}
