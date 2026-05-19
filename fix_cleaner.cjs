const fs = require('fs');
const file = 'c:/Users/Ruan/Desktop/WebApps/FocinhoApp/focinhoapp/perfect_cleaner.cjs';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `if (skipState === 4 && line.includes("{accountSubView === 'support' && (")) {`,
  `if (skipState === 4 && line.includes("{accountSubView === 'settingsPage' && (")) {`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed the cleaner script!');
