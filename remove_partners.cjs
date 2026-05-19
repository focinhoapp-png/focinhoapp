const fs = require('fs');
const file = 'c:/Users/Ruan/Desktop/WebApps/FocinhoApp/focinhoapp/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/const \[partners, setPartners\] = useState<Partner\[\]>\(\[\]\);/g, '');
content = content.replace(/const handleSavePartner = async \([^]*?const getDashboardGreeting = \(\) => \{/g, 'const getDashboardGreeting = () => {');
content = content.replace(/\{\/\* Partners Management \*\/\}[\s\S]*?\{\/\* Admin Config \*\/\}/g, '{/* Admin Config */}');
content = content.replace(/partners: true,/g, '');
content = content.replace(/products: true, partners: true/g, 'products: true');
content = content.replace(/\{ key: 'partners', label: 'Lojas Parceiras',[^}]+\},/g, '');
content = content.replace(/\.\.\.partners\.map\(p => part-\$\{p\.id\}\),/g, '');
content = content.replace(/<button[^>]+onClick=\{\(\) => setAccountSubView\('partners'\)\}[^>]+>[\s\S]*?<\/button>/g, '');
content = content.replace(/setPartners\(\(data \|\| \[\]\) as Partner\[\]\);/g, '');
content = content.replace(/const \[activePartnerFilter, setActivePartnerFilter\] = useState\('Todos'\);/g, '');
content = content.replace(/menu, profile, pets, support, store, admin, partners/g, 'menu, profile, pets, support, store, admin');
content = content.replace(/\/\/ Partners[\s\S]*?action: \(\) => \{ setAccountSubView\('partners'\); \},[\s\S]*?\}\)\),/g, '');

fs.writeFileSync(file, content, 'utf8');
console.log('Done');