const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

s = s.replace(/generatedPrecise = precisePayableAmount;\s*\} else \{\s*\/\/ UNIQUE PAISA DISCOUNT ENGINE\s*\/\/ Random variation of \.01 to \.99 instead of strict \.10 to 1\.99\s*const randomVariation = parseFloat\(\(Math\.random\(\) \* \(0\.99 - 0\.01\) \+ 0\.01\)\.toFixed\(2\)\);\s*\}\s*generatedPrecise = parseFloat\(\(selectedAmount - randomVariation\)\.toFixed\(2\)\);\s*/, 
`generatedPrecise = precisePayableAmount;
        } else {
            // UNIQUE PAISA DISCOUNT ENGINE
            // Random variation of .01 to .99 instead of strict .10 to 1.99
            const randomVariation = parseFloat((Math.random() * (0.99 - 0.01) + 0.01).toFixed(2));
            generatedPrecise = parseFloat((selectedAmount - randomVariation).toFixed(2));
        }
`);
fs.writeFileSync('server.js', s);
