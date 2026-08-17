const fs = require('fs');
let s = fs.readFileSync('app/src/main/java/com/example/ui/screens/CrazyPayScreens.kt', 'utf8');

s = s.replace(/colors = TextFieldDefaults\.outlinedTextFieldColors\(\n *focusedBorderColor = BrandElectricGreen,\n *textColor = BrandTextPrimary\n *\)/g, 
"colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = BrandElectricGreen, focusedTextColor = BrandTextPrimary, unfocusedTextColor = BrandTextPrimary)");

s = s.replace(/colors = TextFieldDefaults\.outlinedTextFieldColors\(textColor = BrandTextPrimary\)/g, 
"colors = OutlinedTextFieldDefaults.colors(focusedTextColor = BrandTextPrimary, unfocusedTextColor = BrandTextPrimary)");

fs.writeFileSync('app/src/main/java/com/example/ui/screens/CrazyPayScreens.kt', s);
