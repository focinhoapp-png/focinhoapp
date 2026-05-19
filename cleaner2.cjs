const fs = require('fs');
const file = 'c:/Users/Ruan/Desktop/WebApps/FocinhoApp/focinhoapp/src/App.tsx';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
let newLines = [];
let skip = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Remove State
  if (line.includes('const [partners, setPartners] = useState<Partner[]>')) skip = true;
  if (skip && line.includes('const [partnerMessage, setPartnerMessage] = useState<string | null>(null);')) {
    skip = false;
    continue;
  }
  
  // Remove Admin Handlers
  if (line.includes('const handleSavePartner = async ')) skip = true;
  if (skip && line.includes('const getDashboardGreeting = () => {')) {
    skip = false;
  }

  // Remove Admin UI
  if (line.includes('{/* Partners Management */}')) skip = true;
  if (skip && line.includes('{/* Admin Config */}')) {
    skip = false;
  }

  // Remove Partners Button from Menu
  if (line.includes("onClick={() => setAccountSubView('partners')}")) {
    // The button spans from <button to </button>.
    // Since we process line by line, let's remove the previous line (<button)
    // and the next lines until </button>
    newLines.pop(); // remove <button line
    while (!lines[i].includes('</button>')) {
        i++;
    }
    continue;
  }
  
  // Remove Fetch Partners
  if (line.includes('// Fetch Partners')) skip = true;
  if (skip && line.includes('// Fetch Events')) skip = false;

  // Remove small remnants
  if (line.includes('...partners.map(p => `part-${p.id}`),')) continue;
  if (line.includes("{ key: 'partners', label: 'Lojas Parceiras'")) continue;
  if (line.includes('partners: true,')) continue;
  
  if (!skip) {
     newLines.push(line);
  }
}

// Global replaces on the joined string for single-line leftovers
let finalContent = newLines.join('\n');
finalContent = finalContent.replace("products: true, partners: true", "products: true");
finalContent = finalContent.replace("menu, profile, pets, support, store, admin, partners", "menu, profile, pets, support, store, admin");
finalContent = finalContent.replace(/interface Partner \{[\s\S]*?\}/, '');
finalContent = finalContent.replace(/const PARTNER_CATEGORIES = \['Todos',[^\]]+\];/, '');
finalContent = finalContent.replace(/const \[activePartnerFilter, setActivePartnerFilter\] = useState\('Todos'\);/, '');
finalContent = finalContent.replace(/\.\.\.partners\.filter[\s\S]*?\}\)\),/, '');

fs.writeFileSync(file, finalContent, 'utf8');
console.log('Done!');
