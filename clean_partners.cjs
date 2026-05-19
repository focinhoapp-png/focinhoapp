const fs = require('fs');
const file = 'c:/Users/Ruan/Desktop/WebApps/FocinhoApp/focinhoapp/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const s1 = '...partners.map(p => part-\),';
content = content.split(s1).join('');

const hStart = 'const handleSavePartner = async (e: React.FormEvent) => {';
const hEnd = 'const getDashboardGreeting = () => {';
const idx1 = content.indexOf(hStart);
if (idx1 > 0) {
  const idx2 = content.indexOf(hEnd, idx1);
  if (idx2 > 0) {
    content = content.substring(0, idx1) + content.substring(idx2);
  }
}

const adminStart = '{/* Partners Management */}';
const adminEnd = '{/* Eventos Management */}';
const idx3 = content.indexOf(adminStart);
if (idx3 > 0) {
  let endBlock = content.indexOf(adminEnd, idx3);
  if(endBlock === -1) endBlock = content.indexOf('{/* Admin Config */}', idx3);
  if (endBlock > 0) {
     content = content.substring(0, idx3) + content.substring(endBlock);
  }
}

fs.writeFileSync(file, content, 'utf8');
console.log('Cleanup done.');