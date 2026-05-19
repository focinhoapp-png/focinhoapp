const fs = require('fs');
const file = 'c:/Users/Ruan/Desktop/WebApps/FocinhoApp/focinhoapp/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Dashboard Grid - Parceiros -> Passeio
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
if (!content.includes(newCard)) {
  content = content.replace(oldCard.replace(/\n/g, '\r\n'), newCard.replace(/\n/g, '\r\n'));
}

// 2. Bell to PawPrint
content = content.replace('title="Notifica\u00e7\u00f5es"\r\n              >\r\n                <Bell', 'title="Notifica\u00e7\u00f5es"\r\n              >\r\n                <PawPrint');
content = content.replace('title="Notifica\u00e7\u00f5es"\n              >\n                <Bell', 'title="Notifica\u00e7\u00f5es"\n              >\n                <PawPrint');

content = content.replace('title="Notificações"\r\n              >\r\n                <Bell', 'title="Notificações"\r\n              >\r\n                <PawPrint');
content = content.replace('title="Notificações"\n              >\n                <Bell', 'title="Notificações"\n              >\n                <PawPrint');

content = content.replace('<Bell className="w-[22px] h-[22px] text-gray-900 shrink-0 group-hover:scale-110 transition-transform" />', '<PawPrint className="w-[22px] h-[22px] text-gray-900 shrink-0 group-hover:scale-110 transition-transform" />');
content = content.replace('<Bell className="w-5 h-5 text-gray-600" />', '<PawPrint className="w-5 h-5 text-gray-600" />');
content = content.replace('<BellOff className="w-8 h-8 text-gray-300" />', '<PawPrint className="w-8 h-8 text-gray-300" />');
content = content.replace('<Bell className="w-[22px] h-[22px] text-orange-500" />', '<PawPrint className="w-[22px] h-[22px] text-orange-500" />');

// 3. Remove Partners
content = content.replace(/interface Partner \{[\s\S]*?\}/, '');
content = content.replace(/const PARTNER_CATEGORIES = \['Todos',[^\]]+\];/, '');

const stateLines = `const [partners, setPartners] = useState<Partner[]>([]); // DB Partners
  const [partnerForm, setPartnerForm] = useState<Partial<Partner>>({ id: '', name: '', category: 'Pet Shops', description: '', location: '', logo: '', url: '' }); // Admin
  const [partnerMessage, setPartnerMessage] = useState<string | null>(null); // Admin`;

content = content.replace(stateLines, '');
content = content.replace(stateLines.replace(/\n/g, '\r\n'), '');

content = content.replace(/const \[activePartnerFilter, setActivePartnerFilter\] = useState\('Todos'\);/, '');

function removeBlockBefore(startStr, endStr) {
  const i1 = content.indexOf(startStr);
  if (i1 !== -1) {
    const i2 = content.indexOf(endStr, i1);
    if (i2 !== -1) {
       content = content.substring(0, i1) + content.substring(i2);
    }
  }
}

removeBlockBefore('// Fetch Partners', '  // Fetch Events');
removeBlockBefore('const handleSavePartner = async (e: React.FormEvent) => {', 'const getDashboardGreeting = () => {');
removeBlockBefore('{/* Partners Management */}', '{/* Admin Config */}');
removeBlockBefore("{accountSubView === 'partners' && (", "{accountSubView === 'events' && (");

content = content.replace(/\.\.\.partners\.filter[\s\S]*?\}\)\),/, '');

const btnStart = "<button\n                      onClick={() => setAccountSubView('partners')}";
const btnStartRN = "<button\r\n                      onClick={() => setAccountSubView('partners')}";
let iBtn = content.indexOf(btnStart);
if (iBtn === -1) iBtn = content.indexOf(btnStartRN);

if (iBtn !== -1) {
    let iEnd = content.indexOf("</button>", iBtn);
    if (iEnd !== -1) {
        content = content.substring(0, iBtn) + content.substring(iEnd + 9);
    }
}

content = content.replace("...partners.map(p => `part-${p.id}`),", "");
content = content.replace(/\{ key: 'partners', label: 'Lojas Parceiras',[^}]+\},/, "");
content = content.replace("partners: true,", "");
content = content.replace("products: true, partners: true", "products: true");
content = content.replace("menu, profile, pets, support, store, admin, partners", "menu, profile, pets, support, store, admin");
content = content.replace("setPartners((data || []) as Partner[]);", "");

fs.writeFileSync(file, content, 'utf8');
console.log('Restored state and removed partners properly via node file.');
