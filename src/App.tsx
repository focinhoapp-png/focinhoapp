/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Component, ReactNode } from 'react';
import {
  Plus,
  QrCode,
  MapPin,
  Phone,
  ShieldCheck,
  Dog,
  LogOut,
  Camera,
  MessageCircle,
  AlertCircle,
  Loader2,
  Home,
  User as UserIcon,
  Calendar,
  Scale,
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
  Image as ImageIcon,
  Bell,
  Compass,
  PawPrint,
  ShoppingBag,
  HelpCircle,
  Megaphone,
  Heart,
  ExternalLink,
  Share2,
  Download,
  Edit2,
  Trash2,
  Settings,
  HeartHandshake,
  CheckCircle2,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toPng } from 'html-to-image';
import { supabase } from './supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// Helper to generate random ID (replaces doc(collection()).id)
const generateId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);


// --- Types ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

interface PetProfile {
  id: string;
  ownerId: string;
  tagId: string;
  name: string;
  animalType: string;
  gender: string;
  breed: string;
  color: string;
  size?: string;
  birthday?: string;
  weight?: string;
  adoptionDate?: string;
  ownerPhone: string;
  phoneVerified?: boolean;
  ownerAddress: string;
  observations: string;
  photoUrl: string;
  gallery?: string[];
  privacySettings?: {
    showAddress?: boolean;
    showPhone?: boolean;
    showObservations?: boolean;
    showAgeAndWeight?: boolean;
  };
  ownerName?: string; // Appended at runtime for finder
  createdAt: any;
}

interface OwnerProfile {
  uid: string;
  name?: string;
  photoUrl?: string;
  gender?: string;
  birthday?: string;
  phone?: string;
  address?: string;
  privacySettings?: {
    showAddress?: boolean;
    showPhone?: boolean;
    showObservations?: boolean;
    showAgeAndWeight?: boolean;
  };
  updatedAt?: any;
}

interface Reminder {
  id: string;
  ownerId: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  petName: string;
  type: string;
  createdAt: any;
}

interface AdoptionPet {
  id: string;
  name: string;
  animalType: string;
  breed: string;
  color: string;
  size?: string;
  gender: string;
  age?: string;
  description: string;
  photoUrl: string;
  gallery?: string[];
  contactPhone: string;
  status: 'available' | 'adopted';
  createdAt: any;
}

interface LostAlert {
  id: string;
  petId: string;
  ownerId: string;
  petName: string;
  petPhoto: string;
  city: string;
  lastSeen: string;
  contactPhone: string;
  createdAt: any;
}

interface Partner {
  id: string;
  name: string;
  category: string;
  description: string;
  location: string;
  logo: string;
  url: string;
  created_at: any;
}

interface Walk {
  id: string;
  userId: string;
  petId?: string;
  startTime: any;
  endTime?: any;
  duration: number;
  distance: number;
  altitudeGain?: number;
  averageSpeed?: number;
  maxSpeed?: number;
  path: { lat: number; lng: number; timestamp: number; alt?: number; speed?: number }[];
  markers: { type: 'water' | 'poop'; lat: number; lng: number; timestamp: number }[];
}

interface Post {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  petId?: string;
  petName?: string;
  type: 'photo' | 'walk';
  content: string;
  imageUrl?: string;
  walkId?: string;
  likes: string[];
  createdAt: any;
}

// --- Helpers ---

const formatPhoneMask = (value: string) => {
  if (!value) return '';
  const phone = value.replace(/\D/g, '');
  if (phone.length <= 2) return phone;
  if (phone.length <= 6) return `(${phone.slice(0, 2)}) ${phone.slice(2)}`;
  if (phone.length <= 10) return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
  return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7, 11)}`;
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// Fix Leaflet icons
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

// --- Components ---

class ErrorBoundary extends Component<any, any> {
  state: any;
  props: any;
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-red-50 p-6 rounded-[2.5rem] border border-red-100 max-w-md space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-gray-800">Ops! Algo deu errado.</h2>
            <p className="text-sm text-gray-500">
              Ocorreu um erro inesperado. Tente recarregar a página ou voltar mais tarde.
            </p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Recarregar Página
            </Button>
            {process.env.NODE_ENV !== 'production' && (
              <pre className="mt-4 p-4 bg-gray-900 text-white text-[10px] rounded-xl overflow-auto text-left max-h-40">
                {String(this.state.error)}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, loading = false }: any) => {
  const variants: any = {
    primary: 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-200',
    secondary: 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50',
    outline: 'bg-transparent border-2 border-orange-500 text-orange-500 hover:bg-orange-50',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-red-200',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-6 py-4 rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-base ${variants[variant]} ${className}`}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : children}
    </button>
  );
};

const Input = ({ label, value, onChange, placeholder, type = 'text', icon: Icon }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-sm font-bold text-gray-700 ml-1">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 ${Icon ? 'pl-12' : 'px-4'} pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-base`}
      />
    </div>
  </div>
);

const DOG_BREEDS = ['Vira-lata (SRD)', 'Golden Retriever', 'Labrador', 'Poodle', 'Bulldog', 'Beagle', 'Pug', 'Shih Tzu', 'Rottweiler', 'Pastor Alemão', 'Yorkshire', 'Pinscher', 'Dachshund', 'Chihuahua', 'Pitbull', 'Outro'];
const CAT_BREEDS = ['Vira-lata (SRD)', 'Persa', 'Siamês', 'Maine Coon', 'Angorá', 'Bengal', 'Ragdoll', 'Sphynx', 'Munchkin', 'Outro'];
const COLORS = ['Branco', 'Preto', 'Marrom', 'Cinza', 'Dourado', 'Creme', 'Malhado', 'Caramelo', 'Chocolate', 'Cinza Azulado', 'Outro'];

const PARTNER_CATEGORIES = ['Todos', 'Pet Shops', 'Clínicas Veterinárias', 'ONGs', 'Adestradores', 'Hotéis para Pets', 'Casas de Ração', 'Marcas Pet'];

const Select = ({ label, value, onChange, options, icon: Icon }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-sm font-bold text-gray-700 ml-1">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 ${Icon ? 'pl-12' : 'px-4'} pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all appearance-none text-base`}
      >
        <option value="">Selecione...</option>
        {options.map((opt: any) => {
          const isObj = typeof opt === 'object';
          const val = isObj ? opt.value : opt;
          const lab = isObj ? opt.label : opt;
          return <option key={val} value={val}>{lab}</option>;
        })}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
      </div>
    </div>
  </div>
);

