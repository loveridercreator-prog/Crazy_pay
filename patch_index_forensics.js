const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const forensicsJs = `
        async function runScreenshotForensicsAndFill(file) {
            try {
                // Read the file into memory
                const buffer = await file.arrayBuffer();
                
                showNotificationBroadcast("🔍 Running AI Forensics on Receipt...");
                
                const response = await fetch('/api/v1/forensics', {
                    method: 'POST',
                    body: buffer
                });
                
                const data = await response.json();
                if (data.success && data.extracted && data.extracted.utr) {
                    const utrField = document.getElementById('payment-utr-input');
                    if (utrField) {
                        utrField.value = data.extracted.utr;
                        showNotificationBroadcast("✅ AI Extracted UTR: " + data.extracted.utr);
                    }
                } else if (!data.success) {
                    showNotificationBroadcast("❌ Security Alert: " + (data.error || "Image analysis failed"));
                }
            } catch (e) {
                console.error("Forensics failed", e);
            }
        }
`;

if (!html.includes('runScreenshotForensicsAndFill')) {
    html = html.replace(/function uploadPaymentScreenshot\(\) \{/, forensicsJs + "\n        function uploadPaymentScreenshot() {");
    
    const fileChangeHook = `
            const fileInput = document.getElementById('payment-screenshot-upload');
            if (fileInput && fileInput.files && fileInput.files[0]) {
                runScreenshotForensicsAndFill(fileInput.files[0]);
            }
    `;
    // Find where the image is displayed
    const previewRegex = /const reader = new FileReader\(\);\s*reader\.onload = function\(e\) \{[\s\S]*?payment-screenshot-preview[\s\S]*?\};\s*reader\.readAsDataURL\(file\);/m;
    
    if (previewRegex.test(html)) {
        html = html.replace(previewRegex, `$&` + "\n" + fileChangeHook);
    }
}

fs.writeFileSync('index.html', html);
console.log("index.html forensics patched.");
