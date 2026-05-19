const fs = require('fs');

const appFile = 'src/App.tsx';
let content = fs.readFileSync(appFile, 'utf8');

// 1. Imports
content = content.replace("import { EventCarousel } from './components/EventCarousel';\n", "");
content = content.replace("import { MyEventsCarousel } from './components/MyEventsCarousel';\n", "");

// 2. Interfaces
content = content.replace(/interface PetEvent \{[\s\S]*?\}\n/g, "");
content = content.replace(/export interface PromoEvent \{[\s\S]*?\}\n/g, "");

// 3. Quick Action
const quickActionStr = `                      <div 
                        onClick={() => { setView('account'); setAccountSubView('events'); }}
                        className="bg-white py-3 px-1 rounded-[1.5rem] border border-gray-100 flex flex-col items-center text-center gap-2 cursor-pointer hover:border-blue-200 transition-all shadow-sm active:scale-95 relative"
                      >
                        <div className="w-12 h-12 bg-blue-50 rounded-[1rem] flex items-center justify-center">
                          <Calendar className="w-[22px] h-[22px] text-blue-500" />
                        </div>
                        <span className="text-[10px] font-black text-gray-700 leading-tight tracking-tight">Eventos</span>
                      </div>`;
content = content.replace(quickActionStr, "");

// 4. Carousels
const carouselsStr = `                    {/* Novo Slider de Eventos com Auto-scroll */}
                    <EventCarousel onEventClick={(evt) => setEventInfoEvent(evt)} />
                    
                    {/* Eventos Destacados pelo Admin */}
                    <MyEventsCarousel />`;
content = content.replace(carouselsStr, "");

// 5. Hooks
content = content.replace(/\s*\/\/\s*Fetch Promo Events\s*useEffect\(\(\)\s*=>\s*\{[\s\S]*?\},\s*\[\]\);\n/g, "");
content = content.replace(/\s*\/\/\s*Fetch Events\s*useEffect\(\(\)\s*=>\s*\{[\s\S]*?\},\s*\[\]\);\n/g, "");

// 6. States
content = content.replace(/\s*const\s*\[petEvents,\s*setPetEvents\]\s*=\s*useState<PetEvent\[\]>\(\[\]\);\n/g, "");
content = content.replace(/\s*const\s*\[eventForm,\s*setEventForm\]\s*=\s*useState<Partial<PetEvent>>\(\{.*?\}\);\n/g, "");
content = content.replace(/\s*const\s*\[eventMessage,\s*setEventMessage\]\s*=\s*useState<string\s*\|\s*null>\(null\);\n/g, "");
content = content.replace(/\s*const\s*\[selectedEventId,\s*setSelectedEventId\]\s*=\s*useState<string\s*\|\s*null>\(null\);\n/g, "");
content = content.replace(/\s*const\s*\[eventInfoEvent,\s*setEventInfoEvent\]\s*=\s*useState<PetEvent\s*\|\s*null>\(null\);\n/g, "");
content = content.replace(/\s*const\s*\[promoEvents,\s*setPromoEvents\]\s*=\s*useState<PromoEvent\[\]>\(\[\]\);\n/g, "");
content = content.replace(/\s*const\s*\[promoEventForm,\s*setPromoEventForm\]\s*=\s*useState<Partial<PromoEvent>>\(\{.*?\}\);\n/g, "");
content = content.replace(/\s*\/\/\s*Events State\n/g, "");
content = content.replace(/\s*\/\/\s*Promo Events State \(Admin\)\n/g, "");

// 7. Render Views
content = content.replace(/\{view === 'events' && \([\s\S]*?\}\)\}/, "");

fs.writeFileSync(appFile, content, 'utf8');
console.log('App.tsx cleaned (Part 1)');
