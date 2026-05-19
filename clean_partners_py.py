import os

filepath = 'c:/Users/Ruan/Desktop/WebApps/FocinhoApp/focinhoapp/src/App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Dashboard Grid - Parceiros -> Passeio
old_card = """                      <div 
                        onClick={() => { setView('account'); setAccountSubView('partners'); }}
                        className="bg-white py-3 px-1 rounded-[1.5rem] border border-gray-100 flex flex-col items-center text-center gap-2 cursor-pointer hover:border-emerald-200 transition-all shadow-sm active:scale-95"
                      >
                        <div className="w-12 h-12 bg-emerald-50 rounded-[1rem] flex items-center justify-center">
                          <HeartHandshake className="w-[22px] h-[22px] text-emerald-500" />
                        </div>
                        <span className="text-[10px] font-black text-gray-700 leading-tight tracking-tight">Parceiros</span>
                      </div>"""
new_card = """                      <div 
                        onClick={() => setView('walk')}
                        className="bg-white py-3 px-1 rounded-[1.5rem] border border-gray-100 flex flex-col items-center text-center gap-2 cursor-pointer hover:border-orange-200 transition-all shadow-sm active:scale-95"
                      >
                        <div className="w-12 h-12 bg-orange-50 rounded-[1rem] flex items-center justify-center">
                          <PawPrint className="w-[22px] h-[22px] text-orange-500" />
                        </div>
                        <span className="text-[10px] font-black text-gray-700 leading-tight tracking-tight">Passeio</span>
                      </div>"""
content = content.replace(old_card, new_card)

# 2. Bell to PawPrint
content = content.replace('title="Notifica\u00e7\u00f5es"\n              >\n                <Bell', 'title="Notifica\u00e7\u00f5es"\n              >\n                <PawPrint')
content = content.replace('title="Notificações"\n              >\n                <Bell', 'title="Notificações"\n              >\n                <PawPrint')
content = content.replace('<Bell className="w-[22px] h-[22px] text-gray-900 shrink-0 group-hover:scale-110 transition-transform" />', '<PawPrint className="w-[22px] h-[22px] text-gray-900 shrink-0 group-hover:scale-110 transition-transform" />')
content = content.replace('<Bell className="w-5 h-5 text-gray-600" />', '<PawPrint className="w-5 h-5 text-gray-600" />')
content = content.replace('<BellOff className="w-8 h-8 text-gray-300" />', '<PawPrint className="w-8 h-8 text-gray-300" />')
content = content.replace('<Bell className="w-[22px] h-[22px] text-orange-500" />', '<PawPrint className="w-[22px] h-[22px] text-orange-500" />')

import re
# 3. Remove Partners
content = re.sub(r'interface Partner \{[\s\S]*?\}', '', content)
content = re.sub(r"const PARTNER_CATEGORIES = \['Todos',[^\]]+\];", '', content)

state_lines = """const [partners, setPartners] = useState<Partner[]>([]); // DB Partners
  const [partnerForm, setPartnerForm] = useState<Partial<Partner>>({ id: '', name: '', category: 'Pet Shops', description: '', location: '', logo: '', url: '' }); // Admin
  const [partnerMessage, setPartnerMessage] = useState<string | null>(null); // Admin"""
content = content.replace(state_lines, '')
content = re.sub(r"const \[activePartnerFilter, setActivePartnerFilter\] = useState\('Todos'\);", '', content)

def remove_block_before(start_str, end_str):
    global content
    i1 = content.find(start_str)
    if i1 != -1:
        i2 = content.find(end_str, i1)
        if i2 != -1:
            content = content[:i1] + content[i2:]

remove_block_before('// Fetch Partners', 'return () => { supabase.removeChannel(channel); };\n  }, []);\n\n  // Fetch Events')

# Wait, if I replace up to "// Fetch Events", I should make sure that "return ... removeChannel... }, []);" for Fetch Events is not removed.
# Actually, the string "// Fetch Partners" to "\n  // Fetch Events" is safer.
def remove_between(start_str, end_str):
    global content
    i1 = content.find(start_str)
    if i1 != -1:
        i2 = content.find(end_str, i1)
        if i2 != -1:
            content = content[:i1] + content[i2:]

remove_between('// Fetch Partners', '  // Fetch Events')

remove_block_before('const handleSavePartner = async (e: React.FormEvent) => {', 'const getDashboardGreeting = () => {')

remove_block_before('{/* Partners Management */}', '{/* Admin Config */}')
remove_block_before("{accountSubView === 'partners' && (", "{accountSubView === 'events' && (")

# Remove Notification Prefs logic for partners filter map
content = re.sub(r'\.\.\.partners\.filter[\s\S]*?\}\)\),', '', content)

# Remove the Partner button in the Menu.
btn_start = "<button\n                      onClick={() => setAccountSubView('partners')}"
i_btn = content.find(btn_start)
if i_btn != -1:
    i_end = content.find("</button>", i_btn)
    if i_end != -1:
        content = content[:i_btn] + content[i_end + 9:]

# Replace remaining partner small pieces
content = content.replace("...partners.map(p => `part-${p.id}`),", "")
content = re.sub(r"\{ key: 'partners', label: 'Lojas Parceiras',[^}]+\},", "", content)
content = content.replace("partners: true,", "")
content = content.replace("products: true, partners: true", "products: true")
content = content.replace("menu, profile, pets, support, store, admin, partners", "menu, profile, pets, support, store, admin")
content = content.replace("setPartners((data || []) as Partner[]);", "")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done in Python!')