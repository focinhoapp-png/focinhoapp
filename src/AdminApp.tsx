import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';
import { 
  Mail, Lock, LogOut, Loader2, ShieldCheck, 
  LayoutDashboard, QrCode, Image as ImageIcon, Star, 
  Heart, Briefcase, Calendar, ChevronRight, Menu, X, Plus, Trash2, Edit2, Download, CheckCircle2, MapPin, Camera, ExternalLink,
  Store, Dog, Edit3, User as UserIcon
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Interfaces
interface PromoEvent { id: string; title?: string; image_url: string; link_url: string; expires_at: string; }
interface Partner { id: string; name: string; category: string; description: string; location: string; logo: string; url: string; }
interface PetEvent { id: string; title: string; description?: string; imageUrl?: string; event_date?: string; location?: string; }
interface AdoptionPet { id: string; name: string; animalType: string; breed: string; color: string; gender: string; description: string; photoUrl?: string; gallery?: string[]; city?: string; state?: string; status: 'available' | 'adopted'; }
interface Banner { id: string; image_url: string; link_url: string; title?: string; }
interface Tag { id: string; petId?: string; ownerId?: string; activated: boolean; }
interface AppPet { id: string; ownerId?: string; tagId?: string | null; name: string; animalType?: string; gender?: string; breed?: string; photoUrl?: string; deleted?: boolean; createdAt?: string; }
interface AppOwner { uid: string; name: string; phone?: string; }

export default function AdminApp() {
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  
  // Login States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Nav States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  
  // --- DATA STATES ---
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [amountToGenerate, setAmountToGenerate] = useState(10);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());

  const [promoEvents, setPromoEvents] = useState<PromoEvent[]>([]);
  const [promoEventForm, setPromoEventForm] = useState<Partial<PromoEvent>>({ id: '', title: '', image_url: '', link_url: '', expires_at: '' });

  const [adminBanners, setAdminBanners] = useState<Banner[]>([]);
  const [bannerForm, setBannerForm] = useState<Partial<Banner>>({ id: '', title: '', image_url: '', link_url: '' });

  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerForm, setPartnerForm] = useState<Partial<Partner>>({ id: '', name: '', category: 'Pet Shops', description: '', location: '', logo: '', url: '' });

  const [petEvents, setPetEvents] = useState<PetEvent[]>([]);
  const [adoptionPets, setAdoptionPets] = useState<AdoptionPet[]>([]);
  const emptyAdoptionForm: Partial<AdoptionPet> = { id: '', name: '', animalType: 'Cachorro', breed: '', color: '', gender: 'Macho', description: '', photoUrl: '', city: '', state: '', status: 'available' };
  const [adoptionForm, setAdoptionForm] = useState<Partial<AdoptionPet>>(emptyAdoptionForm);
  const [showAdoptionForm, setShowAdoptionForm] = useState(false);
  const [allAppPets, setAllAppPets] = useState<AppPet[]>([]);
  const [allAppOwners, setAllAppOwners] = useState<AppOwner[]>([]);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [petsSearch, setPetsSearch] = useState('');
  const [petsError, setPetsError] = useState<string | null>(null);
  const [editAppPetForm, setEditAppPetForm] = useState<AppPet | null>(null);
  const [editAppOwnerForm, setEditAppOwnerForm] = useState<AppOwner | null>(null);
  const [isTagSelectionMode, setIsTagSelectionMode] = useState(false);

  const [eventForm, setEventForm] = useState<Partial<PetEvent>>({ id: '', title: '', description: '', imageUrl: '', event_date: '', location: '' });
  const [eventMessage, setEventMessage] = useState<string | null>(null);

  /** Retorna a URL da foto apenas se for uma URL real (não base64 enorme) */
  const petPhoto = (url?: string) => url && (url.startsWith('http') || url.startsWith('https')) ? url : null;

  // --- FETCH DATA ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user ?? null);
      setLoadingSession(false);
      if (session?.user) fetchAllAdminData();
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
      if (session?.user) fetchAllAdminData();
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchAllAdminData = async () => {
    // Queries independentes — uma falha não afeta as outras
    try {
      const tagsRes = await supabase.from('tags').select('id, petId, ownerId, activated').order('id', { ascending: true });
      if (tagsRes.error) console.error('Tags error:', tagsRes.error);
      else { console.log('Tags:', tagsRes.data?.length); setAllTags(tagsRes.data ?? []); }
    } catch(e) { console.error('Tags exception:', e); }

    try {
      const promoRes = await supabase.from('promo_events').select('*').order('created_at', { ascending: false });
      if (promoRes.data) setPromoEvents(promoRes.data);
    } catch(e) { console.error('Promo exception:', e); }

    try {
      const partnersRes = await supabase.from('partners').select('*').order('created_at', { ascending: false });
      if (partnersRes.data) setPartners(partnersRes.data);
    } catch(e) { console.error('Partners exception:', e); }

    try {
      const eventsRes = await supabase.from('events').select('*').order('created_at', { ascending: false });
      if (eventsRes.data) setPetEvents(eventsRes.data);
    } catch(e) { console.error('Events exception:', e); }

    try {
      const adoptRes = await supabase.from('adoption_pets').select('id, name, animalType, breed, gender, status, city, state, photoUrl, description').order('id', { ascending: false });
      if (adoptRes.error) console.error('Adoption error:', adoptRes.error);
      else { console.log('Adoption pets:', adoptRes.data?.length); setAdoptionPets(adoptRes.data ?? []); }
    } catch(e) { console.error('Adoption exception:', e); }

    try {
      const bannersRes = await supabase.from('banners').select('*').order('created_at', { ascending: false });
      if (bannersRes.data) setAdminBanners(bannersRes.data);
    } catch(e) { console.error('Banners exception:', e); }

    try {
      const petsRes = await supabase.from('pets')
        .select('id, ownerId, tagId, name, animalType, gender, breed, deleted')
        .order('id', { ascending: false })
        .limit(200);
      if (petsRes.error) {
        console.error('Pets error:', petsRes.error);
        setPetsError(petsRes.error.message);
      } else { 
        console.log('App pets:', petsRes.data?.length);
        const filteredPets = (petsRes.data ?? []).filter(p => p.deleted !== true);
        setAllAppPets(filteredPets); 
      }
    } catch(e: any) { 
        console.error('Pets exception:', e); 
        setPetsError(e.message || 'Unknown error');
    }

    try {
      const ownersRes = await supabase.from('owners').select('uid, name, phone, gender, birthday, address, state, city').limit(500);
      if (ownersRes.data) setAllAppOwners(ownersRes.data);
      
      const countRes = await supabase.from('owners').select('*', { count: 'exact', head: true });
      setTotalUsersCount(countRes.count || 0);

      // Usando uma aproximação de ativos pelas últimas 24h caso não haja Supabase Presence global
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      const activeRes = await supabase.from('owners').select('uid', { count: 'exact', head: true }).gte('updatedAt', yesterday.toISOString());
      setActiveUsersCount(activeRes.count || 0);
    } catch(e) { console.error('Owners exception', e); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      // Permite usar apenas um 'login' simples anexando um domínio falso se não houver @
      const loginEmail = email.includes('@') ? email : `${email}@focinho.app`;
      const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      if (error) throw error;
      if (data.user) fetchAllAdminData();
    } catch {
      setLoginError('Credenciais inválidas ou sem permissão.');
    } finally {
      setLoggingIn(false);
    }
  };

  // --- ACTIONS ---
  const handleSavePromoEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true);
    const payload = { title: promoEventForm.title, image_url: promoEventForm.image_url, link_url: promoEventForm.link_url, expires_at: promoEventForm.expires_at };
    if (promoEventForm.id) await supabase.from('promo_events').update(payload).eq('id', promoEventForm.id);
    else await supabase.from('promo_events').insert(payload);
    setPromoEventForm({ id: '', title: '', image_url: '', link_url: '', expires_at: '' });
    fetchAllAdminData();
    setLoadingAction(false);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true);
    const payload = { title: bannerForm.title, image_url: bannerForm.image_url, link_url: bannerForm.link_url };
    if (bannerForm.id) await supabase.from('banners').update(payload).eq('id', bannerForm.id);
    else await supabase.from('banners').insert(payload);
    setBannerForm({ id: '', title: '', image_url: '', link_url: '' });
    fetchAllAdminData();
    setLoadingAction(false);
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true);
    const payload = { name: partnerForm.name, category: partnerForm.category, description: partnerForm.description, location: partnerForm.location, logo: partnerForm.logo, url: partnerForm.url };
    if (partnerForm.id) await supabase.from('partners').update(payload).eq('id', partnerForm.id);
    else await supabase.from('partners').insert(payload);
    setPartnerForm({ id: '', name: '', category: 'Pet Shops', description: '', location: '', logo: '', url: '' });
    fetchAllAdminData();
    setLoadingAction(false);
  };

  const handleSaveAdoptionPet = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true);
    const payload = {
      name: adoptionForm.name,
      animalType: adoptionForm.animalType,
      breed: adoptionForm.breed,
      color: adoptionForm.color,
      gender: adoptionForm.gender,
      description: adoptionForm.description,
      photoUrl: adoptionForm.photoUrl || '',
      city: adoptionForm.city,
      state: adoptionForm.state,
      status: adoptionForm.status || 'available',
    };
    if (adoptionForm.id) {
      await supabase.from('adoption_pets').update(payload).eq('id', adoptionForm.id);
    } else {
      const newId = Math.random().toString(36).slice(2, 20);
      await supabase.from('adoption_pets').insert({ ...payload, id: newId });
    }
    setAdoptionForm(emptyAdoptionForm);
    setShowAdoptionForm(false);
    fetchAllAdminData();
    setLoadingAction(false);
  };

  const generateRandomTag = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    result += '-';
    for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };

  const handleGenerateTags = async () => {
    setLoadingAction(true);
    try {
      const newTags = Array.from({ length: amountToGenerate }, () => ({
        id: generateRandomTag(),
        activated: false
      }));
      const { error } = await supabase.from('tags').insert(newTags);
      if (error) throw error;
      fetchAllAdminData();
      alert(`${amountToGenerate} tags criadas com sucesso!`);
    } catch (err) { console.error(err); alert('Erro ao criar tags.'); }
    finally { setLoadingAction(false); }
  };

  const handleGenerateQRZip = async () => {
    if (selectedTagIds.size === 0) return alert('Selecione as tags primeiro.');
    setLoadingAction(true);
    try {
      const zip = new JSZip();
      const promises = Array.from(selectedTagIds).map(async (id) => {
        const res = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=https://focinhoapp.com/?tag=${id}`);
        const blob = await res.blob();
        zip.file(`${id}_tag.png`, blob);
      });
      await Promise.all(promises);
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "focinho_qrs.zip");
      setSelectedTagIds(new Set());
    } catch { alert("Erro ao baixar Zips"); }
    finally { setLoadingAction(false); }
  };

  const toggleSelectTag = (id: string) => {
    const newSet = new Set(selectedTagIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedTagIds(newSet);
  };


  // --- LOGIN UI ---
  if (loadingSession) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div>;
  
  if (!sessionUser) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
         <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-xl shadow-indigo-100/20 border border-gray-100">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black text-center text-gray-900 mb-2">Focinho Admin</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Nome de Usuário (Login)</label>
                <input type="text" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="ex: ruan" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Senha</label>
                <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none" />
              </div>
              {loginError && <p className="text-red-500 text-xs font-bold">{loginError}</p>}
              <button disabled={loggingIn} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl mt-4">Entrar</button>
            </form>
         </div>
      </div>
    );
  }

  // --- DASHBOARD UI ---
  const TABS = [
    { id: 'dashboard', label: 'Estatísticas', icon: LayoutDashboard },
    { id: 'tags', label: 'Tags Inteligentes', icon: QrCode },
    { id: 'banners', label: 'Primeiro Carrossel', icon: ImageIcon },
    { id: 'promo', label: 'Megabanners Promo', icon: Star },
    { id: 'partners', label: 'Loja Parceira', icon: Store },
    { id: 'adoption', label: 'Adoção', icon: Heart },
    { id: 'pets_app', label: 'Pets do App', icon: Dog },
    { id: 'events', label: 'Eventos', icon: Calendar }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-gray-800">
      
      {/* Sidebar Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 w-64 h-screen bg-white border-r border-gray-100 flex flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
         <div className="p-6 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
               <ShieldCheck className="w-6 h-6 text-white" />
             </div>
             <span className="font-black text-xl text-gray-900 tracking-tight">Admin<span className="text-indigo-600">.</span></span>
           </div>
         </div>
         <div className="flex-1 px-4 space-y-1 overflow-y-auto">
           {TABS.map(tab => (
             <button key={tab.id} onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}>
               <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-indigo-600' : 'text-gray-400'}`} />
               {tab.label}
             </button>
           ))}
         </div>
         <div className="p-4 border-t border-gray-100">
           <button onClick={async () => { await supabase.auth.signOut(); setSessionUser(null); }} className="w-full flex justify-center gap-2 px-4 py-3 text-red-600 font-bold bg-red-50 hover:bg-red-100 rounded-2xl">
             <LogOut className="w-4 h-4" /> Sair
           </button>
         </div>
      </aside>

      <main className="flex-1 w-full h-screen overflow-y-auto relative">
         <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3 sticky top-0 z-30">
           <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-gray-50 rounded-xl text-gray-600"><Menu className="w-5 h-5" /></button>
           <h1 className="font-black text-xl text-gray-800">{TABS.find(t => t.id === activeTab)?.label}</h1>
         </header>

         <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
            
            {/* 1. DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                 {[
                   { label: 'Usuários Cad', val: totalUsersCount, c: 'text-indigo-600' },
                   { label: 'Online / Ativos', val: activeUsersCount, c: 'text-blue-500' },
                   { label: 'Tags Focinho', val: allTags.length, c: 'text-orange-500' },
                   { label: 'Parceiros', val: partners.length, c: 'text-purple-500' },
                   { label: 'Carrossel 1', val: adminBanners.length, c: 'text-emerald-500' },
                   { label: 'Megabanners', val: promoEvents.length, c: 'text-amber-500' }
                 ].map((stat, i) => (
                   <div key={i} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                      <h3 className={`text-4xl font-black mt-2 leading-none ${stat.c}`}>{stat.val}</h3>
                   </div>
                 ))}
              </div>
            )}

            {/* 2. TAGS */}
            {activeTab === 'tags' && (
               <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <h3 className="font-black text-xl mb-1">Geração de Novas Tags</h3>
                      <p className="text-sm text-gray-500 font-medium">Quantas etiquetas numéricas você deseja imprimir/gerar?</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <input type="number" min="1" max="100" value={amountToGenerate} onChange={e=>setAmountToGenerate(Number(e.target.value))} className="w-20 px-4 py-3 rounded-xl border border-gray-200 outline-none font-bold bg-gray-50 text-center" />
                       <button onClick={handleGenerateTags} disabled={loadingAction} className="bg-orange-500 text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center min-w-[120px] shadow-sm hover:bg-orange-600">
                         {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Gerar Novas'}
                       </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-gray-100 mb-4">
                     <div className="flex items-center gap-3">
                        <h3 className="font-black text-xl flex items-center gap-3">
                           QR Codes Já Criados
                           <span className="text-sm font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-xl">{allTags.length} tags criadas</span>
                        </h3>
                        <button onClick={() => {
                           setIsTagSelectionMode(!isTagSelectionMode);
                           if (isTagSelectionMode) setSelectedTagIds(new Set());
                        }} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border ${isTagSelectionMode ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                           {isTagSelectionMode ? 'Cancelar Seleção' : 'Ativar Modo Seleção Múltipla'}
                        </button>
                     </div>
                     {selectedTagIds.size > 0 && isTagSelectionMode && (
                       <button onClick={handleGenerateQRZip} disabled={loadingAction} className="bg-gray-900 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 shadow-sm hover:bg-gray-800">
                          <Download className="w-4 h-4"/> Baixar {selectedTagIds.size} em .ZIP
                       </button>
                     )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                     {allTags.map(tag => (
                       <div key={tag.id} className={`rounded-2xl border-2 overflow-hidden transition-all relative flex flex-col ${selectedTagIds.has(tag.id) ? 'border-orange-500 bg-orange-50 shadow-sm' : 'border-gray-100 hover:border-gray-300 bg-white group'}`}>
                          {isTagSelectionMode && (
                             <div className="absolute top-2 left-2 z-10 flex items-center justify-center p-1 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200">
                                <input type="checkbox" checked={selectedTagIds.has(tag.id)} onChange={() => toggleSelectTag(tag.id)} className="w-5 h-5 accent-orange-500 cursor-pointer" />
                             </div>
                          )}
                          
                          <div className={`p-4 flex items-center justify-center bg-white ${tag.petId ? 'opacity-40 grayscale' : ''}`}>
                             <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://focinhoapp.com/?tag=${tag.id}`} alt="QR" className="w-full mix-blend-multiply" />
                          </div>
                          
                          <div className="px-2 py-2 border-t border-gray-100 text-center bg-gray-50/50 flex flex-col justify-center min-h-[50px]">
                             <p className="text-[11px] font-mono font-bold text-gray-700">{tag.id}</p>
                             {tag.petId && <p className="text-[9px] text-red-500 font-black mt-0.5 tracking-wider">EM USO</p>}
                          </div>

                          <div className="flex border-t border-gray-100 bg-white divide-x divide-gray-100">
                             <button onClick={() => window.open(`https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=https://focinhoapp.com/?tag=${tag.id}`, '_blank')} className="flex-1 py-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 flex justify-center items-center font-bold text-[10px] gap-1 transition-colors" title="Ver Ampliado">
                                <ExternalLink className="w-3.5 h-3.5"/> Ver
                             </button>
                             <button onClick={async () => {
                                if(window.confirm('Certeza que deseja escluir este QR Code Básico? Caso um pingente tenha esse QR, ele não funcionará mais.')) {
                                   await supabase.from('tags').delete().eq('id', tag.id);
                                   setAllTags(prev => prev.filter(t => t.id !== tag.id));
                                   if(selectedTagIds.has(tag.id)) toggleSelectTag(tag.id);
                                }
                             }} className="flex-1 py-2 text-gray-400 hover:text-red-600 hover:bg-red-50 flex justify-center items-center font-bold text-[10px] gap-1 transition-colors" title="Deletar permanentemente">
                                <Trash2 className="w-3.5 h-3.5"/> Excluir
                             </button>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            )}

            {/* 3. BANNERS (Primeiro Carrossel Pequeno) */}
            {activeTab === 'banners' && (
              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
                 <h3 className="font-black text-xl mb-4 text-emerald-900">Editor do Primeiro Carrossel</h3>
                 <p className="text-gray-500 text-sm font-medium mb-8 max-w-2xl">Cadastre aqui as imagens compridas para publicidade de lojas e parceiros. Elas passam de forma contínua no topo normal do app.</p>
                 
                 <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1 space-y-4">
                       {adminBanners.map(b => (
                         <div key={b.id} className="bg-gray-50 border border-gray-100 rounded-3xl p-4 flex gap-4 items-center justify-between">
                            <img src={b.image_url} className="h-16 w-32 object-cover rounded-2xl border border-gray-200 bg-white" />
                            <div className="flex-1 min-w-0">
                               <p className="font-bold text-gray-900 truncate text-sm">{b.title || 'Sem título'}</p>
                               <p className="text-xs font-mono truncate text-emerald-600 mt-1">{b.link_url}</p>
                            </div>
                            <div className="flex gap-2">
                               <button onClick={() => setBannerForm({ id: b.id, title: b.title || '', image_url: b.image_url, link_url: b.link_url })} className="p-3 bg-white hover:bg-emerald-50 text-emerald-600 rounded-xl shadow-sm"><Edit2 className="w-4 h-4"/></button>
                               <button onClick={async () =>{ if(window.confirm('Excluir?')){ await supabase.from('banners').delete().eq('id', b.id); setAdminBanners(p=>p.filter(x=>x.id !== b.id)); } }} className="p-3 bg-white hover:bg-red-50 text-red-500 rounded-xl shadow-sm"><Trash2 className="w-4 h-4"/></button>
                            </div>
                         </div>
                       ))}
                       {adminBanners.length === 0 && <p className="text-center text-gray-400 py-6 font-medium text-sm">Nenhum banner comum criado.</p>}
                    </div>

                    <div className="md:w-96 bg-emerald-50 border border-emerald-100 p-6 rounded-[1.5rem] h-fit">
                       <h4 className="font-black text-emerald-900 mb-4">{bannerForm.id ? 'Editar Banner' : 'Novo Banner'}</h4>
                       <form onSubmit={handleSaveBanner} className="space-y-4">
                         <div>
                            <label className="text-xs font-bold text-emerald-800 mb-1 block">Título (Opcional)</label>
                            <input type="text" className="w-full bg-white border border-emerald-200 rounded-xl py-3 text-sm px-4 outline-none focus:border-emerald-500" value={bannerForm.title||''} onChange={e=>setBannerForm(p=>({...p, title: e.target.value}))} />
                         </div>
                         <div>
                            <label className="text-xs font-bold text-emerald-800 mb-1 block">Link</label>
                            <input type="url" required className="w-full bg-white border border-emerald-200 rounded-xl py-3 text-sm px-4 outline-none focus:border-emerald-500" placeholder="https://" value={bannerForm.link_url||''} onChange={e=>setBannerForm(p=>({...p, link_url: e.target.value}))} />
                         </div>
                         <div>
                            <label className="text-xs font-bold text-emerald-800 mb-1 block">Imagem Resolução (Ex: 800x300)</label>
                            {bannerForm.image_url ? (
                              <div className="relative rounded-xl overflow-hidden group border border-emerald-200">
                                 <img src={bannerForm.image_url} className="w-full h-24 object-cover" />
                                 <button type="button" onClick={()=>setBannerForm(p=>({...p, image_url:''}))} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-6 h-6"/></button>
                              </div>
                            ) : (
                              <label className="w-full h-24 bg-white border-2 border-dashed border-emerald-200 rounded-xl flex items-center justify-center cursor-pointer text-emerald-500 font-bold text-xs hover:border-emerald-400">
                                 <input type="file" accept="image/*" className="hidden" onChange={(e)=>{
                                    const f = e.target.files?.[0];
                                    if(f){ const r=new FileReader(); r.onload=ev=>setBannerForm(p=>({...p, image_url: ev.target?.result as string})); r.readAsDataURL(f); }
                                 }} />
                                 + Anexar Imagem
                              </label>
                            )}
                         </div>
                         <div className="pt-2 flex gap-2">
                           <button type="submit" disabled={loadingAction || !bannerForm.image_url} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center">
                             {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar'}
                           </button>
                           {bannerForm.id && <button type="button" onClick={()=>setBannerForm({id:'', title:'', image_url:'', link_url:''})} className="px-4 py-3 bg-white text-gray-500 border border-gray-200 rounded-xl font-bold">Cancelar</button>}
                         </div>
                       </form>
                    </div>
                 </div>
              </div>
            )}

            {/* 4. PROMO BANNERS */}
            {activeTab === 'promo' && (
               <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
                  <h3 className="font-black text-xl mb-4 text-amber-900">Megabanners (Promo)</h3>
                  <p className="text-gray-500 text-sm font-medium mb-8 max-w-2xl">Banners grandes em destaque no app. O tamanho ideal é na <strong>proporção 2:1</strong> (Por exemplo: Largura 800px por Altura 400px ou 1000x500).</p>
                 <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1 space-y-3">
                       {promoEvents.map(ev => (
                         <div key={ev.id} className="bg-gray-50 rounded-3xl border border-gray-100 p-4 flex items-center justify-between shadow-sm">
                           <div className="flex items-center gap-4">
                             <img src={ev.image_url} className="w-16 h-12 object-cover rounded-xl" />
                             <div>
                                <h4 className="font-bold text-gray-900">{ev.title || 'Sem Título'}</h4>
                                <p className="text-[11px] text-gray-500 font-medium tracking-wide border border-gray-200 bg-white inline-block px-1.5 py-0.5 rounded-md mt-1">Expira: {new Date(ev.expires_at).toLocaleString()}</p>
                             </div>
                           </div>
                           <div className="flex gap-2">
                             <button onClick={() => setPromoEventForm({ id: ev.id, title: ev.title || '', image_url: ev.image_url, link_url: ev.link_url, expires_at: new Date(ev.expires_at).toISOString().slice(0,16) })} className="p-3 bg-white hover:bg-amber-50 text-amber-600 rounded-xl"><Edit2 className="w-4 h-4"/></button>
                             <button onClick={async () =>{ if(window.confirm('Excluir?')){ await supabase.from('promo_events').delete().eq('id', ev.id); setPromoEvents(p=>p.filter(x=>x.id !== ev.id)); } }} className="p-3 bg-white hover:bg-red-50 text-red-500 rounded-xl"><Trash2 className="w-4 h-4"/></button>
                           </div>
                         </div>
                       ))}
                       {promoEvents.length===0 && <p className="text-gray-400 py-6 text-center font-medium text-sm">Sem Megabanners no ar.</p>}
                    </div>

                    <div className="md:w-96 bg-amber-50 border border-amber-100 p-6 rounded-[1.5rem] h-fit">
                        <h4 className="font-black text-amber-900 mb-4">{promoEventForm.id ? 'Editar Mega' : 'Novo Megabanner'}</h4>
                        <form onSubmit={handleSavePromoEvent} className="space-y-4">
                           <div><label className="text-xs font-bold text-amber-800 mb-1 block">Título</label><input type="text" className="w-full bg-white border border-amber-200 rounded-xl py-3 px-4 outline-none text-sm" value={promoEventForm.title||''} onChange={e=>setPromoEventForm(p=>({...p, title: e.target.value}))}/></div>
                           <div><label className="text-xs font-bold text-amber-800 mb-1 block">Link Destino</label><input type="url" className="w-full bg-white border border-amber-200 rounded-xl py-3 px-4 outline-none text-sm" value={promoEventForm.link_url||''} onChange={e=>setPromoEventForm(p=>({...p, link_url: e.target.value}))}/></div>
                           <div><label className="text-xs font-bold text-amber-800 mb-1 block">Data Ocultar</label><input type="datetime-local" className="w-full bg-white border border-amber-200 rounded-xl py-3 px-4 outline-none text-sm font-sans" value={promoEventForm.expires_at||''} onChange={e=>setPromoEventForm(p=>({...p, expires_at: e.target.value}))}/></div>
                           <div>
                              <label className="text-xs font-bold text-amber-800 mb-1 block">Imagem do Megabanner</label>
                              {promoEventForm.image_url ? (
                                <div className="relative w-full h-24 rounded-xl overflow-hidden group"><img src={promoEventForm.image_url} className="w-full h-full object-cover" /><button type="button" className="absolute inset-0 bg-black/50 text-white flex justify-center items-center opacity-0 group-hover:opacity-100" onClick={()=>setPromoEventForm(p=>({...p, image_url:''}))}><X/></button></div>
                              ) : (
                                <label className="w-full h-24 bg-white border-2 border-dashed border-amber-300 rounded-xl flex items-center justify-center font-bold text-xs text-amber-600 cursor-pointer hover:border-amber-500">
                                   <input type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f = e.target.files?.[0]; if(f){ const r=new FileReader(); r.onload=ev=>setPromoEventForm(p=>({...p, image_url: ev.target?.result as string})); r.readAsDataURL(f); } }} />
                                   + Banners Retangulares (Ex: 800x400)
                                </label>
                              )}
                           </div>
                           <div className="pt-2 flex gap-2">
                              <button disabled={loadingAction || !promoEventForm.image_url} type="submit" className="flex-1 py-3 text-white bg-amber-500 font-bold rounded-xl disabled:opacity-50 flex items-center justify-center"> {loadingAction ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Salvar'}</button>
                           </div>
                        </form>
                    </div>
                 </div>
              </div>
            )}

            {/* 5. PARCEIROS / LOJINHA */}
            {activeTab === 'partners' && (
              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
                 <h3 className="font-black text-xl mb-4 text-purple-900 flex items-center gap-2"><Store className="w-6 h-6"/> Loja Parceira</h3>
                 
                 <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                       {partners.map(p => (
                         <div key={p.id} className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm relative group overflow-hidden">
                           <div className="absolute top-2 right-2 flex gap-1 z-10 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all bg-white p-1 rounded-xl shadow-lg border border-gray-100">
                              <button onClick={() => setPartnerForm(p)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                              <button onClick={async () => { if(window.confirm('Excluir parceiro?')){ await supabase.from('partners').delete().eq('id', p.id); setPartners(r=>r.filter(x=>x.id!==p.id)); } }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                           </div>
                           <div className="flex items-center gap-4 mb-3">
                              <img src={p.logo} alt="logo" className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 object-cover" />
                              <div className="min-w-0">
                                 <h4 className="font-black text-gray-900 border-b border-gray-100 pb-1 mb-1 truncate text-lg pr-4">{p.name}</h4>
                                 <span className="text-[10px] font-bold tracking-wider uppercase text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">{p.category}</span>
                              </div>
                           </div>
                           <p className="text-xs text-gray-500 font-medium mb-3 line-clamp-3 leading-relaxed">{p.description}</p>
                           <a href={p.url} target="_blank" rel="noreferrer" className="w-full block text-center py-2 bg-gray-50 rounded-xl text-xs font-bold text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors">Visitar Link</a>
                         </div>
                       ))}
                       {partners.length === 0 && <div className="col-span-full py-10 text-center"><p className="text-sm font-medium text-gray-400">Nenhum parceiro cadastrado na lojinha.</p></div>}
                    </div>

                    <div className="md:w-96 bg-purple-50 border border-purple-100 p-6 rounded-[1.5rem] h-fit">
                       <h4 className="font-black text-purple-900 mb-4">{partnerForm.id ? 'Editar Loja' : 'Novo Parceiro'}</h4>
                       <form onSubmit={handleSavePartner} className="space-y-4">
                         <div>
                            <label className="text-xs font-bold text-purple-800 mb-1 block">Nome Loja / Produto</label>
                            <input type="text" required className="w-full bg-white border border-purple-200 rounded-xl py-3 px-4 text-sm outline-none focus:border-purple-500" value={partnerForm.name||''} onChange={e=>setPartnerForm(p=>({...p, name: e.target.value}))}/>
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                           <div>
                              <label className="text-xs font-bold text-purple-800 mb-1 block">Categoria</label>
                              <select className="w-full bg-white border border-purple-200 rounded-xl py-3 px-4 text-sm outline-none" value={partnerForm.category||''} onChange={e=>setPartnerForm(p=>({...p, category: e.target.value}))}>
                                <option value="Pet Shops">Pet Shops</option>
                                <option value="Clínicas">Clínicas</option>
                                <option value="Utensílios">Utensílios</option>
                                <option value="Parceiros">Restaurantes</option>
                              </select>
                           </div>
                           <div>
                              <label className="text-xs font-bold text-purple-800 mb-1 block">Localização (Opcional)</label>
                              <input type="text" className="w-full bg-white border border-purple-200 rounded-xl py-3 px-4 text-sm outline-none" placeholder="Cidade/Bairro" value={partnerForm.location||''} onChange={e=>setPartnerForm(p=>({...p, location: e.target.value}))}/>
                           </div>
                         </div>
                         <div>
                            <label className="text-xs font-bold text-purple-800 mb-1 block">Foto Principal (Logotipo/Produto)</label>
                            {partnerForm.logo ? (
                              <div className="w-20 h-20 relative group bg-white border border-purple-200 rounded-xl overflow-hidden mx-auto">
                                <img src={partnerForm.logo} className="w-full h-full object-cover" />
                                <button type="button" onClick={()=>setPartnerForm(p=>({...p, logo:''}))} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100"><X className="text-white w-5 h-5"/></button>
                              </div>
                            ) : (
                              <label className="block w-full h-20 bg-white border-2 border-dashed border-purple-300 rounded-xl flex items-center justify-center text-purple-600 font-bold text-xs cursor-pointer hover:border-purple-500">
                                <input type="file" accept="image/*" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f){ const r=new FileReader(); r.onload=ev=>setPartnerForm(p=>({...p, logo: ev.target?.result as string})); r.readAsDataURL(f); } }}/>
                                + Upload (Formato Quadrado)
                              </label>
                            )}
                         </div>
                         <div>
                            <label className="text-xs font-bold text-purple-800 mb-1 block">Mini Descrição Lojinha</label>
                            <textarea rows={3} required className="w-full bg-white border border-purple-200 rounded-xl py-3 px-4 text-sm outline-none flex-1 resize-none leading-relaxed" value={partnerForm.description||''} onChange={e=>setPartnerForm(p=>({...p, description: e.target.value}))}></textarea>
                         </div>
                         <div>
                            <label className="text-xs font-bold text-purple-800 mb-1 block">Link Site ou WhatsApp</label>
                            <input type="url" required className="w-full bg-white border border-purple-200 rounded-xl py-3 px-4 text-sm outline-none" placeholder="https://" value={partnerForm.url||''} onChange={e=>setPartnerForm(p=>({...p, url: e.target.value}))}/>
                         </div>
                         <button disabled={loadingAction || !partnerForm.logo} type="submit" className="w-full py-4 text-white bg-purple-600 hover:bg-purple-700 font-black rounded-xl shadow-md disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                           {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Loja'}
                         </button>
                       </form>
                    </div>
                 </div>
              </div>
            )}


            {/* 6. ADOÇÃO */}
            {activeTab === 'adoption' && (
               <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                     <div>
                        <h3 className="font-black text-xl text-rose-900 flex items-center gap-2"><Heart className="w-6 h-6" /> Pets para Adoção</h3>
                        <p className="text-sm text-gray-500 font-medium mt-1">Gerencie os pets disponíveis para adoção cadastrados no app.</p>
                     </div>
                     <div className="flex items-center gap-3">
                        <span className="bg-rose-100 text-rose-700 font-black text-xl px-4 py-2 rounded-2xl">{adoptionPets.length}</span>
                        <button
                           onClick={() => { setAdoptionForm(emptyAdoptionForm); setShowAdoptionForm(true); }}
                           className="bg-rose-500 hover:bg-rose-600 text-white font-black px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-sm transition-colors"
                        >
                           <Plus className="w-4 h-4" /> Novo Pet
                        </button>
                     </div>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-6">
                     {/* Lista */}
                     <div className="flex-1">
                        {adoptionPets.length === 0 && !showAdoptionForm ? (
                           <div className="text-center py-16">
                              <Heart className="w-12 h-12 text-rose-200 mx-auto mb-4" />
                              <p className="text-gray-400 font-medium">Nenhum pet para adoção cadastrado ainda.</p>
                           </div>
                        ) : (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {adoptionPets.map(pet => (
                                 <div key={pet.id} className={`bg-white border-2 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group relative ${adoptionForm.id === pet.id ? 'border-rose-400' : 'border-gray-100'}`}>
                                    {/* Foto */}
                                    <div className="h-36 bg-gray-100 overflow-hidden relative">
                                       {pet.photoUrl ? (
                                          <img src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                       ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-rose-50">
                                             <Heart className="w-8 h-8 text-rose-200" />
                                          </div>
                                       )}
                                       <span className={`absolute top-2 right-2 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${pet.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                          {pet.status === 'available' ? 'Disponível' : 'Adotado'}
                                       </span>
                                    </div>
                                    {/* Info */}
                                    <div className="p-3">
                                       <h4 className="font-black text-gray-900 truncate">{pet.name}</h4>
                                       <p className="text-xs text-gray-500">{pet.animalType} · {pet.breed || 'SRD'} · {pet.gender}</p>
                                       {(pet.city || pet.state) && (
                                          <p className="text-[11px] text-rose-500 font-bold mt-0.5">📍 {[pet.city, pet.state].filter(Boolean).join(', ')}</p>
                                       )}
                                       {/* Ações */}
                                       <div className="flex gap-2 mt-3">
                                          <button
                                             onClick={async () => {
                                                const newStatus = pet.status === 'available' ? 'adopted' : 'available';
                                                await supabase.from('adoption_pets').update({ status: newStatus }).eq('id', pet.id);
                                                setAdoptionPets(p => p.map(x => x.id === pet.id ? {...x, status: newStatus as 'available' | 'adopted'} : x));
                                             }}
                                             className={`flex-1 py-2 rounded-xl text-xs font-bold ${pet.status === 'available' ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                          >
                                             {pet.status === 'available' ? '✓ Adotado' : '↺ Disponível'}
                                          </button>
                                          <button
                                             onClick={() => { setAdoptionForm({ ...pet }); setShowAdoptionForm(true); }}
                                             className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl"
                                          >
                                             <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                             onClick={async () => {
                                                if(window.confirm(`Excluir ${pet.name}?`)){
                                                   await supabase.from('adoption_pets').delete().eq('id', pet.id);
                                                   setAdoptionPets(p => p.filter(x => x.id !== pet.id));
                                                   if (adoptionForm.id === pet.id) { setAdoptionForm(emptyAdoptionForm); setShowAdoptionForm(false); }
                                                }
                                             }}
                                             className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl"
                                          >
                                             <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                       </div>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>

                     {/* Formulário lateral */}
                     {showAdoptionForm && (
                        <div className="lg:w-96 bg-rose-50 border border-rose-100 p-6 rounded-[1.5rem] h-fit">
                           <div className="flex items-center justify-between mb-4">
                              <h4 className="font-black text-rose-900">{adoptionForm.id ? 'Editar Pet' : 'Novo Pet para Adoção'}</h4>
                              <button type="button" onClick={() => { setShowAdoptionForm(false); setAdoptionForm(emptyAdoptionForm); }} className="p-1.5 bg-white rounded-xl text-gray-400 hover:text-gray-600">
                                 <X className="w-4 h-4" />
                              </button>
                           </div>
                           <form onSubmit={handleSaveAdoptionPet} className="space-y-3">
                              {/* Foto */}
                              <div>
                                 <label className="text-xs font-bold text-rose-800 mb-1 block">Foto Principal</label>
                                 {adoptionForm.photoUrl ? (
                                    <div className="relative h-32 rounded-xl overflow-hidden group border border-rose-200">
                                       <img src={adoptionForm.photoUrl} className="w-full h-full object-cover" alt="" />
                                       <button type="button" onClick={() => setAdoptionForm(p => ({...p, photoUrl: ''}))} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                          <X className="w-5 h-5" />
                                       </button>
                                    </div>
                                 ) : (
                                    <label className="block h-24 bg-white border-2 border-dashed border-rose-300 rounded-xl flex items-center justify-center text-rose-500 font-bold text-xs cursor-pointer hover:border-rose-400">
                                       <input type="file" accept="image/*" className="hidden" onChange={e => {
                                          const f = e.target.files?.[0];
                                          if(f){ const r = new FileReader(); r.onload = ev => setAdoptionForm(p => ({...p, photoUrl: ev.target?.result as string})); r.readAsDataURL(f); }
                                       }} />
                                       + Foto do Pet
                                    </label>
                                 )}
                              </div>

                              {/* Nome */}
                              <div>
                                 <label className="text-xs font-bold text-rose-800 mb-1 block">Nome do Pet *</label>
                                 <input required type="text" value={adoptionForm.name || ''} onChange={e => setAdoptionForm(p => ({...p, name: e.target.value}))} className="w-full bg-white border border-rose-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-rose-400" placeholder="Ex: Bolinha" />
                              </div>

                              {/* Espécie + Gênero */}
                              <div className="grid grid-cols-2 gap-2">
                                 <div>
                                    <label className="text-xs font-bold text-rose-800 mb-1 block">Espécie</label>
                                    <select value={adoptionForm.animalType || 'Cachorro'} onChange={e => setAdoptionForm(p => ({...p, animalType: e.target.value}))} className="w-full bg-white border border-rose-200 rounded-xl py-2.5 px-3 text-sm outline-none">
                                       <option>Cachorro</option>
                                       <option>Gato</option>
                                       <option>Coelho</option>
                                       <option>Ave</option>
                                       <option>Outro</option>
                                    </select>
                                 </div>
                                 <div>
                                    <label className="text-xs font-bold text-rose-800 mb-1 block">Gênero</label>
                                    <select value={adoptionForm.gender || 'Macho'} onChange={e => setAdoptionForm(p => ({...p, gender: e.target.value}))} className="w-full bg-white border border-rose-200 rounded-xl py-2.5 px-3 text-sm outline-none">
                                       <option>Macho</option>
                                       <option>Fêmea</option>
                                    </select>
                                 </div>
                              </div>

                              {/* Raça + Cor */}
                              <div className="grid grid-cols-2 gap-2">
                                 <div>
                                    <label className="text-xs font-bold text-rose-800 mb-1 block">Raça</label>
                                    <input type="text" value={adoptionForm.breed || ''} onChange={e => setAdoptionForm(p => ({...p, breed: e.target.value}))} className="w-full bg-white border border-rose-200 rounded-xl py-2.5 px-3 text-sm outline-none" placeholder="SRD, Labrador..." />
                                 </div>
                                 <div>
                                    <label className="text-xs font-bold text-rose-800 mb-1 block">Cor</label>
                                    <input type="text" value={adoptionForm.color || ''} onChange={e => setAdoptionForm(p => ({...p, color: e.target.value}))} className="w-full bg-white border border-rose-200 rounded-xl py-2.5 px-3 text-sm outline-none" placeholder="Caramelo..." />
                                 </div>
                              </div>

                              {/* Cidade + Estado */}
                              <div className="grid grid-cols-2 gap-2">
                                 <div>
                                    <label className="text-xs font-bold text-rose-800 mb-1 block">Cidade</label>
                                    <input type="text" value={adoptionForm.city || ''} onChange={e => setAdoptionForm(p => ({...p, city: e.target.value}))} className="w-full bg-white border border-rose-200 rounded-xl py-2.5 px-3 text-sm outline-none" placeholder="Ex: São Paulo" />
                                 </div>
                                 <div>
                                    <label className="text-xs font-bold text-rose-800 mb-1 block">Estado (UF)</label>
                                    <input type="text" value={adoptionForm.state || ''} onChange={e => setAdoptionForm(p => ({...p, state: e.target.value.toUpperCase().slice(0,2)}))} className="w-full bg-white border border-rose-200 rounded-xl py-2.5 px-3 text-sm outline-none" placeholder="SP" maxLength={2} />
                                 </div>
                              </div>

                              {/* Descrição */}
                              <div>
                                 <label className="text-xs font-bold text-rose-800 mb-1 block">Descrição / Observações *</label>
                                 <textarea required rows={4} value={adoptionForm.description || ''} onChange={e => setAdoptionForm(p => ({...p, description: e.target.value}))} className="w-full bg-white border border-rose-200 rounded-xl py-2.5 px-3 text-sm outline-none resize-none leading-relaxed" placeholder="Conte sobre a personalidade, história e cuidados do pet..." />
                              </div>

                              {/* Status */}
                              <div>
                                 <label className="text-xs font-bold text-rose-800 mb-1 block">Status</label>
                                 <select value={adoptionForm.status || 'available'} onChange={e => setAdoptionForm(p => ({...p, status: e.target.value as 'available' | 'adopted'}))} className="w-full bg-white border border-rose-200 rounded-xl py-2.5 px-3 text-sm outline-none">
                                    <option value="available">Disponível para Adoção</option>
                                    <option value="adopted">Já Adotado</option>
                                 </select>
                              </div>

                              {/* Salvar */}
                              <div className="pt-1 flex gap-2">
                                 <button type="submit" disabled={loadingAction} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-black py-3 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center">
                                    {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : (adoptionForm.id ? 'Salvar Alterações' : 'Cadastrar Pet')}
                                 </button>
                                 <button type="button" onClick={() => { setShowAdoptionForm(false); setAdoptionForm(emptyAdoptionForm); }} className="px-4 py-3 bg-white text-gray-500 border border-gray-200 rounded-xl font-bold">
                                    Cancelar
                                 </button>
                              </div>
                           </form>
                        </div>
                     )}
                  </div>
               </div>
            )}

            {/* 7. PETS DO APP (aba separada, visualização por usuários) */}
            {activeTab === 'pets_app' && (() => {
               // 1. Filtrar pets baseados em texto (Nome do Pet ou Tag)
               const term = petsSearch.toLowerCase();
               const matchingPets = allAppPets.filter(p => {
                  if (!term) return true;
                  return (p.name && p.name.toLowerCase().includes(term)) || 
                         (p.tagId && p.tagId.toLowerCase().includes(term));
               });

               // 2. Extrair os donos desses pets
               const matchingPetsOwnerIds = new Set(matchingPets.map(p => p.ownerId));

               // 3. Filtrar owners baseados em texto (Nome do Owner)
               const filteredOwners = allAppOwners.filter(owner => {
                  if (!term) return true;
                  const petMatch = matchingPetsOwnerIds.has(owner.uid);
                  const nameMatch = owner.name && owner.name.toLowerCase().includes(term);
                  return petMatch || nameMatch;
               });

               return (
                  <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
                     {/* Header */}
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                           <h3 className="font-black text-xl text-gray-900 flex items-center gap-2">
                              <UserIcon className="w-6 h-6 text-indigo-500" /> Usuários & Pets
                           </h3>
                           <p className="text-sm text-gray-500 mt-1">Busque usuários para gerenciar os pets cadastrados por eles.</p>
                           {petsError && <p className="text-red-500 text-xs font-bold mt-2">Error loading pets: {petsError}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="bg-gray-100 text-gray-700 font-black px-3 py-1.5 rounded-xl text-sm">{filteredOwners.length} usuários</span>
                           <input
                              type="text"
                              value={petsSearch}
                              onChange={e => setPetsSearch(e.target.value)}
                              placeholder="Dono, Pet ou ID da Tag..."
                              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-400 w-56"
                           />
                        </div>
                     </div>

                     <div className="flex flex-col gap-6">
                        {filteredOwners.map(owner => {
                           const ownersPets = allAppPets.filter(p => p.ownerId === owner.uid);
                           return (
                              <div key={owner.uid} className="bg-white border-2 border-gray-100 rounded-[1.5rem] p-5 shadow-sm">
                                 {/* Detalhes do Usuário */}
                                 <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-50">
                                    <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg">
                                          {owner.name?.charAt(0)?.toUpperCase()}
                                       </div>
                                       <div>
                                          <h4 className="font-bold text-gray-900 leading-tight">{owner.name}</h4>
                                          {owner.phone && <p className="text-xs text-gray-500">{owner.phone}</p>}
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                                          {ownersPets.length} {ownersPets.length === 1 ? 'pet' : 'pets'}
                                       </span>
                                       <button onClick={() => setEditAppOwnerForm({ ...owner })} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
                                          <Edit3 className="w-4 h-4" />
                                       </button>
                                    </div>
                                 </div>

                                 {/* Pets Desse Usuário */}
                                 {ownersPets.length === 0 ? (
                                    <p className="text-sm text-gray-400">Nenhum pet cadastrado.</p>
                                 ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                       {ownersPets.map(pet => (
                                          <div key={pet.id} className={`border rounded-2xl overflow-hidden shadow-sm flex flex-col ${pet.tagId ? 'border-green-100' : 'border-gray-100'}`}>
                                             <div className="h-20 bg-gray-50 flex items-center justify-center relative">
                                                {pet.tagId && (
                                                   <div className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                                      <QrCode className="w-2.5 h-2.5" /> ID: {pet.tagId}
                                                   </div>
                                                )}
                                                <div className="text-3xl">{pet.animalType === 'Gato' ? '🐱' : '🐶'}</div>
                                             </div>
                                             <div className="p-3 flex-1 flex flex-col">
                                                <h5 className="font-black text-gray-900 text-base leading-tight mb-0.5 max-w-[120px] truncate">{pet.name}</h5>
                                                <p className="text-[10px] text-gray-500 font-bold max-w-[120px] truncate">
                                                   {pet.breed || 'SRD'} {pet.gender && `• ${pet.gender === 'male' ? 'Macho' : 'Fêmea'}`}
                                                </p>
                                                <div className="mt-auto pt-3 flex gap-1">
                                                   <button onClick={() => setEditAppPetForm({ ...pet })} className="flex-1 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 flex items-center justify-center gap-1">
                                                      <Edit3 className="w-3 h-3" /> Editar
                                                   </button>
                                                   <button onClick={async () => {
                                                      if(window.confirm('Excluir este pet?')) {
                                                         await supabase.from('pets').update({ deleted: true }).eq('id', pet.id);
                                                         setAllAppPets(p => p.filter(x => x.id !== pet.id));
                                                      }
                                                   }} className="px-2 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors">
                                                      <Trash2 className="w-3 h-3" />
                                                   </button>
                                                </div>
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 )}
                              </div>
                           );
                        })}
                        {filteredOwners.length === 0 && (
                           <div className="py-12 bg-white rounded-[2rem] border border-gray-100 flex flex-col items-center">
                              <Dog className="w-12 h-12 text-gray-200 mb-3" />
                              <p className="font-bold text-gray-400">Nenhum dono ou pet encontrado.</p>
                           </div>
                        )}
                     </div>

                     {/* Modal de Editar Pet Completo */}
                     {editAppPetForm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto pt-20 pb-20">
                           <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative my-auto">
                              <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                                 <h3 className="font-black text-xl text-gray-900 flex items-center gap-2">
                                    <Dog className="w-5 h-5 text-orange-500" /> Editar Perfil do Pet
                                 </h3>
                                 <button onClick={() => setEditAppPetForm(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                                    <X className="w-5 h-5" />
                                 </button>
                              </div>
                              <form className="p-6 max-h-[70vh] overflow-y-auto space-y-4" onSubmit={async (e) => {
                                 e.preventDefault();
                                 const res = await supabase.from('pets').update(editAppPetForm).eq('id', editAppPetForm.id).select();
                                 if(!res.error && res.data) {
                                    setAllAppPets(p => p.map(pet => pet.id === editAppPetForm.id ? editAppPetForm : pet));
                                    setEditAppPetForm(null);
                                 }
                              }}>
                                 <h4 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-2 mt-0">Dados Básicos</h4>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                       <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nome do Pet</label>
                                       <input type="text" value={editAppPetForm.name || ''} onChange={e => setEditAppPetForm({...editAppPetForm, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-medium" />
                                    </div>
                                    <div>
                                       <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Tag ID (Pingente)</label>
                                       <input type="text" value={editAppPetForm.tagId || ''} onChange={e => setEditAppPetForm({...editAppPetForm, tagId: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-medium" placeholder="Ex: A1B2-C3D4" />
                                    </div>
                                    <div>
                                       <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Espécie</label>
                                       <select value={editAppPetForm.animalType || ''} onChange={e => setEditAppPetForm({...editAppPetForm, animalType: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-medium">
                                          <option value="Cachorro">Cachorro</option>
                                          <option value="Gato">Gato</option>
                                       </select>
                                    </div>
                                    <div>
                                       <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Gênero</label>
                                       <select value={editAppPetForm.gender || ''} onChange={e => setEditAppPetForm({...editAppPetForm, gender: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-medium">
                                          <option value="male">Macho</option>
                                          <option value="female">Fêmea</option>
                                       </select>
                                    </div>
                                    <div>
                                       <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Raça / Mistura</label>
                                       <input type="text" value={editAppPetForm.breed || ''} onChange={e => setEditAppPetForm({...editAppPetForm, breed: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-medium" />
                                    </div>
                                    <div>
                                       <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cor</label>
                                       <input type="text" value={editAppPetForm.color || ''} onChange={e => setEditAppPetForm({...editAppPetForm, color: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-medium" />
                                    </div>
                                 </div>

                                 <h4 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-2 mt-6">Características Físicas e Detalhes</h4>
                                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                       <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nascimento</label>
                                       <input type="text" value={editAppPetForm.birthday || ''} onChange={e => setEditAppPetForm({...editAppPetForm, birthday: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-medium" placeholder="Ex: 22/04/2020" />
                                    </div>
                                    <div>
                                       <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Data Adoção</label>
                                       <input type="text" value={editAppPetForm.adoptionDate || ''} onChange={e => setEditAppPetForm({...editAppPetForm, adoptionDate: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-medium" />
                                    </div>
                                    <div>
                                       <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Peso (kg)</label>
                                       <input type="text" value={editAppPetForm.weight || ''} onChange={e => setEditAppPetForm({...editAppPetForm, weight: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-medium" />
                                    </div>
                                 </div>
                                 <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Observações Médicas ou Dicas</label>
                                    <textarea value={editAppPetForm.observations || ''} onChange={e => setEditAppPetForm({...editAppPetForm, observations: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-medium min-h-[80px]" />
                                 </div>

                                 <div className="pt-4 flex gap-3 sticky bottom-0 bg-white">
                                    <button type="submit" className="flex-1 bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100">Salvar Alterações</button>
                                 </div>
                              </form>
                           </div>
                        </div>
                     )}

                     {/* Modal de Editar Usuário (Dono) */}
                     {editAppOwnerForm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto pt-20 pb-20">
                           <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative my-auto">
                              <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                                 <h3 className="font-black text-xl text-gray-900 flex items-center gap-2">
                                    <UserIcon className="w-5 h-5 text-indigo-500" /> Editar Conta de Usuário
                                 </h3>
                                 <button onClick={() => setEditAppOwnerForm(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                                    <X className="w-5 h-5" />
                                 </button>
                              </div>
                              <form className="p-6 max-h-[70vh] overflow-y-auto space-y-4" onSubmit={async (e) => {
                                 e.preventDefault();
                                 const payload = {
                                    name: editAppOwnerForm.name,
                                    phone: editAppOwnerForm.phone,
                                    gender: editAppOwnerForm.gender,
                                    birthday: editAppOwnerForm.birthday,
                                    address: editAppOwnerForm.address,
                                    city: editAppOwnerForm.city,
                                    state: editAppOwnerForm.state
                                 };
                                 const res = await supabase.from('owners').update(payload).eq('uid', editAppOwnerForm.uid).select();
                                 if(!res.error) {
                                    setAllAppOwners(prev => prev.map(o => o.uid === editAppOwnerForm.uid ? editAppOwnerForm : o));
                                    setEditAppOwnerForm(null);
                                 } else {
                                    alert('Erro ao atualizar dono: ' + res.error.message);
                                 }
                              }}>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                       <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nome Completo</label>
                                       <input type="text" value={editAppOwnerForm.name || ''} onChange={e => setEditAppOwnerForm({...editAppOwnerForm, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-medium" required />
                                    </div>
                                    <div>
                                       <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Celular / WhatsApp</label>
                                       <input type="text" value={editAppOwnerForm.phone || ''} onChange={e => setEditAppOwnerForm({...editAppOwnerForm, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-medium" />
                                    </div>
                                    <div>
                                       <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Gênero</label>
                                       <input type="text" value={editAppOwnerForm.gender || ''} onChange={e => setEditAppOwnerForm({...editAppOwnerForm, gender: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-medium" placeholder="Ex: masculino, feminino" />
                                    </div>
                                    <div>
                                       <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Data de Nascimento</label>
                                       <input type="text" value={editAppOwnerForm.birthday || ''} onChange={e => setEditAppOwnerForm({...editAppOwnerForm, birthday: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-medium" />
                                    </div>
                                 </div>
                                 <h4 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-2 mt-6">Endereço Associado</h4>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                       <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Endereço Completo</label>
                                       <input type="text" value={editAppOwnerForm.address || ''} onChange={e => setEditAppOwnerForm({...editAppOwnerForm, address: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-medium" />
                                    </div>
                                    <div>
                                       <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cidade</label>
                                       <input type="text" value={editAppOwnerForm.city || ''} onChange={e => setEditAppOwnerForm({...editAppOwnerForm, city: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-medium" />
                                    </div>
                                    <div>
                                       <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Estado (UF)</label>
                                       <input type="text" value={editAppOwnerForm.state || ''} onChange={e => setEditAppOwnerForm({...editAppOwnerForm, state: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-medium" />
                                    </div>
                                 </div>

                                 <div className="pt-4 flex gap-3 sticky bottom-0 bg-white">
                                    <button type="submit" className="flex-1 bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100">Atualizar Usuário</button>
                                 </div>
                              </form>
                           </div>
                        </div>
                     )}
                  </div>
               );
            })()}

            {/* 8. EDITOR DE EVENTOS */}
            {activeTab === 'events' && (
               <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                     <h4 className="font-black text-xl text-gray-800 flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-orange-500" /> Eventos ({petEvents.length})
                     </h4>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 mb-6">
                     <form
                        onSubmit={async (e) => {
                           e.preventDefault();
                           if (!eventForm.title) return;
                           try {
                              const payload = {
                                 title: eventForm.title,
                                 description: eventForm.description || null,
                                 imageUrl: eventForm.imageUrl || null,
                                 event_date: eventForm.event_date || null,
                                 location: eventForm.location || null,
                              };
                              if (eventForm.id) {
                                 await supabase.from('events').update(payload).eq('id', eventForm.id);
                                 setEventMessage('Evento atualizado!');
                              } else {
                                 const newId = `evt-${Date.now()}`;
                                 await supabase.from('events').insert({ id: newId, ...payload });
                                 setEventMessage('Evento criado!');
                              }
                              const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false });
                              setPetEvents((data || []) as PetEvent[]);
                              setEventForm({ id: '', title: '', description: '', imageUrl: '', event_date: '', location: '' });
                              setTimeout(() => setEventMessage(null), 3000);
                           } catch { alert('Erro ao salvar evento.'); }
                        }}
                        className="flex flex-col gap-4"
                     >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Título do Evento</label>
                              <div className="relative">
                                 <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                 <input
                                    type="text"
                                    value={eventForm.title || ''}
                                    onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                                    className="w-full bg-white border border-gray-200 py-3 pl-12 pr-4 rounded-xl text-sm outline-none focus:border-indigo-500"
                                    required
                                 />
                              </div>
                           </div>
                           <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Descrição</label>
                              <input
                                 type="text"
                                 value={eventForm.description || ''}
                                 onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                                 className="w-full bg-white border border-gray-200 py-3 px-4 rounded-xl text-sm outline-none focus:border-indigo-500"
                              />
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Data (ex: 2026-04-15)</label>
                              <input
                                 type="text"
                                 value={eventForm.event_date || ''}
                                 onChange={e => setEventForm({ ...eventForm, event_date: e.target.value })}
                                 className="w-full bg-white border border-gray-200 py-3 px-4 rounded-xl text-sm outline-none focus:border-indigo-500"
                              />
                           </div>
                           <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Local / Cidade</label>
                              <div className="relative">
                                 <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                 <input
                                    type="text"
                                    value={eventForm.location || ''}
                                    onChange={e => setEventForm({ ...eventForm, location: e.target.value })}
                                    className="w-full bg-white border border-gray-200 py-3 pl-12 pr-4 rounded-xl text-sm outline-none focus:border-indigo-500"
                                 />
                              </div>
                           </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                           <label className="text-xs font-bold text-gray-500 uppercase ml-1">Imagem do Evento</label>
                           <div className="flex gap-2">
                              {eventForm.imageUrl && (
                                 <div className="w-20 h-20 rounded-xl overflow-hidden relative group border border-gray-200">
                                    <img src={eventForm.imageUrl} className="w-full h-full object-cover" alt="Event" />
                                    <button
                                       type="button"
                                       onClick={() => setEventForm(prev => ({ ...prev, imageUrl: '' }))}
                                       className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                       <X className="w-5 h-5" />
                                    </button>
                                 </div>
                              )}
                              {!eventForm.imageUrl && (
                                 <label className="w-20 h-20 bg-white rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-indigo-400 cursor-pointer transition-all">
                                    <input
                                       type="file"
                                       accept="image/*"
                                       className="hidden"
                                       onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          const reader = new FileReader();
                                          reader.onload = (ev) => setEventForm(prev => ({ ...prev, imageUrl: ev.target?.result as string }));
                                          reader.readAsDataURL(file);
                                       }}
                                    />
                                    <Camera className="w-5 h-5 text-gray-400" />
                                    <span className="text-[8px] font-bold text-gray-400 uppercase mt-1">Foto</span>
                                 </label>
                              )}
                           </div>
                        </div>

                        {eventMessage && (
                           <div className="bg-green-50 text-green-600 p-3 rounded-xl text-center text-sm font-bold border border-green-200">
                              {eventMessage}
                           </div>
                        )}

                        <div className="flex gap-2 mt-2">
                           <button type="submit" className="flex-1 bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-all">
                              {eventForm.id ? 'Atualizar Evento' : 'Criar Evento'}
                           </button>
                           {eventForm.id && (
                              <button type="button" onClick={() => setEventForm({ id: '', title: '', description: '', imageUrl: '', event_date: '', location: '' })} className="px-6 bg-white border border-gray-200 text-gray-600 font-bold py-3.5 rounded-xl hover:bg-gray-50 transition-all">
                                 Cancelar
                              </button>
                           )}
                        </div>
                     </form>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                     {petEvents.map(event => (
                        <div key={event.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                           {event.imageUrl ? (
                              <img src={event.imageUrl} className="w-full h-32 object-cover" />
                           ) : (
                              <div className="w-full h-32 bg-gray-50 flex items-center justify-center border-b border-gray-100">
                                 <Calendar className="w-8 h-8 text-gray-300" />
                              </div>
                           )}
                           <div className="p-4 flex-1 flex flex-col">
                              <h5 className="font-bold text-gray-900 line-clamp-1">{event.title}</h5>
                              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                 <Calendar className="w-3 h-3" /> {event.event_date || 'N/A'}
                              </p>
                              {event.location && (
                                 <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 line-clamp-1">
                                    <MapPin className="w-3 h-3" /> {event.location}
                                 </p>
                              )}
                              <div className="mt-auto pt-4 flex gap-2">
                                 <button onClick={() => setEventForm({ ...event })} className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1">
                                    <Edit3 className="w-4 h-4" /> Editar
                                 </button>
                                 <button onClick={async () => {
                                    if(window.confirm('Excluir este evento?')) {
                                       await supabase.from('events').delete().eq('id', event.id);
                                       setPetEvents(p => p.filter(e => e.id !== event.id));
                                    }
                                 }} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                 </button>
                              </div>
                           </div>
                        </div>
                     ))}
                     {petEvents.length === 0 && <p className="col-span-full text-center text-sm text-gray-400 py-8">Nenhum evento criado.</p>}
                  </div>
               </div>
            )}
            
         </div>
      </main>

    </div>
  );
}
