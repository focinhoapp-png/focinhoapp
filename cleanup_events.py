import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
content = content.replace("import { EventCarousel } from './components/EventCarousel';\n", "")
content = content.replace("import { MyEventsCarousel } from './components/MyEventsCarousel';\n", "")

# 2. Interfaces
content = re.sub(r"interface PetEvent \{.*?\n\}\n", "", content, flags=re.DOTALL)
content = re.sub(r"export interface PromoEvent \{.*?\n\}\n", "", content, flags=re.DOTALL)

# 3. Quick Action
quick_action_str = """                      <div 
                        onClick={() => { setView('account'); setAccountSubView('events'); }}
                        className="bg-white py-3 px-1 rounded-[1.5rem] border border-gray-100 flex flex-col items-center text-center gap-2 cursor-pointer hover:border-blue-200 transition-all shadow-sm active:scale-95 relative"
                      >
                        <div className="w-12 h-12 bg-blue-50 rounded-[1rem] flex items-center justify-center">
                          <Calendar className="w-[22px] h-[22px] text-blue-500" />
                        </div>
                        <span className="text-[10px] font-black text-gray-700 leading-tight tracking-tight">Eventos</span>
                      </div>"""
content = content.replace(quick_action_str, "")

# 4. Carousels
carousels_str = """                    {/* Novo Slider de Eventos com Auto-scroll */}
                    <EventCarousel onEventClick={(evt) => setEventInfoEvent(evt)} />
                    
                    {/* Eventos Destacados pelo Admin */}
                    <MyEventsCarousel />"""
content = content.replace(carousels_str, "")

# 5. Admin Promo Events hook
content = re.sub(r"\s*//\s*Fetch Promo Events\s*useEffect\(\(\)\s*=>\s*\{.*?\},\s*\[\]\);\n", "", content, flags=re.DOTALL)
content = re.sub(r"\s*//\s*Fetch Events\s*useEffect\(\(\)\s*=>\s*\{.*?\},\s*\[\]\);\n", "", content, flags=re.DOTALL)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("App.tsx cleaned (Part 1)")
