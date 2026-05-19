const fs = require('fs');
const file = 'c:/Users/Ruan/Desktop/WebApps/FocinhoApp/focinhoapp/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Dashboard Grid
let oldCard = '                      <div \\n' +
'                        onClick={() => { setView(\\'account\\'); setAccountSubView(\\'partners\\'); }}\\n' +
'                        className="bg-white py-3 px-1 rounded-[1.5rem] border border-gray-100 flex flex-col items-center text-center gap-2 cursor-pointer hover:border-emerald-200 transition-all shadow-sm active:scale-95"\\n' +
'                      >\\n' +
'                        <div className="w-12 h-12 bg-emerald-50 rounded-[1rem] flex items-center justify-center">\\n' +
'                          <HeartHandshake className="w-[22px] h-[22px] text-emerald-500" />\\n' +
'                        </div>\\n' +
'                        <span className="text-[10px] font-black text-gray-700 leading-tight tracking-tight">Parceiros</span>\\n' +
'                      </div>';

let newCard = '                      <div \\n' +
'                        onClick={() => setView(\\'walk\\')}\\n' +
'                        className="bg-white py-3 px-1 rounded-[1.5rem] border border-gray-100 flex flex-col items-center text-center gap-2 cursor-pointer hover:border-orange-200 transition-all shadow-sm active:scale-95"\\n' +
'                      >\\n' +
'                        <div className="w-12 h-12 bg-orange-50 rounded-[1rem] flex items-center justify-center">\\n' +
'                          <PawPrint className="w-[22px] h-[22px] text-orange-500" />\\n' +
'                        </div>\\n' +
'                        <span className="text-[10px] font-black text-gray-700 leading-tight tracking-tight">Passeio</span>\\n' +
'                      </div>';

// We must accommodate \r\n vs \n
oldCard = oldCard.replace(/\n/g, '\r\n');
newCard = newCard.replace(/\n/g, '\r\n');

if (content.includes(oldCard)) {
   content = content.replace(oldCard, newCard);
} else {
   oldCard = oldCard.replace(/\r\n/g, '\n');
   newCard = newCard.replace(/\r\n/g, '\n');
   content = content.replace(oldCard, newCard);
}

// 2. Bell to PawPrint
content = content.replace('title="Notifica\\u00e7\\u00f5es"\\r\\n              >\\r\\n                <Bell', 'title="Notifica\\u00e7\\u00f5es"\\r\\n              >\\r\\n                <PawPrint');
content = content.replace('title="Notificações"\\r\\n              >\\r\\n                <Bell', 'title="Notificações"\\r\\n              >\\r\\n                <PawPrint');
content = content.replace('<Bell className="w-[22px] h-[22px] text-gray-900 shrink-0 group-hover:scale-110 transition-transform" />', '<PawPrint className="w-[22px] h-[22px] text-gray-900 shrink-0 group-hover:scale-110 transition-transform" />');
content = content.replace('<Bell className="w-5 h-5 text-gray-600" />', '<PawPrint className="w-5 h-5 text-gray-600" />');
content = content.replace('<BellOff className="w-8 h-8 text-gray-300" />', '<PawPrint className="w-8 h-8 text-gray-300" />');
content = content.replace('<Bell className="w-[22px] h-[22px] text-orange-500" />', '<PawPrint className="w-[22px] h-[22px] text-orange-500" />');

// 3. Remove Partners
content = content.replace(/interface Partner \\{[\\s\\S]*?\\}/, '');
content = content.replace(/const PARTNER_CATEGORIES = \\['Todos',[^\\]]+\\];/, '');

let stateLines = "const [partners, setPartners] = useState<Partner[]>([]); // DB Partners\\r\\n  const [partnerForm, setPartnerForm] = useState<Partial<Partner>>({ id: '', name: '', category: 'Pet Shops', description: '', location: '', logo: '', url: '' }); // Admin\\r\\n  const [partnerMessage, setPartnerMessage] = useState<string | null>(null); // Admin";
if (content.includes(stateLines)) {
   content = content.replace(stateLines, '');
} else {
   content = content.replace(stateLines.replace(/\\r\\n/g, '\\n'), '');
}

content = content.replace(/const \\[activePartnerFilter, setActivePartnerFilter\\] = useState\\('Todos'\\);/, '');

function removeBetween(startStr, endStr) {
    let i1 = content.indexOf(startStr);
    if (i1 !== -1) {
        let i2 = content.indexOf(endStr, i1);
        if (i2 !== -1) {
            content = content.substring(0, i1) + content.substring(i2);
        }
    }
}

removeBetween('// Fetch Partners', '  // Fetch Events');
removeBetween('const handleSavePartner = async (e: React.FormEvent) => {', 'const getDashboardGreeting = () => {');
removeBetween('{/* Partners Management */}', '{/* Admin Config */}');
removeBetween("{accountSubView === 'partners' && (", "{accountSubView === 'events' && (");

content = content.replace(/\\.\\.\\.partners\\.filter[\\s\\S]*?\\}\\)\\),/, '');

let btnStart = "<button\\r\\n                      onClick={() => setAccountSubView('partners')}";
let iBtn = content.indexOf(btnStart);
if (iBtn === -1) {
   btnStart = "<button\\n                      onClick={() => setAccountSubView('partners')}";
   iBtn = content.indexOf(btnStart);
}
if (iBtn !== -1) {
    let iEnd = content.indexOf("</button>", iBtn);
    if (iEnd !== -1) {
        content = content.substring(0, iBtn) + content.substring(iEnd + 9);
    }
}

// Replace backticks using String.fromCharCode(96) to avoid issues with powershell
const backtick = String.fromCharCode(96);
const stringToReplace = '...partners.map(p => ' + backtick + 'part-' + backtick + '),';
content = content.replace(stringToReplace, "");

content = content.replace(/\\{ key: 'partners', label: 'Lojas Parceiras',[^\\]]+\\},/, '');
content = content.replace("partners: true,", "");
content = content.replace("products: true, partners: true", "products: true");
content = content.replace("menu, profile, pets, support, store, admin, partners", "menu, profile, pets, support, store, admin");
content = content.replace("setPartners((data || []) as Partner[]);", "");

fs.writeFileSync(file, content, 'utf8');
console.log('Done in node!');