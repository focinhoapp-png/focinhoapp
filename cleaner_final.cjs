const fs = require('fs');
const file = 'c:/Users/Ruan/Desktop/WebApps/FocinhoApp/focinhoapp/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

function removeBlockBefore(startStr, endStr) {
  const i1 = content.indexOf(startStr);
  if (i1 !== -1) {
    const i2 = content.indexOf(endStr, i1);
    if (i2 !== -1) {
       content = content.substring(0, i1) + content.substring(i2);
    }
  }
}

removeBlockBefore("{accountSubView === 'partners' && (", "{accountSubView === 'support' && (");

content = content.replace("...partners.map(p => `part-${p.id}`),", "");
content = content.replace(/\{ key: 'partners', label: 'Lojas Parceiras',[^}]+\},/, "");
content = content.replace("partners: true,", "");

fs.writeFileSync(file, content, 'utf8');
console.log('Final cleanup!');
