const fs = require('fs');
const file = 'c:/Users/Ruan/Desktop/WebApps/FocinhoApp/focinhoapp/src/App.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split(/\r?\n/);

let newLines = [];
let skip = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes('...partners.map(p =>')) {
     continue;
  }

  if (!skip) {
    newLines.push(line);
  }
}

fs.writeFileSync(file, newLines.join('\n'), 'utf8');
console.log('Cleanup maps done.');