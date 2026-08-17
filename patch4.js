const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const targetStr = `        user.engineRoundOrderCount = nextRoundCount;
        user.engineTotalOrderCount = nextTotalCount;`;

const replacement = `        user.engineRoundOrderCount = nextRoundCount;
        user.engineTotalOrderCount = nextTotalCount;
        user.totalOrdersCreated = nextTotalOrdersCreated;`;

const targetRegex = new RegExp(targetStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'));
if (targetRegex.test(serverJs)) {
    serverJs = serverJs.replace(targetRegex, replacement);
    fs.writeFileSync('server.js', serverJs);
    console.log("Replaced patch4 successfully!");
} else {
    console.log("Target patch4 not found!");
}
