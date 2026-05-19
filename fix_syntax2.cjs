const fs = require('fs');
const file = 'c:/Users/Ruan/Desktop/WebApps/FocinhoApp/focinhoapp/src/App.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split(/\r?\n/);

lines.splice(4001, 7); // removing 4002 to 4008 (indices 4001-4007)

fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('Fixed syntax error 2.');