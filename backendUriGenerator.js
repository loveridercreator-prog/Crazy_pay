function generateUpiIntentUri(provider, targetUpiId, sellerName, amtVal, orderId) {
    const encodedSellerName = encodeURIComponent(sellerName || "CRAZY PAY MERCHANT");
    const amountStr = parseFloat(amtVal).toFixed(2);
    
    let baseUri = `upi://pay?pa=${targetUpiId}&pn=${encodedSellerName}&am=${amountStr}&tr=${orderId}&tn=${orderId}&cu=INR`;
    
    if (!provider) return baseUri;
    
    const provLower = provider.toLowerCase();
    
    if (provLower.includes("mobikwik")) {
        return `intent://pay?pa=${targetUpiId}&pn=${encodedSellerName}&am=${amountStr}&tr=${orderId}&tn=${orderId}&cu=INR#Intent;scheme=upi;package=com.mobikwik_new;end`;
    } else if (provLower.includes("paytm")) {
        return `intent://pay?pa=${targetUpiId}&pn=${encodedSellerName}&am=${amountStr}&tr=${orderId}&tn=${orderId}&cu=INR#Intent;scheme=upi;package=net.one97.paytm;end`;
    } else if (provLower.includes("phonepe")) {
        return `intent://pay?pa=${targetUpiId}&pn=${encodedSellerName}&am=${amountStr}&tr=${orderId}&tn=${orderId}&cu=INR#Intent;scheme=upi;package=com.phonepe.app;end`;
    } else if (provLower.includes("gpay") || provLower.includes("google")) {
        return `intent://pay?pa=${targetUpiId}&pn=${encodedSellerName}&am=${amountStr}&tr=${orderId}&tn=${orderId}&cu=INR#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
    }
    
    return baseUri;
}

module.exports = {
    generateUpiIntentUri
};
