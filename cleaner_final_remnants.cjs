const fs = require('fs');
const file = 'c:/Users/Ruan/Desktop/WebApps/FocinhoApp/focinhoapp/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/const filteredPartners = useMemo\([\s\S]*?\}, \[partners, activePartnerFilter\]\);/, '');

fs.writeFileSync(file, content, 'utf8');
console.log('Final cleanup!');
