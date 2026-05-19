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
  if (skip && line.includes('const handleSaveOwnerProfile = async () => {')) {
    skip = false;
  }

  // Remove Admin UI
  if (line.includes('{/* Partners Management */}')) skip = true;
  if (skip && line.includes('{/* Admin Config */}')) {
    skip = false;
  }

  // Remove Partners Button from Menu
  if (line.includes("onClick={() => setAccountSubView('partners')}")) {
    newLines.pop(); // remove <button line
    while (!lines[i].includes('</button>')) {
        i++;
    }
    continue;
  }
  
  // Remove Fetch Partners
  if (line.includes('// Fetch Partners')) skip = true;
  if (skip && line.includes('// Fetch Events')) {
     skip = false;
  }

  // Remove small remnants
  if (line.includes('...partners.map(p => `part-${p.id}`),')) continue;
  if (line.includes("{ key: 'partners', label: 'Lojas Parceiras'")) continue;
  if (line.includes('partners: true,')) continue;
  if (line.includes('return () => { supabase.removeChannel(channel); };')) {
      // Wait, there are multiple of these. Let's not blindly remove them.
      // But the one for fetchPartners is between // Fetch Partners and // Fetch Events which is already skipped!
  }
  
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
finalContent = finalContent.replace("setPartners((data || []) as Partner[]);", "");

// UI and notification icons replacement
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

finalContent = finalContent.replace(oldCard, newCard);
finalContent = finalContent.replace(oldCard.replace(/\n/g, '\r\n'), newCard.replace(/\n/g, '\r\n'));
finalContent = finalContent.replace(oldCard.replace(/\r\n/g, '\n'), newCard.replace(/\r\n/g, '\n'));

finalContent = finalContent.replace('title="Notifica\u00e7\u00f5es"\r\n              >\r\n                <Bell', 'title="Notifica\u00e7\u00f5es"\r\n              >\r\n                <PawPrint');
finalContent = finalContent.replace('title="Notifica\u00e7\u00f5es"\n              >\n                <Bell', 'title="Notifica\u00e7\u00f5es"\n              >\n                <PawPrint');

finalContent = finalContent.replace('title="Notificações"\r\n              >\r\n                <Bell', 'title="Notificações"\r\n              >\r\n                <PawPrint');
finalContent = finalContent.replace('title="Notificações"\n              >\n                <Bell', 'title="Notificações"\n              >\n                <PawPrint');

finalContent = finalContent.replace('<Bell className="w-[22px] h-[22px] text-gray-900 shrink-0 group-hover:scale-110 transition-transform" />', '<PawPrint className="w-[22px] h-[22px] text-gray-900 shrink-0 group-hover:scale-110 transition-transform" />');
finalContent = finalContent.replace('<Bell className="w-5 h-5 text-gray-600" />', '<PawPrint className="w-5 h-5 text-gray-600" />');
finalContent = finalContent.replace('<BellOff className="w-8 h-8 text-gray-300" />', '<PawPrint className="w-8 h-8 text-gray-300" />');
finalContent = finalContent.replace('<Bell className="w-[22px] h-[22px] text-orange-500" />', '<PawPrint className="w-[22px] h-[22px] text-orange-500" />');

fs.writeFileSync(file, finalContent, 'utf8');
console.log('Done cleaning correctly!');
