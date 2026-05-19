const fs = require('fs');
const file = 'c:/Users/Ruan/Desktop/WebApps/FocinhoApp/focinhoapp/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove admin handlers for partners again
const h1 = content.indexOf('const handleSavePartner = ');
if (h1 > 0) {
  const hEnd = content.indexOf('const getDashboardGreeting = () => {', h1);
  if (hEnd > 0) {
     content = content.substring(0, h1) + content.substring(hEnd);
  }
}

// 2. Remove Admin UI Partners Management
const ui1 = content.indexOf('{/* Partners Management */}');
if (ui1 > 0) {
  const uiEnd = content.indexOf('{/* Admin Config */}', ui1);
  if (uiEnd > 0) {
     content = content.substring(0, ui1) + content.substring(uiEnd);
  }
}

// 3. Remove partners: true and mappings
content = content.replace(/\.\.\.partners\.map\(p => part-\$\{p\.id\}\),/g, "");
content = content.replace(/\.\.\.partners\.filter\(\(\) => notifPrefs\.partners\)\.map\(p => \(\{[\s\S]*?action: \(\) => \{ setAccountSubView\('partners'\); \},[\s\S]*?\}\)\),/g, "");
content = content.replace(/setPartners\(\(data \|\| \[\]\) as Partner\[\]\);/g, "");
content = content.replace(/menu, profile, pets, support, store, admin, partners/g, "menu, profile, pets, support, store, admin");
content = content.replace(/const \[activePartnerFilter, setActivePartnerFilter\] = useState\('Todos'\);/g, "");

fs.writeFileSync(file, content, 'utf8');
console.log('Removed 4th batch');