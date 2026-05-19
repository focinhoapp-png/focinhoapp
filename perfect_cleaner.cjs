const fs = require('fs');
const file = 'c:/Users/Ruan/Desktop/WebApps/FocinhoApp/focinhoapp/src/App.tsx';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

let newLines = [];
let skipState = 0; // 0 = keep, 1 = skip

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // 1. Remove Partners State
  if (line.includes('const [partners, setPartners] = useState<Partner[]>')) {
    skipState = 1;
  }
  if (skipState === 1 && line.includes('const [partnerMessage, setPartnerMessage]')) {
    skipState = 0;
    continue; // Skip the closing line too
  }

  // 2. Remove Admin Handler
  if (line.includes('const handleSavePartner = async (e: React.FormEvent) => {')) {
    skipState = 2;
  }
  if (skipState === 2 && line.includes('const handleSaveOwnerProfile = async () => {')) {
    skipState = 0;
  }

  // 3. Remove Admin Config Section
  if (line.includes('{/* Partners Management */}')) {
    skipState = 3;
  }
  if (skipState === 3 && line.includes('{/* Admin Config */}')) {
    skipState = 0;
  }

  // 4. Remove UI Partners Account View
  if (line.includes("{accountSubView === 'partners' && (")) {
    skipState = 4;
  }
  if (skipState === 4 && line.includes("{accountSubView === 'settingsPage' && (")) {
    skipState = 0;
  }

  // 5. Remove fetch channel
  if (line.includes('// Fetch Partners')) {
    skipState = 5;
  }
  if (skipState === 5 && line.includes('// Fetch Events')) {
    skipState = 0;
  }

  // 6. Remove button in Account menu
  if (line.includes("onClick={() => setAccountSubView('partners')}")) {
    // we need to remove this line, the previous line (<button), and next lines until </button>
    // Since newLines already has the previous line, pop it.
    newLines.pop();
    skipState = 6;
  }
  if (skipState === 6 && line.includes('</button>')) {
    skipState = 0;
    continue;
  }

  // Single line removals
  if (skipState === 0) {
    if (line.includes('...partners.map(p => `part-${p.id}`),')) continue;
    if (line.includes("{ key: 'partners', label: 'Lojas Parceiras',")) continue;
    if (line.includes('partners: true,')) continue;
    
    newLines.push(line);
  }
}

let content = newLines.join('\n');

// Global string replacements
content = content.replace("products: true, partners: true", "products: true");
content = content.replace("menu, profile, pets, support, store, admin, partners", "menu, profile, pets, support, store, admin");
content = content.replace(/interface Partner \{[\s\S]*?\}/, '');
content = content.replace(/const PARTNER_CATEGORIES = \['Todos',[^\]]+\];/, '');
content = content.replace(/const \[activePartnerFilter, setActivePartnerFilter\] = useState\('Todos'\);/, '');
content = content.replace(/\.\.\.partners\.filter[\s\S]*?\}\)\),/, '');
content = content.replace("setPartners((data || []) as Partner[]);", "");
content = content.replace(/const filteredPartners = useMemo\([\s\S]*?\}, \[partners, activePartnerFilter\]\);/, '');

const oldCard = `                      <div 
                        onClick={() => { setView('account'); setAccountSubView('partners'); }}
                        className="bg-white py-3 px-1 rounded-[1.5rem] border border-gray-100 flex flex-col items-center text-center gap-2 cursor-pointer hover:border-emerald-200 transition-all shadow-sm active:scale-95"
                      >
                        <div className="w-12 h-12 bg-emerald-50 rounded-[1rem] flex items-center justify-center">
                          <HeartHandshake className="w-[22px] h-[22px] text-emerald-500" />
                        </div>
                        <span className="text-[10px] font-black text-gray-700 leading-tight tracking-tight">Parceiros</span>
                      </div>`;
const newCard = `                      <div 
                        onClick={() => setView('walk')}
                        className="bg-white py-3 px-1 rounded-[1.5rem] border border-gray-100 flex flex-col items-center text-center gap-2 cursor-pointer hover:border-orange-200 transition-all shadow-sm active:scale-95"
                      >
                        <div className="w-12 h-12 bg-orange-50 rounded-[1rem] flex items-center justify-center">
                          <PawPrint className="w-[22px] h-[22px] text-orange-500" />
                        </div>
                        <span className="text-[10px] font-black text-gray-700 leading-tight tracking-tight">Passeio</span>
                      </div>`;

content = content.replace(oldCard, newCard);
content = content.replace(oldCard.replace(/\n/g, '\r\n'), newCard.replace(/\n/g, '\r\n'));

content = content.replace('title="Notifica\u00e7\u00f5es"\r\n              >\r\n                <Bell', 'title="Notifica\u00e7\u00f5es"\r\n              >\r\n                <PawPrint');
content = content.replace('title="Notifica\u00e7\u00f5es"\n              >\n                <Bell', 'title="Notifica\u00e7\u00f5es"\n              >\n                <PawPrint');

content = content.replace('title="Notificações"\r\n              >\r\n                <Bell', 'title="Notificações"\r\n              >\r\n                <PawPrint');
content = content.replace('title="Notificações"\n              >\n                <Bell', 'title="Notificações"\n              >\n                <PawPrint');

content = content.replace('<Bell className="w-[22px] h-[22px] text-gray-900 shrink-0 group-hover:scale-110 transition-transform" />', '<PawPrint className="w-[22px] h-[22px] text-gray-900 shrink-0 group-hover:scale-110 transition-transform" />');
content = content.replace('<Bell className="w-5 h-5 text-gray-600" />', '<PawPrint className="w-5 h-5 text-gray-600" />');
content = content.replace('<BellOff className="w-8 h-8 text-gray-300" />', '<PawPrint className="w-8 h-8 text-gray-300" />');
content = content.replace('<Bell className="w-[22px] h-[22px] text-orange-500" />', '<PawPrint className="w-[22px] h-[22px] text-orange-500" />');

fs.writeFileSync(file, content, 'utf8');
console.log('App.tsx perfectly cleaned!');
