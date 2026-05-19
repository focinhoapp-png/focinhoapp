const fs = require('fs');
const file = 'c:/Users/Ruan/Desktop/WebApps/FocinhoApp/focinhoapp/src/App.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split(/\r?\n/);

lines.splice(2696, 5); // remove lines 2697 to 2701 (indices 2696-2700)

fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('Fixed syntax error.');