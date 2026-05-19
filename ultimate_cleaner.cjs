const fs = require('fs');
const file = 'c:/Users/Ruan/Desktop/WebApps/FocinhoApp/focinhoapp/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

function removeBlock(startStr, endStr) {
  const i1 = content.indexOf(startStr);
  if (i1 === -1) {
    console.log(`Could not find start: ${startStr.substring(0, 30)}...`);
    return;
  }
  const i2 = content.indexOf(endStr, i1);
  if (i2 === -1) {
    console.log(`Could not find end: ${endStr.substring(0, 30)}... after start ${startStr.substring(0, 30)}`);
    return;
  }
  content = content.substring(0, i1) + content.substring(i2);
}

// 1. Remove Partners State
removeBlock('const [partners, setPartners] = useState<Partner[]>([])', 'const [lostAlerts, setLostAlerts]');

// 2. Remove Admin Handler
removeBlock('const handleSavePartner = async (e: React.FormEvent) => {', 'const handleSaveOwnerProfile = async () => {');

// 3. Remove Admin Config Section
removeBlock('{/* Partners Management */}', '{/* Events Management */}');

// 4. Remove UI Partners Account View
removeBlock("{accountSubView === 'partners' && (", "{/* ═══════════════════════════════════════\r\n                    SETTINGS PAGE");
removeBlock("{accountSubView === 'partners' && (", "{/* ═══════════════════════════════════════\n                    SETTINGS PAGE");

// 5. Remove fetch channel
removeBlock('// Fetch Partners', '// Fetch Events');

// 6. Remove button in Account menu
let btnStart = "<button\r\n                      onClick={() => setAccountSubView('partners')}";
if (!content.includes(btnStart)) btnStart = "<button\n                      onClick={() => setAccountSubView('partners')}";

let iBtn = content.indexOf(btnStart);
if (iBtn !== -1) {
    let iEnd = content.indexOf("</button>", iBtn);
    if (iEnd !== -1) {
        content = content.substring(0, iBtn) + content.substring(iEnd + 9);
    }
}

// 7. Remove single line variables and interface
content = content.replace("...partners.map(p => `part-${p.id}`),", "");
content = content.replace(/\{ key: 'partners', label: 'Lojas Parceiras',[^}]+\},/g, "");
content = content.replace("partners: true,", "");
content = content.replace("products: true, partners: true", "products: true");
content = content.replace("menu, profile, pets, support, store, admin, partners", "menu, profile, pets, support, store, admin");
content = content.replace(/interface Partner \{[\s\S]*?\}/g, '');
content = content.replace(/const PARTNER_CATEGORIES = \['Todos',[^\]]+\];/g, '');
content = content.replace(/const \[activePartnerFilter, setActivePartnerFilter\] = useState\('Todos'\);/g, '');
content = content.replace(/\.\.\.partners\.filter[\s\S]*?\}\)\),/g, '');
content = content.replace("setPartners((data || []) as Partner[]);", "");
content = content.replace(/const filteredPartners = useMemo\([\s\S]*?\}, \[partners, activePartnerFilter\]\);/g, '');

// 8. Replace Dashboard Card
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

// 9. Rename Bell to PawPrint
content = content.replace('title="Notifica\u00e7\u00f5es"\r\n              >\r\n                <Bell', 'title="Notifica\u00e7\u00f5es"\r\n              >\r\n                <PawPrint');
content = content.replace('title="Notifica\u00e7\u00f5es"\n              >\n                <Bell', 'title="Notifica\u00e7\u00f5es"\n              >\n                <PawPrint');

content = content.replace('title="Notificações"\r\n              >\r\n                <Bell', 'title="Notificações"\r\n              >\r\n                <PawPrint');
content = content.replace('title="Notificações"\n              >\n                <Bell', 'title="Notificações"\n              >\n                <PawPrint');

content = content.replace('<Bell className="w-[22px] h-[22px] text-gray-900 shrink-0 group-hover:scale-110 transition-transform" />', '<PawPrint className="w-[22px] h-[22px] text-gray-900 shrink-0 group-hover:scale-110 transition-transform" />');
content = content.replace('<Bell className="w-5 h-5 text-gray-600" />', '<PawPrint className="w-5 h-5 text-gray-600" />');
content = content.replace('<BellOff className="w-8 h-8 text-gray-300" />', '<PawPrint className="w-8 h-8 text-gray-300" />');
content = content.replace('<Bell className="w-[22px] h-[22px] text-orange-500" />', '<PawPrint className="w-[22px] h-[22px] text-orange-500" />');

fs.writeFileSync(file, content, 'utf8');
console.log('App.tsx effectively cleaned!');