const LocationInput = ({ label, value, onChange, placeholder, icon: Icon }: any) => {
  const [loading, setLoading] = useState(false);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Seu navegador não suporta geolocalização.');
      return;
    }
    
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        // Use browser language fallback to pt-BR
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1&accept-language=pt-BR`);
        const data = await res.json();
        
        if (data && data.address) {
          const { road, suburb, city, town, village, state } = data.address;
          const street = road || '';
          const neighborhood = suburb || '';
          const cityName = city || town || village || '';
          const stateName = state || '';
          
          const parts = [street, neighborhood, cityName, stateName].filter(Boolean);
          onChange(parts.join(', '));
        } else {
          onChange(`${latitude}, ${longitude}`);
        }
      } catch (err) {
        console.error('Error fetching address:', err);
        alert('Erro ao buscar o endereço. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('Error getting location:', error);
      alert('Não foi possível obter sua localização. Verifique as permissões de GPS do seu aparelho/navegador.');
      setLoading(false);
    }, { enableHighAccuracy: true, timeout: 10000 });
  };

  return (
    <div className="flex flex-col gap-1.5 w-full relative">
      {label && <label className="text-sm font-bold text-gray-700 ml-1">{label}</label>}
      <div className="relative flex items-center">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 ${Icon ? 'pl-12' : 'px-4'} pr-16 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-base`}
        />
        <button
          type="button"
          onClick={handleGetLocation}
          disabled={loading}
          title="Preencher meu endereço atual"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-orange-100 text-orange-600 rounded-xl hover:bg-orange-200 transition-colors disabled:opacity-50 active:scale-95"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Compass className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  // Tracks the previous user ID so we only change the view on REAL auth changes
  // (login/logout), ignoring token refreshes and tab-focus session recoveries
  const lastUserIdRef = useRef<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard'); // home, dashboard, reminders, walk, lost_pets, account, activate, profile, finder
  const [userCity, setUserCity] = useState<string>('');
  const [accountSubView, setAccountSubView] = useState('menu'); // menu, profile, pets, support, store, admin, partners
  const [activePartnerFilter, setActivePartnerFilter] = useState('Todos');
  const [selectedPet, setSelectedPet] = useState<PetProfile | null>(null);
  const [userPets, setUserPets] = useState<PetProfile[]>([]);
  const [allPets, setAllPets] = useState<PetProfile[]>([]); // Admin only
  const [isFetchingAllPets, setIsFetchingAllPets] = useState(false); // Admin only
  const [allTags, setAllTags] = useState<any[]>([]); // Admin only
  const [isFetchingAllTags, setIsFetchingAllTags] = useState(false); // Admin only
  const [amountToGenerate, setAmountToGenerate] = useState(10); // Admin only
  const [adminTagsPage, setAdminTagsPage] = useState(1); // Admin only
  const [adminPetsPage, setAdminPetsPage] = useState(1); // Admin only
  const [tagIdToActivate, setTagIdToActivate] = useState('');
  const [finderPet, setFinderPet] = useState<PetProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [storeItems, setStoreItems] = useState<any[]>([]); // Admin only
  const [storeForm, setStoreForm] = useState<{ id: string, name: string, price: string, url: string, gallery: string[] }>({ id: '', name: '', price: '', url: '', gallery: [] }); // Admin only
  const [storeMessage, setStoreMessage] = useState<string | null>(null); // Admin only
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null);
  const [currentPetIndex, setCurrentPetIndex] = useState(0);

  // SOS State
  const [lostAlerts, setLostAlerts] = useState<LostAlert[]>([]);
  const [isAddingSOS, setIsAddingSOS] = useState(false);
  const [editingSOSId, setEditingSOSId] = useState<string | null>(null);
  const [newSOS, setNewSOS] = useState({ petId: '', city: '', lastSeen: '' });
  const [hasNewUnreadSOS, setHasNewUnreadSOS] = useState(false);
  const lastLostAlertsCount = useRef(0);

  // Partners State
  const [partners, setPartners] = useState<Partner[]>([]); // DB Partners
  const [partnerForm, setPartnerForm] = useState<Partial<Partner>>({ id: '', name: '', category: 'Pet Shops', description: '', location: '', logo: '', url: '' }); // Admin
  const [partnerMessage, setPartnerMessage] = useState<string | null>(null); // Admin

  const [activeNotification, setActiveNotification] = useState<{ title: string, message: string } | null>(null);

  // Reminders State
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [newReminder, setNewReminder] = useState({ title: '', petName: '', type: 'Saúde', time: '12:00' });

  const isAdmin = user?.email === 'ennesruan@gmail.com' || user?.email === 'admin@focinho.app';

  // Adoption State
  const [adoptionPets, setAdoptionPets] = useState<AdoptionPet[]>([]);
  const [isAddingAdoptionPet, setIsAddingAdoptionPet] = useState(false);
  const [newAdoptionPet, setNewAdoptionPet] = useState<Partial<AdoptionPet>>({
    name: '', animalType: 'Cachorro', breed: '', color: '', gender: 'Macho', description: '', photoUrl: '', contactPhone: '', status: 'available'
  });
  const [hasNewAdoption, setHasNewAdoption] = useState(false);
  const [lastAdoptedPetName, setLastAdoptedPetName] = useState<string | null>(null);
  const [editingAdoptionPetId, setEditingAdoptionPetId] = useState<string | null>(null);
  const [fireworksActive, setFireworksActive] = useState(false);

  // Walk State
  const [walkSubView, setWalkSubView] = useState<'record' | 'history'>('record');
  const [isWalking, setIsWalking] = useState(false);
  const [walkPath, setWalkPath] = useState<{ lat: number; lng: number; timestamp: number; alt?: number; speed?: number }[]>([]);
  const [walkMarkers, setWalkMarkers] = useState<{ type: 'water' | 'poop'; lat: number; lng: number; timestamp: number }[]>([]);
  const [walkStartTime, setWalkStartTime] = useState<number | null>(null);
  const [walkDistance, setWalkDistance] = useState(0);
  const [walkAltitudeGain, setWalkAltitudeGain] = useState(0);
  const [walkMaxSpeed, setWalkMaxSpeed] = useState(0);
  const [lastAltitude, setLastAltitude] = useState<number | null>(null);
  const [walkSpeeds, setWalkSpeeds] = useState<number[]>([]);
  const [walkSummary, setWalkSummary] = useState<Walk | null>(null);
  const [generatedWalkImage, setGeneratedWalkImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [walkTimer, setWalkTimer] = useState(0);
  const [walkHistory, setWalkHistory] = useState<Walk[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  // Feed State
  const [posts, setPosts] = useState<Post[]>([]);
  const [isAddingPost, setIsAddingPost] = useState(false);
  const [newPost, setNewPost] = useState<{ content: string, type: 'photo' | 'walk', imageUrl?: string, petId?: string, petName?: string }>({ content: '', type: 'photo' });

  // Verification State
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Auth form state
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const timeStr = now.toTimeString().slice(0, 5);

      reminders.forEach(reminder => {
        if (reminder.date === nowStr && reminder.time === timeStr) {
          setActiveNotification({
            title: `Lembrete: ${reminder.type}`,
            message: `Está na hora do compromisso de ${reminder.petName}!`
          });
        }
      });
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [reminders]);

  // Auth and URL Listener
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tagParam = params.get('tag') || params.get('p');
    const tag = tagParam ? tagParam.toUpperCase() : null;

    const checkTagStatus = async (id: string) => {
      setLoading(true);
      try {
        // 1. Try tags table first
        const { data: tagData } = await supabase.from('tags').select('*').eq('id', id).maybeSingle();
        let petId: string | null = tagData?.petId || null;

        // 2. Fallback: search pets table
        if (!petId) {
          const { data: petData } = await supabase.from('pets').select('id').eq('tagId', id).maybeSingle();
          if (petData) petId = petData.id;
        }

        if (petId) {
          const { data: petSnap } = await supabase.from('pets').select('*').eq('id', petId).maybeSingle();
          if (petSnap) {
            const { data: ownerData } = await supabase.from('owners').select('*').eq('uid', petSnap.ownerId).maybeSingle();
            if (ownerData) {
              petSnap.ownerPhone = ownerData.phone || petSnap.ownerPhone;
              petSnap.ownerAddress = ownerData.address || petSnap.ownerAddress;
              petSnap.ownerName = ownerData.name || '';
              // Owner's privacy settings override Pet's locally in frontend
              if (ownerData.privacySettings) {
                petSnap.privacySettings = { ...(petSnap.privacySettings || {}), ...ownerData.privacySettings };
              }
            }
            setFinderPet(petSnap as PetProfile);
            setView('finder');
            setLoading(false);
            return;
          }
        }

        // Tag not associated with any pet yet
        setTagIdToActivate(id);
      } catch (err) {
        console.error('Error checking tag:', err);
      } finally {
        setLoading(false);
      }
    };

    if (tag) {
      checkTagStatus(tag);
    } else {
      setLoading(false);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      const prevUserId = lastUserIdRef.current;
      lastUserIdRef.current = u?.id ?? null;

      setUser(u);

      // Only change view when auth STATUS truly changes:
      //   undefined → anything  : first check on page load
      //   null      → user.id   : user just logged in
      //   user.id   → null      : user just logged out
      // Everything else (same user, token refresh, tab focus) → keep current view
      const firstCheck = prevUserId === undefined;
      const statusChanged = (prevUserId === null) !== (u === null);
      if (!firstCheck && !statusChanged) return;

      // If we are currently loading (checking a tag), don't change the view yet
      setLoading(currentLoading => {
        if (!currentLoading) {
          if (u) {
            setView(currentView => {
              if (currentView === 'finder') return 'finder';
              if (tag) return 'activate';
              return 'dashboard';
            });
          } else {
            setView(currentView => {
              if (currentView === 'finder') return 'finder';
              return 'home';
            });
          }
        }
        return currentLoading;
      });
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch User Pets
  useEffect(() => {
    if (!user) { setUserPets([]); return; }
    const fetchPets = async () => {
      const { data } = await supabase.from('pets').select('*').eq('ownerId', user.id).neq('deleted', true);
      setUserPets((data || []) as PetProfile[]);
    };
    fetchPets();
    const channel = supabase.channel('pets-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pets', filter: `ownerId=eq.${user.id}` }, fetchPets)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Fetch Owner Profile
  useEffect(() => {
    if (!user) { setOwnerProfile(null); return; }
    const fetchOwner = async () => {
      const { data } = await supabase.from('owners').select('*').eq('uid', user.id).maybeSingle();
      if (data) {
        setOwnerProfile(data as OwnerProfile);
      } else {
        setOwnerProfile({ uid: user.id, gender: '', birthday: '', phone: '', address: '', photoUrl: '' });
      }
    };
    fetchOwner();
    const channel = supabase.channel('owner-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'owners', filter: `uid=eq.${user.id}` }, fetchOwner)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Auto-detect User City for Geo-fencing
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await response.json();
        const city = data.address.city || data.address.town || data.address.village || data.address.suburb || "";
        const state = data.address.state || "";
        const locationString = city ? `${city}${state ? ` - ${state}` : ''}` : "";
        if (locationString) setUserCity(locationString);
      } catch (err) {
        console.error("Error detecting user city:", err);
      }
    });
  }, []);

  // Fetch Reminders
  useEffect(() => {
    if (!user) return;
    const fetchReminders = async () => {
      const { data } = await supabase.from('reminders').select('*').eq('ownerId', user.id);
      setReminders((data || []) as Reminder[]);
    };
    fetchReminders();
    const channel = supabase.channel('reminders-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders', filter: `ownerId=eq.${user.id}` }, fetchReminders)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Fetch Adoption Pets
  useEffect(() => {
    const fetchAdoption = async () => {
      const { data } = await supabase.from('adoption_pets').select('*');
      setAdoptionPets((data || []) as AdoptionPet[]);
    };
    fetchAdoption();
    const channel = supabase.channel('adoption-pets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'adoption_pets' }, fetchAdoption)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fetch Partners
  useEffect(() => {
    const fetchPartners = async () => {
      const { data } = await supabase.from('partners').select('*').order('created_at', { ascending: false });
      setPartners((data || []) as Partner[]);
    };
    fetchPartners();
    const channel = supabase.channel('partners-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partners' }, fetchPartners)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fetch All Pets and Tags (Admin Only)
  useEffect(() => {
    if (!isAdmin || accountSubView !== 'admin') return;
    const fetchAdminData = async () => {
      setIsFetchingAllPets(true);
      setIsFetchingAllTags(true);
      try {
        const [petsRes, tagsRes, storeRes] = await Promise.all([
          supabase.from('pets').select('*').neq('deleted', true),
          supabase.from('tags').select('*').order('id', { ascending: true }),
          supabase.from('store_items').select('*').order('created_at', { ascending: false })
        ]);
        setAllPets((petsRes.data || []) as PetProfile[]);
        setAllTags(tagsRes.data || []);
        setStoreItems(storeRes.data || []);
      } catch (err) {
        console.error('Error fetching admin data:', err);
      } finally {
        setIsFetchingAllPets(false);
        setIsFetchingAllTags(false);
      }
    };
    fetchAdminData();
  }, [isAdmin, accountSubView]);

  // Fetch SOS Alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      const { data } = await supabase.from('lost_alerts').select('*');
      const allAlerts = (data || []) as LostAlert[];

      // Filtrar alertas pela cidade do usuário (Geo-fencing)
      // Se userCity estiver vazio, mostramos todos por enquanto ou apenas os da região se detectado
      const filteredAlerts = userCity
        ? allAlerts.filter(a => a.city.toLowerCase().includes(userCity.split(' - ')[0].toLowerCase()))
        : allAlerts;

      // Detecção de novos alertas (piscar no dashboard) apenas se for na cidade do usuário
      if (lastLostAlertsCount.current !== 0 && filteredAlerts.length > lastLostAlertsCount.current && view !== 'lost_pets') {
        setHasNewUnreadSOS(true);
      }
      lastLostAlertsCount.current = filteredAlerts.length;
      setLostAlerts(filteredAlerts);
    };
    fetchAlerts();
    const channel = supabase.channel('lost-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lost_alerts' }, fetchAlerts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [view, userCity]);

  // Fetch Walk History
  useEffect(() => {
    if (!user || view !== 'walk') return;
    const fetchWalkHistory = async () => {
      setIsFetchingHistory(true);
      try {
        const { data } = await supabase.from('walks').select('*').eq('userId', user.id).order('startTime', { ascending: false });
        setWalkHistory((data || []) as Walk[]);
      } catch (err) {
        console.error('Error fetching walks:', err);
      } finally {
        setIsFetchingHistory(false);
      }
    };
    fetchWalkHistory();
    const channel = supabase.channel('walks-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'walks', filter: `userId=eq.${user.id}` }, fetchWalkHistory)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, view]);

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: user?.id,
        email: user?.email,
        emailVerified: user?.email_confirmed_at != null,
        isAnonymous: false,
        tenantId: null,
        providerInfo: []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    return JSON.stringify(errInfo);
  };

  const handleSaveReminder = async () => {
    if (!user || !newReminder.title || !newReminder.petName) return;
    setLoading(true);
    try {
      const reminderId = editingReminder ? editingReminder.id : generateId();
      const { error } = await supabase.from('reminders').upsert({
        id: reminderId,
        ownerId: user.id,
        title: newReminder.title,
        petName: newReminder.petName,
        type: newReminder.type,
        date: selectedDate,
        time: newReminder.time,
        createdAt: editingReminder ? editingReminder.createdAt : new Date().toISOString()
      });
      if (error) throw error;
      setIsAddingReminder(false);
      setEditingReminder(null);
      setNewReminder({ title: '', petName: '', type: 'Saúde', time: '12:00' });
      // Refresh
      const { data } = await supabase.from('reminders').select('*').eq('ownerId', user.id);
      setReminders((data || []) as Reminder[]);
    } catch (err) {
      console.error('Error saving reminder:', err);
      setError('Erro ao salvar lembrete.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('reminders').delete().eq('id', id);
      if (error) throw error;
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Error deleting reminder:', err);
      setError('Erro ao excluir lembrete.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdoptionPet = async () => {
    if (!newAdoptionPet.name || !newAdoptionPet.description) return;
    setLoading(true);
    try {
      if (editingAdoptionPetId) {
        // Edit mode: update existing pet
        const { error } = await supabase.from('adoption_pets').update({
          ...newAdoptionPet,
        }).eq('id', editingAdoptionPetId);
        if (error) throw error;
      } else {
        // Create mode: insert new pet
        const petId = generateId();
        const { error } = await supabase.from('adoption_pets').insert({
          ...newAdoptionPet,
          id: petId,
          status: 'available',
          gallery: newAdoptionPet.gallery || [],
          createdAt: new Date().toISOString()
        });
        if (error) throw error;
      }
      setIsAddingAdoptionPet(false);
      setEditingAdoptionPetId(null);
      setNewAdoptionPet({ name: '', animalType: 'Cachorro', breed: '', color: '', gender: 'Macho', description: '', photoUrl: '', gallery: [], contactPhone: '', status: 'available' });
      const { data } = await supabase.from('adoption_pets').select('*');
      setAdoptionPets((data || []) as AdoptionPet[]);
    } catch (err) {
      console.error('Error saving adoption pet:', err);
      setError('Erro ao salvar pet para adoção.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSOS = async () => {
    if (!user || !newSOS.petId || !newSOS.city) return;

    // Validar limite de 1 alerta por pet (apenas na criação)
    if (!editingSOSId) {
      const existingAlert = lostAlerts.find(a => a.petId === newSOS.petId);
      if (existingAlert) {
        setError('Este pet já possui um alerta SOS ativo.');
        return;
      }
    }

    setLoading(true);
    try {
      const pet = userPets.find(p => p.id === newSOS.petId);
      if (!pet) return;

      const alertId = editingSOSId || generateId();
      const payload = {
        id: alertId,
        petId: pet.id,
        ownerId: user.id,
        petName: pet.name,
        petPhoto: pet.photoUrl,
        city: newSOS.city,
        lastSeen: newSOS.lastSeen,
        contactPhone: pet.ownerPhone || ownerProfile?.phone || '',
        createdAt: editingSOSId ? lostAlerts.find(a => a.id === editingSOSId)?.createdAt : new Date().toISOString()
      };

      const { error } = await supabase.from('lost_alerts').upsert(payload);
      if (error) throw error;

      setIsAddingSOS(false);
      setEditingSOSId(null);
      setNewSOS({ petId: '', city: '', lastSeen: '' });
      const { data } = await supabase.from('lost_alerts').select('*');
      setLostAlerts((data || []) as LostAlert[]);
    } catch (err) {
      console.error('Error saving SOS alert:', err);
      setError(`Erro ao gerar alerta SOS: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSOS = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este alerta? Se o pet foi encontrado, parabéns!')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('lost_alerts').delete().eq('id', id);
      if (error) throw error;
      const { data } = await supabase.from('lost_alerts').select('*');
      setLostAlerts((data || []) as LostAlert[]);
    } catch (err) {
      console.error('Error deleting SOS alert:', err);
      setError('Erro ao remover alerta.');
    } finally {
      setLoading(false);
    }
  };

  // Walk Tracking Effect
  useEffect(() => {
    let watchId: number | null = null;

    if (isWalking && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, altitude, speed } = position.coords;
          const currentSpeed = speed ? speed * 3.6 : 0; // Convert m/s to km/h
          const newPoint = { 
            lat: latitude, 
            lng: longitude, 
            timestamp: Date.now(),
            alt: altitude || undefined,
            speed: currentSpeed || undefined
          };

          setCurrentLocation([latitude, longitude]);

          if (currentSpeed > 0) {
            setWalkSpeeds(prev => [...prev, currentSpeed]);
            setWalkMaxSpeed(prev => Math.max(prev, currentSpeed));
          }

          if (altitude !== null) {
            setLastAltitude(prev => {
              if (prev !== null && altitude > prev) {
                setWalkAltitudeGain(gain => gain + (altitude - prev));
              }
              return altitude;
            });
          }

          setWalkPath(prev => {
            if (prev.length > 0) {
              const lastPoint = prev[prev.length - 1];
              const dist = calculateDistance(lastPoint.lat, lastPoint.lng, latitude, longitude);
              if (dist > 0.005) { // Only add if moved more than 5 meters to avoid noise
                setWalkDistance(d => d + dist);
                return [...prev, newPoint];
              }
              return prev;
            }
            return [newPoint];
          });
        },
        (err) => console.error("GPS Error:", err),
        { enableHighAccuracy: true }
      );
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [isWalking]);

  // Walk Timer Interval
  useEffect(() => {
    let interval: number | null = null;
    if (isWalking) {
      interval = window.setInterval(() => {
        setWalkTimer(t => t + 1);
      }, 1000);
    } else {
      setWalkTimer(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWalking]);

  // Initial Location for Map
  useEffect(() => {
    if (view === 'walk' && !currentLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation([position.coords.latitude, position.coords.longitude]);
        },
        (err) => console.error("Initial GPS Error:", err)
      );
    }
  }, [view]);

  const handleStartWalk = () => {
    setWalkPath([]);
    setWalkMarkers([]);
    setWalkDistance(0);
    setWalkAltitudeGain(0);
    setWalkMaxSpeed(0);
    setLastAltitude(null);
    setWalkSpeeds([]);
    setWalkStartTime(Date.now());
    setIsWalking(true);
    setWalkSummary(null);
    setGeneratedWalkImage(null);
    // Extra safety to clear old lines from ReactLeaflet caching
    setTimeout(() => {
        setWalkPath([]);
    }, 100);
  };

  const generateSummaryImage = async (): Promise<string | null> => {
    if (!walkSummary) return null;
    const element = document.getElementById('walk-summary-card');
    if (!element) return null;

    try {
      setIsGeneratingImage(true);
      // html-to-image lida melhor com SVGs e mapas que o html2canvas
      const baseImage = await toPng(element, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      // Adicionando marca d'água offscreen
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const imgObj = new Image();
      
      await new Promise((resolve) => {
        imgObj.onload = resolve;
        imgObj.src = baseImage;
      });

      canvas.width = imgObj.width;
      canvas.height = imgObj.height;
      if (ctx) {
        ctx.drawImage(imgObj, 0, 0);
        ctx.font = 'bold 40px Inter, sans-serif';
        ctx.fillStyle = 'rgba(249, 115, 22, 0.4)';
        ctx.textAlign = 'right';
        ctx.fillText('FocinhoApp', canvas.width - 40, canvas.height - 40);
        
        const finalImage = canvas.toDataURL('image/png');
        setGeneratedWalkImage(finalImage);
        return finalImage;
      }
      
      setGeneratedWalkImage(baseImage);
      return baseImage;
    } catch (err) {
      console.error("Error generating automatic walk image:", err);
      // Em caso de nova falha com imagens de terceiros no map
      setError('Não foi possível gerar a imagem no seu dispositivo. Verifique a internet e tente novamente.');
      return null;
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDownloadWalkImage = async (imgUrlOrEvent?: string | React.MouseEvent) => {
    let imgToDownload = generatedWalkImage;
    if (!imgToDownload) {
      const generated = await generateSummaryImage();
      if (!generated) return;
      imgToDownload = generated;
    }

    try {
      const res = await fetch(imgToDownload);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `passeio-${new Date().getTime()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      const link = document.createElement('a');
      link.href = imgToDownload;
      link.download = `passeio-${new Date().getTime()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShareWalkImage = async () => {
    let imgToShare = generatedWalkImage;
    if (!imgToShare) {
      const generated = await generateSummaryImage();
      if (!generated) return;
      imgToShare = generated;
    }

    try {
      const res = await fetch(imgToShare);
      const blob = await res.blob();
      const file = new File([blob], `passeio-${new Date().getTime()}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Meu Passeio no FocinhoApp',
          text: 'Confira meu passeio de hoje!',
        });
      } else {
        handleDownloadWalkImage(imgToShare);
      }
    } catch (err) {
      handleDownloadWalkImage(imgToShare);
    }
  };

  const handleEndWalk = async () => {
    if (!user || !walkStartTime) return;
    setIsWalking(false);
    const endTime = Date.now();
    const duration = Math.floor((endTime - walkStartTime) / 1000);
    
    // Average Speed (km/h)
    let averageSpeed = 0;
    if (walkSpeeds.length > 0) {
      averageSpeed = walkSpeeds.reduce((a, b) => a + b, 0) / walkSpeeds.length;
    } else if (duration > 0 && walkDistance > 0) {
      averageSpeed = (walkDistance / (duration / 3600)); // Fallback: distance/hours
    }
    
    const walkData: Walk = {
      id: generateId(),
      userId: user.id,
      petId: userPets[currentPetIndex]?.id,
      startTime: new Date(walkStartTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration,
      distance: Number(walkDistance.toFixed(2)),
      altitudeGain: Number(walkAltitudeGain.toFixed(2)),
      averageSpeed: Number(averageSpeed.toFixed(1)),
      maxSpeed: Number(walkMaxSpeed.toFixed(1)),
      path: walkPath,
      markers: walkMarkers
    };
    setLoading(true);
    try {
      const { error } = await supabase.from('walks').insert(walkData);
      if (error) {
        console.warn('Falha ao salvar novas métricas, tentando formato legado...', error);
        
        const legacyWalkData = {
           id: walkData.id,
           userId: walkData.userId,
           petId: walkData.petId,
           startTime: walkData.startTime,
           endTime: walkData.endTime,
           duration: walkData.duration,
           distance: walkData.distance,
           path: walkData.path.map(({ lat, lng, timestamp }) => ({ lat, lng, timestamp })),
           markers: walkData.markers
        };
        
        const { error: legacyError } = await supabase.from('walks').insert(legacyWalkData);
        if (legacyError) throw legacyError;
      }
      
      setWalkSummary(walkData);
      
      // Update history list if needed
      setWalkHistory(prev => [walkData, ...prev]);
    } catch (err) {
      console.error('Error saving walk:', err);
      setError('Erro ao salvar passeio.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMarker = (type: 'water' | 'poop') => {
    if (!currentLocation) return;
    setWalkMarkers(prev => [...prev, {
      type,
      lat: currentLocation[0],
      lng: currentLocation[1],
      timestamp: Date.now()
    }]);
  };

  const launchFireworks = () => {
    setFireworksActive(true);
    setTimeout(() => setFireworksActive(false), 4000);
  };

  const handleUpdateAdoptionStatus = async (petId: string, newStatus: 'available' | 'adopted') => {
    setLoading(true);
    try {
      const { error } = await supabase.from('adoption_pets').update({ status: newStatus }).eq('id', petId);
      if (error) throw error;
      const pet = adoptionPets.find(p => p.id === petId);
      setAdoptionPets(prev => prev.map(p => p.id === petId ? { ...p, status: newStatus } : p));
      if (newStatus === 'adopted') {
        setHasNewAdoption(true);
        setLastAdoptedPetName(pet?.name || null);
        launchFireworks();
      }
    } catch (err) {
      console.error('Error updating adoption status:', err);
      setError('Erro ao atualizar status.');
    } finally {
      setLoading(false);
    }
  };


  // Fetch Feed Posts
  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase.from('posts').select('*').order('createdAt', { ascending: false }).limit(50);
      setPosts((data || []) as Post[]);
    };
    fetchPosts();
    const channel = supabase.channel('posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchPosts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleCreatePost = async () => {
    if (!user || !newPost.content) return;
    setLoading(true);
    try {
      const postId = generateId();
      const postData: Post = {
        id: postId,
        userId: user.id,
        userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
        userPhoto: user.user_metadata?.avatar_url || '',
        type: newPost.type,
        content: newPost.content,
        imageUrl: newPost.imageUrl,
        likes: [],
        createdAt: new Date().toISOString(),
        petId: newPost.petId || userPets[currentPetIndex]?.id || '',
        petName: newPost.petName || userPets[currentPetIndex]?.name || ''
      };
      const { error } = await supabase.from('posts').insert(postData);
      if (error) throw error;
      setIsAddingPost(false);
      setNewPost({ content: '', type: 'photo', imageUrl: '' });
      const { data } = await supabase.from('posts').select('*').order('createdAt', { ascending: false }).limit(50);
      setPosts((data || []) as Post[]);
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Erro ao publicar.');
    } finally {
      setLoading(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const isLiked = post.likes.includes(user.id);
    const newLikes = isLiked ? post.likes.filter(id => id !== user.id) : [...post.likes, user.id];
    try {
      await supabase.from('posts').update({ likes: newLikes }).eq('id', postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: newLikes } : p));
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (authMode === 'register') {
        const { error, data } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
        if (error) throw error;
        if (data.user && !data.session) {
          setAuthError('Conta criada! Verifique seu email para confirmar o cadastro.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
      }
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView('home');
  };

  const handleActivateTag = async () => {
    if (!tagIdToActivate) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Check if tag is already in use
      const { data: existingPet } = await supabase.from('pets').select('id').eq('tagId', tagIdToActivate).maybeSingle();
      if (existingPet) {
        setError('Esta tag já está em uso por outro pet.');
        setLoading(false);
        return;
      }
      // 2. Check tags table
      const { data: tagData } = await supabase.from('tags').select('*').eq('id', tagIdToActivate).maybeSingle();
      if (tagData?.activated) {
        setError('Esta tag já está em uso por outro pet.');
        setLoading(false);
        return;
      }
      // 3. Create tag entry if needed
      if (!tagData) {
        await supabase.from('tags').insert({ id: tagIdToActivate, activated: false, ownerId: null, petId: null });
      }
      setView('profile');
    } catch (err) {
      console.error(err);
      setError('Erro ao verificar tag.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateTag = async (tagId: string, petId: string) => {
    if (!confirm('Tem certeza que deseja desativar esta tag? Ela não funcionará mais para este pet.')) return;
    
    setLoading(true);
    try {
      // 1. Remove tag from pet
      await supabase.from('pets').update({ tagId: null }).eq('id', petId);
      
      // 2. Free up the tag in the tags table
      await supabase.from('tags').update({ activated: false, petId: null, ownerId: null }).eq('id', tagId);
      
      // 3. Update local state
      setSelectedPet(prev => prev ? { ...prev, tagId: null } : null);
      setUserPets(prev => prev.map(p => p.id === petId ? { ...p, tagId: null } : p));
      
      alert('Tag desativada com sucesso! Você já pode vincular uma nova.');
    } catch (err) {
      console.error('Error deactivating tag:', err);
      setError('Erro ao desativar tag.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePet = async () => {
    if (!user || !selectedPet) return;
    const petsWithoutTag = userPets.filter(p => !p.tagId);
    const hasActiveTag = userPets.some(p => p.tagId);
    // effectiveTagId: prefer state flow, fallback to form field
    const effectiveTagId = (tagIdToActivate || selectedPet.tagId || '').trim().toUpperCase() || null;

    if (!effectiveTagId) {
      const isNewPet = !userPets.find(p => p.id === selectedPet.id);
      if (isNewPet && !hasActiveTag && petsWithoutTag.length >= 2) {
        setError('Você atingiu o limite de 2 pets sem tag. Ative uma tag para adicionar mais!');
        return;
      }
    }
    setLoading(true);
    try {
      if (effectiveTagId) {
        // Check tag exists in tags table, create if not
        const { data: tagRow } = await supabase.from('tags').select('*').eq('id', effectiveTagId).maybeSingle();
        if (tagRow?.activated && tagRow?.petId && tagRow.petId !== (selectedPet.id || '')) {
          setError('Esta tag já está em uso por outro pet.');
          setLoading(false);
          return;
        }
        // Check if another pet already has this tag
        const { data: existingPet } = await supabase.from('pets').select('id').eq('tagId', effectiveTagId).maybeSingle();
        if (existingPet && existingPet.id !== (selectedPet.id || '')) {
          setError('Esta tag já está em uso por outro pet.');
          setLoading(false);
          return;
        }
        // Create tag entry if it doesn't exist yet
        if (!tagRow) {
          await supabase.from('tags').insert({ id: effectiveTagId, activated: false, ownerId: null, petId: null });
        }
      }
      const petId = selectedPet.id || generateId();
      const finalPetData = {
        ...selectedPet,
        id: petId,
        ownerId: selectedPet.ownerId || user.id, // Keep original owner if editing someone else's pet
        tagId: effectiveTagId,
        createdAt: selectedPet.createdAt || new Date().toISOString(),
      };
      const { error } = await supabase.from('pets').upsert(finalPetData);
      if (error) throw error;
      // Activate tag in tags table
      if (effectiveTagId) {
        await supabase.from('tags').upsert({ id: effectiveTagId, activated: true, ownerId: user.id, petId: petId });
      }
      // Refresh pets
      const { data } = await supabase.from('pets').select('*').eq('ownerId', user.id).neq('deleted', true);
      setUserPets((data || []) as PetProfile[]);
      setView('dashboard');
      setSelectedPet(null);
      setTagIdToActivate('');
    } catch (err) {
      console.error('Error saving pet:', err);
      setError('Erro ao salvar perfil.');
    } finally {
      setLoading(false);
    }
  };


  const handleStorePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        if ((storeForm.gallery?.length || 0) + newImages.length >= 10) break;
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onloadend = () => {
            newImages.push(reader.result as string);
            resolve(true);
          };
          reader.readAsDataURL(files[i]);
        });
      }
      setStoreForm(prev => ({ ...prev, gallery: [...(prev.gallery || []), ...newImages].slice(0, 10) }));
    } catch (err) {
      setError('Erro ao carregar fotos da loja.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStoreItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeForm.name || !storeForm.price || !storeForm.url) return;
    setLoading(true);
    setStoreMessage(null);
    try {
      const priceVal = parseFloat(storeForm.price.replace(',', '.'));
      const payload = { 
          name: storeForm.name, 
          price: priceVal, 
          url: storeForm.url, 
          gallery: storeForm.gallery || [] 
      };
      
      if (storeForm.id) {
        const { error } = await supabase.from('store_items').update(payload).eq('id', storeForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('store_items').insert(payload);
        if (error) throw error;
      }
      const { data } = await supabase.from('store_items').select('*').order('created_at', { ascending: false });
      setStoreItems(data || []);
      setStoreForm({ id: '', name: '', price: '', url: '', gallery: [] });
      setStoreMessage(storeForm.id ? 'Produto atualizado de maneira rápida!' : 'Item adicionado na loja perfeitamente!');
      setTimeout(() => setStoreMessage(null), 3000);
    } catch (err) {
      setStoreMessage('Falha ao processar o item. Tente novamente.');
      setTimeout(() => setStoreMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStoreItem = async (id: string) => {
    if(!window.confirm('Excluir este item da loja?')) return;
    setLoading(true);
    try {
      await supabase.from('store_items').delete().eq('id', id);
      setStoreItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      alert('Erro ao deletar item.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerForm.name || !partnerForm.category) return;
    setLoading(true);
    setPartnerMessage(null);
    try {
      if (partnerForm.id) {
        const { error } = await supabase.from('partners').update(partnerForm).eq('id', partnerForm.id);
        if (error) throw error;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, ...insertData } = partnerForm;
        const { error } = await supabase.from('partners').insert(insertData as any);
        if (error) throw error;
      }
      const { data } = await supabase.from('partners').select('*').order('created_at', { ascending: false });
      setPartners(data || []);
      setPartnerForm({ id: '', name: '', category: 'Pet Shops', description: '', location: '', logo: '', url: '' });
      setPartnerMessage(partnerForm.id ? 'Parceiro atualizado!' : 'Parceiro adicionado!');
      setTimeout(() => setPartnerMessage(null), 3000);
    } catch (err) {
      setPartnerMessage('Erro ao salvar parceiro.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePartner = async (id: string) => {
    if(!window.confirm('Excluir este parceiro?')) return;
    setLoading(true);
    try {
      await supabase.from('partners').delete().eq('id', id);
      setPartners(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert('Erro ao deletar parceiro.');
    } finally {
      setLoading(false);
    }
  };

  const handlePartnerLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      if (file.size > 5000000) {
        setError('A logo é muito grande. Escolha uma foto menor que 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPartnerForm(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Erro ao carregar logo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOwnerProfile = async () => {
    if (!user || !ownerProfile) return;
    setLoading(true);
    setSuccessMessage(null);
    try {
      // Always write all 4 privacy settings explicitly so the DB never has partial data
      const fullPrivacySettings = {
        showPhone:        ownerProfile.privacySettings?.showPhone        ?? true,
        showAddress:      ownerProfile.privacySettings?.showAddress      ?? true,
        showObservations: ownerProfile.privacySettings?.showObservations ?? true,
        showAgeAndWeight: ownerProfile.privacySettings?.showAgeAndWeight ?? true,
      };
      const { error } = await supabase.from('owners').upsert({
        ...ownerProfile,
        privacySettings: fullPrivacySettings,
        uid: user.id,
        updatedAt: new Date().toISOString()
      });
      if (error) throw error;
      setOwnerProfile(prev => prev ? { ...prev, privacySettings: fullPrivacySettings } : prev);
      setError(null);
      setSuccessMessage('Configurações salvas com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Erro ao salvar perfil do dono.');
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOwnerProfile(prev => ({ ...prev, photoUrl: reader.result as string } as any));
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Erro ao carregar foto.');
      setLoading(false);
    }
  };

  const handleAdoptionPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      const newPhotos: string[] = [];
      const currentGallery = newAdoptionPet.gallery || [];

      // Limit to 5 photos total
      const remainingSlots = 5 - currentGallery.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);

      for (const file of filesToProcess) {
        const reader = new FileReader();
        const photo = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file as File);
        });
        newPhotos.push(photo);
      }

      setNewAdoptionPet(prev => ({
        ...prev,
        photoUrl: prev.photoUrl || newPhotos[0],
        gallery: [...(prev.gallery || []), ...newPhotos]
      }));
    } catch (err) {
      setError('Erro ao carregar fotos.');
    } finally {
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocalização não é suportada pelo seu navegador.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Using Nominatim (OpenStreetMap) for free reverse geocoding
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          const city = data.address.city || data.address.town || data.address.village || data.address.suburb || "";
          const state = data.address.state || "";
          const locationString = city ? `${city}${state ? ` - ${state}` : ''}` : "";

          if (locationString) {
            setNewSOS(prev => ({ ...prev, city: locationString }));
          } else {
            setError("Não foi possível determinar a cidade automaticamente.");
          }
        } catch (err) {
          setError("Erro ao obter nome da cidade.");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError("Erro ao obter localização. Verifique as permissões.");
        setLoading(false);
      }
    );
  };

  const startPhoneVerification = () => {
    if (!selectedPet?.ownerPhone) {
      setError('Insira um número de WhatsApp primeiro.');
      return;
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setVerificationCode(code);
    setIsVerifying(true);

    const message = `Seu código de verificação Pingente Inteligente é: ${code}`;
    const whatsappUrl = `https://wa.me/${selectedPet.ownerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const confirmPhoneVerification = () => {
    if (inputCode === verificationCode) {
      setSelectedPet(prev => ({ ...prev, phoneVerified: true } as any));
      setIsVerifying(false);
      setVerificationCode(null);
      setInputCode('');
      alert('WhatsApp verificado com sucesso!');
    } else {
      setError('Código incorreto. Tente novamente.');
    }
  };

  const handleViewFinder = async (tagId: string) => {
    setLoading(true);
    try {
      const { data: tagData } = await supabase.from('tags').select('*').eq('id', tagId).maybeSingle();
      if (tagData?.petId) {
        const { data: petData } = await supabase.from('pets').select('*').eq('id', tagData.petId).maybeSingle();
        if (petData) {
          // Fetch owner profile to merge contact info and privacy settings
          const { data: ownerData } = await supabase.from('owners').select('*').eq('uid', petData.ownerId).maybeSingle();
          if (ownerData) {
            petData.ownerPhone = ownerData.phone || petData.ownerPhone;
            petData.ownerAddress = ownerData.address || petData.ownerAddress;
            petData.ownerName = ownerData.name || '';
            if (ownerData.privacySettings) {
              petData.privacySettings = { ...(petData.privacySettings || {}), ...ownerData.privacySettings };
            }
          }
          setFinderPet(petData as PetProfile);
          setView('finder');
        } else {
          setError('Perfil do pet não encontrado.');
        }
      } else {
        setError('Tag não ativada ou inválida.');
      }
    } catch (err) {
      setError('Erro ao buscar informações.');
    } finally {
      setLoading(false);
    }
  };

  const sendLocation = () => {
    if (!finderPet?.ownerPhone) {
      setError('O dono não cadastrou um telefone de contato.');
      return;
    }

    if (!navigator.geolocation) {
      alert('Geolocalização não suportada pelo seu navegador.');
      return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      const message = `Olá! Encontrei seu pet ${finderPet?.name}. Minha localização atual é: ${mapsUrl}`;
      const whatsappUrl = `https://wa.me/55${finderPet.ownerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }, () => {
      alert('Por favor, permita o acesso à localização para ajudar o dono.');
    });
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada.');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await response.json();
        if (data && data.display_name) {
          setSelectedPet(prev => ({ ...prev, ownerAddress: data.display_name } as any));
        } else {
          setSelectedPet(prev => ({ ...prev, ownerAddress: `${latitude}, ${longitude}` } as any));
        }
      } catch (err) {
        setSelectedPet(prev => ({ ...prev, ownerAddress: `${latitude}, ${longitude}` } as any));
      } finally {
        setLoading(false);
      }
    }, () => {
      setError('Não foi possível obter sua localização.');
      setLoading(false);
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5000000) { // 5MB limit for base64 in Firestore
        setError('A imagem é muito grande. Escolha uma foto menor que 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedPet(prev => ({ ...prev, photoUrl: reader.result as string } as any));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxPhotos = selectedPet?.tagId ? 10 : 3;
    const currentGallery = selectedPet?.gallery || [];

    if (currentGallery.length + files.length > maxPhotos) {
      setError(`Limite de fotos atingido (${maxPhotos} fotos para usuários ${selectedPet?.tagId ? 'com' : 'sem'} tag ativa).`);
      return;
    }

    Array.from(files).forEach(file => {
      const f = file as File;
      if (f.size > 5000000) {
        setError('Uma das imagens é muito grande (>5MB).');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedPet(prev => ({
          ...prev,
          gallery: [...(prev?.gallery || []), reader.result as string]
        } as any));
      };
      reader.readAsDataURL(f);
    });
  };

  const removeGalleryPhoto = (index: number) => {
    setSelectedPet(prev => ({
      ...prev,
      gallery: prev?.gallery?.filter((_, i) => i !== index)
    } as any));
  };

  if (loading && view !== 'finder') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-32 md:pb-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-50 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView(user ? 'dashboard' : 'home')}>
            <img src="./logo.png" alt="FocinhoApp Logo" className="w-10 h-10 object-cover rounded-xl" />
            <span translate="no" className="text-xl font-bold tracking-tight">FocinhoApp</span>
          </div>
          {user && (
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
              <LogOut className="w-6 h-6" />
            </button>
          )}
        </header>

        <main className="max-w-xl mx-auto p-4 md:p-6 pb-40">
          <AnimatePresence mode="wait">
            {/* Landing Page */}
            {view === 'home' && !user && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center text-center gap-8 py-12"
              >
                <div className="relative">
                  <div className="absolute -inset-4 bg-orange-500/10 blur-3xl rounded-full" />
                  <QrCode className="w-32 h-32 text-orange-500 relative" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-4xl font-extrabold leading-tight">
                    Proteja quem você <span className="text-orange-500">ama</span>
                  </h1>
                  <p className="text-gray-500 text-lg">
                    Pingentes inteligentes com QR Code para que seu pet nunca se perca. Simples, moderno e funcional.
                  </p>
                </div>
                <div className="w-full space-y-4 pt-4">
                  <div className="space-y-3 w-full">
                    <Input
                      label="Email"
                      type="email"
                      value={authEmail}
                      onChange={setAuthEmail}
                      placeholder="seu@email.com"
                    />
                    <Input
                      label="Senha"
                      type="password"
                      value={authPassword}
                      onChange={setAuthPassword}
                      placeholder="••••••••"
                    />
                    {authError && (
                      <p className="text-sm text-red-500 text-center px-1">{authError}</p>
                    )}
                  </div>
                  <Button onClick={handleLogin} className="w-full py-4 text-lg" loading={authLoading}>
                    {authMode === 'login' ? 'Entrar' : 'Criar Conta'}
                  </Button>
                  <button
                    onClick={() => { setAuthMode(m => m === 'login' ? 'register' : 'login'); setAuthError(null); }}
                    className="w-full text-sm text-gray-500 hover:text-orange-500 transition-colors py-1"
                  >
                    {authMode === 'login' ? 'Não tem conta? Criar uma agora' : 'Já tem conta? Fazer login'}
                  </button>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Seguro e gratuito para usuários</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full mt-8">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-left">
                    <div className="bg-blue-50 w-10 h-10 rounded-full flex items-center justify-center mb-4">
                      <Phone className="w-5 h-5 text-blue-500" />
                    </div>
                    <h3 className="font-bold mb-1">Contato Direto</h3>
                    <p className="text-xs text-gray-400">WhatsApp do dono em um clique.</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-left">
                    <div className="bg-green-50 w-10 h-10 rounded-full flex items-center justify-center mb-4">
                      <MapPin className="w-5 h-5 text-green-500" />
                    </div>
                    <h3 className="font-bold mb-1">Localização</h3>
                    <p className="text-xs text-gray-400">Envio de GPS em tempo real.</p>
                  </div>
                  <div className="h-20" /> {/* Spacer to avoid bottom nav overlap */}
                </div>
              </motion.div>
            )}

            {/* Dashboard (Inicio) */}
            {view === 'dashboard' && user && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-2xl font-bold">Olá, {ownerProfile?.name?.split(' ')[0] || user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0]}!</h2>
                    <p className="text-gray-400 text-sm">Bem-vindo de volta ao FocinhoApp</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setView('activate')}
                      className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 hover:bg-orange-200 transition-colors"
                    >
                      <QrCode className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* SOS Alerts on Dashboard - MOVED TO ANIMAL PERDIDO VIEW */}

                {userPets.length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2.5rem] p-12 text-center space-y-4">
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                      <Dog className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-400">Você ainda não tem pets cadastrados.</p>
                    <Button onClick={() => {
                      setSelectedPet(null);
                      setView('activate');
                    }} variant="outline" className="mx-auto block w-full mb-3">
                      Ativar minha primeira tag
                    </Button>
                    <Button onClick={() => {
                      setSelectedPet(null);
                      setView('profile');
                    }} className="mx-auto block w-full">
                      <Plus className="w-5 h-5 inline-block mr-2" /> Cadastrar Pet Sem Tag
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Pet Carousel */}
                    <div className="relative bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-xl shadow-orange-100 border border-orange-50">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight">Seu Pet</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCurrentPetIndex(prev => (prev > 0 ? prev - 1 : userPets.length - 1))}
                            className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm"
                          >
                            <ChevronLeft className="w-6 h-6 text-gray-600" />
                          </button>
                          <button
                            onClick={() => setCurrentPetIndex(prev => (prev < userPets.length - 1 ? prev + 1 : 0))}
                            className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm"
                          >
                            <ChevronRight className="w-6 h-6 text-gray-600" />
                          </button>
                        </div>
                      </div>

                      <AnimatePresence mode="wait">
                        <motion.div
                          key={userPets[currentPetIndex]?.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          onClick={() => { setSelectedPet(userPets[currentPetIndex]); setView('profile'); }}
                          className="bg-gray-50 p-4 md:p-6 rounded-[2rem] flex items-center gap-4 md:gap-6 cursor-pointer group hover:bg-orange-50 transition-all border-2 border-transparent hover:border-orange-200"
                        >
                          <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center overflow-hidden shadow-md border-2 border-white group-hover:scale-105 transition-transform">
                            {userPets[currentPetIndex]?.photoUrl ? (
                              <img src={userPets[currentPetIndex].photoUrl} alt={userPets[currentPetIndex].name} className="w-full h-full object-cover" />
                            ) : (
                              <Dog className="w-12 h-12 text-orange-200" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-col gap-1">
                              <h3 className="font-black text-2xl text-gray-900">{userPets[currentPetIndex]?.name}</h3>
                              {userPets[currentPetIndex]?.tagId ? (
                                <span className="w-fit bg-green-500 text-white text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                                  <ShieldCheck className="w-3 h-3" /> PROTEGIDO
                                </span>
                              ) : (
                                <span className="w-fit bg-gray-200 text-gray-500 text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> NÃO PROTEGIDO
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400 mt-2 font-medium">{userPets[currentPetIndex]?.breed || 'Sem raça definida'}</p>

                            {userPets[currentPetIndex]?.tagId && (
                              <div className="mt-2 flex items-center gap-2 bg-white w-fit px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm relative z-10">
                                <QrCode className="w-3 h-3 text-orange-500" />
                                <span className="text-[10px] font-bold text-gray-600">ID: {userPets[currentPetIndex].tagId}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`${window.location.origin}/?tag=${userPets[currentPetIndex].tagId}`, '_blank');
                                  }}
                                  className="p-1.5 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors flex items-center justify-center"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-orange-500" />
                                </button>
                              </div>
                            )}

                            <div className="flex items-center gap-1 text-orange-500 font-black text-[10px] mt-3 uppercase tracking-widest">
                              Ver Perfil Completo <ChevronRight className="w-3 h-3" />
                            </div>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-4">
                      <div
                        onClick={() => setView('walk')}
                        className="bg-orange-500 p-5 rounded-[2.5rem] flex flex-col items-center text-center gap-2 cursor-pointer hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 h-40 justify-center"
                      >
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-sm">
                          <PawPrint className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-white">Passeio</h4>
                          <p className="text-[10px] text-white/80 font-medium">Rastrear percurso</p>
                        </div>
                      </div>
                      <div
                        onClick={() => setView('reminders')}
                        className="bg-white p-5 rounded-[2.5rem] border border-gray-100 flex flex-col items-center text-center gap-2 cursor-pointer hover:border-orange-200 transition-all shadow-sm h-40 justify-center"
                      >
                        <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center shadow-sm">
                          <Bell className="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-gray-800">Lembretes</h4>
                          <p className="text-[10px] text-gray-400 font-medium">Vacinas e remédios</p>
                        </div>
                      </div>
                      <div
                        onClick={() => {
                          setView('lost_pets');
                          setHasNewUnreadSOS(false);
                        }}
                        className={`p-5 rounded-[2.5rem] border flex flex-col items-center text-center gap-2 cursor-pointer transition-all shadow-sm h-40 justify-center 
                        ${hasNewUnreadSOS
                            ? 'bg-red-500 border-red-600 animate-pulse text-white'
                            : 'bg-white border-gray-100 hover:border-red-200 text-gray-800'}`}
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${hasNewUnreadSOS ? 'bg-white/20' : 'bg-red-50'}`}>
                          <Megaphone className={`w-6 h-6 ${hasNewUnreadSOS ? 'text-white' : 'text-red-500'}`} />
                        </div>
                        <div>
                          <h4 className={`font-black text-sm ${hasNewUnreadSOS ? 'text-white' : 'text-gray-800'}`}>Animal Perdido</h4>
                          <p className={`text-[10px] font-medium ${hasNewUnreadSOS ? 'text-white/80' : 'text-gray-400'}`}>Alertas SOS ativos</p>
                        </div>
                      </div>
                      <div
                        onClick={() => {
                          setView('account');
                          setAccountSubView('adoption');
                          setHasNewAdoption(false);
                        }}
                        className={`p-5 rounded-[2.5rem] border flex flex-col items-center text-center gap-2 cursor-pointer transition-all shadow-sm h-40 justify-center
                        ${hasNewAdoption
                            ? 'bg-pink-500 border-pink-600 animate-pulse text-white'
                            : 'bg-white border-gray-100 hover:border-pink-200'}`}
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${hasNewAdoption ? 'bg-white/20' : 'bg-pink-50'}`}>
                          <Heart className={`w-6 h-6 ${hasNewAdoption ? 'text-white' : 'text-pink-500'}`} />
                        </div>
                        <div>
                          <h4 className={`font-black text-sm ${hasNewAdoption ? 'text-white' : 'text-gray-800'}`}>Adoção</h4>
                          <p className={`text-[10px] font-medium ${hasNewAdoption ? 'text-white/80' : 'text-gray-400'}`}>
                            {hasNewAdoption ? '🎉 Nova adoção!' : 'Encontre um amigo'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="h-20" /> {/* Spacer to avoid bottom nav overlap */}
                  </div>
                )}
              </motion.div>
            )}

            {/* Lembretes */}
            {view === 'reminders' && (
              <motion.div key="reminders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Lembretes</h2>
                  <button
                    onClick={() => setIsAddingReminder(true)}
                    className="p-2 bg-orange-100 text-orange-600 rounded-xl hover:bg-orange-200 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Dynamic Calendar UI */}
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-6 px-2">
                    <h3 className="font-bold text-gray-800">
                      {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(calendarYear, calendarMonth))}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (calendarMonth === 0) {
                            setCalendarMonth(11);
                            setCalendarYear(prev => prev - 1);
                          } else {
                            setCalendarMonth(prev => prev - 1);
                          }
                        }}
                        className="p-1.5 bg-gray-50 rounded-lg"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (calendarMonth === 11) {
                            setCalendarMonth(0);
                            setCalendarYear(prev => prev + 1);
                          } else {
                            setCalendarMonth(prev => prev + 1);
                          }
                        }}
                        className="p-1.5 bg-gray-50 rounded-lg"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-center mb-2">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                      <span key={d} className="text-[10px] font-bold text-gray-400 uppercase">{d}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {(() => {
                      const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
                      const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                      const days = [];

                      // Padding for first week
                      for (let i = 0; i < firstDay; i++) {
                        days.push(<div key={`empty-${i}`} />);
                      }

                      for (let day = 1; day <= daysInMonth; day++) {
                        const dateStr = `${calendarYear}-${(calendarMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                        const today = new Date();
                        const isToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` === dateStr;
                        const isSelected = selectedDate === dateStr;
                        const hasEvent = reminders.some(r => r.date === dateStr);

                        days.push(
                          <div
                            key={day}
                            onClick={() => setSelectedDate(dateStr)}
                            className={`aspect-square flex flex-col items-center justify-center text-xs font-bold relative cursor-pointer transition-all ${
                              isSelected ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 rounded-xl' :
                              isToday ? 'bg-orange-50 text-orange-500 rounded-xl' : 'hover:bg-gray-50 text-gray-700 rounded-xl'
                            } ${hasEvent && !isSelected ? 'border-2 border-orange-500 rounded-lg' : ''}`}
                          >
                            {day}
                            {hasEvent && !isSelected && (
                              <div className="absolute bottom-1 w-1 h-1 bg-orange-500 rounded-full" />
                            )}
                          </div>
                        );
                      }
                      return days;
                    })()}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between ml-1">
                    <h3 className="font-bold text-gray-800">Próximos Compromissos</h3>
                    <button
                      onClick={() => setIsAddingReminder(true)}
                      className="text-orange-500 text-xs font-bold hover:underline"
                    >
                      + Novo Lembrete
                    </button>
                  </div>
                  {reminders.length > 0 ? (
                    [...reminders]
                      .sort((a, b) => {
                        const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
                        const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
                        return dateA.getTime() - dateB.getTime();
                      })
                      .map((rem, i) => (
                        <div key={i} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4 group relative">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${rem.type === 'Saúde' ? 'bg-red-50 text-red-500' :
                              rem.type === 'Medicação' ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-500'
                            }`}>
                            <Calendar className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-800 text-sm">{rem.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">
                                {rem.date.split('-').reverse().join('/')} {rem.time && `às ${rem.time}`}
                              </p>
                              <span className="text-gray-300">•</span>
                              <p className="text-[10px] text-gray-400 font-medium">{rem.petName}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-[10px] font-bold px-2 py-1 bg-gray-50 text-gray-400 rounded-lg uppercase">
                              {rem.type}
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingReminder(rem);
                                  setNewReminder({
                                    title: rem.title,
                                    petName: rem.petName,
                                    type: rem.type,
                                    time: rem.time || '12:00'
                                  });
                                  setSelectedDate(rem.date);
                                  setIsAddingReminder(true);
                                }}
                                className="p-1.5 bg-gray-50 text-gray-400 hover:text-orange-500 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteReminder(rem.id)}
                                className="p-1.5 bg-gray-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="bg-gray-50 p-8 rounded-[2rem] text-center border border-dashed border-gray-200">
                      <p className="text-gray-400 text-sm">Nenhum compromisso agendado.</p>
                    </div>
                  )}
                  <div className="h-24" /> {/* Spacer to avoid bottom nav overlap */}
                </div>

                {/* Add Reminder Modal */}
                <AnimatePresence>
                  {isAddingReminder && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsAddingReminder(false)}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                      />
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl relative z-10 space-y-6"
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="text-xl font-bold">Novo Lembrete</h3>
                          <button onClick={() => setIsAddingReminder(false)} className="p-2 hover:bg-gray-100 rounded-full">
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <Input
                            label="O que fazer?"
                            placeholder="Ex: Vacina, Banho, Remédio..."
                            value={newReminder.title}
                            onChange={(v: string) => setNewReminder(prev => ({ ...prev, title: v }))}
                          />
                          <Select
                            label="Qual Pet?"
                            value={newReminder.petName}
                            onChange={(v: string) => setNewReminder(prev => ({ ...prev, petName: v }))}
                            options={userPets.map(p => p.name)}
                            icon={Dog}
                          />
                          <Select
                            label="Tipo"
                            value={newReminder.type}
                            onChange={(v: string) => setNewReminder(prev => ({ ...prev, type: v }))}
                            options={['Saúde', 'Medicação', 'Higiene', 'Alimentação', 'Outro']}
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Data</label>
                              <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-all font-medium"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Horário</label>
                              <input
                                type="time"
                                value={newReminder.time}
                                onChange={(e) => setNewReminder(prev => ({ ...prev, time: e.target.value }))}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-all font-medium"
                              />
                            </div>
                          </div>
                        </div>

                        <Button onClick={handleSaveReminder} loading={loading} className="w-full">
                          Salvar Lembrete
                        </Button>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Passeio (Walk) */}
            {view === 'walk' && (
              <motion.div
                key="walk"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6 h-[calc(100vh-180px)] flex flex-col"
              >
                <div className="flex items-center gap-4 mb-2">
                  <button onClick={() => setView('dashboard')} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <h2 className="text-2xl font-bold">Passeio</h2>
                </div>

                {!walkSummary && !isWalking && (
                  <div className="flex bg-gray-200/50 p-1.5 rounded-2xl">
                    <button
                      onClick={() => setWalkSubView('record')}
                      className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${walkSubView === 'record' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Gravar
                    </button>
                    <button
                      onClick={() => setWalkSubView('history')}
                      className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${walkSubView === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Histórico
                    </button>
                  </div>
                )}

                {walkSubView === 'history' && !walkSummary ? (
                  <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-32">
                    {/* Metrics Cards */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-orange-500 p-5 rounded-[2rem] text-white shadow-lg shadow-orange-200">
                        <p className="text-[10px] uppercase font-bold tracking-widest opacity-80 mb-1">Total de Km</p>
                        <p className="text-3xl font-black">
                          {walkHistory.reduce((acc, w) => acc + (w.distance || 0), 0).toFixed(1)} <span className="text-lg font-bold opacity-80">km</span>
                        </p>
                      </div>
                      <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Tempo Total</p>
                        <p className="text-3xl font-black text-gray-800">
                          {(() => {
                            const totalSecs = walkHistory.reduce((acc, w) => acc + (w.duration || 0), 0);
                            const hours = Math.floor(totalSecs / 3600);
                            const mins = Math.floor((totalSecs % 3600) / 60);
                            return `${hours}h${mins}m`;
                          })()}
                        </p>
                      </div>
                      <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Recorde (Dist)</p>
                        <p className="text-2xl font-black text-gray-800">
                          {Math.max(0, ...walkHistory.map(w => w.distance || 0)).toFixed(1)} <span className="text-sm font-bold opacity-60">km</span>
                        </p>
                      </div>
                      <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Recorde (Vel)</p>
                        <p className="text-2xl font-black text-gray-800">
                          {Math.max(0, ...walkHistory.map(w => w.maxSpeed || 0)).toFixed(1)} <span className="text-sm font-bold opacity-60">km/h</span>
                        </p>
                      </div>
                    </div>

                    {/* Chart mock with actual data structure */}
                    <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-6">Atividade Recente (km)</h3>
                      <div className="flex items-end justify-between h-32 gap-2 mt-4 px-2">
                        {(() => {
                          const last7Walks = [...walkHistory].slice(0, 7).reverse();
                          const maxDistChart = Math.max(0.1, ...last7Walks.map(w => w.distance || 0));
                          // Fill to 7 items if empty
                          const chartData = Array(7).fill({ distance: 0 }).map((_, i) => last7Walks[i] || { distance: 0, startTime: new Date().toISOString() });
                          
                          return chartData.map((walk, i) => (
                            <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                              <div className="w-full relative h-full flex items-end">
                                <div 
                                  className="w-full bg-orange-100 rounded-t-lg relative transition-all group-hover:bg-orange-200"
                                  style={{ height: `${Math.max(5, ((walk.distance || 0) / maxDistChart) * 100)}%` }}
                                >
                                  {walk.distance > 0 && (
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {walk.distance.toFixed(1)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase">
                                {new Date(walk.startTime).toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* List of Previous Walks */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-gray-800 ml-1">Histórico Detalhado</h3>
                      {walkHistory.length > 0 ? walkHistory.map(walk => (
                        <div key={walk.id} onClick={() => setWalkSummary(walk)} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-orange-200 transition-colors">
                          <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                              <PawPrint className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-800">{new Date(walk.startTime).toLocaleDateString('pt-BR')}</p>
                              <div className="flex gap-2 text-xs text-gray-400 font-medium mt-1">
                                <span>{walk.distance?.toFixed(2)} km</span>
                                <span>•</span>
                                <span>{Math.floor(walk.duration / 60)}m</span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-300" />
                        </div>
                      )) : (
                        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem] p-6 text-center">
                          <p className="text-gray-400 text-sm">Nenhum passeio registrado ainda.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : !walkSummary ? (
                  <div className="flex-1 flex flex-col gap-4 relative">
                    <div className="flex-1 bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm relative z-0">
                      {currentLocation ? (
                        <MapContainer
                          center={currentLocation}
                          zoom={16}
                          style={{ height: '100%', width: '100%' }}
                          zoomControl={false}
                        >
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          />
                          <MapUpdater center={currentLocation} />

                          {/* Current Location Marker */}
                          <Marker position={currentLocation}>
                            <Popup>Você está aqui</Popup>
                          </Marker>

                          {/* Path Line */}
                          {walkPath.length > 1 && (
                            <Polyline
                              positions={walkPath.map(p => [p.lat, p.lng])}
                              color="#f97316"
                              weight={5}
                              opacity={0.8}
                            />
                          )}

                          {/* Markers */}
                          {walkMarkers.map((m, i) => (
                            <Marker
                              key={i}
                              position={[m.lat, m.lng]}
                              icon={L.divIcon({
                                className: 'custom-div-icon',
                                html: `<div style="font-size: 24px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2))">${m.type === 'water' ? '💧' : '💩'}</div>`,
                                iconSize: [30, 30],
                                iconAnchor: [15, 15]
                              })}
                            />
                          ))}
                        </MapContainer>
                      ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center gap-4 bg-gray-50">
                          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                          <p className="text-sm text-gray-400 font-medium">Obtendo localização...</p>
                        </div>
                      )}
                    </div>

                    {isWalking && (
                      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10 pointer-events-none">
                        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/20 pointer-events-auto">
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Distância</p>
                              <p className="text-xl font-black text-orange-500">{walkDistance.toFixed(2)} km</p>
                            </div>
                            <div className="w-px h-8 bg-gray-200" />
                            <div className="text-center">
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tempo</p>
                              <p className="text-xl font-black text-gray-800">
                                {(() => {
                                  const diff = Math.floor((Date.now() - (walkStartTime || Date.now())) / 1000);
                                  const min = Math.floor(diff / 60);
                                  const sec = diff % 60;
                                  return `${min}:${sec.toString().padStart(2, '0')}`;
                                })()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4 relative z-10 pb-8">
                      {isWalking ? (
                        <div className="flex flex-col gap-4">
                          <div className="flex gap-4">
                            <button
                              onClick={() => handleAddMarker('water')}
                              className="flex-1 bg-blue-500 text-white p-6 rounded-[2rem] shadow-xl shadow-blue-200 flex flex-col items-center gap-2 active:scale-95 transition-all"
                            >
                              <span className="text-3xl">💧</span>
                              <span className="font-black text-xs uppercase tracking-widest">Água</span>
                            </button>
                            <button
                              onClick={() => handleAddMarker('poop')}
                              className="flex-1 bg-amber-800 text-white p-6 rounded-[2rem] shadow-xl shadow-amber-200 flex flex-col items-center gap-2 active:scale-95 transition-all"
                            >
                              <span className="text-3xl">💩</span>
                              <span className="font-black text-xs uppercase tracking-widest">Cocô</span>
                            </button>
                          </div>
                          <Button onClick={handleEndWalk} variant="danger" className="w-full py-6 text-xl rounded-[2rem]">
                            Finalizar Passeio
                          </Button>
                        </div>
                      ) : (
                        <Button onClick={handleStartWalk} className="w-full py-6 text-xl rounded-[2rem] shadow-2xl shadow-orange-200">
                          Iniciar Passeio
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-32">
                    {generatedWalkImage ? (
                      <div className="space-y-6">
                        <div className="bg-white p-4 rounded-[3rem] shadow-2xl border-4 border-orange-100 overflow-hidden">
                          <img src={generatedWalkImage} alt="Resumo do Passeio" className="w-full h-auto rounded-[2rem]" />
                        </div>
                        <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100 text-center">
                          <p className="text-orange-600 font-bold text-sm">✨ Imagem pronta para salvar!</p>
                          <p className="text-orange-400 text-xs mt-1">Você pode baixar ou compartilhar com seus amigos.</p>
                        </div>
                      </div>
                    ) : (
                      <div id="walk-summary-card" className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 space-y-8">
                        <div className="text-center space-y-2">
                          <div className="w-20 h-20 bg-orange-100 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                            <PawPrint className="w-10 h-10 text-orange-500" />
                          </div>
                          <h3 className="text-3xl font-black text-gray-900">Resumo do Passeio</h3>
                          <p className="text-gray-400 font-medium">
                            {new Date(walkSummary.startTime).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-gray-50 p-6 rounded-[2rem] text-center border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Distância</p>
                            <p className="text-3xl font-black text-orange-500">{walkSummary.distance} km</p>
                          </div>
                          <div className="bg-gray-50 p-6 rounded-[2rem] text-center border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Duração</p>
                            <p className="text-3xl font-black text-gray-800">
                              {Math.floor(walkSummary.duration / 60)}m {walkSummary.duration % 60}s
                            </p>
                          </div>
                          <div className="bg-gray-50 p-4 md:p-6 rounded-[2rem] text-center border border-gray-100 flex flex-col justify-center">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Vel Média</p>
                            <p className="text-xl md:text-3xl font-black text-gray-800">{walkSummary.averageSpeed?.toFixed(1) || '0.0'} km/h</p>
                          </div>
                          <div className="bg-gray-50 p-4 md:p-6 rounded-[2rem] text-center border border-gray-100 flex flex-col justify-center">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Elevação</p>
                            <p className="text-xl md:text-3xl font-black text-gray-800">{walkSummary.altitudeGain?.toFixed(0) || '0'} m</p>
                          </div>
                        </div>

                        <div className="h-64 bg-gray-50 rounded-[2.5rem] overflow-hidden border border-gray-100 relative">
                          <MapContainer
                            center={walkSummary.path[0] ? [walkSummary.path[0].lat, walkSummary.path[0].lng] : currentLocation || [0, 0]}
                            zoom={15}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={false}
                            dragging={false}
                            scrollWheelZoom={false}
                            touchZoom={false}
                          >
                            <TileLayer
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              crossOrigin="anonymous"
                            />
                            <Polyline positions={walkSummary.path.map(p => [p.lat, p.lng])} color="#f97316" weight={5} />
                            {walkSummary.markers.map((m, i) => (
                              <Marker
                                key={i}
                                position={[m.lat, m.lng]}
                                icon={L.divIcon({
                                  className: 'custom-div-icon',
                                  html: `<div style="font-size: 20px">${m.type === 'water' ? '💧' : '💩'}</div>`,
                                  iconSize: [24, 24],
                                  iconAnchor: [12, 12]
                                })}
                              />
                            ))}
                          </MapContainer>
                        </div>

                        <div className="flex justify-center gap-8">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">💧</span>
                            <span className="font-bold text-gray-600">{walkSummary.markers.filter(m => m.type === 'water').length}x Água</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">💩</span>
                            <span className="font-bold text-gray-600">{walkSummary.markers.filter(m => m.type === 'poop').length}x Cocô</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <Button
                          onClick={handleDownloadWalkImage}
                          loading={isGeneratingImage}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 shadow-orange-200 py-4 flex items-center justify-center gap-2"
                        >
                          <Download className="w-5 h-5" />
                          Salvar na Galeria
                        </Button>
                        <Button
                          onClick={handleShareWalkImage}
                          loading={isGeneratingImage}
                          variant="secondary"
                          className="flex-1 py-4 flex items-center justify-center gap-2"
                        >
                          <Share2 className="w-5 h-5" />
                          Compartilhar
                        </Button>
                      </div>
                      <Button
                        onClick={() => {
                          setWalkSummary(null);
                          setGeneratedWalkImage(null);
                          setWalkPath([]);
                          setWalkMarkers([]);
                          setWalkDistance(0);
                          setWalkAltitudeGain(0);
                          setWalkMaxSpeed(0);
                          setLastAltitude(null);
                          setWalkSpeeds([]);
                          setWalkStartTime(null);
                        }}
                        variant="outline"
                        className="w-full py-4"
                      >
                        Novo Passeio
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Animal Perdido (was SOS/Explorar) */}
            {view === 'lost_pets' && (
              <motion.div key="lost_pets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Animal Perdido</h2>
                  <button
                    onClick={() => setIsAddingSOS(true)}
                    className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-red-600 p-8 rounded-[3rem] shadow-2xl shadow-red-200 border border-red-400 text-center space-y-6 text-white relative overflow-hidden">
                  <motion.div
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-24 -right-24 w-64 h-64 bg-white/20 rounded-full blur-3xl"
                  />

                  <div className="relative">
                    <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-md border border-white/30 relative">
                      <motion.div
                        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute inset-0 bg-white rounded-full"
                      />
                      <Megaphone className="w-12 h-12 text-white relative z-10" />
                    </div>
                  </div>

                  <div className="space-y-2 relative z-10">
                    <h3 className="text-2xl font-black uppercase tracking-tight">Pet Desaparecido?</h3>
                    <p className="text-white/90 text-sm font-medium leading-relaxed">
                      Não perca tempo. Gere um alerta SOS agora para notificar todos os usuários em sua região.
                    </p>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    animate={{
                      boxShadow: [
                        "0 0 0 0px rgba(255, 255, 255, 0.4)",
                        "0 0 0 20px rgba(255, 255, 255, 0)",
                        "0 0 0 0px rgba(255, 255, 255, 0)"
                      ]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    onClick={() => setIsAddingSOS(true)}
                    className="w-full py-5 bg-white text-red-600 rounded-[2rem] font-black text-xl shadow-2xl flex items-center justify-center gap-3 relative z-10"
                  >
                    <motion.div
                      animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                    >
                      <Megaphone className="w-7 h-7" />
                    </motion.div>
                    GERAR ALERTA AGORA
                  </motion.button>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800 ml-1">Alertas na Região</h3>
                  {lostAlerts.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                      {lostAlerts.map((alert) => (
                        <div key={alert.id} className="bg-red-50 p-6 rounded-[2.5rem] border-2 border-red-500 space-y-4 shadow-xl shadow-red-100 relative overflow-hidden">
                          <div className="aspect-video bg-white rounded-3xl overflow-hidden relative border-2 border-red-200">
                            <img src={alert.petPhoto} alt={alert.petName} className="w-full h-full object-cover" />
                            <div className="absolute top-4 right-4 bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase shadow-lg animate-pulse">
                              Desaparecido
                            </div>
                          </div>
                          <div className="px-2 space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-black text-2xl text-red-700">{alert.petName}</h4>
                                <p className="text-sm text-red-500 font-bold flex items-center gap-1">
                                  <MapPin className="w-4 h-4" /> {alert.city}
                                </p>
                              </div>
                              <div className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                SOS
                              </div>
                            </div>

                            <div className="bg-white/50 p-4 rounded-2xl border border-red-100">
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Visto por último em:</p>
                              <p className="text-sm text-gray-700 font-medium">{alert.lastSeen}</p>
                            </div>

                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => window.open(`https://wa.me/${alert.contactPhone.replace(/\D/g, '')}`, '_blank')}
                                className="w-full py-5 bg-red-600 text-white text-lg font-black rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-200 flex items-center justify-center gap-3 active:scale-95"
                              >
                                <Phone className="w-6 h-6" /> ENTRAR EM CONTATO
                              </button>

                              {user && alert.ownerId === user.id && (
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  <button
                                    onClick={() => {
                                      setEditingSOSId(alert.id);
                                      setNewSOS({
                                        petId: alert.petId,
                                        city: alert.city,
                                        lastSeen: alert.lastSeen
                                      });
                                      setIsAddingSOS(true);
                                    }}
                                    className="py-3 bg-white border-2 border-orange-500 text-orange-500 rounded-xl font-bold text-sm hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
                                  >
                                    <Plus className="w-4 h-4" /> Editar
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSOS(alert.id)}
                                    className="py-3 bg-white border-2 border-green-600 text-green-600 rounded-xl font-bold text-sm hover:bg-green-50 transition-all flex items-center justify-center gap-2"
                                  >
                                    <ShieldCheck className="w-4 h-4" /> Encontrado
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-8 rounded-[2rem] text-center border border-dashed border-gray-200">
                      <p className="text-gray-400 text-sm">Nenhum alerta ativo no momento.</p>
                    </div>
                  )}
                  <div className="h-20" /> {/* Spacer to avoid bottom nav overlap */}
                </div>

                {/* Add SOS Modal */}
                <AnimatePresence>
                  {isAddingSOS && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                          setIsAddingSOS(false);
                          setEditingSOSId(null);
                          setNewSOS({ petId: '', city: '', lastSeen: '' });
                        }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                      />
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-white w-full max-w-md rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative z-10 space-y-6 overflow-y-auto max-h-[90vh]"
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="text-xl font-bold">{editingSOSId ? 'Editar Alerta' : 'Gerar Alerta SOS'}</h3>
                          <button onClick={() => {
                            setIsAddingSOS(false);
                            setEditingSOSId(null);
                            setNewSOS({ petId: '', city: '', lastSeen: '' });
                          }} className="p-2 hover:bg-gray-100 rounded-full">
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <Select
                            label="Qual Pet fugiu?"
                            value={newSOS.petId}
                            onChange={(v: string) => setNewSOS(prev => ({ ...prev, petId: v }))}
                            options={userPets.map(p => ({ label: p.name, value: p.id }))}
                            icon={Dog}
                          />
                          <div className="relative">
                            <Input
                              label="Cidade"
                              placeholder="Ex: São Paulo - SP"
                              value={newSOS.city}
                              onChange={(v: string) => setNewSOS(prev => ({ ...prev, city: v }))}
                              icon={MapPin}
                            />
                            <button
                              type="button"
                              onClick={handleGetCurrentLocation}
                              className="absolute right-3 bottom-3 p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors"
                              title="Pegar localização atual"
                            >
                              <Compass className="w-4 h-4" />
                            </button>
                          </div>
                          <Input
                            label="Visto por último em..."
                            placeholder="Ex: Próximo ao metrô, Rua X..."
                            value={newSOS.lastSeen}
                            onChange={(v: string) => setNewSOS(prev => ({ ...prev, lastSeen: v }))}
                            icon={AlertCircle}
                          />
                        </div>

                        <Button onClick={handleSaveSOS} loading={loading} variant="danger" className="w-full">
                          {editingSOSId ? 'Atualizar Alerta' : 'Publicar Alerta SOS'}
                        </Button>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Explorar - REMOVED AS PER REQUEST */}

            {/* Conta (Account) */}
            {view === 'account' && user && (
              <motion.div key="account" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Sua Conta</h2>
                </div>

                {accountSubView === 'menu' && (
                  <div className="grid gap-4">
                    <button
                      onClick={() => setAccountSubView('profile')}
                      className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4 hover:border-orange-200 transition-all text-left"
                    >
                      <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">Meu Perfil</h4>
                        <p className="text-xs text-gray-400">Suas informações pessoais</p>
                      </div>
                      <ChevronRight className="text-gray-300" />
                    </button>

                    <button
                      onClick={() => setAccountSubView('pets')}
                      className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4 hover:border-orange-200 transition-all text-left"
                    >
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                        <Dog className="w-6 h-6 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">Meus Pets</h4>
                        <p className="text-xs text-gray-400">Gerenciar todos os seus pets</p>
                      </div>
                      <ChevronRight className="text-gray-300" />
                    </button>

                    <button
                      onClick={() => setAccountSubView('support')}
                      className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4 hover:border-orange-200 transition-all text-left"
                    >
                      <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
                        <HelpCircle className="w-6 h-6 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">Suporte</h4>
                        <p className="text-xs text-gray-400">Dúvidas e ajuda</p>
                      </div>
                      <ChevronRight className="text-gray-300" />
                    </button>

                    <button
                      onClick={() => setAccountSubView('store')}
                      className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4 hover:border-orange-200 transition-all text-left"
                    >
                      <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-purple-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">Loja</h4>
                        <p className="text-xs text-gray-400">Acessórios e novas tags</p>
                      </div>
                      <ChevronRight className="text-gray-300" />
                    </button>

                    <button
                      onClick={() => setAccountSubView('adoption')}
                      className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4 hover:border-orange-200 transition-all text-left"
                    >
                      <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center">
                        <Heart className="w-6 h-6 text-pink-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">Adoção</h4>
                        <p className="text-xs text-gray-400">Encontre um novo amigo</p>
                      </div>
                      <ChevronRight className="text-gray-300" />
                    </button>

                    <button
                      onClick={() => setAccountSubView('partners')}
                      className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4 hover:border-orange-200 transition-all text-left mb-4"
                    >
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">Parceiros</h4>
                        <p className="text-xs text-gray-400">Apoiam a causa animal</p>
                      </div>
                      <ChevronRight className="text-gray-300" />
                    </button>

                    <button
                      onClick={() => setAccountSubView('report')}
                      className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4 hover:border-orange-200 transition-all text-left mb-4"
                    >
                      <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
                        <Megaphone className="w-6 h-6 text-red-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">Denunciar</h4>
                        <p className="text-xs text-gray-400">Denuncie maus-tratos</p>
                      </div>
                      <ChevronRight className="text-gray-300" />
                    </button>

                    <button
                      onClick={() => setAccountSubView('config')}
                      className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4 hover:border-orange-200 transition-all text-left mb-4"
                    >
                      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                        <Settings className="w-6 h-6 text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">Configuração</h4>
                        <p className="text-xs text-gray-400">Privacidade global do pet</p>
                      </div>
                      <ChevronRight className="text-gray-300" />
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => setAccountSubView('admin')}
                        className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-orange-200 flex items-center gap-4 hover:border-orange-400 transition-all text-left bg-gradient-to-r from-orange-50/50 to-transparent"
                      >
                        <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                          <ShieldCheck className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-800">Painel Admin</h4>
                          <p className="text-xs text-orange-500 font-bold">Gestão, tags e pets</p>
                        </div>
                        <ChevronRight className="text-gray-300" />
                      </button>
                    )}
                    <div className="h-20" /> {/* Spacer to avoid bottom nav overlap */}
                  </div>
                )}

                {accountSubView === 'profile' && (
                  <div className="space-y-6">
                    <button onClick={() => setAccountSubView('menu')} className="flex items-center gap-2 text-orange-500 font-bold text-sm">
                      <ChevronLeft className="w-4 h-4" /> Voltar ao menu
                    </button>
                    {/* Owner Profile Section */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6 pb-24">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-orange-600" />
                        </div>
                        <h3 className="font-bold text-xl text-gray-800">Meu Perfil</h3>
                      </div>

                      <div className="flex flex-col items-center gap-4">
                        <label className="cursor-pointer group relative">
                          <input type="file" accept="image/*" className="hidden" onChange={handleOwnerPhotoUpload} />
                          <div className="w-28 h-28 bg-gray-50 rounded-[2rem] flex items-center justify-center relative overflow-hidden border-2 border-dashed border-gray-200 group-hover:border-orange-300 transition-all">
                            {ownerProfile?.photoUrl ? (
                              <img src={ownerProfile.photoUrl} className="w-full h-full object-cover" />
                            ) : (
                              <Camera className="w-8 h-8 text-gray-300 group-hover:text-orange-300 transition-all" />
                            )}
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-[10px] font-bold uppercase">Alterar</span>
                            </div>
                          </div>
                          {ownerProfile?.photoUrl && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setOwnerProfile(prev => ({ ...prev, photoUrl: '' } as any));
                              }}
                              className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </label>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Foto de Perfil</p>
                      </div>

                      <div className="grid gap-4">
                        <Input
                          label="Nome"
                          placeholder="Seu nome completo"
                          value={ownerProfile?.name || ''}
                          onChange={(v: string) => setOwnerProfile(prev => ({ ...prev, name: v } as any))}
                          icon={UserIcon}
                        />
                        <Select
                          label="Sexo"
                          value={ownerProfile?.gender || ''}
                          onChange={(v: string) => setOwnerProfile(prev => ({ ...prev, gender: v } as any))}
                          options={['Feminino', 'Masculino', 'Outro']}
                          icon={UserIcon}
                        />
                        <Input
                          label="Data de Nascimento"
                          type="date"
                          value={ownerProfile?.birthday || ''}
                          onChange={(v: string) => setOwnerProfile(prev => ({ ...prev, birthday: v } as any))}
                          icon={Calendar}
                        />
                        <Input
                          label="Número de Celular"
                          placeholder="(00) 00000-0000"
                          value={ownerProfile?.phone || ''}
                          onChange={(v: string) => setOwnerProfile(prev => ({ ...prev, phone: formatPhoneMask(v) } as any))}
                          icon={Phone}
                        />
                        <LocationInput
                          label="Endereço de Devolução"
                          placeholder="Rua, Número, Bairro, Cidade..."
                          value={ownerProfile?.address || ''}
                          onChange={(v: string) => setOwnerProfile(prev => ({ ...prev, address: v } as any))}
                          icon={MapPin}
                        />
                      </div>

                      {successMessage && (
                        <div className="bg-green-50 text-green-600 p-4 rounded-2xl text-center text-sm font-bold border border-green-200 mt-2 mb-2">
                          {successMessage}
                        </div>
                      )}

                      <Button
                        onClick={handleSaveOwnerProfile}
                        loading={loading}
                        className="w-full"
                      >
                        Salvar Perfil
                      </Button>
                      <div className="h-20" /> {/* Spacer to avoid bottom nav overlap */}
                    </div>
                  </div>
                )}

                {accountSubView === 'partners' && (
                  <div className="space-y-6">
                    <button onClick={() => setAccountSubView('menu')} className="flex items-center gap-2 text-orange-500 font-bold text-sm">
                      <ChevronLeft className="w-4 h-4" /> Voltar ao menu
                    </button>

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6 pb-24">
                      {/* Header */}
                      <div className="text-center space-y-3">
                        <div className="w-16 h-16 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                          <HeartHandshake className="w-8 h-8 text-blue-500" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-800">Nossos Parceiros</h2>
                        <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-xs mx-auto">
                          Empresas e profissionais que apoiam a proteção e o bem-estar dos animais junto com o FocinhoApp.
                        </p>
                      </div>

                      {/* Filters */}
                      <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide -mx-6 px-6">
                        {PARTNER_CATEGORIES.map(category => (
                          <button
                            key={category}
                            onClick={() => setActivePartnerFilter(category)}
                            className={`whitespace-nowrap px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${activePartnerFilter === category ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-500'}`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>

                      {/* Partner Cards Grid */}
                      <div className="gap-4 flex flex-col mt-2">
                        <AnimatePresence mode="popLayout">
                          {partners
                            .filter(p => {
                              if (!userCity || !p.location) return true;
                              const baseCity = userCity.split('-')[0].split(',')[0].trim().toLowerCase();
                              return p.location.toLowerCase().includes(baseCity);
                            })
                            .filter(p => activePartnerFilter === 'Todos' || p.category === activePartnerFilter)
                            .map(partner => (
                            <motion.div
                              key={partner.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="bg-gray-50 rounded-3xl p-5 border border-gray-100 flex flex-col gap-4"
                            >
                              <div className="flex items-center gap-4">
                                <img src={partner.logo} alt={partner.name} className="w-16 h-16 rounded-2xl object-cover bg-white shadow-sm" />
                                <div>
                                  <h4 className="font-bold text-gray-800 text-lg">{partner.name}</h4>
                                  <p className="text-xs font-bold text-orange-500 uppercase tracking-wide">{partner.category}</p>
                                </div>
                              </div>
                              <p className="text-sm text-gray-500 leading-relaxed font-medium">
                                {partner.description}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-1.5 text-gray-400">
                                  <MapPin className="w-4 h-4" />
                                  <span className="text-xs font-bold">{partner.location}</span>
                                </div>
                                <a
                                  href={partner.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-orange-100 text-orange-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-orange-200 transition-colors"
                                >
                                  Conhecer <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        {partners
                          .filter(p => {
                            if (!userCity || !p.location) return true;
                            const baseCity = userCity.split('-')[0].split(',')[0].trim().toLowerCase();
                            return p.location.toLowerCase().includes(baseCity);
                          })
                          .filter(p => activePartnerFilter === 'Todos' || p.category === activePartnerFilter).length === 0 && (
                          <div className="text-center py-8 text-gray-400 font-medium">
                            Nenhum parceiro encontrado nesta categoria em sua cidade.
                          </div>
                        )}
                      </div>

                      {/* Benefits Section */}
                      <div className="bg-orange-50 rounded-[2rem] p-6 space-y-4 border border-orange-100 mt-8">
                        <h3 className="font-black text-orange-800 text-lg">Por que ser parceiro do FocinhoApp?</h3>
                        <ul className="space-y-3">
                          {[
                            'Divulgação dentro do aplicativo',
                            'Apoio à causa animal',
                            'Aumento de visibilidade para amantes de pets',
                            'Participação em campanhas de adoção',
                            'Conexão com a comunidade pet'
                          ].map((benefit, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                              <span className="text-sm text-orange-900 font-medium leading-relaxed">{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Call to Action for new partners */}
                      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[2rem] p-8 text-center space-y-6 shadow-lg shadow-blue-500/20 text-white mt-8 mx-[-1rem]">
                        <h3 className="font-black text-2xl">Quer se tornar um parceiro do FocinhoApp?</h3>
                        <p className="text-blue-100 text-sm font-medium leading-relaxed">
                          Junte-se a nós para proteger os animais e aumente o alcance da sua marca para um público apaixonado por pets!
                        </p>
                        <a
                          href="https://wa.me/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white text-blue-600 font-black px-6 py-4 rounded-2xl w-full flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md mt-4"
                        >
                          <HeartHandshake className="w-5 h-5" />
                          Quero ser parceiro
                        </a>
                      </div>

                    </div>
                  </div>
                )}

                {accountSubView === 'config' && (
                  <div className="space-y-6">
                    <button onClick={() => setAccountSubView('menu')} className="flex items-center gap-2 text-orange-500 font-bold text-sm">
                      <ChevronLeft className="w-4 h-4" /> Voltar ao menu
                    </button>
                    {/* Privacy Config Section */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6 pb-24">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center">
                          <Settings className="w-5 h-5 text-gray-600" />
                        </div>
                        <h3 className="font-bold text-xl text-gray-800">Configuração</h3>
                      </div>

                      <div className="space-y-4">
                        <p className="text-xs text-gray-500 font-medium mb-4">Essas definições valem para todos os seus pets ativos.</p>
                        
                        {[
                          { id: 'showPhone', label: 'Número de Telefone', desc: 'Permite contato direto e botão de WhatsApp', val: ownerProfile?.privacySettings?.showPhone ?? true },
                          { id: 'showAddress', label: 'Endereço de Devolução', desc: 'Mostra o endereço exato caso o encontrem', val: ownerProfile?.privacySettings?.showAddress ?? true },
                          { id: 'showObservations', label: 'Observações Especiais', desc: 'Medicações, comportamento e recompensas', val: ownerProfile?.privacySettings?.showObservations ?? true },
                          { id: 'showAgeAndWeight', label: 'Idade e Peso', desc: 'Ocultar detalhes físicos do pet', val: ownerProfile?.privacySettings?.showAgeAndWeight ?? true }
                        ].map((setting) => (
                          <div key={setting.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-orange-100 transition-colors">
                            <div className="flex-1 pr-4">
                              <h4 className="font-bold text-gray-900 text-sm">{setting.label}</h4>
                              <p className="text-xs text-gray-500 mt-0.5">{setting.desc}</p>
                            </div>
                            <button
                              onClick={() => {
                                setOwnerProfile(prev => {
                                  if(!prev) return prev;
                                  return {
                                    ...prev,
                                    privacySettings: {
                                      ...(prev.privacySettings || {
                                        showAddress: true, showPhone: true, showObservations: true, showAgeAndWeight: true
                                      }),
                                      [setting.id]: !setting.val
                                    }
                                  } as any;
                                });
                              }}
                              className={`w-12 h-6 rounded-full transition-colors relative shadow-inner ${setting.val ? 'bg-orange-500' : 'bg-gray-200'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${setting.val ? 'left-7' : 'left-1'}`} />
                            </button>
                          </div>
                        ))}
                      </div>

                      {successMessage && (
                        <div className="bg-green-50 text-green-600 p-4 rounded-2xl text-center text-sm font-bold border border-green-200 mt-2 mb-2">
                          {successMessage}
                        </div>
                      )}

                      <Button
                        onClick={handleSaveOwnerProfile}
                        loading={loading}
                        className="w-full"
                      >
                        Salvar Configurações
                      </Button>
                      <div className="h-20" /> {/* Spacer to avoid bottom nav overlap */}
                    </div>
                  </div>
                )}

                {accountSubView === 'pets' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <button onClick={() => setAccountSubView('menu')} className="flex items-center gap-2 text-orange-500 font-bold text-sm">
                        <ChevronLeft className="w-4 h-4" /> Voltar ao menu
                      </button>
                      <Button
                        onClick={() => {
                          const petsWithoutTag = userPets.filter(p => !p.tagId);
                          const hasActiveTag = userPets.some(p => p.tagId);
                          if (!hasActiveTag && petsWithoutTag.length >= 2) {
                            setError('Limite atingido! Ative uma tag para cadastrar mais pets.');
                          } else {
                            setSelectedPet(null);
                            setView('profile');
                          }
                        }}
                        variant="secondary"
                        className="!px-4 !py-2 text-xs"
                      >
                        <Plus className="w-4 h-4" /> Novo Pet
                      </Button>
                    </div>

                    <div className="grid gap-4">
                      {userPets.map(pet => {
                        const isLost = lostAlerts.some(a => a.petId === pet.id);
                        return (
                          <div
                            key={pet.id}
                            onClick={() => { setSelectedPet(pet); setView('profile'); }}
                            className={`bg-white p-4 rounded-3xl shadow-sm border ${isLost ? 'border-red-500 bg-red-50' : 'border-gray-100'} flex items-center gap-4 cursor-pointer hover:border-orange-200 transition-all`}
                          >
                            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center overflow-hidden">
                              {pet.photoUrl ? (
                                <img src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover" />
                              ) : (
                                <Dog className="w-8 h-8 text-orange-200" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg">{pet.name}</h3>
                                {isLost ? (
                                  <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                                    PERDIDO
                                  </span>
                                ) : pet.tagId ? (
                                  <span className="bg-green-100 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" /> PROTEGIDO
                                  </span>
                                ) : (
                                  <span className="bg-gray-100 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> NÃO PROTEGIDO
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-400">{pet.breed || 'Sem raça definida'}</p>
                            </div>
                            <ChevronRight className="text-gray-300" />
                          </div>
                        );
                      })}
                    </div>
                    <div className="h-20" /> {/* Spacer to avoid bottom nav overlap */}
                  </div>
                )}

                {accountSubView === 'support' && (
                  <div className="space-y-6">
                    <button onClick={() => setAccountSubView('menu')} className="flex items-center gap-2 text-orange-500 font-bold text-sm">
                      <ChevronLeft className="w-4 h-4" /> Voltar ao menu
                    </button>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
                          <HelpCircle className="w-6 h-6 text-green-500" />
                        </div>
                        <h3 className="font-bold text-xl">Suporte Pingente Inteligente</h3>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-2xl">
                          <h4 className="font-bold text-sm mb-1">Como ativar minha tag?</h4>
                          <p className="text-xs text-gray-500">Basta escanear o QR Code ou digitar o ID na tela de ativação.</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl">
                          <h4 className="font-bold text-sm mb-1">O que fazer se perder a tag?</h4>
                          <p className="text-xs text-gray-500">Você pode desativar a tag antiga no perfil do pet e ativar uma nova.</p>
                        </div>
                      </div>

                      <div className="pt-4">
                        <p className="text-gray-400 text-sm mb-4 text-center">Ainda precisa de ajuda? Nossa equipe está pronta para te atender.</p>
                        <Button className="w-full bg-green-500 hover:bg-green-600 shadow-green-100">
                          <MessageCircle className="w-5 h-5" /> Falar no WhatsApp
                        </Button>
                      </div>
                    </div>
                    <div className="h-20" /> {/* Spacer to avoid bottom nav overlap */}
                  </div>
                )}

                {accountSubView === 'store' && (
                  <div className="space-y-6">
                    <button onClick={() => setAccountSubView('menu')} className="flex items-center gap-2 text-orange-500 font-bold text-sm">
                      <ChevronLeft className="w-4 h-4" /> Voltar ao menu
                    </button>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
                          <ShoppingBag className="w-6 h-6 text-purple-500" />
                        </div>
                        <h3 className="font-bold text-xl">Loja FocinhoApp</h3>
                      </div>

                      {storeItems.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                          {storeItems.map(item => (
                            <a 
                              key={item.id}
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-gray-50 p-4 rounded-3xl border border-gray-100 space-y-3 hover:border-purple-200 transition-colors group block"
                            >
                              <div className="aspect-square bg-white rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden">
                                {item.gallery && item.gallery.length > 0 ? (
                                  <img src={item.gallery[0]} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <ShoppingBag className="w-8 h-8 text-purple-300" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-bold text-xs truncate" title={item.name}>{item.name}</h4>
                                <p className="text-[10px] text-purple-600 font-black mt-1">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.price))}
                                </p>
                              </div>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-purple-50 p-6 rounded-3xl text-center">
                          <p className="text-purple-800 font-bold text-sm">Lançamento em breve!</p>
                          <p className="text-purple-600 text-xs mt-1">Novos acessórios e cores exclusivas para seu pet.</p>
                        </div>
                      )}
                    </div>
                    <div className="h-20" /> {/* Spacer to avoid bottom nav overlap */}
                  </div>
                )}

                {accountSubView === 'adoption' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <button onClick={() => setAccountSubView('menu')} className="flex items-center gap-2 text-orange-500 font-bold text-sm">
                        <ChevronLeft className="w-4 h-4" /> Voltar ao menu
                      </button>
                      {isAdmin && (
                        <Button
                          onClick={() => setIsAddingAdoptionPet(true)}
                          variant="secondary"
                          className="!px-4 !py-2 text-xs"
                        >
                          <Plus className="w-4 h-4" /> Divulgar Pet
                        </Button>
                      )}
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center">
                          <Heart className="w-6 h-6 text-pink-500" />
                        </div>
                        <h3 className="font-bold text-xl">Adoção Responsável</h3>
                      </div>

                      <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-5 rounded-2xl text-center shadow-lg shadow-pink-100">
                        <p className="text-white font-black text-sm">Mude uma vida! 💖</p>
                        <p className="text-white/90 text-[11px] mt-1">Adote um pet e ganhe um Pingente Inteligente do FocinhoApp.</p>
                      </div>

                      <div className="space-y-8">
                        {/* Available Pets */}
                        <div className="space-y-4">
                          <h4 className="font-black text-xs text-gray-400 uppercase tracking-widest ml-1">Pets Disponíveis</h4>
                          <div className="grid grid-cols-1 gap-6">
                            {adoptionPets.filter(p => p.status !== 'adopted').length > 0 ? adoptionPets.filter(p => p.status !== 'adopted').map((pet, i) => (
                              <div key={i} className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 space-y-4">
                                <div className="aspect-video bg-white rounded-3xl overflow-hidden relative cursor-pointer" onClick={() => setLightboxImage(pet.gallery && pet.gallery.length > 0 ? pet.gallery[0] : pet.photoUrl || '')}>
                                  {pet.gallery && pet.gallery.length > 1 ? (
                                    <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide h-full">
                                      {pet.gallery.map((url, idx) => (
                                        <img
                                          key={idx}
                                          src={url}
                                          onClick={(e) => { e.stopPropagation(); setLightboxImage(url); }}
                                          className="w-full h-full object-cover snap-center shrink-0 cursor-zoom-in"
                                        />
                                      ))}
                                    </div>
                                  ) : (
                                    <img src={pet.photoUrl || 'https://picsum.photos/seed/pet/800/600'} className="w-full h-full object-cover cursor-zoom-in" />
                                  )}
                                  <div className="absolute top-4 right-4 bg-green-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase shadow-lg">
                                    Disponível
                                  </div>
                                  {pet.gallery && pet.gallery.length > 1 && (
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                      {pet.gallery.map((_, idx) => (
                                        <div key={idx} className="w-1.5 h-1.5 rounded-full bg-white/50" />
                                      ))}
                                    </div>
                                  )}
                                  <div className="absolute bottom-4 right-4 bg-black/40 text-white p-1.5 rounded-lg backdrop-blur-sm">
                                    <Maximize2 className="w-3.5 h-3.5" />
                                  </div>
                                </div>
                                <div className="px-2 space-y-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="font-black text-xl text-gray-800">{pet.name}</h4>
                                      <p className="text-sm text-gray-500 font-bold">{pet.breed} • {pet.age || 'Idade não informada'}</p>
                                    </div>
                                    <div className="bg-pink-50 text-pink-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                      {pet.gender}
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-600 leading-relaxed">{pet.description}</p>

                                  <div className="flex flex-col gap-3 mt-4">
                                    <button
                                      onClick={() => window.open(`https://wa.me/${pet.contactPhone.replace(/\D/g, '')}`, '_blank')}
                                      className="w-full py-4 bg-pink-500 text-white text-sm font-black rounded-2xl hover:bg-pink-600 transition-all shadow-lg shadow-pink-100 flex items-center justify-center gap-2"
                                    >
                                      <MessageCircle className="w-5 h-5" /> Quero adotar
                                    </button>
                                    {isAdmin && (
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => {
                                            setEditingAdoptionPetId(pet.id);
                                            setNewAdoptionPet({ ...pet });
                                            setIsAddingAdoptionPet(true);
                                          }}
                                          className="flex-1 py-3 bg-orange-50 border border-orange-200 text-orange-600 text-sm font-bold rounded-2xl hover:bg-orange-100 transition-all flex items-center justify-center gap-2"
                                        >
                                          <Edit2 className="w-4 h-4" /> Editar
                                        </button>
                                        <button
                                          onClick={() => handleUpdateAdoptionStatus(pet.id, 'adopted')}
                                          className="flex-1 py-3 bg-white border-2 border-gray-100 text-gray-400 text-sm font-bold rounded-2xl hover:bg-gray-50 transition-all"
                                        >
                                          Marcar Adotado
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )) : (
                              <div className="py-12 text-center bg-gray-50/50 rounded-[2.5rem] border border-dashed border-gray-200">
                                <p className="text-gray-400 text-sm">Nenhum pet disponível no momento.</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Adopted Pets */}
                        {adoptionPets.filter(p => p.status === 'adopted').length > 0 && (
                          <div className="space-y-4">
                            <h4 className="font-black text-xs text-gray-400 uppercase tracking-widest ml-1">Já Adotados ❤️</h4>
                            <div className="grid grid-cols-1 gap-6 opacity-75">
                              {adoptionPets.filter(p => p.status === 'adopted').map((pet, i) => (
                                <div key={i} className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 space-y-4 grayscale-[0.5]">
                                  <div className="aspect-video bg-white rounded-3xl overflow-hidden relative">
                                    <img src={pet.photoUrl || 'https://picsum.photos/seed/pet/800/600'} className="w-full h-full object-cover" />
                                    <div className="absolute top-4 right-4 bg-gray-400 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase shadow-lg">
                                      Adotado
                                    </div>
                                  </div>
                                  <div className="px-2 flex justify-between items-center">
                                    <div>
                                      <h4 className="font-black text-lg text-gray-600">{pet.name}</h4>
                                      <p className="text-xs text-gray-400 font-bold">{pet.breed}</p>
                                    </div>
                                    {isAdmin && (
                                      <button
                                        onClick={() => handleUpdateAdoptionStatus(pet.id, 'available')}
                                        className="py-2 px-4 bg-white border border-gray-200 text-gray-400 text-[10px] font-bold rounded-xl hover:bg-gray-50 transition-all"
                                      >
                                        Voltar para Disponível
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Add Adoption Pet Modal */}
                    <AnimatePresence>
                      {isAddingAdoptionPet && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-y-auto">
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setIsAddingAdoptionPet(false); setEditingAdoptionPetId(null); }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                          />
                          <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-md rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative z-10 space-y-6 my-8 overflow-y-auto max-h-[90vh]"
                          >
                            <div className="flex justify-between items-center">
                              <h3 className="text-xl font-bold">{editingAdoptionPetId ? 'Editar Pet' : 'Divulgar Pet'}</h3>
                              <button onClick={() => { setIsAddingAdoptionPet(false); setEditingAdoptionPetId(null); }} className="p-2 hover:bg-gray-100 rounded-full">
                                <X className="w-5 h-5" />
                              </button>
                            </div>

                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
                              <Input
                                label="Nome do Pet"
                                value={newAdoptionPet.name}
                                onChange={(v: string) => setNewAdoptionPet(prev => ({ ...prev, name: v }))}
                              />
                              <Select
                                label="Tipo"
                                value={newAdoptionPet.animalType}
                                onChange={(v: string) => setNewAdoptionPet(prev => ({ ...prev, animalType: v }))}
                                options={['Cachorro', 'Gato', 'Outro']}
                              />
                              <Select
                                label="Raça"
                                value={newAdoptionPet.breed}
                                onChange={(v: string) => setNewAdoptionPet(prev => ({ ...prev, breed: v }))}
                                options={newAdoptionPet.animalType === 'Cachorro' ? DOG_BREEDS : newAdoptionPet.animalType === 'Gato' ? CAT_BREEDS : ['Outro']}
                              />
                              <Select
                                label="Cor Predominante"
                                value={newAdoptionPet.color}
                                onChange={(v: string) => setNewAdoptionPet(prev => ({ ...prev, color: v }))}
                                options={COLORS}
                              />
                              <Select
                                label="Porte"
                                value={newAdoptionPet.size || ''}
                                onChange={(v: string) => setNewAdoptionPet(prev => ({ ...prev, size: v }))}
                                options={['Pequeno', 'Médio', 'Grande']}
                              />
                              <Select
                                label="Sexo"
                                value={newAdoptionPet.gender}
                                onChange={(v: string) => setNewAdoptionPet(prev => ({ ...prev, gender: v }))}
                                options={['Macho', 'Fêmea']}
                              />
                              <Input
                                label="Idade (opcional)"
                                value={newAdoptionPet.age}
                                onChange={(v: string) => setNewAdoptionPet(prev => ({ ...prev, age: v }))}
                              />
                              <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-gray-600 ml-1">Descrição / História</label>
                                <textarea
                                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all min-h-[100px]"
                                  value={newAdoptionPet.description}
                                  onChange={(e) => setNewAdoptionPet(prev => ({ ...prev, description: e.target.value }))}
                                  placeholder="Conte um pouco sobre o pet..."
                                />
                              </div>
                              <Input
                                label="WhatsApp de Contato"
                                placeholder="(00) 00000-0000"
                                value={newAdoptionPet.contactPhone}
                                onChange={(v: string) => setNewAdoptionPet(prev => ({ ...prev, contactPhone: formatPhoneMask(v) }))}
                                icon={Phone}
                              />

                              <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-gray-600 ml-1">Fotos do Pet (até 5)</label>
                                <div className="grid grid-cols-3 gap-2">
                                  {newAdoptionPet.gallery?.map((url, idx) => (
                                    <div key={idx} className="aspect-square rounded-2xl overflow-hidden relative group">
                                      <img src={url} className="w-full h-full object-cover" />
                                      <button
                                        onClick={() => setNewAdoptionPet(prev => ({ ...prev, gallery: prev.gallery?.filter((_, i) => i !== idx) }))}
                                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                  {(newAdoptionPet.gallery?.length || 0) < 5 && (
                                    <label className="aspect-square bg-gray-50 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gray-200 hover:border-orange-300 transition-all cursor-pointer">
                                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleAdoptionPhotoUpload} />
                                      <Camera className="w-6 h-6 text-gray-300" />
                                      <span className="text-[8px] text-gray-400 font-bold uppercase mt-1">Adicionar</span>
                                    </label>
                                  )}
                                </div>
                              </div>
                            </div>

                            <Button onClick={handleSaveAdoptionPet} loading={loading} className="w-full">
                              Publicar para Adoção
                            </Button>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>
                    <div className="h-20" /> {/* Spacer to avoid bottom nav overlap */}
                  </div>
                )}

                {accountSubView === 'report' && (
                  <div className="space-y-6">
                    <button onClick={() => setAccountSubView('menu')} className="flex items-center gap-2 text-orange-500 font-bold text-sm">
                      <ChevronLeft className="w-4 h-4" /> Voltar ao menu
                    </button>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 space-y-6 mb-10">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
                          <Megaphone className="w-6 h-6 text-red-500" />
                        </div>
                        <h3 className="font-bold text-xl">Denunciar Maus-tratos</h3>
                      </div>

                      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
                        <p>Se você presenciou algum caso de maus-tratos a animais, não se cale. A denúncia é anônima e o <strong>sigilo é 100% garantido</strong>.</p>
                        <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                          <p className="text-red-800 font-bold text-xs mb-1">O que é considerado maus-tratos?</p>
                          <ul className="text-[10px] text-red-600 list-disc ml-4 space-y-1">
                            <li>Abandono em vias públicas</li>
                            <li>Agressão física ou envenenamento</li>
                            <li>Manter preso em correntes curtas</li>
                            <li>Falta de higiene, água ou comida</li>
                          </ul>
                        </div>
                      </div>

                      <Button
                        onClick={() => window.open('https://wa.me/5511999999999?text=Gostaria%20de%20fazer%20uma%20denúncia%20de%20maus-tratos%20animal.', '_blank')}
                        className="w-full bg-red-500 hover:bg-red-600 shadow-red-100"
                      >
                        <MessageCircle className="w-5 h-5" /> Denunciar via WhatsApp
                      </Button>
                      <p className="text-[10px] text-gray-400 text-center">Em caso de emergência, ligue para 190.</p>
                    </div>
                    <div className="h-20" /> {/* Spacer to avoid bottom nav overlap */}
                  </div>
                )}

                {accountSubView === 'admin' && isAdmin && (
                  <div className="space-y-6">
                    <button onClick={() => setAccountSubView('menu')} className="flex items-center gap-2 text-orange-500 font-bold text-sm">
                      <ChevronLeft className="w-4 h-4" /> Voltar ao menu
                    </button>
                    
                    {/* Admin Dashboard */}
                    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 space-y-8 mb-10 overflow-hidden">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                          <ShieldCheck className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-xl text-gray-900">Painel Administrador</h3>
                          <p className="text-xs text-orange-500 font-bold uppercase tracking-widest">Acesso Restrito</p>
                        </div>
                      </div>

                      {/* Tag Generator */}
                      <div className="border border-orange-100 rounded-[2rem] p-6 bg-gradient-to-br from-orange-50 to-white relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4 relative z-10">
                          <div className="flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-orange-600" />
                            <h4 className="font-bold text-gray-800">Gerenciador de Tags</h4>
                          </div>
                          {isFetchingAllTags && <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />}
                        </div>
                        <p className="text-xs text-gray-500 mb-6 relative z-10">
                          Gere novas tags com IDs seguros (ex: ABC-1234) ou visualize as tags já criadas.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-3 mb-6">
                          <div className="flex-1 bg-white border border-gray-200 rounded-2xl flex items-center px-4 shadow-sm focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
                            <span className="text-xs font-bold text-gray-400 mr-2">Qtd:</span>
                            <input 
                              type="number"
                              min="1"
                              max="100"
                              value={amountToGenerate}
                              onChange={(e) => setAmountToGenerate(parseInt(e.target.value) || 1)}
                              className="w-full py-3 bg-transparent outline-none text-gray-800 font-medium"
                            />
                          </div>
                          <Button
                            onClick={async () => {
                              if (amountToGenerate < 1) return;
                              setLoading(true);
                              try {
                                const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                                const numbers = '0123456789';
                                const getRandom = (chars: string, len: number) => 
                                  Array.from({length: len}).map(() => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
                                
                                const newTags: any[] = [];
                                for (let i = 0; i < amountToGenerate; i++) {
                                  let tagId = '';
                                  let isDuplicate = true;
                                  while(isDuplicate) {
                                    tagId = `${getRandom(letters, 3)}-${getRandom(numbers, 4)}`;
                                    isDuplicate = allTags.some(t => t.id === tagId) || newTags.some(t => t.id === tagId);
                                  }
                                  
                                  newTags.push({
                                    id: tagId,
                                    activated: false,
                                    ownerId: null,
                                    petId: null
                                  });
                                }

                                for (const tag of newTags) {
                                  await supabase.from('tags').upsert(tag);
                                }
                                alert(`${amountToGenerate} Tags geradas com sucesso!`);
                                const { data } = await supabase.from('tags').select('*').order('id', { ascending: true });
                                setAllTags(data || []);
                                setAdminTagsPage(1); // Reset to first page after generating new tags
                              } catch (err) {
                                setError('Erro ao gerar tags.');
                              } finally {
                                setLoading(false);
                              }
                            }}
                            className="relative z-10 py-3 px-8 shrink-0"
                            loading={loading}
                          >
                            Gerar Novas Tags
                          </Button>
                        </div>

                        <div className="flex items-center justify-between mb-4">
                          <h5 className="font-bold text-sm text-gray-800">Total de Tags: {allTags.length}</h5>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setAdminTagsPage(p => Math.max(1, p - 1))}
                              disabled={adminTagsPage === 1}
                              className="p-1 bg-gray-50 rounded-lg disabled:opacity-50"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-gray-500">Pág {adminTagsPage}</span>
                            <button 
                              onClick={() => setAdminTagsPage(p => (p * 20 < allTags.length ? p + 1 : p))}
                              disabled={adminTagsPage * 20 >= allTags.length}
                              className="p-1 bg-gray-50 rounded-lg disabled:opacity-50"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 min-h-[200px] relative z-10">
                          {allTags.slice((adminTagsPage - 1) * 20, adminTagsPage * 20).map((tag) => {
                            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/?tag=' + tag.id)}`;
                            return (
                              <div key={tag.id} className="bg-white p-3 rounded-2xl border border-gray-100 text-center shadow-sm relative group flex flex-col items-center justify-center">
                                <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${tag.activated ? 'bg-green-500' : 'bg-gray-300'}`} title={tag.activated ? 'Ativada' : 'Inativa'} />
                                <img src={qrUrl} alt={tag.id} className="w-full aspect-square mb-2 rounded-xl" />
                                <p className="text-[10px] font-black text-gray-700 w-full truncate">{tag.id}</p>
                                <a
                                  href={qrUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[9px] text-orange-500 font-bold hover:underline py-1 block"
                                >
                                  Baixar QR
                                </a>
                              </div>
                            );
                          })}
                          {allTags.length === 0 && !isFetchingAllTags && (
                             <p className="col-span-full text-center text-sm text-gray-400 py-8 font-medium">Nenhuma tag gerada ainda.</p>
                          )}
                        </div>
                      </div>

                      {/* Global Pets Management */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            <Dog className="w-5 h-5 text-gray-400" /> Todos os Pets ({allPets.length})
                          </h4>
                          <div className="flex items-center gap-2">
                            {isFetchingAllPets && <Loader2 className="w-4 h-4 text-orange-500 animate-spin mr-2" />}
                            <button 
                              onClick={() => setAdminPetsPage(p => Math.max(1, p - 1))}
                              disabled={adminPetsPage === 1}
                              className="p-1 bg-gray-50 rounded-lg disabled:opacity-50"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-gray-500">Pág {adminPetsPage}</span>
                            <button 
                              onClick={() => setAdminPetsPage(p => (p * 5 < allPets.length ? p + 1 : p))}
                              disabled={adminPetsPage * 5 >= allPets.length}
                              className="p-1 bg-gray-50 rounded-lg disabled:opacity-50"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4 min-h-[300px] border border-gray-100 rounded-[2rem] p-3 bg-gray-50/50">
                          {allPets.length > 0 ? allPets.slice((adminPetsPage - 1) * 5, adminPetsPage * 5).map(pet => (
                            <div key={pet.id} className="bg-white p-4 rounded-3xl border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center gap-4 relative shadow-sm hover:border-orange-200 transition-colors">
                              <div className="flex items-center gap-4 flex-1 w-full">
                                <div className="w-14 h-14 bg-gray-100 rounded-2xl overflow-hidden shrink-0">
                                  {pet.photoUrl ? (
                                    <img src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Dog className="w-6 h-6 text-gray-300 m-auto h-full" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 pr-2">
                                  <h5 className="font-black text-gray-900 text-lg truncate">{pet.name}</h5>
                                  <p className="text-[10px] text-gray-400 font-bold truncate mt-0.5">Dono: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-500">{pet.ownerId}</span></p>
                                  <div className="flex gap-2 mt-2">
                                    {pet.tagId ? (
                                      <span className="bg-green-100 text-green-700 text-[9px] font-black px-2 py-0.5 rounded-md uppercase">ID: {pet.tagId}</span>
                                    ) : (
                                      <span className="bg-gray-100 text-gray-500 text-[9px] font-black px-2 py-0.5 rounded-md uppercase">Sem tag</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-row flex-wrap sm:flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-gray-100 sm:border-l sm:pl-4 shrink-0 justify-center min-w-[6rem]">
                                <button
                                  onClick={() => {
                                    setSelectedPet(pet);
                                    setView('profile'); // Admins editing other's pets
                                  }}
                                  className="w-10 h-10 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-xl transition-colors font-bold text-xs flex items-center justify-center shrink-0"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={async () => {
                                    if(window.confirm(`Excluir ${pet.name} DE OFÍCIO?`)) {
                                      setLoading(true);
                                      try {
                                        await supabase.from('pets').update({ deleted: true }).eq('id', pet.id);
                                        setAllPets(prev => prev.filter(p => p.id !== pet.id));
                                        
                                        // Adjust page if current page became empty
                                        const totalRemainingPages = Math.ceil((allPets.length - 1) / 5);
                                        if (adminPetsPage > totalRemainingPages && totalRemainingPages > 0) {
                                          setAdminPetsPage(totalRemainingPages);
                                        }
                                      } catch (err) {
                                        setError('Erro ao excluir pet.');
                                      } finally {
                                        setLoading(false);
                                      }
                                    }
                                  }}
                                  className="w-10 h-10 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors font-bold text-xs flex items-center justify-center shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )) : (
                            <p className="text-center text-sm text-gray-400 py-8 font-medium">Nenhum pet encontrado ou dados não carregados.</p>
                          )}
                        </div>
                      </div>

                      {/* Store Management */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-gray-400" /> Loja Parceira ({storeItems.length})
                          </h4>
                        </div>
                        <div className="bg-gray-50/50 border border-gray-100 rounded-[2rem] p-4">
                          <form onSubmit={handleSaveStoreItem} className="flex flex-col gap-3 mb-6">
                            <Input 
                              placeholder="Nome do Produto" 
                              icon={ShoppingBag} 
                              value={storeForm.name}
                              onChange={(v: string) => setStoreForm(prev => ({ ...prev, name: v }))}
                            />
                            <div className="flex gap-3">
                              <Input 
                                placeholder="Preço (19.90)" 
                                value={storeForm.price}
                                onChange={(v: string) => setStoreForm(prev => ({ ...prev, price: v }))}
                              />
                            </div>
                            <Input 
                              placeholder="Link de Venda (https://...)" 
                              value={storeForm.url}
                              onChange={(v: string) => setStoreForm(prev => ({ ...prev, url: v }))}
                            />
                            
                            <div className="flex flex-col gap-1.5">
                              <label className="text-sm font-medium text-gray-600 ml-1">Fotos do Produto (até 10)</label>
                              <div className="grid grid-cols-5 gap-2">
                                {storeForm.gallery?.map((url, idx) => (
                                  <div key={idx} className="aspect-square rounded-xl overflow-hidden relative group">
                                    <img src={url} className="w-full h-full object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => setStoreForm(prev => ({ ...prev, gallery: prev.gallery?.filter((_, i) => i !== idx) }))}
                                      className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                                {(storeForm.gallery?.length || 0) < 10 && (
                                  <label className="aspect-square bg-gray-50 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-gray-200 hover:border-orange-300 transition-all cursor-pointer">
                                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleStorePhotoUpload} />
                                    <Camera className="w-5 h-5 text-gray-300" />
                                    <span className="text-[8px] text-gray-400 font-bold uppercase mt-1">Fotos</span>
                                  </label>
                                )}
                              </div>
                            </div>

                            {storeMessage && (
                              <div className="bg-green-50 text-green-600 p-3 rounded-xl text-center text-sm font-bold border border-green-200 mt-1">
                                {storeMessage}
                              </div>
                            )}

                            <div className="flex gap-2">
                              <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600">
                                {storeForm.id ? 'Salvar Alterações' : 'Adicionar Produto'}
                              </Button>
                              {storeForm.id && (
                                <button type="button" onClick={() => setStoreForm({ id: '', name: '', price: '', url: '', gallery: [] })} className="px-6 rounded-2xl border-2 border-gray-100 text-gray-500 font-bold hover:bg-gray-50">
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </form>
                          
                          <div className="flex flex-col gap-3">
                            {storeItems.map(item => (
                              <div key={item.id} className="bg-white p-4 rounded-3xl border border-gray-200 flex justify-between items-center shadow-sm">
                                <div className="min-w-0 pr-2">
                                  <h5 className="font-bold text-gray-900 truncate">{item.name}</h5>
                                  <p className="text-orange-500 font-black text-sm">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.price))}
                                  </p>
                                  <a href={item.url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline mt-1 block max-w-full truncate">{item.url}</a>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  <button onClick={() => setStoreForm({ id: item.id, name: item.name, price: item.price.toString(), url: item.url, gallery: item.gallery || [] })} className="p-2.5 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-colors">
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDeleteStoreItem(item.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {storeItems.length === 0 && <p className="text-center text-xs text-gray-400 font-medium py-4">Nenhum item cadastrado.</p>}
                          </div>
                        </div>
                      </div>

                      {/* Partners Management */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-gray-400" /> Parceiros ({partners.length})
                          </h4>
                        </div>
                        <div className="bg-gray-50/50 border border-gray-100 rounded-[2rem] p-4">
                          <form onSubmit={handleSavePartner} className="flex flex-col gap-3 mb-6">
                            <div className="flex gap-3">
                              <Input 
                                placeholder="Nome da Empresa" 
                                icon={Briefcase} 
                                value={partnerForm.name || ''}
                                onChange={(v: string) => setPartnerForm(prev => ({ ...prev, name: v }))}
                              />
                              <div className="w-1/2">
                                <Select
                                  value={partnerForm.category || ''}
                                  onChange={(v: string) => setPartnerForm(prev => ({ ...prev, category: v }))}
                                  options={PARTNER_CATEGORIES.filter(c => c !== 'Todos')}
                                />
                              </div>
                            </div>
                            
                            <Input 
                              placeholder="Breve descrição" 
                              value={partnerForm.description || ''}
                              onChange={(v: string) => setPartnerForm(prev => ({ ...prev, description: v }))}
                            />

                            <div className="flex gap-3">
                              <Input 
                                placeholder="Cidade-UF (ex: Guapimirim-RJ)" 
                                icon={MapPin}
                                value={partnerForm.location || ''}
                                onChange={(v: string) => setPartnerForm(prev => ({ ...prev, location: v }))}
                              />
                              <Input 
                                placeholder="Link / Instagram" 
                                icon={ExternalLink}
                                value={partnerForm.url || ''}
                                onChange={(v: string) => setPartnerForm(prev => ({ ...prev, url: v }))}
                              />
                            </div>
                            
                            <div className="flex flex-col gap-1.5">
                              <label className="text-sm font-medium text-gray-600 ml-1">Logo do Parceiro (1)</label>
                              <div className="flex gap-2">
                                {partnerForm.logo && (
                                  <div className="w-16 h-16 rounded-xl overflow-hidden relative group shrink-0 border border-gray-200">
                                    <img src={partnerForm.logo} className="w-full h-full object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => setPartnerForm(prev => ({ ...prev, logo: '' }))}
                                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="w-5 h-5" />
                                    </button>
                                  </div>
                                )}
                                {!partnerForm.logo && (
                                  <label className="w-16 h-16 bg-gray-50 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-gray-200 hover:border-orange-300 transition-all cursor-pointer shrink-0">
                                    <input type="file" accept="image/*" className="hidden" onChange={handlePartnerLogoUpload} />
                                    <Camera className="w-5 h-5 text-gray-300" />
                                    <span className="text-[8px] text-gray-400 font-bold uppercase mt-1">Logo</span>
                                  </label>
                                )}
                              </div>
                            </div>

                            {partnerMessage && (
                              <div className="bg-green-50 text-green-600 p-3 rounded-xl text-center text-sm font-bold border border-green-200 mt-1">
                                {partnerMessage}
                              </div>
                            )}

                            <div className="flex gap-2 mt-2">
                              <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 shadow-blue-100">
                                {partnerForm.id ? 'Atualizar Parceiro' : 'Salvar Parceiro'}
                              </Button>
                              {partnerForm.id && (
                                <button type="button" onClick={() => setPartnerForm({ id: '', name: '', category: 'Pet Shops', description: '', location: '', logo: '', url: '' })} className="px-6 rounded-2xl border-2 border-gray-100 text-gray-500 font-bold hover:bg-gray-50">
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </form>
                          
                          <div className="flex flex-col gap-3">
                            {partners.map(partner => (
                              <div key={partner.id} className="bg-white p-4 rounded-3xl border border-gray-200 flex justify-between items-center shadow-sm">
                                <div className="flex items-center gap-3 w-full pr-2 overflow-hidden">
                                  {partner.logo ? (
                                     <img src={partner.logo} className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0" />
                                  ) : (
                                     <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                                       <Briefcase className="w-4 h-4 text-gray-300" />
                                     </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <h5 className="font-bold text-gray-900 truncate text-sm">{partner.name}</h5>
                                    <p className="text-[10px] text-gray-500 font-bold truncate">
                                      {partner.category} {partner.location && `• ${partner.location}`}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  <button onClick={() => setPartnerForm({ ...partner })} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDeletePartner(partner.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {partners.length === 0 && <p className="text-center text-xs text-gray-400 font-medium py-4">Nenhum parceiro cadastrado.</p>}
                          </div>
                        </div>
                      </div>

                    </div>
                    <div className="h-20" />
                  </div>
                )}
              </motion.div>
            )}

            {/* Activate Tag */}
            {view === 'activate' && (
              <motion.div
                key="activate"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8 py-8"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold">Ativar Tag</h2>
                  <p className="text-gray-400">Insira o ID que veio com o seu QR Code</p>
                </div>
                <div className="space-y-6">
                  <Input
                    label="ID da Tag"
                    placeholder="Ex: PAW-12345"
                    value={tagIdToActivate}
                    onChange={setTagIdToActivate}
                    icon={QrCode}
                  />
                  {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                  <Button
                    onClick={handleActivateTag}
                    className="w-full py-4"
                    loading={loading}
                  >
                    Verificar Tag
                  </Button>
                  <Button onClick={() => setView('dashboard')} variant="secondary" className="w-full">
                    Cancelar
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Profile Editor */}
            {view === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-4">
                  <button onClick={() => setView('dashboard')} className="p-2 bg-white rounded-xl shadow-sm">
                    <ChevronRight className="w-6 h-6 rotate-180" />
                  </button>
                  <h2 className="text-2xl font-bold">{selectedPet ? 'Editar Perfil' : 'Novo Perfil'}</h2>
                </div>

                <div className="space-y-6 pb-24">
                  {selectedPet && lostAlerts.some(a => a.petId === selectedPet.id) && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-orange-50 border-2 border-orange-200 p-4 rounded-3xl text-center space-y-2"
                    >
                      <Heart className="w-8 h-8 text-orange-500 mx-auto" />
                      <p className="text-orange-600 font-black text-lg">
                        Mantenha a esperança!
                      </p>
                      <p className="text-orange-500 text-xs font-medium">Estamos na torcida para que o {selectedPet.name} volte logo para casa em segurança.</p>
                    </motion.div>
                  )}
                  <div className="flex flex-col items-center gap-4">
                    <label className="cursor-pointer group">
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                      <div className="w-32 h-32 bg-gray-100 rounded-3xl flex items-center justify-center relative overflow-hidden border-2 border-dashed border-gray-200 group-hover:border-orange-300 transition-all">
                        {selectedPet?.photoUrl ? (
                          <img src={selectedPet.photoUrl} className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-10 h-10 text-gray-300 group-hover:text-orange-300 transition-all" />
                        )}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-xs font-bold">Alterar Foto</span>
                        </div>
                      </div>
                    </label>
                    <p className="text-xs text-gray-400">Clique para carregar a foto do seu pet</p>
                  </div>

                  {/* Gallery Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-sm font-medium text-gray-600">Galeria de Fotos</label>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        {selectedPet?.gallery?.length || 0} / {selectedPet?.tagId ? 10 : 3} FOTOS
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      {selectedPet?.gallery?.map((photo, idx) => (
                        <div key={idx} className="aspect-square rounded-2xl bg-gray-100 relative overflow-hidden group">
                          <img src={photo} className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeGalleryPhoto(idx)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {(selectedPet?.gallery?.length || 0) < (selectedPet?.tagId ? 10 : 3) && (
                        <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-all text-gray-400 hover:text-orange-500">
                          <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
                          <Plus className="w-6 h-6" />
                          <span className="text-[8px] font-bold uppercase">Adicionar</span>
                        </label>
                      )}
                    </div>
                    {!selectedPet?.tagId && (
                      <p className="text-[10px] text-orange-600 font-medium bg-orange-50 p-2 rounded-lg">
                        Dica: Ative uma tag para liberar até 10 fotos na galeria!
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4">
                    {tagIdToActivate && !selectedPet?.tagId && (
                      <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="text-xs font-bold text-green-800">TAG PRONTA PARA ATIVAR</p>
                          <p className="text-[10px] text-green-600">ID: {tagIdToActivate} (Será vinculada ao salvar)</p>
                        </div>
                      </div>
                    )}
                    {selectedPet?.tagId && (
                      <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 text-green-500" />
                            <div>
                              <p className="text-xs font-bold text-green-800">TAG VINCULADA</p>
                              <p className="text-[10px] text-green-600">ID: {selectedPet.tagId}</p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            if (selectedPet.id && selectedPet.tagId) {
                              handleDeactivateTag(selectedPet.tagId, selectedPet.id);
                            }
                          }}
                          className="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 py-2 px-3 rounded-xl transition-colors border border-red-100 w-full text-center"
                        >
                          Perdeu a tag? Desativar agora
                        </button>
                      </div>
                    )}

                    {!tagIdToActivate && !selectedPet?.tagId && (
                      <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <QrCode className="w-5 h-5 text-orange-500" />
                          <div>
                            <p className="text-xs font-bold text-orange-800">TAG NÃO VINCULADA</p>
                            <p className="text-[10px] text-orange-600">Este pet não está protegido.</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setView('activate')}
                          className="text-xs font-bold text-orange-500 hover:underline"
                        >
                          Vincular Agora
                        </button>
                      </div>
                    )}
                    <Input
                      label="Nome do Pet"
                      placeholder="Ex: Totó"
                      value={selectedPet?.name || ''}
                      onChange={(v: string) => setSelectedPet(prev => ({ ...prev, name: v } as any))}
                    />

                    <Select
                      label="Tipo de Animal"
                      value={selectedPet?.animalType || ''}
                      onChange={(v: string) => setSelectedPet(prev => ({ ...prev, animalType: v, breed: '', color: '' } as any))}
                      options={['Cachorro', 'Gato', 'Outro']}
                      icon={Dog}
                    />

                    <Select
                      label="Sexo"
                      value={selectedPet?.gender || ''}
                      onChange={(v: string) => setSelectedPet(prev => ({ ...prev, gender: v } as any))}
                      options={['Macho', 'Fêmea', 'Outro']}
                      icon={UserIcon}
                    />

                    {selectedPet?.animalType === 'Cachorro' && (
                      <Select
                        label="Raça do Cachorro"
                        value={selectedPet?.breed || ''}
                        onChange={(v: string) => setSelectedPet(prev => ({ ...prev, breed: v } as any))}
                        options={DOG_BREEDS}
                      />
                    )}

                    {selectedPet?.animalType === 'Gato' && (
                      <Select
                        label="Raça do Gato"
                        value={selectedPet?.breed || ''}
                        onChange={(v: string) => setSelectedPet(prev => ({ ...prev, breed: v } as any))}
                        options={CAT_BREEDS}
                      />
                    )}

                    {(selectedPet?.animalType === 'Outro' || selectedPet?.breed === 'Outro') && (
                      <Input
                        label="Especifique a Raça/Tipo"
                        placeholder="Digite aqui..."
                        value={selectedPet?.breed === 'Outro' ? '' : selectedPet?.breed || ''}
                        onChange={(v: string) => setSelectedPet(prev => ({ ...prev, breed: v } as any))}
                      />
                    )}

                    <Select
                      label="Cor Predominante"
                      value={selectedPet?.color || ''}
                      onChange={(v: string) => setSelectedPet(prev => ({ ...prev, color: v } as any))}
                      options={COLORS}
                    />

                    <Select
                      label="Porte"
                      value={selectedPet?.size || ''}
                      onChange={(v: string) => setSelectedPet(prev => ({ ...prev, size: v } as any))}
                      options={['Pequeno', 'Médio', 'Grande']}
                    />

                    <Input
                      label="Aniversário"
                      type="date"
                      value={selectedPet?.birthday || ''}
                      onChange={(v: string) => setSelectedPet(prev => ({ ...prev, birthday: v } as any))}
                      icon={Calendar}
                    />

                    <Input
                      label="Peso (kg)"
                      placeholder="Ex: 10.5"
                      value={selectedPet?.weight || ''}
                      onChange={(v: string) => setSelectedPet(prev => ({ ...prev, weight: v } as any))}
                      icon={Scale}
                    />

                    <Input
                      label="Data de Adoção"
                      type="date"
                      value={selectedPet?.adoptionDate || ''}
                      onChange={(v: string) => setSelectedPet(prev => ({ ...prev, adoptionDate: v } as any))}
                      icon={Calendar}
                    />

                    <div className="flex flex-col gap-1.5 pb-8">
                      <label className="text-sm font-medium text-gray-600 ml-1">Observações Importantes</label>
                      <textarea
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all min-h-[100px]"
                        placeholder="Alergias, temperamento, recompensa..."
                        value={selectedPet?.observations || ''}
                        onChange={(e) => setSelectedPet(prev => ({ ...prev, observations: e.target.value } as any))}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={handleSavePet}
                      className="w-full py-4"
                      loading={loading}
                    >
                      Salvar Perfil
                    </Button>
                    {selectedPet && (
                      <button
                        onClick={async () => {
                          if (window.confirm('Tem certeza que deseja excluir este pet?')) {
                            setLoading(true);
                            try {
                              // In a real app we'd use deleteDoc, but for this demo we'll just remove it from state if needed
                              // Actually let's implement real delete
                              await supabase.from('pets').update({ deleted: true }).eq('id', selectedPet.id);
                              setView('dashboard');
                              setSelectedPet(null);
                            } catch (err) {
                              setError('Erro ao excluir pet.');
                            } finally {
                              setLoading(false);
                            }
                          }
                        }}
                        className="text-red-500 text-sm font-bold hover:underline"
                      >
                        Excluir Pet
                      </button>
                    )}
                  </div>
                  <div className="h-20" /> {/* Spacer to avoid bottom nav overlap */}
                </div>
              </motion.div>
            )}

            {/* Finder Page (Public) */}
            {view === 'finder' && finderPet && (
              <motion.div
                key="finder"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8 py-4"
              >
                <div className="bg-white rounded-[40px] overflow-hidden shadow-2xl shadow-orange-100 border border-orange-50">
                  <div className="h-64 bg-orange-500 relative group cursor-pointer" onClick={() => setLightboxImage(finderPet.photoUrl)}>
                    {finderPet.photoUrl ? (
                      <img src={finderPet.photoUrl} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Dog className="w-24 h-24 text-white/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
                  </div>

                  <div className="px-8 pb-8 -mt-12 relative text-center">
                    <div className="bg-white inline-block px-6 py-2 rounded-full shadow-lg mb-4 border border-gray-50 relative">
                      <h1 className="text-3xl font-black text-gray-900">{finderPet.name}</h1>
                      {finderPet.phoneVerified && (
                        <div className="absolute -top-2 -right-2 bg-green-500 text-white p-1 rounded-full shadow-lg border-2 border-white">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {finderPet && lostAlerts.some(a => a.petId === finderPet.id) && (
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="bg-red-600 p-4 rounded-3xl mb-6 shadow-xl shadow-red-200"
                      >
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <AlertCircle className="w-5 h-5 text-white animate-pulse" />
                          <span className="text-white font-black text-sm uppercase tracking-wider">Atenção: Pet Perdido!</span>
                        </div>
                        <p className="text-white text-sm font-bold">
                          Ajude o {finderPet.name} a voltar para casa!
                        </p>
                      </motion.div>
                    )}

                    {/* Finder Gallery */}
                    {finderPet.gallery && finderPet.gallery.length > 0 && (
                      <div className="flex gap-3 overflow-x-auto pb-4 px-2 no-scrollbar snap-x">
                        {finderPet.gallery.map((photo, idx) => (
                          <div
                            key={idx}
                            className="w-20 h-20 shrink-0 rounded-2xl bg-gray-100 overflow-hidden shadow-sm snap-center cursor-pointer active:scale-95 transition-transform"
                            onClick={() => setLightboxImage(photo)}
                          >
                            <img src={photo} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-orange-600 font-bold uppercase tracking-widest text-xs mb-3">
                      {finderPet.breed || 'Pet Encontrado'}
                    </p>
                    
                    {finderPet.ownerName && (
                      <div className="bg-orange-50/50 rounded-2xl p-3 mb-6 inline-flex items-center justify-center gap-2 border border-orange-100">
                        <UserIcon className="w-4 h-4 text-orange-500" />
                        <span className="text-orange-900 text-xs font-bold uppercase tracking-wide">Dono(a): {finderPet.ownerName}</span>
                      </div>
                    )}

                    <div className="bg-gray-50 rounded-3xl p-6 text-left space-y-4 mb-8">
                      <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-4">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Sexo</p>
                          <p className="text-sm font-bold">{finderPet.gender || 'Não informado'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Cor Predominante</p>
                          <p className="text-sm font-bold">{finderPet.color || 'Não informada'}</p>
                        </div>
                        {finderPet.size && (
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Porte</p>
                            <p className="text-sm font-bold">{finderPet.size}</p>
                          </div>
                        )}
                        {finderPet.privacySettings?.showAgeAndWeight !== false && finderPet.birthday && (
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Aniversário</p>
                            <p className="text-sm font-bold">{new Date(finderPet.birthday).toLocaleDateString('pt-BR')}</p>
                          </div>
                        )}
                        {finderPet.privacySettings?.showAgeAndWeight !== false && finderPet.weight && (
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Peso</p>
                            <p className="text-sm font-bold">{finderPet.weight} kg</p>
                          </div>
                        )}
                        {finderPet.adoptionDate && (
                          <div className="col-span-2">
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Data de Adoção</p>
                            <p className="text-sm font-bold">{new Date(finderPet.adoptionDate).toLocaleDateString('pt-BR')}</p>
                          </div>
                        )}
                      </div>

                      {finderPet.privacySettings?.showAddress !== false ? (
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-orange-500 mt-1 shrink-0" />
                          <div>
                            <h4 className="font-bold text-sm">Endereço de Devolução</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">
                              {finderPet.ownerAddress || 'Não informado'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3 opacity-60">
                          <MapPin className="w-5 h-5 text-gray-400 mt-1 shrink-0" />
                          <div>
                            <h4 className="font-bold text-sm text-gray-500">Endereço Oculto</h4>
                            <p className="text-gray-400 text-xs mt-1">
                              O dono ativou o modo privado para este campo.
                            </p>
                          </div>
                        </div>
                      )}

                      {finderPet.privacySettings?.showObservations !== false && finderPet.observations && (
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-orange-500 mt-1 shrink-0" />
                          <div>
                            <h4 className="font-bold text-sm">Observações</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">
                              {finderPet.observations}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {finderPet.privacySettings?.showPhone !== false ? (
                        finderPet.ownerPhone ? (
                          <>
                            <Button
                              onClick={() => window.open(`https://wa.me/55${finderPet.ownerPhone!.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Encontrei seu pet ${finderPet.name}.`)}`, '_blank')}
                              className="w-full py-5 text-lg bg-green-500 hover:bg-green-600 shadow-green-200"
                            >
                              <MessageCircle className="w-6 h-6" /> Falar com o Dono
                            </Button>
                            <Button
                              onClick={sendLocation}
                              variant="outline"
                              className="w-full py-5 text-lg"
                            >
                              <MapPin className="w-6 h-6" /> Enviar Minha Localização
                            </Button>
                          </>
                        ) : (
                          <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-center">
                            <p className="text-sm text-red-600 font-bold">Telefone de contato não disponível.</p>
                          </div>
                        )
                      ) : (
                        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-center">
                          <p className="text-sm text-orange-600 font-bold">O dono optou por ocultar o número de telefone.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-2 opacity-50">
                  <p className="text-xs font-bold uppercase tracking-widest">Plataforma FocinhoApp</p>
                  <p className="text-[10px]">Ajudando pets a voltarem para casa.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Add Post Modal */}
          <AnimatePresence>
            {isAddingPost && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4"
                onClick={() => setIsAddingPost(false)}
              >
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-orange-50/50">
                    <h3 className="font-black text-gray-900 uppercase tracking-tight">Nova Postagem</h3>
                    <button
                      onClick={() => setIsAddingPost(false)}
                      className="p-2 hover:bg-white rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Image Upload */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Foto do Pet</label>
                      <div
                        onClick={() => document.getElementById('post-photo')?.click()}
                        className="aspect-video bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-all overflow-hidden group"
                      >
                        {newPost.imageUrl ? (
                          <img src={newPost.imageUrl} className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                              <Plus className="w-6 h-6 text-orange-500" />
                            </div>
                            <span className="text-xs font-bold text-gray-400">Clique para adicionar foto</span>
                          </>
                        )}
                        <input
                          id="post-photo"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setNewPost(prev => ({ ...prev, imageUrl: reader.result as string }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Legenda</label>
                      <textarea
                        value={newPost.content}
                        onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="O que seu pet está aprontando hoje?"
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all min-h-[120px] text-sm"
                      />
                    </div>

                    {/* Pet Selection */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Com qual Pet?</label>
                      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {userPets.map(pet => (
                          <button
                            key={pet.id}
                            onClick={() => setNewPost(prev => ({ ...prev, petId: pet.id, petName: pet.name }))}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all shrink-0 ${newPost.petId === pet.id ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-100' : 'bg-white border-gray-100 text-gray-600 hover:border-orange-200'}`}
                          >
                            <div className="w-6 h-6 rounded-full bg-gray-100 overflow-hidden border border-white/20">
                              {pet.photoUrl ? (
                                <img src={pet.photoUrl} className="w-full h-full object-cover" />
                              ) : (
                                <Dog className="w-4 h-4 m-1" />
                              )}
                            </div>
                            <span className="text-xs font-bold">{pet.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={handleCreatePost}
                      className="w-full py-4 shadow-xl shadow-orange-100"
                      loading={loading}
                      disabled={!newPost.content && !newPost.imageUrl}
                    >
                      Publicar na Timeline
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Mobile Nav */}
        {user && view !== 'finder' && (
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-3 flex justify-around items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <button
              onClick={() => setView('dashboard')}
              className={`flex flex-col items-center gap-1 transition-colors flex-1 min-h-[44px] justify-center ${view === 'dashboard' ? 'text-orange-500' : 'text-gray-300'}`}
            >
              <Home className="w-7 h-7" />
              <span translate="no" className="text-[11px] font-bold uppercase">Início</span>
            </button>

            <button
              onClick={() => setView('reminders')}
              className={`flex flex-col items-center gap-1 transition-colors flex-1 min-h-[44px] justify-center ${view === 'reminders' ? 'text-orange-500' : 'text-gray-300'}`}
            >
              <Bell className="w-7 h-7" />
              <span className="text-[11px] font-bold uppercase">Lembretes</span>
            </button>

            <button
              onClick={() => setView('walk')}
              className="flex flex-col items-center -mt-12 flex-1 min-h-[44px] justify-center"
            >
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-200 border-4 border-white active:scale-90 transition-transform">
                <PawPrint className="w-8 h-8 text-white" />
              </div>
              <span className="text-[11px] font-bold uppercase text-orange-500 mt-1">Passeio</span>
            </button>

            <button
              onClick={() => {
                setView('lost_pets');
                setHasNewUnreadSOS(false);
              }}
              className={`flex flex-col items-center gap-1 transition-colors flex-1 min-h-[44px] justify-center relative ${view === 'lost_pets' ? 'text-orange-500' : 'text-gray-300'}`}
            >
              <Megaphone className={`w-7 h-7 ${hasNewUnreadSOS && view !== 'lost_pets' ? 'text-red-500 animate-pulse' : ''}`} />
              <span className="text-[11px] font-bold uppercase">Animal Perdido</span>
              {hasNewUnreadSOS && view !== 'lost_pets' && (
                <span className="absolute top-1 right-1/2 translate-x-4 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-bounce" />
              )}
            </button>

            <button
              onClick={() => {
                setView('account');
                setAccountSubView('menu');
              }}
              className={`flex flex-col items-center gap-1 transition-colors flex-1 min-h-[44px] justify-center ${view === 'account' ? 'text-orange-500' : 'text-gray-300'}`}
            >
              <UserIcon className="w-7 h-7" />
              <span className="text-[11px] font-bold uppercase">Conta</span>
            </button>
          </nav>
        )}

        {/* Lightbox */}
        <AnimatePresence>
          {lightboxImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/95 z-[200] flex flex-col items-center justify-center p-4"
              onClick={() => setLightboxImage(null)}
            >
              <button
                className="absolute top-8 right-8 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
                onClick={() => setLightboxImage(null)}
              >
                <X className="w-6 h-6" />
              </button>
              <motion.img
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={lightboxImage}
                className="max-w-full max-h-[80vh] rounded-3xl shadow-2xl object-contain"
                onClick={(e) => e.stopPropagation()}
              />
              <p className="text-white/50 text-sm mt-6 font-medium">Toque fora para fechar</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notification Toast */}
        <AnimatePresence>
          {activeNotification && (
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 20, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="fixed top-0 left-0 right-0 z-[200] flex justify-center px-6 pointer-events-none"
            >
              <div className="bg-white rounded-3xl p-4 shadow-2xl border border-orange-100 flex items-center gap-4 max-w-md w-full pointer-events-auto">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center shrink-0">
                  <Bell className="w-6 h-6 text-orange-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-gray-800">{activeNotification.title}</h4>
                  <p className="text-xs text-gray-500">{activeNotification.message}</p>
                </div>
                <button
                  onClick={() => setActiveNotification(null)}
                  className="p-2 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Toast */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-24 left-6 right-6 bg-red-500 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between z-[100]"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-medium">{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-white/50 hover:text-white">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Fireworks Overlay */}
        <AnimatePresence>
          {fireworksActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] pointer-events-none overflow-hidden"
            >
              {/* Celebration message */}
              <motion.div
                initial={{ y: -80, opacity: 0, scale: 0.8 }}
                animate={{ y: 40, opacity: 1, scale: 1 }}
                exit={{ y: -80, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="flex justify-center"
              >
                <div className="bg-white rounded-3xl px-8 py-5 shadow-2xl border border-pink-100 flex flex-col items-center gap-2">
                  <span className="text-4xl">🎉</span>
                  <p className="font-black text-lg text-gray-800">Adoção realizada!</p>
                  {lastAdoptedPetName && <p className="text-pink-500 font-bold text-sm">{lastAdoptedPetName} encontrou um lar! 🐾</p>}
                </div>
              </motion.div>
              {/* Confetti particles */}
              {Array.from({ length: 40 }).map((_, i) => {
                const colors = ['#f472b6', '#fb923c', '#a78bfa', '#34d399', '#fbbf24', '#60a5fa'];
                const color = colors[i % colors.length];
                const size = 8 + Math.random() * 12;
                const startX = Math.random() * 100;
                const delay = Math.random() * 1.5;
                const duration = 2 + Math.random() * 2;
                const rotate = Math.random() * 720 - 360;
                return (
                  <motion.div
                    key={i}
                    initial={{ x: `${startX}vw`, y: -20, opacity: 1, rotate: 0, scale: 1 }}
                    animate={{ y: '110vh', rotate, opacity: [1, 1, 0], scale: [1, 1, 0.5] }}
                    transition={{ duration, delay, ease: 'easeIn' }}
                    style={{
                      position: 'absolute',
                      width: size,
                      height: size,
                      borderRadius: i % 3 === 0 ? '50%' : '2px',
                      backgroundColor: color,
                    }}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </ErrorBoundary>
  );
}
