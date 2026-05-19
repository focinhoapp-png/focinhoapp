const fs = require('fs');
const file = 'c:/Users/Ruan/Desktop/WebApps/FocinhoApp/focinhoapp/src/App.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split(/\r?\n/);

let newLines = [];
let skip = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes('...partners.map(p => part-),')) continue;

  if (line.includes('{/* Partners Management */}')) {
    skip = true;
  }

  if (skip && (line.includes('{/* Eventos Management */}') || line.includes('{/* Admin Config */}'))) {
    skip = false;
  }

  if (line.includes('const handleSavePartner = ')) {
    skip = true;
  }

  if (skip && line.includes('const getDashboardGreeting = ')) {
    skip = false;
  }

  if (!skip) {
    newLines.push(line);
  }
}

fs.writeFileSync(file, newLines.join('\n'), 'utf8');
console.log('Cleanup done by lines.');