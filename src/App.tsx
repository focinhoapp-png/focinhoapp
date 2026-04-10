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
  Briefcase,
  Navigation,
  Globe,
  Users,
  Copy,
  Info,
  FileText,
  Cake,
  Smartphone,
  MoreVertical,
  Clock,
  DollarSign,
  Star,
  AtSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toPng } from 'html-to-image';
import { supabase } from './supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import QRScanner from './components/QRScanner';
import { ImageCropperModal } from './components/ImageCropperModal';
import { PhoneInputWithDDI } from './components/PhoneInputWithDDI';
import { BannerCarousel } from './components/BannerCarousel';
import { EventCarousel } from './components/EventCarousel';
import { MyEventsCarousel } from './components/MyEventsCarousel';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

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
  username?: string;
  bio?: string;
  photoUrl?: string;
  gender?: string;
  birthday?: string;
  phone?: string;
  state?: string;
  city?: string;
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
  city?: string;
  state?: string;
  address?: string;
  status: 'available' | 'adopted';
  createdAt: any;
  ownerId?: string;
  ownerName?: string;
  ownerUsername?: string;
  ownerPhotoUrl?: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
}

interface LostAlert {
  id: string;
  petId: string;
  ownerId: string;
  petName: string;
  petPhoto: string;
  ownerName?: string;
  ownerUsername?: string;
  ownerPhotoUrl?: string;
  city: string;
  lastSeen: string;
  reward?: string;
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

interface PetEvent {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  event_date?: string;
  location?: string;
  created_at: any;
}

export interface PromoEvent {
  id: string;
  title?: string;
  image_url: string;
  link_url: string;
  expires_at: string;
  created_at?: any;
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
    primary: 'clay-btn-primary border-none',
    secondary: 'clay-btn-secondary border-none',
    outline: 'bg-transparent border-2 border-orange-500 text-orange-500 hover:bg-orange-50',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200 border-none transition-transform active:scale-95',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-6 py-4 font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base rounded-[24px] ${variants[variant]} ${className}`}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : children}
    </button>
  );
};

const Input = ({ label, value, onChange, placeholder, type = 'text', icon: Icon }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full clay-input outline-none py-4 ${Icon ? 'pl-12' : 'px-4'} pr-4 text-base`}
      />
    </div>
  </div>
);

const DOG_BREEDS = ['Vira-lata (SRD)', 'Golden Retriever', 'Labrador', 'Poodle', 'Bulldog', 'Beagle', 'Pug', 'Shih Tzu', 'Rottweiler', 'Pastor Alemão', 'Yorkshire', 'Pinscher', 'Dachshund', 'Chihuahua', 'Pitbull', 'Outro'];
const CAT_BREEDS = ['Vira-lata (SRD)', 'Persa', 'Siamês', 'Maine Coon', 'Angorá', 'Bengal', 'Ragdoll', 'Sphynx', 'Munchkin', 'Outro'];
const COLORS = ['Branco', 'Preto', 'Marrom', 'Cinza', 'Dourado', 'Creme', 'Malhado', 'Caramelo', 'Chocolate', 'Cinza Azulado', 'Outro'];

const PARTNER_CATEGORIES = ['Todos', 'Pet Shops', 'Clínicas Veterinárias', 'ONGs', 'Adestradores', 'Hotéis para Pets', 'Casas de Ração', 'Marcas Pet'];

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const Select = ({ label, value, onChange, options, icon: Icon }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full clay-input outline-none py-4 ${Icon ? 'pl-12' : 'px-4'} pr-10 appearance-none text-base`}
      >
        <option value="">Selecione...</option>
        {options.map((opt: any) => {
          const isObj = typeof opt === 'object';
          const val = isObj ? opt.value : opt;
          const lab = isObj ? opt.label : opt;
          return <option key={val} value={val} translate="no">{lab}</option>;
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
      {label && <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>}
      <div className="relative flex items-center">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full clay-input outline-none py-4 ${Icon ? 'pl-12' : 'px-4'} pr-16 text-base`}
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

// --- Helper Functions for Pet Dates ---
const parsePetDate = (dateStr: string) => {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

const getDaysTogether = (pet: PetProfile) => {
  // Try adoptionDate first, then birthday, then fallback to createdAt
  const startDateStr = pet.adoptionDate || pet.birthday || pet.createdAt;
  const startDate = parsePetDate(startDateStr);
  if (!startDate) return null;
  const now = new Date();
  
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  
  const formatter = new Intl.DateTimeFormat('pt-BR', { year: 'numeric', month: 'short', day: 'numeric' });
  return { days: diffDays, dateStr: formatter.format(startDate) };
};

const getDaysUntilBirthday = (birthdayStr?: string) => {
  const birthday = parsePetDate(birthdayStr || '');
  if (!birthday) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let nextBday = new Date(now.getFullYear(), birthday.getMonth(), birthday.getDate());
  
  if (today.getTime() > nextBday.getTime()) {
    nextBday.setFullYear(now.getFullYear() + 1);
  }
  
  const diffTime = nextBday.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const formatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  return { days: diffDays, dateStr: formatter.format(nextBday) };
};

const calculatePetAge = (birthdayStr?: string) => {
  if (!birthdayStr) return '';
  const birthday = parsePetDate(birthdayStr);
  if (!birthday) return '';
  const today = new Date();
  
  let years = today.getFullYear() - birthday.getFullYear();
  let months = today.getMonth() - birthday.getMonth();
  
  if (today.getDate() < birthday.getDate()) {
    months--;
  }
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  const yearStr = years > 0 ? `${years} ano(s)` : '';
  const monthStr = months > 0 ? `${months} mês(es)` : '';
  
  if (yearStr && monthStr) return `${yearStr}, ${monthStr} de idade`;
  if (yearStr) return `${yearStr} de idade`;
  if (monthStr) return `${monthStr} de idade`;
  return 'Menos de 1 mês de idade';
};

// --- Reusable State→City Picker ---
const BRAZIL_STATES = [
  { sigla: 'AC', nome: 'Acre' }, { sigla: 'AL', nome: 'Alagoas' }, { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' }, { sigla: 'BA', nome: 'Bahia' }, { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' }, { sigla: 'ES', nome: 'Espírito Santo' }, { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' }, { sigla: 'MT', nome: 'Mato Grosso' }, { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' }, { sigla: 'PA', nome: 'Pará' }, { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' }, { sigla: 'PE', nome: 'Pernambuco' }, { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' }, { sigla: 'RN', nome: 'Rio Grande do Norte' }, { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' }, { sigla: 'RR', nome: 'Roraima' }, { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' }, { sigla: 'SE', nome: 'Sergipe' }, { sigla: 'TO', nome: 'Tocantins' },
];

function CityStatePicker({ state, city, onStateChange, onCityChange, label = 'Localização' }: {
  state: string; city: string;
  onStateChange: (s: string) => void;
  onCityChange: (c: string) => void;
  label?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<'state' | 'city'>('state');
  const [selState, setSelState] = React.useState<{ sigla: string; nome: string } | null>(null);
  const [cities, setCities] = React.useState<string[]>([]);
  const [citySearch, setCitySearch] = React.useState('');
  const [stateSearch, setStateSearch] = React.useState('');
  const [loadingCities, setLoadingCities] = React.useState(false);

  const displayValue = state && city ? `${city} - ${state}` : state ? state : '';

  const reset = () => { setStep('state'); setSelState(null); setCities([]); setCitySearch(''); setStateSearch(''); };

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-600 ml-1">{label}</label>
        <button
          type="button"
          onClick={() => { setOpen(true); reset(); }}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl hover:border-orange-400 transition-all text-left"
        >
          <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
          <span className={`flex-1 text-sm font-medium ${displayValue ? 'text-gray-800' : 'text-gray-400'}`}>
            {displayValue || 'Selecionar Estado / Cidade'}
          </span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setOpen(false); reset(); }} />
          <div className="relative bg-white w-full max-w-lg rounded-t-[3rem] p-6 shadow-2xl z-10 flex flex-col" style={{ maxHeight: '85vh' }}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              {step === 'city' && (
                <button onClick={() => { setStep('state'); setSelState(null); setCities([]); setCitySearch(''); }} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-black text-gray-900">{step === 'state' ? 'Selecionar Estado' : selState?.nome}</h3>
                <p className="text-xs text-gray-400 font-medium mt-0.5">{step === 'state' ? 'Escolha o estado primeiro' : 'Agora escolha a cidade'}</p>
              </div>
              <button onClick={() => { setOpen(false); reset(); }} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
              <input
                type="text"
                placeholder={step === 'state' ? 'Buscar estado...' : 'Buscar cidade...'}
                value={step === 'state' ? stateSearch : citySearch}
                onChange={e => step === 'state' ? setStateSearch(e.target.value) : setCitySearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:outline-none focus:border-orange-400 transition-all"
                autoFocus
              />
            </div>

            {/* States */}
            {step === 'state' && (
              <div className="overflow-y-auto flex-1 space-y-1 pr-1">
                {BRAZIL_STATES.filter(s => s.nome.toLowerCase().includes(stateSearch.toLowerCase()) || s.sigla.toLowerCase().includes(stateSearch.toLowerCase())).map(s => (
                  <button key={s.sigla} onClick={async () => {
                    setSelState(s); setStep('city'); setCitySearch(''); setLoadingCities(true);
                    try {
                      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${s.sigla}/municipios?orderBy=nome`);
                      const data = await res.json();
                      setCities(data.map((m: { nome: string }) => m.nome));
                    } catch { setCities([]); } finally { setLoadingCities(false); }
                  }} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-orange-50 border border-transparent hover:border-orange-200 transition-all text-left active:scale-[0.98]">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 bg-orange-50 text-orange-600 font-black text-xs rounded-xl flex items-center justify-center shrink-0">{s.sigla}</span>
                      <span className="font-bold text-gray-800 text-sm">{s.nome}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </button>
                ))}
              </div>
            )}

            {/* Cities */}
            {step === 'city' && (
              <div className="overflow-y-auto flex-1 pr-1">
                {loadingCities ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                    <p className="text-sm text-gray-400 font-medium">Carregando cidades...</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {cities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase())).map(c => (
                      <button key={c} onClick={() => {
                        onStateChange(selState!.sigla);
                        onCityChange(c);
                        setOpen(false); reset();
                      }} className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left active:scale-[0.98] ${
                        state === selState?.sigla && city === c ? 'bg-orange-50 border-orange-300' : 'border-transparent hover:bg-orange-50 hover:border-orange-200'
                      }`}>
                        <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
                        <span className="font-bold text-gray-800 text-sm">{c}</span>
                        {state === selState?.sigla && city === c && <span className="ml-auto text-orange-500 text-xs font-black">✓</span>}
                      </button>
                    ))}
                    {cities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase())).length === 0 && (
                      <div className="text-center py-8"><p className="text-gray-400 text-sm">Nenhuma cidade encontrada.</p></div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// --- SOS Alert Card (Instagram-style) ---

function SOSAlertCard({ alert, user, onEdit, onFound, onShare, onOpenFinder }: {
  key?: string;
  alert: LostAlert;
  user: any;
  onEdit: () => void;
  onFound: () => void | Promise<void>;
  onShare: () => void | Promise<void>;
  onOpenFinder?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const mainImage = alert.petPhoto || null;

  return (
    <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            {alert.ownerPhotoUrl ? (
              <img src={alert.ownerPhotoUrl} alt="Tutor" className="w-10 h-10 rounded-full object-cover border border-gray-100" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
                <UserIcon className="w-5 h-5 text-red-300" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1 border-2 border-white">
              <AlertCircle className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          <div>
            <p className="text-[14px] text-gray-900 leading-tight">
              <span className="font-bold">{alert.ownerUsername || alert.ownerName || 'Tutor do Pet'}</span> procurando por{' '}
              {onOpenFinder ? (
                <button onClick={onOpenFinder} className="font-bold text-orange-600 hover:underline">
                  {alert.petName}
                </button>
              ) : (
                <span className="font-bold">{alert.petName}</span>
              )}
            </p>
            <p className="text-[12px] text-gray-500 font-medium leading-tight mt-0.5">
               {alert.city || 'Localização não informada'}
            </p>
          </div>
        </div>

        {/* 3-dot menu — only for owner */}
        {user && alert.ownerId === user.id && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-gray-500" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-10 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 overflow-hidden min-w-[160px]">
                  <button
                    onClick={() => { setMenuOpen(false); onEdit(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-sm font-bold text-gray-700"
                  >
                    <Edit2 className="w-4 h-4 text-orange-500" /> Editar
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onFound(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors text-sm font-bold text-green-600 border-t border-gray-50"
                  >
                    <ShieldCheck className="w-4 h-4" /> Encontrado!
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Caption ── */}
      <div className="px-4 pb-3 space-y-1">
        <p className="text-sm text-gray-800 font-medium leading-relaxed">
          Visto por último em: <span className="text-gray-600">{alert.lastSeen}</span>
        </p>
        {alert.reward && (
          <p className="text-xs text-orange-500 font-bold">🏆 Recompensa: {alert.reward}</p>
        )}
      </div>

      {/* ── Full-width photo ── */}
      <div className="w-full aspect-square bg-gray-100 relative">
        {mainImage ? (
          <img src={mainImage} alt={alert.petName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-red-50 flex flex-col items-center justify-center gap-3">
            <Dog className="w-20 h-20 text-red-200" />
            <p className="text-red-300 text-xs font-bold uppercase tracking-wider">Sem foto</p>
          </div>
        )}
        <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase shadow-lg animate-pulse flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-white rounded-full inline-block" />
          Desaparecido
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div className="flex flex-wrap items-center gap-4 px-4 pt-3 pb-3">
        <button
          onClick={onFound}
          className="flex items-center gap-1.5 text-green-600 font-bold text-sm hover:text-green-700 transition-colors"
        >
          <CheckCircle2 className="w-6 h-6" />
          Encontrado
        </button>
        <button
          onClick={onShare}
          className="flex items-center gap-1.5 text-gray-500 font-bold text-sm hover:text-gray-700 transition-colors"
        >
          <Share2 className="w-5 h-5" />
          Compartilhar
        </button>
        <button
          onClick={() => {
            const phone = (alert.contactPhone || '').replace(/\D/g, '');
            if (!phone) { window.alert('Este alerta não possui telefone de contato.'); return; }
            window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(`Olá! Queria falar sobre o alerta do animal perdido: ${alert.petName}`)}`, '_blank');
          }}
          className="ml-auto flex items-center gap-1.5 text-gray-500 font-bold text-sm hover:text-gray-700 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          Contato
        </button>
      </div>
      <div className="px-4 pb-4">
        <p className="text-[11px] text-gray-400 font-medium">
          {new Date(alert.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
        </p>
      </div>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  // Tracks the previous user ID so we only change the view on REAL auth changes
  // (login/logout), ignoring token refreshes and tab-focus session recoveries
  const lastUserIdRef = useRef<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(() => localStorage.getItem('focinho_pending_tag') ? 'profile' : 'dashboard'); // home, dashboard, reminders, walk, lost_pets, account, activate, profile, finder
  const [userCity, setUserCity] = useState<string>('');          // GPS auto-detected city (City - State)
  const [selectedCity, setSelectedCity] = useState<string>(() => localStorage.getItem('focinho_selected_city') || ''); // user-selected city for filtering
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [cityInputTemp, setCityInputTemp] = useState('');
  const [pickerStep, setPickerStep] = useState<'state' | 'city'>('state');
  const [pickerSelectedState, setPickerSelectedState] = useState<{sigla: string, nome: string} | null>(null);
  const [pickerCities, setPickerCities] = useState<string[]>([]);
  const [pickerCitySearch, setPickerCitySearch] = useState('');
  const [pickerStateSearch, setPickerStateSearch] = useState('');
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [accountSubView, setAccountSubView] = useState('menu'); // menu, profile, pets, support, store, admin, partners
  const [activePartnerFilter, setActivePartnerFilter] = useState('Todos');
  const [selectedPet, setSelectedPet] = useState<PetProfile | null>(() => {
    const pendingTag = localStorage.getItem('focinho_pending_tag');
    return pendingTag ? ({ tagId: pendingTag } as any) : null;
  });
  const [pendingGuestPet, setPendingGuestPet] = useState<Partial<PetProfile> | null>(null);
  const [userPets, setUserPets] = useState<PetProfile[]>([]);
  const [isFetchingUserPets, setIsFetchingUserPets] = useState(true);
  const [allPets, setAllPets] = useState<PetProfile[]>([]); // Admin only
  const [isFetchingAllPets, setIsFetchingAllPets] = useState(false); // Admin only
  const [allTags, setAllTags] = useState<any[]>([]); // Admin only
  const [isFetchingAllTags, setIsFetchingAllTags] = useState(false); // Admin only
  const [amountToGenerate, setAmountToGenerate] = useState(10); // Admin only
  const [adminTagsPage, setAdminTagsPage] = useState(1); // Admin only
  const [adminPetsPage, setAdminPetsPage] = useState(1); // Admin only
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set()); // Admin QR selection
  const [tagIdToActivate, setTagIdToActivate] = useState(() => localStorage.getItem('focinho_pending_tag') || '');
  const [finderPet, setFinderPet] = useState<PetProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Admin Banners
  const [adminBanners, setAdminBanners] = useState<any[]>([]);
  const [adminBannersPage, setAdminBannersPage] = useState(1);
  const [bannerForm, setBannerForm] = useState<{ image_url: string, link_url: string, expires_at: string, file: File | null }>({ image_url: '', link_url: '', expires_at: '', file: null });
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [adoptionTab, setAdoptionTab] = useState<'available'|'adopted'>('available');
  const [adoptionFocusPet, setAdoptionFocusPet] = useState<string | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null);
  const [isFetchingOwnerProfile, setIsFetchingOwnerProfile] = useState(true);
  const [currentPetIndex, setCurrentPetIndex] = useState(0);

  // SOS State
  const [lostAlerts, setLostAlerts] = useState<LostAlert[]>([]);
  const [isAddingSOS, setIsAddingSOS] = useState(false);
  const [editingSOSId, setEditingSOSId] = useState<string | null>(null);
  const [newSOS, setNewSOS] = useState({ petId: '', city: '', lastSeen: '', reward: '' });
  const [hasNewUnreadSOS, setHasNewUnreadSOS] = useState(false);
  const lastLostAlertsCount = useRef(0);

  // Partners State
  const [partners, setPartners] = useState<Partner[]>([]); // DB Partners
  const [partnerForm, setPartnerForm] = useState<Partial<Partner>>({ id: '', name: '', category: 'Pet Shops', description: '', location: '', logo: '', url: '' }); // Admin
  const [partnerMessage, setPartnerMessage] = useState<string | null>(null); // Admin

  // Events State
  const [petEvents, setPetEvents] = useState<PetEvent[]>([]);
  const [eventForm, setEventForm] = useState<Partial<PetEvent>>({ id: '', title: '', description: '', imageUrl: '', event_date: '', location: '' });
  const [eventMessage, setEventMessage] = useState<string | null>(null);

  // Promo Events State (Admin)
  const [promoEvents, setPromoEvents] = useState<PromoEvent[]>([]);
  const [promoEventForm, setPromoEventForm] = useState<Partial<PromoEvent>>({ id: '', title: '', image_url: '', link_url: '', expires_at: '' });
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  // Tag editing state (admin)
  const [editingTag, setEditingTag] = useState<{ id: string; newId: string } | null>(null);
  const [tagVerifiedSuccess, setTagVerifiedSuccess] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
    name: '', animalType: 'Cachorro', breed: '', color: '', gender: 'Macho', description: '', photoUrl: '', contactPhone: '', status: 'available', state: '', city: '', address: ''
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
  const [selectedWalkPets, setSelectedWalkPets] = useState<string[]>([]);
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
  const [authName, setAuthName] = useState('');
  const [authDDI, setAuthDDI] = useState('+55');
  const [authPhone, setAuthPhone] = useState('');
  const [authState, setAuthState] = useState('');
  const [authCity, setAuthCity] = useState('');
  const [authAddress, setAuthAddress] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // OTP state (email verification on register)
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0); // seconds until resend allowed

  // Family State
  const [userFamilies, setUserFamilies] = useState<any[]>([]);
  const [familyMembersInfo, setFamilyMembersInfo] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [creatingFamily, setCreatingFamily] = useState(false);
  const [joiningFamily, setJoiningFamily] = useState(false);

  const [showScanner, setShowScanner] = useState(false);

  const [cropModalConfig, setCropModalConfig] = useState({
    isOpen: false,
    imageSrc: null as string | null,
    aspectRatio: 1,
    circularCrop: false,
    onConfirm: (blob: Blob) => {},
  });

  const requestCrop = (file: File, aspectRatio = 1, circularCrop = false): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result && typeof e.target.result === 'string') {
          setCropModalConfig({
            isOpen: true,
            imageSrc: e.target.result,
            aspectRatio,
            circularCrop,
            onConfirm: (blob) => {
              resolve(blob);
              setCropModalConfig(prev => ({ ...prev, isOpen: false }));
            }
          });
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const processScannedTag = async (id: string) => {
    setLoading(true);
    const normalizedId = id.trim().toUpperCase();
    try {
      // 1. Try tags table first (case-insensitive)
      const { data: tagData } = await supabase.from('tags').select('*').ilike('id', normalizedId).limit(1).maybeSingle();
      let petId: string | null = tagData?.petId || null;

      // 2. Fallback: search pets table (case-insensitive)
      if (!petId) {
        const { data: petData } = await supabase.from('pets').select('id').ilike('tagId', normalizedId).limit(1).maybeSingle();
        if (petData) petId = petData.id;
      }

      if (petId) {
        const { data: petSnap } = await supabase.from('pets').select('*').eq('id', petId).limit(1).maybeSingle();
        if (petSnap) {
          const { data: ownerData } = await supabase.from('owners').select('*').eq('uid', petSnap.ownerId).maybeSingle();
          // Build merged object without mutating the readonly Supabase result
          const mergedPet: PetProfile = {
            ...petSnap,
            ownerPhone: ownerData?.phone || petSnap.ownerPhone || '',
            ownerAddress: ownerData?.address || petSnap.ownerAddress || '',
            ownerName: ownerData?.name || '',
            privacySettings: ownerData?.privacySettings
              ? { ...(petSnap.privacySettings || {}), ...ownerData.privacySettings }
              : petSnap.privacySettings,
          };

          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
              try {
                await supabase.from('scan_history').insert({
                  tag_id: normalizedId,
                  pet_id: petId,
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude
                });
              } catch(e) { console.error("Error saving scan location", e); }
            }, () => {
              supabase.from('scan_history').insert({ tag_id: normalizedId, pet_id: petId }).then();
            });
          } else {
             supabase.from('scan_history').insert({ tag_id: normalizedId, pet_id: petId }).then();
          }

          setFinderPet(mergedPet);
          setView('finder');
          setLoading(false);
          return;
        }
      }

      // Tag not associated with any pet yet — save tagId and redirect to install tutorial
      localStorage.setItem('focinho_pending_tag', normalizedId);
      window.location.href = '/?install=true';
    } catch (err) {
      console.error('Error processing scanned tag:', err);
      alert('Erro ao processar o QR Code. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const openPetFinderById = async (petId: string) => {
    setLoading(true);
    try {
      const { data: petSnap } = await supabase.from('pets').select('*').eq('id', petId).limit(1).maybeSingle();
      if (petSnap) {
        const { data: ownerData } = await supabase.from('owners').select('*').eq('uid', petSnap.ownerId).maybeSingle();
        const mergedPet: PetProfile = {
          ...petSnap,
          ownerPhone: ownerData?.phone || petSnap.ownerPhone || '',
          ownerAddress: ownerData?.address || petSnap.ownerAddress || '',
          ownerName: ownerData?.name || '',
          privacySettings: ownerData?.privacySettings
            ? { ...(petSnap.privacySettings || {}), ...ownerData.privacySettings }
            : petSnap.privacySettings,
        };
        setFinderPet(mergedPet);
        setView('finder');
      }
    } catch (err) {
      console.error('Error opening pet finder:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (data: string) => {
    let tagId = data;
    try {
      const url = new URL(data);
      tagId = url.searchParams.get('tag') || url.searchParams.get('p') || data;
    } catch (e) {
      // ignore
    }
    
    const finalTagId = tagId.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
    if (finalTagId) {
      processScannedTag(finalTagId);
    }
  };

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
    const tag = tagParam ? tagParam.trim().toUpperCase() : null;

    const installParam = params.get('install');
    const loginParam = params.get('login');

    if (installParam === '1' || installParam === 'true') {
      setView('install_pwa');
      setLoading(false);
      return;
    }

    // Vindo do tutorial de instalação: forçar tela de login
    if (loginParam === 'true') {
      setView('home');
    }

    // Local flag: once the tag flow determines the view, the auth handler must not override it
    let tagResolved = false;

    const checkTagStatus = async (id: string) => {
      setLoading(true);
      try {
        // 1. Try tags table first (case-insensitive)
        const { data: tagData } = await supabase.from('tags').select('*').ilike('id', id).limit(1).maybeSingle();
        let petId: string | null = tagData?.petId || null;

        // 2. Fallback: search pets table (case-insensitive)
        if (!petId) {
          const { data: petData } = await supabase.from('pets').select('id').ilike('tagId', id).limit(1).maybeSingle();
          if (petData) petId = petData.id;
        }

        if (petId) {
          const { data: petSnap } = await supabase.from('pets').select('*').eq('id', petId).limit(1).maybeSingle();
          if (petSnap) {
            const { data: ownerData } = await supabase.from('owners').select('*').eq('uid', petSnap.ownerId).maybeSingle();
            // Build merged object without mutating the readonly Supabase result
            const mergedPet: PetProfile = {
              ...petSnap,
              ownerPhone: ownerData?.phone || petSnap.ownerPhone || '',
              ownerAddress: ownerData?.address || petSnap.ownerAddress || '',
              ownerName: ownerData?.name || '',
              privacySettings: ownerData?.privacySettings
                ? { ...(petSnap.privacySettings || {}), ...ownerData.privacySettings }
                : petSnap.privacySettings,
            };
            tagResolved = true;
            setFinderPet(mergedPet as PetProfile);
            setView('finder');
            setLoading(false);
            return;
          }
        }

        // Tag not associated with any pet yet — save tagId and redirect to install tutorial
        tagResolved = true;
        localStorage.setItem('focinho_pending_tag', id);
        window.location.href = '/?install=true';
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
      setUser(u);

      // If a tag URL param exists or was resolved, the tag flow owns the view entirely — never override
      if (tag || tagResolved) return;

      if (u) {
        setView(currentView => {
          if (currentView === 'finder') return 'finder';
          if (currentView === 'activate') return 'activate';
          if (currentView === 'profile') return 'profile';
          if (currentView === 'install_pwa') return 'install_pwa';
          if (localStorage.getItem('focinho_pending_tag')) return 'profile';
          return 'dashboard';
        });
      } else {
        setView(currentView => {
          if (currentView === 'finder') return 'finder';
          if (currentView === 'activate') return 'activate';
          // Se vier de /?login=true, nunca preservar 'profile' — mostrar login
          if (currentView === 'profile' && loginParam !== 'true') return 'profile';
          if (currentView === 'install_pwa') return 'install_pwa';
          return 'home';
        });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Interceptar botão voltar do navegador quando usuário não logado está cadastrando pet com tag
  useEffect(() => {
    const isTagFlow = view === 'profile' && (
      !user || (!!localStorage.getItem('focinho_pending_tag') && !selectedPet?.id) || (!!selectedPet?.tagId && !selectedPet?.id)
    );
    if (!isTagFlow) return;

    // Push um estado extra para poder interceptar o "voltar"
    window.history.pushState({ focinhoBlock: true }, '');

    const handlePopState = (e: PopStateEvent) => {
      // Redirecionar de volta para o perfil (não deixar sair)
      window.history.pushState({ focinhoBlock: true }, '');
      setView('profile');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, tagIdToActivate, view, selectedPet]);

  // Processar pendingGuestPet se o usuário logar/registrar e houver pendência
  useEffect(() => {
    const processPendingPet = async () => {
      if (user && pendingGuestPet) {
        setLoading(true);
        try {
          const effectiveTagId = pendingGuestPet.tagId;
          if (effectiveTagId) {
            const { data: tagRow } = await supabase.from('tags').select('*').eq('id', effectiveTagId).maybeSingle();
            if (!tagRow) {
              await supabase.from('tags').insert({ id: effectiveTagId, activated: false, ownerId: null, petId: null });
            }
          }
          
          const petId = pendingGuestPet.id || generateId();
          const finalPetData = {
            ...pendingGuestPet,
            id: petId,
            ownerId: user.id,
            createdAt: new Date().toISOString(),
          };
          
          const { error } = await supabase.from('pets').upsert(finalPetData);
          if (error) throw error;
          
          if (effectiveTagId) {
            await supabase.from('tags').upsert({ id: effectiveTagId, activated: true, ownerId: user.id, petId: petId });
          }

          // Atualizar os pets em memória para refleti-los no dashboard
          const { data } = await supabase.from('pets').select('*').eq('ownerId', user.id).or('deleted.is.null,deleted.eq.false');
          setUserPets((data || []) as PetProfile[]);
          
          // Clear states
          localStorage.removeItem('focinho_pending_tag');
          setPendingGuestPet(null);
          setTagIdToActivate('');
          setView('dashboard');
          
          setTimeout(() => {
            alert('Parabéns! Conta criada, perfil do Pet salvo e Pingente ativado com sucesso!');
          }, 500);
          
        } catch (err) {
          console.error('Error saving pending guest pet:', err);
          setError('Erro ao salvar o Pet que estava pendente.');
        } finally {
          setLoading(false);
        }
      }
    };
    
    processPendingPet();
  }, [user, pendingGuestPet]);

  // Fetch User Pets
  useEffect(() => {
    if (!user) { setUserPets([]); setIsFetchingUserPets(false); return; }
    setIsFetchingUserPets(true);
    const fetchPets = async () => {
      try {
        // Always fetch own pets first (direct, reliable)
        const { data: ownPets, error: ownError } = await supabase
          .from('pets')
          .select('*')
          .eq('ownerId', user.id)
          .neq('deleted', true);

        if (ownError) console.error('Error fetching own pets:', ownError);

        let allPets: PetProfile[] = (ownPets || []) as PetProfile[];

        // Then fetch family pets (optional, extra)
        try {
          const { data: memberships } = await supabase.from('family_members').select('family_id').eq('user_id', user.id);
          if (memberships && memberships.length > 0) {
            const familyIds = memberships.map(m => m.family_id);
            const { data: allMembers } = await supabase.from('family_members').select('user_id').in('family_id', familyIds);
            if (allMembers) {
              const familyOwnerIds = Array.from(new Set(
                allMembers.map(m => m.user_id).filter(id => id !== user.id)
              ));
              if (familyOwnerIds.length > 0) {
                const { data: familyPets } = await supabase
                  .from('pets')
                  .select('*')
                  .in('ownerId', familyOwnerIds)
                  .neq('deleted', true);
                if (familyPets) {
                  allPets = [...allPets, ...(familyPets as PetProfile[])];
                }
              }
            }
          }
        } catch (familyErr) {
          console.warn('Could not fetch family pets (non-critical):', familyErr);
        }

        setUserPets(allPets);
      } catch (err) {
        console.error('Critical error fetching pets:', err);
        setUserPets([]);
      } finally {
        setIsFetchingUserPets(false);
      }
    };
    fetchPets();
    // Subscrbe to pet changes (without filter to catch family pets, or keep simple)
    const channel = supabase.channel('pets-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pets' }, fetchPets)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Fetch Owner Profile
  useEffect(() => {
    if (!user) { setOwnerProfile(null); setIsFetchingOwnerProfile(false); return; }
    setIsFetchingOwnerProfile(true);
    const fetchOwner = async () => {
      const { data } = await supabase.from('owners').select('*').eq('uid', user.id).maybeSingle();
      if (data) {
        setOwnerProfile(data as OwnerProfile);
      } else {
        setOwnerProfile({ uid: user.id, gender: '', birthday: '', phone: '', address: '', photoUrl: '' });
      }
      setIsFetchingOwnerProfile(false);
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
        if (locationString) {
          setUserCity(locationString);
          // Only auto-set selectedCity if the user hasn't chosen one yet
          setSelectedCity(prev => {
            if (!prev) {
              localStorage.setItem('focinho_selected_city', locationString);
              return locationString;
            }
            return prev;
          });
        }
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
      if (!data) {
        setAdoptionPets([]);
        return;
      }
      
      const adoptionData = data as AdoptionPet[];
      const ownerIds = [...new Set(adoptionData.map(p => p.ownerId).filter(Boolean))];
      
      if (ownerIds.length > 0) {
        const { data: ownersData } = await supabase.from('owners').select('uid, name, username, photoUrl').in('uid', ownerIds);
        if (ownersData) {
          const ownersMap = ownersData.reduce((acc: any, owner: any) => {
            acc[owner.uid] = owner;
            return acc;
          }, {});
          
          adoptionData.forEach(pet => {
            if (pet.ownerId && ownersMap[pet.ownerId]) {
              pet.ownerName = ownersMap[pet.ownerId].name;
              pet.ownerUsername = ownersMap[pet.ownerId].username;
              pet.ownerPhotoUrl = ownersMap[pet.ownerId].photoUrl;
            }
          });
        }
      }
      
      setAdoptionPets(adoptionData);
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

  // Fetch Events
  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false });
      setPetEvents((data || []) as PetEvent[]);
    };
    fetchEvents();
    const channel = supabase.channel('events-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchEvents)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fetch Products for Loja
  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      setProducts((data || []) as Product[]);
    };
    fetchProducts();
    const channel = supabase.channel('products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fetch Promo Events
  useEffect(() => {
    const fetchPromoEvents = async () => {
      const { data } = await supabase.from('promo_events').select('*').order('created_at', { ascending: false });
      setPromoEvents((data || []) as PromoEvent[]);
    };
    fetchPromoEvents();
    const channel = supabase.channel('promo-events-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promo_events' }, fetchPromoEvents)
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
        const [petsRes, tagsRes, bannersRes] = await Promise.all([
          supabase.from('pets').select('*').or('deleted.is.null,deleted.eq.false'),
          supabase.from('tags').select('*').order('id', { ascending: true }),
          supabase.from('banners').select('*').order('created_at', { ascending: false })
        ]);
        setAllPets((petsRes.data || []) as PetProfile[]);
        setAllTags(tagsRes.data || []);
        setAdminBanners(bannersRes.data || []);
      } catch (err) {
        console.error('Error fetching admin data:', err);
      } finally {
        setIsFetchingAllPets(false);
        setIsFetchingAllTags(false);
      }
    };
    fetchAdminData();
  }, [isAdmin, accountSubView]);

  // Fetch SOS Alerts — channel is stable; filter re-applies whenever selectedCity or isAdmin changes
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const { data, error } = await supabase.from('lost_alerts').select('*');
        if (error) {
          window.alert('Erro(Supabase) ao carregar alertas: ' + error.message);
        }
        let allAlerts = (data || []) as LostAlert[];

        // Forçar dados fantasma se der erro de rede para que o usuário possa ver o layout como pedido
        if (error || allAlerts.length === 0) {
          allAlerts = [{
            id: 'dummy-1',
            petId: 'dummy-pet-id',
            ownerId: 'dummy-owner',
            petName: 'Jhow (TESTE DESIGN)',
            petPhoto: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&q=80',
            ownerName: 'Jhow (Tutor TESTE)',
            ownerPhotoUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&q=80',
            city: 'Guapimirim - Rio de Janeiro',
            lastSeen: 'Perto da padaria',
            contactPhone: '21999999999',
            createdAt: new Date().toISOString(),
            reward: 'R$ 500,00'
          }];
        } else {
          // Enriquecer alertas reais com a foto e nome do tutor
          const ownerIds = [...new Set(allAlerts.map(a => a.ownerId).filter(Boolean))];
          if (ownerIds.length > 0) {
            const { data: ownersData } = await supabase
              .from('owners')
              .select('uid, name, username, photoUrl')
              .in('uid', ownerIds);
            if (ownersData && ownersData.length > 0) {
              const ownersMap = ownersData.reduce((acc: any, owner: any) => {
                acc[owner.uid] = owner;
                return acc;
              }, {});

              allAlerts = allAlerts.map(a => ({
                ...a,
                ownerName: ownersMap[a.ownerId]?.name || undefined,
                ownerUsername: ownersMap[a.ownerId]?.username || undefined,
                ownerPhotoUrl: ownersMap[a.ownerId]?.photoUrl || undefined,
              }));
            }
          }

          // Buscar foto do pet direto da tabela pets quando petPhoto estiver vazio
          const alertsSemFoto = allAlerts.filter(a => !a.petPhoto && a.petId);
          if (alertsSemFoto.length > 0) {
            const petIds = alertsSemFoto.map(a => a.petId).filter(Boolean);
            const { data: petsData } = await supabase
              .from('pets')
              .select('id, photoUrl')
              .in('id', petIds);
            if (petsData && petsData.length > 0) {
              const petsMap = petsData.reduce((acc: any, pet: any) => {
                acc[pet.id] = pet;
                return acc;
              }, {});
              allAlerts = allAlerts.map(a => ({
                ...a,
                petPhoto: a.petPhoto || petsMap[a.petId]?.photoUrl || '',
              }));
            }
          }
        }

        // City-level filter: compare only the city portion from both sides
        const cityName = selectedCity ? selectedCity.split(' - ')[0].trim().toLowerCase() : '';
        const filteredAlerts = cityName && !isAdmin
          ? allAlerts.filter(a => {
              const alertCity = (a.city || '').split(' - ')[0].trim().toLowerCase();
              return alertCity.includes(cityName) || cityName.includes(alertCity);
            })
          : allAlerts;

        setHasNewUnreadSOS(prev => {
          if (lastLostAlertsCount.current !== 0 && filteredAlerts.length > lastLostAlertsCount.current) return true;
          return prev;
        });
        lastLostAlertsCount.current = filteredAlerts.length;
        setLostAlerts(filteredAlerts);


      } catch (e: any) {
        window.alert('Crash Fatal no fetchAlerts: ' + e.message);
      }
    };

    fetchAlerts();

    const channel = supabase.channel('lost-alerts-stable')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lost_alerts' }, fetchAlerts)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity, isAdmin]);

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
      const petPayload = {
        name: newAdoptionPet.name || '',
        animalType: newAdoptionPet.animalType || 'Cachorro',
        breed: newAdoptionPet.breed || '',
        color: newAdoptionPet.color || '',
        size: newAdoptionPet.size || null,
        gender: newAdoptionPet.gender || 'Macho',
        age: newAdoptionPet.age || null,
        description: newAdoptionPet.description || '',
        photoUrl: newAdoptionPet.photoUrl || '',
        gallery: newAdoptionPet.gallery || [],
        contactPhone: newAdoptionPet.contactPhone || '',
        state: newAdoptionPet.state || null,
        city: newAdoptionPet.city || null,
        address: newAdoptionPet.address || null,
        status: newAdoptionPet.status || 'available',
        ownerId: newAdoptionPet.ownerId || user?.id || null,
      };

      if (editingAdoptionPetId) {
        // Edit mode: update existing pet
        const { error } = await supabase.from('adoption_pets').update(petPayload).eq('id', editingAdoptionPetId);
        if (error) throw error;
      } else {
        // Create mode: insert new pet
        const petId = generateId();
        const { error } = await supabase.from('adoption_pets').insert({
          ...petPayload,
          id: petId,
          createdAt: new Date().toISOString()
        });
        if (error) throw error;
      }
      setIsAddingAdoptionPet(false);
      setEditingAdoptionPetId(null);
      setNewAdoptionPet({ name: '', animalType: 'Cachorro', breed: '', color: '', gender: 'Macho', description: '', photoUrl: '', gallery: [], contactPhone: '', status: 'available', state: '', city: '', address: '' });
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

      // Só permite alerta se o pet tiver um Pingente ativado
      if (!pet.tagId) {
        setError('Para gerar um alerta SOS, o pet precisa ter um Pingente Inteligente ativado. Adquira já o seu FocinhoPingente!');
        setLoading(false);
        return;
      }

      const alertId = editingSOSId || generateId();
      const payload = {
        id: alertId,
        petId: pet.id,
        ownerId: user.id,
        petName: pet.name,
        petPhoto: pet.photoUrl,
        city: newSOS.city,
        lastSeen: newSOS.lastSeen,
        reward: newSOS.reward || null,
        contactPhone: pet.ownerPhone || ownerProfile?.phone || '',
        createdAt: editingSOSId ? lostAlerts.find(a => a.id === editingSOSId)?.createdAt : new Date().toISOString()
      };

      const { error } = await supabase.from('lost_alerts').upsert(payload);
      if (error) throw error;

      setIsAddingSOS(false);
      setEditingSOSId(null);
      setNewSOS({ petId: '', city: '', lastSeen: '', reward: '' });
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
    
    // Se o usuário não selecionou nenhum pet explicitamente, mas tem pets, tenta usar o pet selecionado do dashboard
    if (selectedWalkPets.length === 0 && userPets.length > 0) {
      setSelectedWalkPets([userPets[currentPetIndex]?.id]);
    }
    
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

  const resetWalkState = () => {
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
  };

  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleDownloadWalkImage = async (imgUrlOrEvent?: string | React.MouseEvent) => {
    let imgToDownload = generatedWalkImage;
    if (!imgToDownload) {
      const generated = await generateSummaryImage();
      if (!generated) return;
      imgToDownload = generated;
    }

    try {
      const blob = imgToDownload.startsWith('data:') ? dataURLtoBlob(imgToDownload) : await (await fetch(imgToDownload)).blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `passeio-${new Date().getTime()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      resetWalkState();
    } catch (err) {
      const link = document.createElement('a');
      link.href = imgToDownload;
      link.download = `passeio-${new Date().getTime()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      resetWalkState();
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
      petId: selectedWalkPets.join(','),
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
        userName: ownerProfile?.username || ownerProfile?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
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

  const handleSendOtp = async () => {
    if (!authEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(authEmail)) {
      setAuthError('Por favor, insira um email válido.');
      return;
    }
    if (!authPhone || authPhone.replace(/\D/g, '').length < 8) {
      setAuthError('Por favor, insira um telefone válido.');
      return;
    }
    setOtpSending(true);
    setAuthError(null);
    setOtpSuccess(null);
    try {
      const fullPhone = `${authDDI}${authPhone}`;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ email: authEmail, phone: fullPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar o código.');
      setOtpSent(true);
      setOtpSuccess(`Código enviado para ${authEmail}! Verifique sua caixa de entrada.`);
      // Start 60s cooldown
      setOtpCooldown(60);
      const timer = setInterval(() => {
        setOtpCooldown(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
      }, 1000);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setOtpSending(false);
    }
  };

  const handleLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (authMode === 'register') {
        if (!authName) { setAuthError('Por favor, informe seu nome.'); setAuthLoading(false); return; }
        if (!otpSent || !otpCode) { setAuthError('Envie e confirme o código de verificação antes de continuar.'); setAuthLoading(false); return; }

        // Validate OTP first
        const verifyRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
          body: JSON.stringify({ email: authEmail, action: 'verify', code: otpCode }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.valid) throw new Error(verifyData.error || 'Código inválido ou expirado.');

        const { error, data } = await supabase.auth.signUp({ 
          email: authEmail, 
          password: authPassword,
          options: {
            data: {
              full_name: authName
            }
          }
        });
        if (error) throw error;
        
        if (data.user) {
          // Immediately create owner profile
          const ownerPayload: OwnerProfile = {
            uid: data.user.id,
            name: authName,
            phone: `${authDDI}${authPhone}`,
            state: authState,
            city: authCity,
            address: authAddress,
            updatedAt: new Date().toISOString()
          };
          await supabase.from('owners').upsert(ownerPayload);

          if (!data.session) {
            setAuthError('Conta criada! Verifique seu email para confirmar o cadastro.');
            setAuthLoading(false);
            return; // stop here if email confirmation is required
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
      }
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao fazer login. Tente novamente.');
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthLoading(false);
    setAuthEmail('');
    setAuthPassword('');
    setView('home');
  };

  // --- Family Functions ---
  const fetchFamilies = async () => {
    if (!user) return;
    try {
      const { data: memberships } = await supabase.from('family_members').select('family_id').eq('user_id', user.id);
      if (memberships && memberships.length > 0) {
        const familyIds = memberships.map((m: any) => m.family_id);
        const { data: families } = await supabase.from('families').select('*').in('id', familyIds);
        setUserFamilies(families || []);

        const { data: allMembers } = await supabase.from('family_members').select('*').in('family_id', familyIds);
        if (allMembers && allMembers.length > 0) {
          const uids = allMembers.map((m: any) => m.user_id);
          const { data: owners } = await supabase.from('owners').select('uid, name, photoUrl').in('uid', uids);
          
          const combined = allMembers.map((m: any) => {
            const owner = owners?.find((o: any) => o.uid === m.user_id);
            return {
              ...m,
              name: owner?.name || 'Usuário',
              photoUrl: owner?.photoUrl
            };
          });
          setFamilyMembersInfo(combined);
        } else {
          setFamilyMembersInfo([]);
        }
      } else {
        setUserFamilies([]);
        setFamilyMembersInfo([]);
      }
    } catch(err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user && accountSubView === 'family') {
      fetchFamilies();
    }
  }, [user, accountSubView]);

  const handleCreateFamily = async () => {
    if (!user) return;
    setCreatingFamily(true);
    try {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const familyName = ownerProfile?.name ? `${ownerProfile.name.split(' ')[0]}'s family` : 'Minha Família';
      
      const { data: newFamily, error: familyError } = await supabase.from('families').insert({
        name: familyName,
        owner_id: user.id,
        invite_code: inviteCode
      }).select().single();
      
      if (familyError) throw familyError;
      
      const { error: memberError } = await supabase.from('family_members').insert({
        family_id: newFamily.id,
        user_id: user.id
      });
      if (memberError) throw memberError;
      
      await fetchFamilies();
      window.location.reload(); 
    } catch (err: any) {
      alert(err.message || 'Erro ao criar família');
    } finally {
      setCreatingFamily(false);
    }
  };

  const regenerateFamilyCode = async (familyId: string) => {
    try {
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { error } = await supabase.from('families').update({ invite_code: newCode }).eq('id', familyId);
      if (error) throw error;
      await fetchFamilies();
      alert('Código refeito com sucesso!');
    } catch (err: any) {
      alert('Erro ao refazer código.');
    }
  };

  const handleJoinFamily = async () => {
    if (!user || !inviteCodeInput) return;
    setJoiningFamily(true);
    try {
      const code = inviteCodeInput.trim().toUpperCase();
      const { data: familyToJoin, error: findError } = await supabase.from('families').select('*').eq('invite_code', code).maybeSingle();
      if (findError || !familyToJoin) {
        alert('Código de família não encontrado.');
        setJoiningFamily(false);
        return;
      }
      
      const { data: existing } = await supabase.from('family_members').select('*').eq('family_id', familyToJoin.id).eq('user_id', user.id).maybeSingle();
      if (existing) {
        alert('Você já é membro desta família!');
        setJoiningFamily(false);
        return;
      }

      const { error: joinError } = await supabase.from('family_members').insert({
        family_id: familyToJoin.id,
        user_id: user.id
      });
      if (joinError) throw joinError;

      alert('Entrou para a família com sucesso!');
      setInviteCodeInput('');
      await fetchFamilies();
      setShowInviteModal(false);
      window.location.reload(); 
    } catch (err: any) {
      alert(err.message || 'Erro ao entrar na família');
    } finally {
      setJoiningFamily(false);
    }
  };

  const handleRemoveMember = async (familyId: string, memberId: string) => {
    if (!window.confirm('Tem certeza que deseja remover este membro da família?')) return;
    try {
      const { error } = await supabase.from('family_members').delete().eq('family_id', familyId).eq('user_id', memberId);
      if (error) throw error;
      await fetchFamilies();
      alert('Membro removido com sucesso!');
    } catch (err: any) {
      alert('Erro ao remover membro.');
      console.error(err);
    }
  };

  const handleDeleteFamily = async (familyId: string) => {
    if (!window.confirm('Tem certeza que deseja exluir a família? Todos os membros perderão acesso.')) return;
    try {
      const { error } = await supabase.from('families').delete().eq('id', familyId);
      if (error) throw error;
      await fetchFamilies();
      alert('Família excluída com sucesso!');
    } catch (err: any) {
      alert('Erro ao excluir família.');
      console.error(err);
    }
  };
  // --- End Family Functions ---

  const handleActivateTag = async () => {
    if (!tagIdToActivate) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Check if tag is already in use
      const { data: existingPet } = await supabase.from('pets').select('id').eq('tagId', tagIdToActivate).limit(1).maybeSingle();
      if (existingPet) {
        setError('Esta tag já está em uso por outro pet.');
        setLoading(false);
        return;
      }
      // 2. Check tags table
      const { data: tagData } = await supabase.from('tags').select('*').eq('id', tagIdToActivate).limit(1).maybeSingle();
      if (tagData?.activated) {
        setError('Esta tag já está em uso por outro pet.');
        setLoading(false);
        return;
      }
      // 3. Create tag entry if needed
      if (!tagData) {
        await supabase.from('tags').insert({ id: tagIdToActivate, activated: false, ownerId: null, petId: null });
      }
      localStorage.setItem('focinho_pending_tag', tagIdToActivate);
      // Mostrar tela de sucesso antes de ir para o perfil
      setTagVerifiedSuccess(true);
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
    if (!selectedPet) return;
    
    const effectiveTagId = (tagIdToActivate || selectedPet.tagId || '').trim().toUpperCase() || null;

    if (!user) {
      setPendingGuestPet({ ...selectedPet, tagId: effectiveTagId });
      setAuthMode('register');
      setView('home');
      setSuccessMessage('Perfil do Pet salvo provisoriamente! Crie sua conta para concluir e atrelar sua Tag.');
      setTimeout(() => setSuccessMessage(null), 8000);
      return;
    }

    const petsWithoutTag = userPets.filter(p => !p.tagId);
    const hasActiveTag = userPets.some(p => p.tagId);
    // effectiveTagId: prefer state flow, fallback to form field

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
      const { data } = await supabase.from('pets').select('*').eq('ownerId', user.id).or('deleted.is.null,deleted.eq.false');
      setUserPets((data || []) as PetProfile[]);
      setView('dashboard');
      localStorage.removeItem('focinho_pending_tag');
      setSelectedPet(null);
      setTagIdToActivate('');
    } catch (err) {
      console.error('Error saving pet:', err);
      setError('Erro ao salvar perfil.');
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
      if (ownerProfile.username && !/^[a-z0-9_.]+$/.test(ownerProfile.username)) {
        setError('O nome de usuário (ex: ruan_silva) deve conter apenas letras minúsculas, números, ponto (.) ou underline (_). Sem espaços.');
        setLoading(false);
        return;
      }

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
      
      if (error) {
        if (error.code === '23505') { // Postgres unique constraint violation
          throw new Error('Eita! Este nome de usuário já está sendo usado por outra pessoa. Tente um diferente.');
        }
        throw error;
      }
      setOwnerProfile(prev => prev ? { ...prev, privacySettings: fullPrivacySettings } : prev);
      
      if (ownerProfile.city && ownerProfile.state) {
        const locationString = `${ownerProfile.city} - ${ownerProfile.state}`;
        setSelectedCity(locationString);
        localStorage.setItem('focinho_selected_city', locationString);
      }

      setError(null);
      setSuccessMessage('Configurações salvas com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Erro ao salvar perfil do tutor.');
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const croppedBlob = await requestCrop(file, 1, true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setOwnerProfile(prev => ({ ...prev, photoUrl: reader.result as string } as any));
      };
      reader.readAsDataURL(croppedBlob);
    } catch (err) {
      console.error(err);
      setError('Erro ao recortar foto.');
    }
    
    // reset input
    e.target.value = '';
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
      setError('O tutor não cadastrou um telefone de contato.');
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
      alert('Por favor, permita o acesso à localização para ajudar o tutor.');
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5000000) {
        setError('A imagem é muito grande. Escolha uma foto menor que 5MB.');
        return;
      }
      try {
        const croppedBlob = await requestCrop(file, 1, false);
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedPet(prev => ({ ...prev, photoUrl: reader.result as string } as any));
        };
        reader.readAsDataURL(croppedBlob);
      } catch (err) {
        console.error(err);
      }
    }
    e.target.value = '';
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
      <div className={`min-h-screen ${!user && view === 'home' ? 'bg-white' : 'bg-gray-50'} font-sans text-gray-900 pb-32 md:pb-0`}>
        {/* Main App Header */}
        {user && view === 'dashboard' && (
          <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-50 flex items-center justify-between relative">
            {/* Left: QR Scanner */}
            <button
              onClick={() => setShowScanner(true)}
              className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
              title="Escanear QR Code ou Tag"
            >
              <QrCode className="w-5 h-5" />
            </button>

            {/* Center: name */}
            <span translate="no" className="absolute left-1/2 -translate-x-1/2 text-xl font-bold tracking-tight text-orange-500">FocinhoApp</span>

            {/* Right: Location + Logout */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCityPicker(true)}
                className="w-10 h-10 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-center text-orange-600 hover:bg-orange-100 transition-colors shrink-0"
                title="Mudar localização global"
              >
                <MapPin className="w-5 h-5" />
              </button>
              <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0" title="Sair da conta">
                <LogOut className="w-6 h-6" />
              </button>
            </div>
          </header>
        )}

        {/* Finder App Header (Public & Logged) */}
        {view === 'finder' && (
          <header className="bg-[#f9fafb] border-b border-gray-100 px-6 py-4 sticky top-0 z-50 flex items-center justify-between relative shadow-sm">
            {user ? (
              <button 
                onClick={() => {
                  setView('dashboard');
                  if (window.location.search) {
                    window.history.replaceState({}, '', window.location.pathname);
                  }
                }}
                className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center hover:bg-orange-100 transition-colors"
                title="Voltar ao início"
              >
                <ChevronLeft className="w-6 h-6 -ml-1" />
              </button>
            ) : (
              <div className="w-10 h-10" />
            )}
            
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
              <img src="./pwa-512x512.png" alt="FocinhoApp Logo" className="w-9 h-9 object-cover rounded-xl" />
              <span translate="no" className="text-xl font-bold tracking-tight text-orange-500">FocinhoApp</span>
            </div>

            <div className="w-10 h-10" />
          </header>
        )}

        <main className="max-w-xl mx-auto p-4 md:p-6 pb-40">
          <AnimatePresence mode="wait">
            {/* Install PWA Tutorial Page */}
            {view === 'install_pwa' && (
              <motion.div
                key="install_pwa"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col max-w-sm mx-auto space-y-5 pt-8 pb-12"
              >
                <div className="flex flex-col items-center text-center space-y-3 mb-2">
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-xl p-1 flex items-center justify-center">
                    <img src="./pwa-512x512.png" alt="Icon" className="w-full h-full rounded-2xl object-cover" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Instale o App</h2>
                    <p className="text-gray-500 font-medium mt-1 text-sm">Adicione o FocinhoApp à sua tela inicial em menos de 1 minuto</p>
                  </div>
                </div>

                {/* Android */}
                <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                      <Smartphone className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm leading-none">Android</p>
                      <p className="text-xs text-gray-400 font-medium mt-0.5">Usar o Google Chrome</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {/* Passo 1: abrir o link */}
                    <div className="flex gap-3 items-start">
                      <span className="bg-green-100 text-green-600 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5">1</span>
                      <p className="text-[13px] text-gray-600 font-medium leading-snug">
                        Abra o FocinhoApp no Chrome:{' '}
                        <a href="/?login=true" className="text-orange-600 font-black underline underline-offset-2 hover:text-orange-700" target="_self">
                          Clique aqui
                        </a>
                      </p>
                    </div>
                    {[
                      'Toque nos três pontinhos no canto superior direito',
                      'Toque em "Adicionar à tela inicial"',
                      'Confirme o nome do app e toque em "Adicionar"',
                    ].map((step, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="bg-green-100 text-green-600 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5">{i + 2}</span>
                        <p className="text-[13px] text-gray-600 font-medium leading-snug">{step}</p>
                      </div>
                    ))}
                    <div className="flex gap-3 items-center pt-1">
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                      <p className="text-[13px] text-green-600 font-bold">Pronto! O ícone aparece na sua tela inicial.</p>
                    </div>
                  </div>
                </div>

                {/* iPhone */}
                <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                      <Smartphone className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm leading-none">iPhone</p>
                      <p className="text-xs text-gray-400 font-medium mt-0.5">Usar o Safari — não funciona no Chrome</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {/* Passo 1: abrir o link */}
                    <div className="flex gap-3 items-start">
                      <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5">1</span>
                      <p className="text-[13px] text-gray-600 font-medium leading-snug">
                        Abra o FocinhoApp no Safari:{' '}
                        <a href="/?login=true" className="text-orange-600 font-black underline underline-offset-2 hover:text-orange-700" target="_self">
                          Clique aqui
                        </a>
                      </p>
                    </div>
                    {[
                      'Toque no botão de compartilhar na barra inferior do Safari',
                      'Role para baixo e toque em "Adicionar à Tela de Início"',
                      'Confirme o nome do app e toque em "Adicionar"',
                    ].map((step, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5">{i + 2}</span>
                        <p className="text-[13px] text-gray-600 font-medium leading-snug">{step}</p>
                      </div>
                    ))}
                    <div className="flex gap-3 items-center pt-1">
                      <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                      <p className="text-[13px] text-blue-600 font-bold">Pronto! O ícone aparece na sua tela inicial.</p>
                    </div>
                  </div>
                </div>


              </motion.div>
            )}

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
                  <img src="./pwa-512x512.png" alt="FocinhoApp Logo" className="w-32 h-32 object-cover rounded-[2rem] relative z-10 shadow-2xl" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-4xl font-extrabold leading-tight">
                    Proteja quem você <span className="text-orange-500">ama</span>
                  </h1>
                  <p className="text-gray-500 text-lg">
                    Pingentes inteligentes com QR Code para que seu pet nunca se perca. Simples, moderno e funcional.
                  </p>
                </div>
                
                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl text-sm font-medium"
                  >
                    {successMessage}
                  </motion.div>
                )}

                <div className="w-full space-y-4 pt-4">
                  <div className="space-y-3 w-full">
                    {/* ── REGISTER FORM ─────────────────────────── */}
                    {authMode === 'register' && (
                      <div className="space-y-3">
                        {/* Back + Title */}
                        <div className="flex items-center gap-3 mb-4">
                          <button
                            onClick={() => { setAuthMode('login'); setAuthError(null); setOtpSent(false); setOtpCode(''); setOtpSuccess(null); setOtpCooldown(0); }}
                            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                          >
                            <ChevronLeft className="w-5 h-5 text-gray-600" />
                          </button>
                          <h2 className="text-2xl font-black text-gray-900">Cadastrar-se</h2>
                        </div>

                        {/* Name */}
                        <input
                          type="text"
                          value={authName}
                          onChange={e => setAuthName(e.target.value)}
                          placeholder="Nome"
                          className="w-full clay-input outline-none px-4 py-4 text-base"
                        />

                        {/* Email */}
                        <input
                          type="email"
                          value={authEmail}
                          onChange={e => { setAuthEmail(e.target.value); setOtpSent(false); setOtpCode(''); setOtpSuccess(null); }}
                          placeholder="Email"
                          className="w-full clay-input outline-none px-4 py-4 text-base"
                        />

                        {/* WhatsApp Phone */}
                        <PhoneInputWithDDI
                          ddi={authDDI}
                          phone={authPhone}
                          onDDIChange={setAuthDDI}
                          onPhoneChange={(v) => setAuthPhone(formatPhoneMask(v))}
                        />

                        {/* OTP row */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={otpCode}
                            onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="Código de 6 dígitos"
                            className="flex-1 clay-input outline-none px-4 py-4 text-base tracking-widest"
                          />
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={otpSending || otpCooldown > 0}
                            className="px-4 py-4 text-sm font-black text-orange-500 hover:text-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {otpSending ? <Loader2 className="w-4 h-4 animate-spin" /> : otpCooldown > 0 ? `${otpCooldown}s` : 'Enviar Código'}
                          </button>
                        </div>

                        {otpSuccess && (
                          <p className="text-sm text-green-600 font-medium px-1">✓ {otpSuccess}</p>
                        )}

                        {/* Password */}
                        <input
                          type="password"
                          value={authPassword}
                          onChange={e => setAuthPassword(e.target.value)}
                          placeholder="Senha"
                          className="w-full clay-input outline-none px-4 py-4 text-base"
                        />

                        {authError && (
                          <p className="text-sm text-red-500 text-center px-1 font-medium">{authError}</p>
                        )}

                        <Button onClick={handleLogin} className="w-full py-4 text-lg" loading={authLoading}>
                          Cadastrar-se
                        </Button>

                        <p className="text-xs text-gray-400 text-center px-4 leading-relaxed">
                          Ao se cadastrar, você concorda com os{' '}
                          <span className="text-orange-500 font-semibold">Termos de Serviço</span>{' '}e a{' '}
                          <span className="text-orange-500 font-semibold">Política de Privacidade</span>
                        </p>
                      </div>
                    )}

                    {/* ── LOGIN FORM ─────────────────────────── */}
                    {authMode === 'login' && (
                      <div className="space-y-3">
                        <p className="text-xl font-black text-gray-900 text-center pb-1">Entrar no FocinhoApp</p>
                        <Input
                          type="email"
                          value={authEmail}
                          onChange={setAuthEmail}
                          placeholder="seu@email.com"
                        />
                        <Input
                          type="password"
                          value={authPassword}
                          onChange={setAuthPassword}
                          placeholder="Senha"
                        />
                        {authError && (
                          <p className="text-sm text-red-500 text-center px-1 font-medium">{authError}</p>
                        )}
                        <Button onClick={handleLogin} className="w-full py-4 text-lg" loading={authLoading}>
                          Entrar
                        </Button>
                        <button
                          onClick={async () => {
                            if (!authEmail) { setAuthError('Digite seu email para recuperar a senha.'); return; }
                            try {
                              const { error } = await supabase.auth.resetPasswordForEmail(authEmail);
                              if (error) throw error;
                              alert('Email de recuperação enviado! Verifique sua caixa de entrada.');
                            } catch (err: any) { setAuthError(err.message); }
                          }}
                          className="w-full text-sm text-gray-500 hover:text-orange-500 transition-colors py-1 font-medium"
                        >
                          Esqueceu a senha?
                        </button>
                        <div className="pt-4 pb-2 mt-2 w-full">
                          <Button
                            onClick={() => { setAuthMode('register'); setAuthError(null); setOtpCode(''); setOtpSent(false); setOtpSuccess(null); setOtpCooldown(0); }}
                            variant="outline"
                            className="w-full py-4 text-lg border-2 text-gray-800 font-bold"
                          >
                            Criar uma nova conta
                          </Button>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Seguro e gratuito para usuários</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-20" /> {/* Spacer to avoid bottom nav overlap */}
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
                {(isFetchingOwnerProfile || isFetchingUserPets) ? (
                  <div className="flex flex-col items-center justify-center py-32 opacity-50">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
                    <p className="text-gray-500 font-medium">Sincronizando seus dados...</p>
                  </div>
                ) : (
                  <>


                {/* ── Pet Selector Row ─────────────────────────── */}
                <div className="mb-2">
                  <div className="flex gap-5 overflow-x-auto pb-3 pt-3 px-2 no-scrollbar">
                    {userPets.map((pet, index) => {
                      const hasTag = !!pet.tagId;
                      const isSelected = index === currentPetIndex;

                      return (
                        <motion.button
                          key={pet.id}
                          whileTap={{ scale: 0.93 }}
                          onClick={() => { 
                            if (isSelected) {
                              // Se já está selecionado, abrir perfil
                              setSelectedPet(pet); setView('profile'); 
                            } else {
                              // Se não, seleciona e foca
                              setCurrentPetIndex(index);
                            }
                          }}
                          className={`flex flex-col items-center gap-2 shrink-0 group transition-all duration-300 ${
                            isSelected ? 'scale-100 opacity-100' : 'scale-90 opacity-60 blur-[1px]'
                          }`}
                        >
                          {/* Circle avatar */}
                          <div className="relative">
                            <div
                              className={`w-[72px] h-[72px] rounded-full p-[3px] transition-all duration-300
                                ${hasTag
                                  ? 'ring-[3px] ring-orange-500 ring-offset-2'
                                  : 'ring-[3px] ring-gray-300 ring-offset-2'
                                }`}
                            >
                              <div className="w-full h-full rounded-full overflow-hidden bg-gray-100">
                                {pet.photoUrl ? (
                                  <img src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Dog className={`w-8 h-8 ${hasTag ? 'text-orange-300' : 'text-gray-300'}`} />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* QR badge — only when tag active */}
                            {hasTag && (
                              <motion.button
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`${window.location.origin}/?tag=${pet.tagId}`, '_blank');
                                }}
                                className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-md border-2 border-white hover:bg-orange-600 transition-colors"
                                title={`Ver perfil público — ID: ${pet.tagId}`}
                              >
                                <QrCode className="w-3 h-3 text-white" />
                              </motion.button>
                            )}
                          </div>

                          {/* Name */}
                          <span className={`text-[12px] font-bold truncate max-w-[72px] transition-colors ${
                            isSelected ? 'text-orange-500' : 'text-gray-500 group-hover:text-gray-700'
                          }`}>
                            {pet.name}
                          </span>
                        </motion.button>
                      );
                    })}

                    {/* Add new pet button */}
                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      onClick={() => { setSelectedPet(null); setView('profile'); }}
                      className="flex flex-col items-center gap-2 shrink-0 group"
                    >
                      <div className="w-[72px] h-[72px] rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center group-hover:border-orange-400 group-hover:bg-orange-50 transition-all">
                        <div className="flex flex-col items-center gap-0.5">
                          <Plus className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                          <PawPrint className="w-3 h-3 text-gray-300 group-hover:text-orange-400 transition-colors" />
                        </div>
                      </div>
                      <span className="text-[12px] font-bold text-gray-400 group-hover:text-orange-500 transition-colors">
                        Adicionar
                      </span>
                    </motion.button>
                  </div>

                  {/* Empty state — when user has zero pets, show centered add circle */}
                  {userPets.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setSelectedPet(null); setView('profile'); }}
                        className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 hover:border-orange-400 hover:bg-orange-50 transition-all group"
                      >
                        <PawPrint className="w-7 h-7 text-gray-300 group-hover:text-orange-400 transition-colors" />
                        <Plus className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                      </motion.button>
                      <p className="text-sm font-bold text-gray-500">Adicionar meu primeiro pet</p>
                      <p className="text-xs text-gray-400 text-center max-w-[200px]">Cadastre seu pet e mantenha-o seguro com o pingente FocinhoApp</p>
                    </div>
                  )}
                </div>

                {/* ── Quick Actions ─────────────────────────────── */}
                {userPets.length > 0 && (
                  <div className="mb-2 flex flex-col gap-5">
                    
                    {/* App Features Grid */}
                    <div className="grid grid-cols-4 gap-3 px-1">
                      <div 
                        onClick={() => { setView('account'); setAccountSubView('adoption'); }}
                        className="bg-white py-3 px-1 rounded-[1.5rem] border border-gray-100 flex flex-col items-center text-center gap-2 cursor-pointer hover:border-orange-200 transition-all shadow-sm active:scale-95"
                      >
                        <div className="w-12 h-12 bg-orange-50 rounded-[1rem] flex items-center justify-center">
                          <Heart className="w-6 h-6 text-orange-500" />
                        </div>
                        <span className="text-[10px] font-black text-gray-700 leading-tight tracking-tight">Adoção</span>
                      </div>
                      
                      <div 
                        onClick={() => { setView('account'); setAccountSubView('partners'); }}
                        className="bg-white py-3 px-1 rounded-[1.5rem] border border-gray-100 flex flex-col items-center text-center gap-2 cursor-pointer hover:border-emerald-200 transition-all shadow-sm active:scale-95"
                      >
                        <div className="w-12 h-12 bg-emerald-50 rounded-[1rem] flex items-center justify-center">
                          <HeartHandshake className="w-6 h-6 text-emerald-500" />
                        </div>
                        <span className="text-[10px] font-black text-gray-700 leading-tight tracking-tight">Parceiros</span>
                      </div>

                      <div 
                        onClick={() => { setView('account'); setAccountSubView('events'); }}
                        className="bg-white py-3 px-1 rounded-[1.5rem] border border-gray-100 flex flex-col items-center text-center gap-2 cursor-pointer hover:border-blue-200 transition-all shadow-sm active:scale-95 relative"
                      >
                        <div className="w-12 h-12 bg-blue-50 rounded-[1rem] flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-blue-500" />
                        </div>
                        <span className="text-[10px] font-black text-gray-700 leading-tight tracking-tight">Eventos</span>
                      </div>

                      <div 
                        onClick={() => { setView('account'); setAccountSubView('store'); }}
                        className="bg-white py-3 px-1 rounded-[1.5rem] border border-gray-100 flex flex-col items-center text-center gap-2 cursor-pointer hover:border-indigo-200 transition-all shadow-sm active:scale-95"
                      >
                        <div className="w-12 h-12 bg-indigo-50 rounded-[1rem] flex items-center justify-center">
                          <ShoppingBag className="w-6 h-6 text-indigo-500" />
                        </div>
                        <span className="text-[10px] font-black text-gray-700 leading-tight tracking-tight">Lojinha</span>
                      </div>
                    </div>

                    {/* Banners Carousel */}
                    <BannerCarousel />

                    {/* Novo Slider de Eventos com Auto-scroll */}
                    <EventCarousel />
                    
                    {/* Eventos Destacados pelo Admin */}
                    <MyEventsCarousel />

                    {/* Timeline Feed (Alerts + Adoptions) */}
                    <div className="space-y-6">
                      
                      {(() => {
                        // Merge and sort alerts and available adoptions
                        const timelineItems = [
                          ...lostAlerts.map(a => ({ type: 'alert' as const, data: a, date: new Date(a.createdAt).getTime() })),
                          ...adoptionPets.filter(p => (p.status === 'available' || p.status === undefined)).map(p => ({ type: 'adoption' as const, data: p, date: new Date(p.createdAt).getTime() })),
                          ...posts.map(p => ({ type: 'post' as const, data: p, date: new Date(p.createdAt).getTime() }))
                        ].sort((a, b) => b.date - a.date);

                        if (timelineItems.length === 0) {
                          return (
                            <div className="text-center py-10 bg-white border border-gray-100 rounded-[2rem]">
                               <p className="text-gray-400 font-medium text-sm">Nenhuma atualização recente na sua região.</p>
                            </div>
                          );
                        }

                        return timelineItems.map((item, idx) => {
                          if (item.type === 'alert') {
                            const alert = item.data;
                            return (
                               <div key={`alert-${alert.id}-${idx}`}>
                                  <SOSAlertCard
                                    alert={alert}
                                    user={user}
                                    onOpenFinder={() => openPetFinderById(alert.petId)}
                                    onEdit={() => {}} /* feed uses read-only */
                                    onFound={async () => {
                                       if (window.confirm(`Você encontrou ${alert.petName}?`)) {
                                          await supabase.from('lost_alerts').delete().eq('id', alert.id);
                                          setLostAlerts(prev => prev.filter(a => a.id !== alert.id));
                                       }
                                    }}
                                    onShare={async () => {
                                       if (navigator.share) {
                                          try {
                                             await navigator.share({
                                                title: `Alerta SOS: ${alert.petName}`,
                                                text: `Ajude a encontrar ${alert.petName}!`,
                                                url: window.location.href,
                                             });
                                          } catch {}
                                       }
                                    }}
                                  />
                               </div>
                            )
                          } else if (item.type === 'adoption') {
                            const pet = item.data;
                            return (
                               <div key={`adopt-${pet.id}-${idx}`} className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
                                  {/* Header */}
                                  <div className="flex items-center justify-between px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="relative">
                                        {pet.ownerPhotoUrl ? (
                                          <img src={pet.ownerPhotoUrl} alt="Tutor" className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                                        ) : (
                                          <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center border border-pink-100">
                                            <UserIcon className="w-5 h-5 text-pink-300" />
                                          </div>
                                        )}
                                        <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full p-1 border-2 border-white">
                                          <Heart className="w-2.5 h-2.5 text-white" />
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-[14px] text-gray-900 leading-tight">
                                          <span className="font-bold">{pet.ownerUsername || pet.ownerName || 'Tutor do Pet'}</span> busca um lar pra{' '}
                                          <button
                                            className="font-bold text-gray-900"
                                            onClick={() => { setAdoptionFocusPet(pet.id); setView('account'); setAccountSubView('adoption'); }}
                                          >{pet.name}</button>
                                        </p>
                                        <p className="text-[12px] text-gray-500 font-medium leading-tight mt-0.5">
                                           {pet.city || 'Localização não informada'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Photo */}
                                  <div className="w-full aspect-square bg-gray-100 relative">
                                    <img src={pet.photoUrl || 'https://picsum.photos/seed/pet/800/600'} alt={pet.name} className="w-full h-full object-cover" />
                                    <div className="absolute top-3 left-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase shadow-lg flex items-center gap-1">
                                      Para Adoção
                                    </div>
                                  </div>

                                  {/* Buttons */}
                                  <div className="flex flex-wrap items-center gap-4 px-4 pt-3 pb-3">
                                     <div className="flex items-center gap-1.5 font-bold text-sm text-green-600">
                                       <CheckCircle2 className="w-6 h-6" />
                                       Disponível
                                     </div>
                                     <button
                                       onClick={async () => {
                                         if (navigator.share) {
                                           try {
                                              await navigator.share({
                                                 title: `Ação de Adoção: ${pet.name}`,
                                                 text: `Conheça ${pet.name}, para adoção!`,
                                                 url: window.location.href,
                                              });
                                           } catch {}
                                         }
                                       }}
                                       className="flex items-center gap-1.5 text-gray-500 font-bold text-sm hover:text-gray-700 transition-colors"
                                     >
                                       <Share2 className="w-5 h-5" />
                                       Compartilhar
                                     </button>
                                     <button
                                       onClick={() => {
                                          const phone = (pet.contactPhone || '').replace(/\D/g, '');
                                          if (!phone) { window.alert('Este pet não possui telefone de contato.'); return; }
                                          window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(`Olá! Queria falar sobre a adoção do ${pet.name}.`)}`, '_blank');
                                       }}
                                       className="ml-auto flex items-center gap-1.5 text-pink-600 font-bold text-sm hover:text-pink-700 transition-colors"
                                     >
                                       <MessageCircle className="w-5 h-5" />
                                       Quero Adotar
                                     </button>
                                  </div>
                                  <div className="px-4 pb-4">
                                     <p className="text-[11px] text-gray-400 font-medium">
                                       {pet.createdAt ? new Date(pet.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Recentemente'}
                                     </p>
                                  </div>
                               </div>
                            )
                          } else if (item.type === 'post') {
                            const post = item.data;
                            return (
                               <div key={`post-${post.id}-${idx}`} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 mb-6 flex flex-col">
                                  {/* Header */}
                                  <div className="flex items-center justify-between p-4 bg-white/50 backdrop-blur-sm z-10 w-full rounded-t-[2rem]">
                                    <div className="flex items-center gap-3">
                                      <div className="relative">
                                        <div className="w-10 h-10 rounded-full border-2 border-orange-100 overflow-hidden bg-gray-50 p-0.5">
                                          <img src={post.userPhoto || 'https://picsum.photos/seed/user/100/100'} className="w-full h-full rounded-full object-cover" alt="User" />
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-[14px] text-gray-900 leading-tight">
                                          <span className="font-bold">{post.userName || 'Tutor'}</span>{' '}
                                          {post.type === 'alert' ? 'procurando por ' : post.type === 'adoption' ? 'busca um lar pra ' : 'passeando com '}
                                          <button
                                            className="font-bold text-gray-900"
                                            onClick={async () => {
                                              if (!post.petId) { window.alert('Para ter um perfil público, o pet precisa de um Pingente Inteligente ativado.'); return; }
                                              const { data: petRow } = await supabase.from('pets').select('tagId').eq('id', post.petId).maybeSingle();
                                              if (petRow?.tagId) {
                                                handleViewFinder(petRow.tagId);
                                              } else {
                                                window.alert('Para ter um perfil público, o pet precisa de um Pingente Inteligente ativado.');
                                              }
                                            }}
                                          >{post.petName || 'Pet'}</button>
                                        </p>
                                        <p className="text-[12px] text-gray-500 font-medium leading-tight mt-0.5">
                                           {selectedCity || userCity || 'Perto de você'}
                                        </p>
                                      </div>
                                    </div>
                                    {(isAdmin || post.userId === user?.id) && (
                                      <div className="relative">
                                        <button 
                                          onClick={() => setOpenMenuId(openMenuId === `post-${post.id}` ? null : `post-${post.id}`)}
                                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-50"
                                        >
                                          <MoreVertical className="w-5 h-5" />
                                        </button>
                                        {openMenuId === `post-${post.id}` && (
                                          <>
                                          <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                                            <button
                                              onClick={async () => {
                                                setOpenMenuId(null);
                                                const newCaption = window.prompt('Editar legenda:', post.content);
                                                if (newCaption !== null && newCaption.trim() !== '' && newCaption !== post.content) {
                                                  await supabase.from('posts').update({ content: newCaption }).eq('id', post.id);
                                                  setPosts(prev => prev.map(p => p.id === post.id ? { ...p, content: newCaption } : p));
                                                }
                                              }}
                                              className="w-full px-4 py-2 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                            >
                                              <Edit2 className="w-4 h-4" /> Editar Legenda
                                            </button>
                                            <button
                                              onClick={async () => {
                                                setOpenMenuId(null);
                                                if (window.confirm('Deseja excluir esta postagem?')) {
                                                  await supabase.from('posts').delete().eq('id', post.id);
                                                  setPosts(prev => prev.filter(p => p.id !== post.id));
                                                }
                                              }}
                                              className="w-full px-4 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                                            >
                                              <Trash2 className="w-4 h-4" /> Excluir
                                            </button>
                                          </div>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Caption */}
                                  <div className="px-4 pb-3 space-y-1">
                                    <p className="text-sm text-gray-800 font-medium leading-relaxed">
                                      {post.content}
                                    </p>
                                  </div>

                                  {/* Photo */}
                                  <div className="w-full aspect-square bg-gray-100 relative">
                                    <img src={post.imageUrl || 'https://picsum.photos/seed/passeio/800/800'} alt="Passeio" className="w-full h-full object-cover" />
                                  </div>

                                  {/* Actions & Date */}
                                  <div className="flex items-center gap-4 px-4 pt-3 pb-4">
                                     <button className="flex items-center gap-1.5 text-gray-400 font-bold text-sm hover:text-orange-500 transition-colors">
                                       <Heart className="w-6 h-6" />
                                       {post.likes?.length || 0}
                                     </button>
                                     <p className="text-[11px] text-gray-400 font-medium ml-auto mt-1">
                                       {post.createdAt ? new Date(post.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Recentemente'}
                                     </p>
                                  </div>
                               </div>
                            );
                          }
                          return null;
                        });
                      })()}
                    </div>
                  </div>
                )}
                <div className="h-20" /> {/* Spacer */}

                  </>
                )}
              </motion.div>
            )}

            {/* Pet Birthday View */}
            {view === 'pet_birthday' && selectedPet && (
              <motion.div key="pet_birthday" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[#FFF8F0] flex flex-col relative overflow-hidden">
                {/* Confetti / Fireworks when it's the birthday */}
                {(() => {
                  const info = getDaysUntilBirthday(selectedPet.birthday);
                  if (!info || info.days !== 0) return null;
                  const emojis = ['🎉','🎊','✨','🐾','🎈','💛','⭐','🎁'];
                  return (
                    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, y: -20, x: `${(i / 24) * 100}vw` as any }}
                          animate={{ opacity: [0, 1, 1, 0], y: '110vh' as any }}
                          transition={{ duration: 2.8 + (i % 5) * 0.4, delay: (i % 8) * 0.15, repeat: Infinity, repeatDelay: 1 }}
                          className="absolute text-2xl"
                          style={{ left: `${(i / 24) * 100}%`, top: `-${30 + (i % 4) * 20}px` }}
                        >
                          {emojis[i % emojis.length]}
                        </motion.span>
                      ))}
                    </div>
                  );
                })()}

                {/* Birthday celebration overlay card */}
                {(() => {
                  const info = getDaysUntilBirthday(selectedPet.birthday);
                  if (!info || info.days !== 0) return null;
                  return (
                    <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/30 backdrop-blur-sm px-8">
                      <motion.div
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl text-center"
                      >
                        <div className="text-6xl mb-4">🎂</div>
                        <h2 className="text-2xl font-black text-orange-500 mb-2">Feliz Aniversário,<br />{selectedPet.name}!</h2>
                        <p className="text-gray-500 text-sm font-medium mb-6">Hoje é um dia muito especial. Que {selectedPet.name} tenha muitos mais anos de alegria, aventuras e muito carinho! 🐾❤️</p>
                        <button
                          onClick={() => setView('dashboard')}
                          className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
                        >
                          Celebrar juntos! 🎊
                        </button>
                      </motion.div>
                    </div>
                  );
                })()}

                {/* Header */}
                <div className="pt-12 px-6 pb-4 flex items-center relative z-10 w-full">
                  <button onClick={() => setView('dashboard')} className="p-2 -ml-2 text-gray-700">
                    <ChevronLeft className="w-8 h-8" strokeWidth={1.5} />
                  </button>
                </div>

                {/* Content */}
                <div className="flex flex-col items-center px-6 relative z-10 w-full mt-2">
                  {/* Photo & Name */}
                  <div className="flex flex-col items-center">
                    <div className="w-28 h-28 rounded-full overflow-hidden mb-3 ring-4 ring-orange-100 shadow-md">
                      <img src={selectedPet.photoUrl} alt={selectedPet.name} className="w-full h-full object-cover" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 mb-1 tracking-tight">{selectedPet.name}</h2>
                    <p className="text-[13px] text-gray-400 font-medium">{calculatePetAge(selectedPet.birthday)}</p>
                  </div>

                  {/* Countdown section */}
                  {(() => {
                    const info = getDaysUntilBirthday(selectedPet.birthday);
                    if (!info) return (
                      <div className="mt-12 text-center">
                        <p className="text-gray-400 text-sm font-medium">Data de nascimento não registrada.</p>
                        <p className="text-gray-300 text-xs mt-1">Adicione a data no perfil do pet para ver a contagem!</p>
                      </div>
                    );
                    const isToday = info.days === 0;
                    return (
                      <div className="mt-10 flex flex-col items-center w-full">
                        <div className="bg-white/80 rounded-[2rem] px-8 py-6 shadow-sm border border-orange-100 text-center w-full max-w-xs">
                          <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">Próximo aniversário</p>
                          <p className="text-sm font-semibold text-gray-600 capitalize mb-5">{info.dateStr.replace('-feira', '').replace('-féira', '').replace(',', '.,')}</p>
                          {isToday ? (
                            <div className="text-center">
                              <span className="text-6xl">🎂</span>
                              <p className="text-lg font-black text-orange-500 mt-3">Hoje é o dia!</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <span className="text-[96px] leading-none font-black text-gray-800 tracking-tighter">{info.days}</span>
                              <span className="text-sm font-semibold text-gray-400 mt-1">{info.days === 1 ? 'dia restante' : 'dias restantes'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* New tiered cake SVG – orange & warm tones, paw prints */}
                <div className="absolute bottom-0 left-0 w-full pointer-events-none z-0" style={{ bottom: '-2px' }}>
                  <svg viewBox="0 0 430 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                    {/* Candle 1 */}
                    <rect x="160" y="60" width="16" height="52" rx="8" fill="#FFAB76" />
                    <ellipse cx="168" cy="52" rx="7" ry="10" fill="#FFD580" />
                    {/* Candle 2 */}
                    <rect x="215" y="48" width="16" height="64" rx="8" fill="#FF8FAB" />
                    <ellipse cx="223" cy="40" rx="7" ry="10" fill="#FFD580" />
                    {/* Candle 3 */}
                    <rect x="270" y="60" width="16" height="52" rx="8" fill="#FFAB76" />
                    <ellipse cx="278" cy="52" rx="7" ry="10" fill="#FFD580" />

                    {/* Top tier */}
                    <rect x="130" y="112" width="170" height="60" rx="20" fill="#FF8FAB" />
                    {/* Top tier frosting drip */}
                    <path d="M140 112 Q160 125 180 112 Q200 99 220 112 Q240 125 260 112 Q280 99 290 112" stroke="#FFF0F5" strokeWidth="6" fill="none" strokeLinecap="round"/>

                    {/* Bottom tier */}
                    <rect x="65" y="172" width="300" height="80" rx="24" fill="#FFAB76" />
                    {/* Bottom tier frosting drip */}
                    <path d="M75 172 Q100 188 125 172 Q150 156 175 172 Q200 188 225 172 Q250 156 275 172 Q300 188 325 172 Q345 156 355 172" stroke="#FFF0F5" strokeWidth="7" fill="none" strokeLinecap="round"/>

                    {/* Base plate */}
                    <ellipse cx="215" cy="254" rx="165" ry="18" fill="#FFD580" opacity="0.6" />

                    {/* Paw prints inside bottom tier */}
                    <circle cx="130" cy="210" r="6" fill="white" opacity="0.35" />
                    <circle cx="120" cy="200" r="3.5" fill="white" opacity="0.35" />
                    <circle cx="132" cy="198" r="3.5" fill="white" opacity="0.35" />
                    <circle cx="144" cy="200" r="3.5" fill="white" opacity="0.35" />

                    <circle cx="300" cy="210" r="6" fill="white" opacity="0.35" />
                    <circle cx="290" cy="200" r="3.5" fill="white" opacity="0.35" />
                    <circle cx="302" cy="198" r="3.5" fill="white" opacity="0.35" />
                    <circle cx="314" cy="200" r="3.5" fill="white" opacity="0.35" />
                  </svg>
                </div>

                {/* Bottom padding so content doesn't sit on cake */}
                <div className="h-60" />
              </motion.div>
            )}

            {/* Lembretes */}
            {view === 'reminders' && (
              <motion.div key="reminders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {selectedPet?.photoUrl && (
                      <img 
                        src={selectedPet.photoUrl} 
                        alt={selectedPet.name} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-orange-500 shadow-sm"
                      />
                    )}
                    <h2 className="text-2xl font-bold text-gray-800">Lembretes</h2>
                  </div>
                  <button
                    onClick={() => setIsAddingReminder(true)}
                    className="p-2 bg-orange-100 text-orange-600 rounded-xl hover:bg-orange-200 transition-colors shadow-sm"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>

                {/* Quick Actions inside Lembretes */}
                {(() => {
                  const currentPet = selectedPet || userPets[currentPetIndex];
                  const birthdayInfo = currentPet ? getDaysUntilBirthday(currentPet.birthday) : null;
                  return (
                    <div
                      onClick={() => {
                        if (currentPet) {
                          setSelectedPet(currentPet);
                          setView('pet_birthday');
                        }
                      }}
                      className="bg-white p-5 rounded-[2.5rem] border border-gray-100 flex items-center justify-between cursor-pointer hover:border-purple-200 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                          <Cake className="w-6 h-6 text-purple-500" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-gray-800">Aniversário</h4>
                          <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                            {birthdayInfo ? `${birthdayInfo.days} dia(s) restante(s)` : 'Sem data definida'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                  );
                })()}

                {/* Dynamic Calendar UI */}
                <div className="bg-gradient-to-br from-orange-400 to-orange-500 p-6 rounded-[2.5rem] shadow-lg text-white border-4 border-white">
                  <div className="flex justify-between items-center mb-6 px-2">
                    <h3 className="font-bold text-lg capitalize">
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
                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5 text-white" />
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
                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                      >
                        <ChevronRight className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-center mb-3">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                      <span key={d} className="text-[11px] font-bold text-orange-100 uppercase">{d}</span>
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
                            className={`aspect-square flex flex-col items-center justify-center text-sm font-bold relative cursor-pointer transition-all ${
                              isSelected ? 'bg-white text-orange-600 shadow-md rounded-xl transform scale-110' :
                              hasEvent ? 'bg-white/90 text-orange-600 shadow-sm rounded-xl' :
                              isToday ? 'bg-orange-300 text-white rounded-xl' : 'hover:bg-white/20 text-orange-50 rounded-xl'
                            }`}
                          >
                            {day}
                            {hasEvent && !isSelected && (
                              <div className="absolute bottom-1 w-1.5 h-1.5 bg-orange-400 rounded-full" />
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
                  <div className="flex-1 flex flex-col bg-white">
                    <div className="flex-1 bg-white rounded-b-[2.5rem] overflow-hidden border-b border-gray-100 shadow-sm relative z-0 min-h-[300px]">
                      {currentLocation ? (
                        <div className="absolute inset-0">
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
                        </div>
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

                    <div className="space-y-4 px-6 relative z-10 pt-4 pb-8">
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
                        <div className="space-y-4">
                          <div className="mb-6">
                            <h3 className="font-bold text-gray-800 mb-4 ml-1">Quem vai passear hoje?</h3>
                            <div className="flex flex-col gap-3">
                              {userPets.map(pet => (
                                <label key={pet.id} className="flex relative items-center justify-between p-4 rounded-2xl hover:bg-orange-50 cursor-pointer transition-all">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-[1rem] overflow-hidden bg-gray-100 border border-gray-200">
                                      <img src={pet.photoUrl || 'https://picsum.photos/seed/pet/100/100'} alt={pet.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                      <span className="font-black text-gray-700 block text-lg">{pet.name}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-center w-6 h-6 mr-1">
                                    <input 
                                      type="checkbox" 
                                      className="w-5 h-5 accent-orange-500 rounded cursor-pointer scale-125 transition-transform"
                                      checked={selectedWalkPets.includes(pet.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedWalkPets([...selectedWalkPets, pet.id]);
                                        } else {
                                          setSelectedWalkPets(selectedWalkPets.filter(id => id !== pet.id));
                                        }
                                      }}
                                    />
                                  </div>
                                </label>
                              ))}
                              {userPets.length === 0 && (
                                <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-2xl">
                                  <p className="text-sm font-medium text-gray-400">Nenhum pet cadastrado.</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Button 
                            onClick={handleStartWalk} 
                            disabled={selectedWalkPets.length === 0 && userPets.length > 0}
                            className="w-full py-6 text-xl rounded-[2rem] shadow-2xl shadow-orange-200"
                          >
                            Iniciar Passeio
                          </Button>
                          <div className="h-32" />
                        </div>
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
                          <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-4 overflow-hidden border-2 border-orange-100 shadow-sm">
                            <img src="./pwa-512x512.png" alt="FocinhoApp" className="w-full h-full object-cover bg-orange-50" />
                          </div>
                          <h3 className="text-3xl font-black text-gray-900">Resumo do Passeio</h3>
                          <p className="text-gray-400 font-medium">
                            {new Date(walkSummary.startTime).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </p>
                        </div>

                        <div className="h-64 bg-gray-50 rounded-[2.5rem] overflow-hidden border border-gray-100 relative shadow-inner">
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

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-gray-50 p-6 rounded-[2rem] text-center border border-gray-100 shadow-sm">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Distância</p>
                            <p className="text-3xl font-black text-orange-500">{walkSummary.distance} km</p>
                          </div>
                          <div className="bg-gray-50 p-6 rounded-[2rem] text-center border border-gray-100 shadow-sm">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Duração</p>
                            <p className="text-3xl font-black text-gray-800">
                              {Math.floor(walkSummary.duration / 60)}m {walkSummary.duration % 60}s
                            </p>
                          </div>
                          <div className="bg-gray-50 p-4 md:p-6 rounded-[2rem] text-center border border-gray-100 shadow-sm flex flex-col justify-center">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Vel Média</p>
                            <p className="text-xl md:text-3xl font-black text-gray-800">{walkSummary.averageSpeed?.toFixed(1) || '0.0'} km/h</p>
                          </div>
                          <div className="bg-gray-50 p-4 md:p-6 rounded-[2rem] text-center border border-gray-100 shadow-sm flex flex-col justify-center">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Elevação</p>
                            <p className="text-xl md:text-3xl font-black text-gray-800">{walkSummary.altitudeGain?.toFixed(0) || '0'} m</p>
                          </div>
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
                      <Button
                        onClick={async () => {
                          if (!user) {
                            window.alert('Você precisa estar logado para postar.');
                            return;
                          }
                          try {
                            setIsGeneratingImage(true);
                            let imgToUpload = generatedWalkImage;
                            if (!imgToUpload) {
                              imgToUpload = await generateSummaryImage();
                            }
                            if (!imgToUpload) throw new Error('Falha ao gerar a imagem');

                            // Buscar o blob
                            const response = await fetch(imgToUpload);
                            const blob = await response.blob();
                            const fileName = `passeio-${user.id}-${Date.now()}.png`;

                            // Fazer upload no storage
                            const { data: uploadData, error: uploadError } = await supabase.storage
                              .from('media')
                              .upload(fileName, blob, { contentType: 'image/png', upsert: true });

                            if (uploadError) throw uploadError;

                            // Pegar a URL pública
                            const { data: publicData } = supabase.storage.from('media').getPublicUrl(uploadData.path);
                            const publicUrl = publicData.publicUrl;

                            // Inserir o post na tabela 'posts'
                            const postId = generateId() + '-walk';
                            const pet = userPets.find(p => p.id === selectedWalkPets[0]);
                            const postData = {
                              id: postId,
                              userId: user.id,
                              userName: ownerProfile?.username || ownerProfile?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
                              userPhoto: typeof ownerProfile?.photoUrl === 'string' ? ownerProfile.photoUrl : user.user_metadata?.avatar_url || '',
                              type: 'walk' as const,
                              content: `Completamos um passeio de ${walkSummary.distance} km em ${Math.floor(walkSummary.duration / 60)}m! 🐾✨`,
                              imageUrl: publicUrl,
                              likes: [],
                              createdAt: new Date().toISOString(),
                              petId: pet?.id || '',
                              petName: pet?.name || ''
                            };

                            const { error: insertError } = await supabase.from('posts').insert(postData);
                            if (insertError) throw insertError;

                            const { data: updatedPosts } = await supabase.from('posts').select('*').order('createdAt', { ascending: false }).limit(50);
                            if (updatedPosts) setPosts(updatedPosts as Post[]);

                            window.alert('Passeio compartilhado na Timeline com sucesso! 🎉');
                            resetWalkState();
                            setView('dashboard');
                          } catch (e) {
                            console.error('Erro ao postar na timeline:', e);
                            window.alert('Ocorreu um erro ao compartilhar. Tente novamente.');
                          } finally {
                            setIsGeneratingImage(false);
                          }
                        }}
                        loading={isGeneratingImage}
                        className="w-full bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 shadow-orange-200 text-white shadow-xl py-4 flex items-center justify-center gap-2 font-bold mb-2"
                      >
                        <span className="text-xl">🚀</span>
                        Postar na Timeline do App
                      </Button>
                      
                      <div className="flex gap-3">
                        <Button
                          onClick={handleDownloadWalkImage}
                          loading={isGeneratingImage}
                          className="flex-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 focus:ring-gray-200 shadow-sm py-4 flex items-center justify-center gap-2"
                        >
                          <Download className="w-5 h-5 text-gray-400" />
                          Salvar Imagem
                        </Button>
                        <Button
                          onClick={resetWalkState}
                          variant="outline"
                          className="flex-1 py-4"
                        >
                          Fechar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Animal Perdido (was SOS/Explorar) */}
            {view === 'lost_pets' && (
              <motion.div key="lost_pets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Alertas</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsAddingSOS(true)}
                      className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
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
                    <h3 className="text-2xl font-black uppercase tracking-tight">Seu amigo está desaparecido?</h3>
                    <p className="text-white/90 text-sm font-medium leading-relaxed">
                      Crie um alerta e deixe a comunidade do FocinhoApp te ajudar a trazer seu amigo de volta.
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
                  <div className="flex items-center justify-between ml-1">
                    <h3 className="font-bold text-gray-800">Alertas na Região</h3>
                  </div>
                  {(() => {
                    const filteredAlerts = lostAlerts.filter(alert => {
                      if (isAdmin || !selectedCity || !alert.city) return true;
                      const cityName = selectedCity.split(' - ')[0].trim().toLowerCase();
                      return alert.city.toLowerCase().includes(cityName);
                    });

                    return filteredAlerts.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4">
                        {filteredAlerts.map((alert) => (
                          <SOSAlertCard
                            key={alert.id}
                            alert={alert}
                            user={user}
                            onOpenFinder={() => openPetFinderById(alert.petId)}
                            onEdit={() => {
                              setEditingSOSId(alert.id);
                              setNewSOS({
                                petId: alert.petId,
                                city: alert.city,
                                lastSeen: alert.lastSeen,
                                reward: alert.reward
                              });
                              setIsAddingSOS(true);
                            }}
                            onFound={() => handleDeleteSOS(alert.id)}
                            onShare={async () => {
                              if (navigator.share) {
                                try {
                                  await navigator.share({
                                    title: `Alerta SOS: ${alert.petName}`,
                                    text: `Alerta SOS: ${alert.petName} desapareceu${alert.city ? ` em ${alert.city}` : ''}. Ajude a encontrar!`,
                                    url: window.location.href,
                                  });
                                } catch (err) { console.log('Error sharing:', err); }
                              } else {
                                window.alert('O compartilhamento não é suportado neste dispositivo.');
                              }
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-8 rounded-[2rem] text-center border border-dashed border-gray-200">
                        <p className="text-gray-400 text-sm">
                          {selectedCity && !isAdmin
                            ? `Nenhum alerta ativo em ${selectedCity.split(' - ')[0]}.`
                            : 'Nenhum alerta ativo no momento.'}
                        </p>
                        {selectedCity && !isAdmin && (
                          <button
                            onClick={() => { setSelectedCity(''); localStorage.removeItem('focinho_selected_city'); }}
                            className="mt-3 text-xs font-bold text-orange-500 underline"
                          >
                            Ver todos os alertas
                          </button>
                        )}
                      </div>
                    );
                  })()}
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
                          setNewSOS({ petId: '', city: '', lastSeen: '', reward: '' });
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
                            setNewSOS({ petId: '', city: '', lastSeen: '', reward: '' });
                          }} className="p-2 hover:bg-gray-100 rounded-full">
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-4">
                          {(() => {
                            const taggedPets = userPets.filter(p => !!p.tagId);
                            if (taggedPets.length === 0) {
                              return (
                                <div className="space-y-6">
                                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center space-y-2">
                                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                                    <p className="text-sm font-bold text-red-600">Nenhum pet com Pingente ativado</p>
                                    <p className="text-xs text-red-400 leading-relaxed">Para gerar um alerta SOS, seu pet precisa ter um Pingente Inteligente FocinhoApp ativado. Adquira já!</p>
                                  </div>
                                  <Button onClick={() => setIsAddingSOS(false)} variant="primary" className="w-full bg-red-600 hover:bg-red-700 text-white">
                                    Fechar
                                  </Button>
                                </div>
                              );
                            }
                            return (
                              <>
                                <Select
                                  label="Qual Pet fugiu?"
                                  value={newSOS.petId}
                                  onChange={(v: string) => setNewSOS(prev => ({ ...prev, petId: v }))}
                                  options={taggedPets.map(p => ({ label: p.name, value: p.id }))}
                                  icon={Dog}
                                />
                                <div className="relative">
                                  <CityStatePicker
                                    label="Cidade do alerta"
                                    state={newSOS.city ? (newSOS.city.includes(' - ') ? newSOS.city.split(' - ')[1] : '') : ''}
                                    city={newSOS.city ? (newSOS.city.includes(' - ') ? newSOS.city.split(' - ')[0] : newSOS.city) : ''}
                                    onStateChange={(s) => {
                                      const currentCity = newSOS.city?.includes(' - ') ? newSOS.city.split(' - ')[0] : newSOS.city || '';
                                      setNewSOS(prev => ({ ...prev, city: currentCity ? `${currentCity} - ${s}` : s }));
                                    }}
                                    onCityChange={(c) => {
                                      const currentState = newSOS.city?.includes(' - ') ? newSOS.city.split(' - ')[1] : '';
                                      setNewSOS(prev => ({ ...prev, city: currentState ? `${c} - ${currentState}` : c }));
                                    }}
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
                                <div className="pt-2">
                                  <Button onClick={handleSaveSOS} loading={loading} variant="danger" className="w-full">
                                    {editingSOSId ? 'Atualizar Alerta' : 'Publicar Alerta SOS'}
                                  </Button>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Explorar - REMOVED AS PER REQUEST */}

            {/* Conta (Account) */}
            {view === 'account' && user && (
              <motion.div key="account" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24">
                
                {accountSubView === 'menu' && (
                  <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 flex flex-col overflow-hidden mb-6">
                    {/* Facebook-style Profile Header */}
                    <div className="relative">
                      {/* Cover Photo */}
                      <div className="h-32 bg-gradient-to-r from-orange-400 to-pink-500 w-full relative">
                        {/* Settings Dropdown */}
                        <div className="absolute top-4 right-4 z-20">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === 'account-settings' ? null : 'account-settings')}
                            className="w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/30 transition-colors"
                            title="Configurações"
                          >
                            <Settings className="w-5 h-5" />
                          </button>
                          {openMenuId === 'account-settings' && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                                <button
                                  onClick={() => { setOpenMenuId(null); setAccountSubView('support'); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm font-bold text-gray-700 transition-colors"
                                >
                                  <HelpCircle className="w-4 h-4 text-green-500" /> Suporte
                                </button>
                                <button
                                  onClick={() => { setOpenMenuId(null); setAccountSubView('config'); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm font-bold text-gray-700 transition-colors border-t border-gray-50"
                                >
                                  <Settings className="w-4 h-4 text-gray-500" /> Configurações
                                </button>
                                <button
                                  onClick={() => { setOpenMenuId(null); setAccountSubView('sobre'); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm font-bold text-gray-700 transition-colors border-t border-gray-50"
                                >
                                  <Info className="w-4 h-4 text-orange-400" /> Sobre
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="px-4 pt-0 pb-6 border-b border-gray-100">
                        {/* Profile Photo and Name/Stats row */}
                        <div className="flex items-end gap-3 -mt-12 mb-3 relative z-10">
                          <div className="w-[104px] h-[104px] rounded-full border-4 border-white bg-gray-100 overflow-hidden shrink-0 shadow-sm relative">
                            {ownerProfile?.photoUrl ? (
                              <img src={ownerProfile.photoUrl} alt="Perfil" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                <UserIcon className="w-12 h-12 text-gray-300" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 pb-2">
                            <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                              {ownerProfile?.name || user?.user_metadata?.full_name || 'Tutor do Pet'}
                            </h2>
                            <div className="text-[15px] font-semibold text-gray-800 mt-0.5">
                              0 amigos <span className="font-normal text-gray-500 mx-1">•</span> 0 posts
                            </div>
                          </div>
                        </div>

                        {/* Bio */}
                        <div className="text-[15px] text-gray-900 mb-2 px-1 whitespace-pre-wrap">
                          {ownerProfile?.bio || (ownerProfile?.username ? `INSTAGRAM @${ownerProfile.username}` : 'Escreva algo sobre você...')}
                        </div>
                        
                        {/* Location */}
                        {ownerProfile?.city && (
                          <div className="flex items-center gap-1.5 mb-4 px-1 text-[15px] font-semibold text-gray-900">
                            <MapPin className="w-5 h-5 text-gray-900" style={{ fill: 'currentColor', stroke: 'white', strokeWidth: 1.5 }} />
                            {ownerProfile.city}
                          </div>
                        )}

                        {/* Buttons (Full Width) */}
                        <div className="flex gap-2 px-1 mt-4">
                          <button 
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
                          >
                            <Plus className="w-5 h-5" /> Adicionar amigo
                          </button>
                          <button 
                            onClick={() => setAccountSubView('profile')} 
                            className="flex-1 bg-[#E4E6EB] hover:bg-[#D8DADF] text-gray-900 font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
                          >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                            </svg>
                            Editar perfil
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Menu List */}
                    <div className="flex flex-col">

                    <button
                      onClick={() => setAccountSubView('pets')}
                      className="p-5 md:p-6 flex items-center gap-4 hover:bg-gray-50 transition-all text-left border-b border-gray-50 last:border-b-0 relative group"
                    >
                      <Dog className="w-6 h-6 text-gray-900 shrink-0 group-hover:scale-110 transition-transform" />
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">Meus Pets</h4>
                        <p className="text-xs text-gray-400">Gerenciar todos os seus pets</p>
                      </div>
                      <ChevronRight className="text-gray-300" />
                    </button>

                    <button
                      onClick={() => setAccountSubView('store')}
                      className="p-5 md:p-6 flex items-center gap-4 hover:bg-gray-50 transition-all text-left border-b border-gray-50 last:border-b-0 relative group"
                    >
                      <ShoppingBag className="w-6 h-6 text-gray-900 shrink-0 group-hover:scale-110 transition-transform" />
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">Loja</h4>
                        <p className="text-xs text-gray-400">Acessórios e novas tags</p>
                      </div>
                      <ChevronRight className="text-gray-300" />
                    </button>

                    <button
                      onClick={() => setAccountSubView('family')}
                      className="p-5 md:p-6 flex items-center gap-4 hover:bg-gray-50 transition-all text-left border-b border-gray-50 last:border-b-0 relative group"
                    >
                      <Users className="w-6 h-6 text-gray-900 shrink-0 group-hover:scale-110 transition-transform" />
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">Minha Família</h4>
                        <p className="text-xs text-gray-400">Gerenciar membros e convites</p>
                      </div>
                      <ChevronRight className="text-gray-300" />
                    </button>

                    <button
                      onClick={() => setAccountSubView('adoption')}
                      className="p-5 md:p-6 flex items-center gap-4 hover:bg-gray-50 transition-all text-left border-b border-gray-50 last:border-b-0 relative group"
                    >
                      <Heart className="w-6 h-6 text-gray-900 shrink-0 group-hover:scale-110 transition-transform" />
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">Adoção</h4>
                        <p className="text-xs text-gray-400">Encontre um novo amigo</p>
                      </div>
                      <ChevronRight className="text-gray-300" />
                    </button>

                    <button
                      onClick={() => setAccountSubView('events')}
                      className="p-5 md:p-6 flex items-center gap-4 hover:bg-gray-50 transition-all text-left border-b border-gray-50 last:border-b-0 relative group"
                    >
                      <Calendar className="w-6 h-6 text-gray-900 shrink-0 group-hover:scale-110 transition-transform" />
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">Eventos</h4>
                        <p className="text-xs text-gray-400">Encontros na comunidade</p>
                      </div>
                      <ChevronRight className="text-gray-300" />
                    </button>

                    <button
                      onClick={() => setAccountSubView('partners')}
                      className="p-5 md:p-6 flex items-center gap-4 hover:bg-gray-50 transition-all text-left border-b border-gray-50 last:border-b-0 relative group"
                    >
                      <Briefcase className="w-6 h-6 text-gray-900 shrink-0 group-hover:scale-110 transition-transform" />
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">Parceiros</h4>
                        <p className="text-xs text-gray-400">Apoiam a causa animal</p>
                      </div>
                      <ChevronRight className="text-gray-300" />
                    </button>
                    </div>
                  </div>
                )}

                {accountSubView === 'family' && (
                  <motion.div
                    key="family"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <button onClick={() => setAccountSubView('menu')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ChevronLeft className="w-6 h-6 text-gray-600" />
                      </button>
                      <h2 className="text-2xl font-bold text-gray-800">Minha Família Criada</h2>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6 pb-24">
                      {userFamilies.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-bold text-gray-800 mb-2">Você ainda não tem uma família</h3>
                          <p className="text-sm text-gray-500 mb-6">Crie uma família para compartilhar pets com outros membros, ou entre em uma família existente.</p>
                          <div className="space-y-4">
                            <Button onClick={handleCreateFamily} className="w-full py-3" loading={creatingFamily}>Criar Nova Família</Button>
                            <div className="relative">
                              <div className="absolute inset-x-0 top-1/2 h-px bg-gray-200" />
                              <span className="relative bg-white px-4 text-xs font-medium text-gray-400">OU</span>
                            </div>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Código da Família (Ex: RBYMJO)"
                                value={inviteCodeInput}
                                onChange={setInviteCodeInput}
                              />
                              <Button onClick={handleJoinFamily} variant="secondary" loading={joiningFamily}>Entrar</Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="divide-y divide-gray-100">
                            <div className="flex justify-between items-center py-4">
                              <span className="text-gray-600">Nome da Família</span>
                              <span className="font-medium text-gray-800">{userFamilies[0].name}</span>
                            </div>
                            <div className="flex justify-between items-center py-4">
                              <span className="text-gray-600">Animais</span>
                              <span className="font-medium text-gray-800">{userPets.length > 0 ? userPets.map(p => p.name).join(', ') : 'Nenhum'}</span>
                            </div>
                          </div>

                          <div className="mt-8">
                            <h4 className="text-sm font-semibold text-gray-400 mb-4 px-2">Membros da Família</h4>
                            <div className="space-y-2">
                              {/* Invite Item */}
                              <button onClick={() => setShowInviteModal(true)} className="w-full flex items-center gap-4 py-3 px-2 hover:bg-gray-50 rounded-xl transition-colors">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                                  <Plus className="w-5 h-5 text-blue-600" />
                                </div>
                                <span className="font-medium text-blue-600 flex-1 text-left">Convidar Membros</span>
                              </button>

                              {/* Members List */}
                              {familyMembersInfo.map((member, idx) => (
                                <div key={idx} className="flex items-center gap-4 py-3 px-2">
                                  <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center border border-gray-200">
                                    {member.photoUrl ? (
                                      <img src={member.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                                    ) : (
                                      <UserIcon className="w-5 h-5 text-gray-400" />
                                    )}
                                  </div>
                                  <span className="font-medium text-gray-800 flex-1">{member.name} {member.user_id === user.id && '(Você)'}</span>
                                  {userFamilies[0].owner_id === member.user_id ? (
                                    <span className="text-xs text-gray-400 font-medium bg-gray-100 px-3 py-1 rounded-full">Proprietário</span>
                                  ) : (
                                    userFamilies[0].owner_id === user?.id && (
                                      <button 
                                        onClick={() => handleRemoveMember(userFamilies[0].id, member.user_id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors flex items-center justify-center relative -mr-2"
                                        title="Remover Membro"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )
                                  )}
                                </div>
                              ))}
                            </div>

                            {userFamilies[0].owner_id === user?.id && (
                              <button 
                                onClick={() => handleDeleteFamily(userFamilies[0].id)}
                                className="w-full mt-8 py-4 border-2 border-red-100 text-red-600 rounded-2xl font-bold hover:bg-red-50 transition-colors flex justify-center items-center gap-2"
                              >
                                <Trash2 className="w-5 h-5" />
                                Excluir Família
                              </button>
                            )}
                          </div>

                          {/* Invite Modal Overlay */}
                          <AnimatePresence>
                            {showInviteModal && userFamilies.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[100] bg-white pt-12 px-6 pb-6 overflow-y-auto"
                              >
                                <div className="flex items-center gap-4 mb-8">
                                  <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <ChevronLeft className="w-6 h-6 text-gray-600" />
                                  </button>
                                  <h2 className="text-2xl font-bold text-gray-800">Convidar Membros</h2>
                                </div>

                                <div className="text-center mb-8">
                                  <div className="w-48 h-32 mx-auto bg-indigo-50 rounded-[2rem] mb-6 flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-blue-100 rotate-12 scale-150 origin-bottom-left" />
                                    <div className="relative z-10 w-24 h-16 bg-white shadow-sm rounded-xl flex items-center justify-center">
                                      <span className="font-bold text-blue-600 text-sm whitespace-pre-line">Invite\nMembers</span>
                                    </div>
                                    <div className="absolute bottom-0 w-full h-1/3 bg-red-400 opacity-90 z-20" />
                                  </div>
                                  <h3 className="font-bold text-xl text-gray-800 mb-2">{userFamilies[0].name}</h3>
                                  <p className="text-gray-500 text-sm px-4">Gerencie seus animais com membros da família e amigos</p>
                                </div>

                                <div className="bg-[#fcf8ef] p-6 rounded-3xl mb-6 shadow-sm border border-[#f5eeda]">
                                  <div className="flex justify-between items-center mb-6">
                                    <span className="font-medium text-gray-800">Código da Família</span>
                                    <button onClick={() => regenerateFamilyCode(userFamilies[0].id)} className="text-[#0a327d] font-medium text-sm">Refazer</button>
                                  </div>
                                  <div className="flex justify-center items-center gap-3 mb-6">
                                    <span className="text-3xl font-mono tracking-[0.3em] text-gray-800 font-bold ml-3">{userFamilies[0].invite_code.split('').join(' ')}</span>
                                    <button 
                                      onClick={() => {
                                        navigator.clipboard.writeText(userFamilies[0].invite_code);
                                        alert('Código copiado!');
                                      }} 
                                      className="p-2 text-[#0a327d] hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                      <Copy className="w-5 h-5" />
                                    </button>
                                  </div>
                                  <Button onClick={() => {
                                    if (navigator.share) {
                                      navigator.share({
                                        title: 'Entrar na minha Família no FocinhoApp',
                                        text: `Use o código ${userFamilies[0].invite_code} para gerenciar nossos pets juntos no FocinhoApp!`,
                                      });
                                    }
                                  }} className="w-full py-4 bg-[#0a327d] hover:bg-[#072459] text-white border-0 text-lg">
                                    Convidar
                                  </Button>
                                </div>

                                <div className="bg-[#fcf8ef] p-6 rounded-3xl shadow-sm border border-[#f5eeda] mb-8">
                                  <h4 className="font-medium text-gray-500 mb-6">Como Funciona</h4>
                                  <div className="space-y-8">
                                    <div>
                                      <p className="text-sm text-gray-600 mb-4 leading-relaxed font-medium">1. Envie o código da família para amigos por email, mensagem ou outros meios.</p>
                                      <div className="w-32 h-24 mx-auto relative flex justify-center items-center">
                                        <div className="absolute w-20 h-20 bg-[#fed15c] rounded-full -left-2 opacity-80" />
                                        <div className="absolute w-20 h-20 bg-[#4db5ff] rounded-full -right-2 opacity-80" />
                                        <Share2 className="w-8 h-8 text-white relative z-10 stroke-2" />
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600 mb-4 leading-relaxed font-medium">2. Baixe o aplicativo, registre-se e entre na família. Insira o código da família para solicitar a entrada.</p>
                                      <div className="w-32 h-24 mx-auto relative flex justify-center items-end pb-2">
                                        <div className="w-16 h-20 bg-[#4e8dd6] rounded-xl relative z-10 flex flex-col justify-between p-2">
                                          <div className="flex justify-between"><div className="w-3 h-3 bg-white rounded-full opacity-50 block"/><div className="w-3 h-3 bg-white rounded-full block"/></div>
                                          <div className="flex justify-between"><div className="w-3 h-3 bg-white rounded-full block"/><div className="w-3 h-3 bg-white rounded-full opacity-50 block"/></div>
                                        </div>
                                        <div className="absolute bottom-0 w-24 h-12 flex justify-between px-1 z-20">
                                          <div className="w-4 h-8 bg-[#fed15c] rounded-t-lg rotate-12" />
                                          <div className="w-4 h-8 bg-[#fed15c] rounded-t-lg -rotate-12" />
                                        </div>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600 mb-4 leading-relaxed font-medium">3. Após entrar na família, visualize colaborativamente as atividades dos pets e gerencie os animais juntos.</p>
                                      <div className="w-32 h-28 mx-auto relative flex justify-center items-center">
                                        <div className="w-14 h-24 bg-white border border-[#4e8dd6] rounded-xl overflow-hidden shadow-sm flex flex-col">
                                          <div className="h-6 bg-[#4e8dd6] w-full" />
                                          <div className="p-1 space-y-1 mt-1">
                                            <div className="w-3 h-3 bg-gray-200 rounded-full" />
                                            <div className="w-full h-1 bg-gray-100 rounded" />
                                            <div className="w-full h-1 bg-gray-100 rounded" />
                                          </div>
                                        </div>
                                        <div className="absolute w-full h-[1px] bg-gray-200 top-1/2 -z-10 rotate-12" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                    </div>
                  </motion.div>
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
                        <Input
                          label="Nome de Usuário (@)"
                          placeholder="ex: seunome123"
                          value={ownerProfile?.username || ''}
                          onChange={(v: string) => setOwnerProfile(prev => ({ ...prev, username: v.toLowerCase().replace(/[^a-z0-9_.]/g, '') } as any))}
                          icon={AtSign}
                        />
                        <div className="w-full">
                          <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                            Biografia
                          </label>
                          <textarea
                            className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all text-[15px] font-medium resize-none h-24"
                            placeholder="Escreva algo sobre você..."
                            value={ownerProfile?.bio || ''}
                            onChange={(e) => setOwnerProfile(prev => ({ ...prev, bio: e.target.value } as any))}
                          />
                        </div>
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
                        <CityStatePicker
                          label="Estado / Cidade"
                          state={ownerProfile?.state || ''}
                          city={ownerProfile?.city || ''}
                          onStateChange={(v) => setOwnerProfile(prev => ({ ...prev, state: v } as any))}
                          onCityChange={(v) => setOwnerProfile(prev => ({ ...prev, city: v } as any))}
                        />
                        <Input
                          label="Endereço"
                          placeholder="Rua, Número, Bairro..."
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
                              if (isAdmin || !selectedCity || !p.location) return true;
                              const cityName = selectedCity.split(' - ')[0].trim().toLowerCase();
                              return p.location.toLowerCase().includes(cityName);
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
                            if (isAdmin || !selectedCity || !p.location) return true;
                            const cityName = selectedCity.split(' - ')[0].trim().toLowerCase();
                            return p.location.toLowerCase().includes(cityName);
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

                {accountSubView === 'sobre' && (
                  <div className="space-y-6">
                    <button onClick={() => setAccountSubView('menu')} className="flex items-center gap-2 text-orange-500 font-bold text-sm">
                      <ChevronLeft className="w-4 h-4" /> Voltar ao menu
                    </button>

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
                      {/* App icon centered */}
                      <div className="flex flex-col items-center gap-3 pb-4 border-b border-gray-100">
                        <img src="./pwa-512x512.png" alt="FocinhoApp" className="w-20 h-20 object-cover rounded-[1.5rem] shadow-lg" />
                        <div className="text-center">
                          <p className="font-black text-gray-900 text-lg">FocinhoApp</p>
                          <p className="text-xs text-gray-400">Proteja quem você ama</p>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-3">
                        <button
                          onClick={() => window.open('https://focinhoapp.com/termos', '_blank')}
                          className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-orange-50 hover:border-orange-100 border border-transparent transition-all text-left"
                        >
                          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                            <FileText className="w-5 h-5 text-orange-500" />
                          </div>
                          <span className="flex-1 font-semibold text-gray-800 text-sm">Termos de Serviço</span>
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </button>

                        <button
                          onClick={() => window.open('https://focinhoapp.com/privacidade', '_blank')}
                          className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-orange-50 hover:border-orange-100 border border-transparent transition-all text-left"
                        >
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5 text-blue-500" />
                          </div>
                          <span className="flex-1 font-semibold text-gray-800 text-sm">Política de Privacidade</span>
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </button>

                        <button
                          onClick={() => {
                            localStorage.clear();
                            sessionStorage.clear();
                            alert('Cache limpo com sucesso!');
                          }}
                          className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-red-50 hover:border-red-100 border border-transparent transition-all text-left"
                        >
                          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-red-400" />
                          </div>
                          <span className="flex-1 font-semibold text-gray-800 text-sm">Limpar Cache</span>
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </button>
                      </div>
                    </div>
                    <div className="h-20" />
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

                      {products.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                          {products.map(item => {
                            const message = encodeURIComponent(`Olá! Gostaria de saber mais sobre o produto: *${item.name}* (Ref: Lojinha Focinho)`);
                            const waLink = `https://wa.me/5521988853407?text=${message}`;
                            return (
                              <a 
                                key={item.id}
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-gray-50 p-4 rounded-3xl border border-gray-100 space-y-3 hover:border-purple-200 transition-colors group block relative"
                              >
                                <div className="absolute top-2 right-2 bg-purple-100 text-purple-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-lg z-10">
                                  {item.category}
                                </div>
                                <div className="relative w-full aspect-square bg-white rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden">
                                  {item.image_url ? (
                                    <img src={item.image_url} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                                  ) : (
                                    <ShoppingBag className="w-8 h-8 text-purple-300 relative z-10" />
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-bold text-xs truncate" title={item.name}>{item.name}</h4>
                                  <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2 leading-snug">{item.description}</p>
                                  <p className="text-xs text-purple-600 font-black mt-2">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.price))}
                                  </p>
                                </div>
                              </a>
                            );
                          })}
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

                {accountSubView === 'events' && (
                  <div className="space-y-6">
                    <button onClick={() => setAccountSubView('menu')} className="flex items-center gap-2 text-orange-500 font-bold text-sm">
                      <ChevronLeft className="w-4 h-4" /> Voltar ao menu
                    </button>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-blue-500" />
                        </div>
                        <h3 className="font-bold text-xl">Eventos da Comunidade</h3>
                      </div>

                      {petEvents.length === 0 ? (
                        <div className="bg-blue-50 p-6 rounded-[2rem] text-center border-2 border-dashed border-blue-200">
                          <p className="text-blue-800 font-bold text-sm">Nenhum evento próximo</p>
                          <p className="text-blue-600 text-xs mt-1">Fique de olho! Em breve teremos encontros de pets na sua região.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {petEvents.map(ev => (
                            <div key={ev.id} className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
                              {ev.imageUrl && (
                                <div className="w-full aspect-video overflow-hidden">
                                  <img src={ev.imageUrl} alt={ev.title} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="p-5">
                                <h4 className="font-black text-gray-900 text-lg mb-1">{ev.title}</h4>
                                {ev.description && <p className="text-sm text-gray-500 mb-3">{ev.description}</p>}
                                <div className="flex flex-wrap gap-2">
                                  {ev.event_date && (
                                    <span className="bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-full">
                                      📅 {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(ev.event_date + 'T12:00:00'))}
                                    </span>
                                  )}
                                  {ev.location && (
                                    <span className="bg-orange-50 text-orange-600 text-xs font-bold px-3 py-1.5 rounded-full">
                                      📍 {ev.location}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="h-20" />
                  </div>
                )}

                {accountSubView === 'adoption' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <button onClick={() => setAccountSubView('menu')} className="flex items-center gap-2 text-orange-500 font-bold text-sm">
                        <ChevronLeft className="w-4 h-4" /> Voltar ao menu
                      </button>
                      <Button
                        onClick={() => setIsAddingAdoptionPet(true)}
                        variant="secondary"
                        className="!px-4 !py-2 text-xs"
                      >
                        <Plus className="w-4 h-4" /> Divulgar Pet
                      </Button>
                    </div>

                    {/* ── Focused Pet Profile (when coming from feed) ── */}
                    {adoptionFocusPet && (() => {
                      const fp = adoptionPets.find(p => p.id === adoptionFocusPet);
                      if (!fp) return null;
                      return (
                        <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-pink-100">
                          {/* Back button */}
                          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                            <button onClick={() => setAdoptionFocusPet(null)} className="flex items-center gap-1.5 text-pink-500 font-bold text-sm">
                              <ChevronLeft className="w-4 h-4" /> Voltar para lista
                            </button>
                          </div>
                          {/* Photo */}
                          <div className="w-full aspect-square bg-gray-100 relative">
                            <img src={fp.photoUrl || 'https://picsum.photos/seed/pet/800/600'} alt={fp.name} className="w-full h-full object-cover" />
                            <div className="absolute top-3 left-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase shadow-lg">
                              Para Adoção
                            </div>
                          </div>
                          {/* Info */}
                          <div className="px-5 py-4 space-y-3">
                            <div>
                              <h2 className="text-2xl font-black text-gray-900">{fp.name}</h2>
                              <p className="text-sm text-gray-500 font-bold mt-0.5">{fp.breed} • {fp.gender} • {fp.city}</p>
                            </div>
                            {fp.description && (
                              <p className="text-sm text-gray-700 leading-relaxed">{fp.description}</p>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                              {fp.size && <div className="bg-gray-50 rounded-2xl p-3"><p className="text-[10px] text-gray-400 font-bold uppercase">Porte</p><p className="font-bold text-gray-800 text-sm mt-0.5">{fp.size}</p></div>}
                              {fp.age && <div className="bg-gray-50 rounded-2xl p-3"><p className="text-[10px] text-gray-400 font-bold uppercase">Idade</p><p className="font-bold text-gray-800 text-sm mt-0.5">{fp.age}</p></div>}
                              {fp.color && <div className="bg-gray-50 rounded-2xl p-3"><p className="text-[10px] text-gray-400 font-bold uppercase">Cor</p><p className="font-bold text-gray-800 text-sm mt-0.5">{fp.color}</p></div>}
                              {fp.location && <div className="bg-gray-50 rounded-2xl p-3"><p className="text-[10px] text-gray-400 font-bold uppercase">Localização</p><p className="font-bold text-gray-800 text-sm mt-0.5">{fp.location}</p></div>}
                            </div>
                            <button
                              onClick={() => {
                                const phone = (fp.contactPhone || '').replace(/\D/g, '');
                                if (!phone) { window.alert('Este pet não possui telefone de contato.'); return; }
                                window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(`Olá! Queria falar sobre a adoção do ${fp.name}.`)}`, '_blank');
                              }}
                              className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-pink-100"
                            >
                              <MessageCircle className="w-5 h-5" /> Quero Adotar {fp.name}
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="space-y-5">
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
                        {/* Tabs */}
                        <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-6">
                          <button
                            onClick={() => setAdoptionTab('available')}
                            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${adoptionTab === 'available' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                            Disponíveis
                          </button>
                          <button
                            onClick={() => setAdoptionTab('adopted')}
                            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${adoptionTab === 'adopted' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                            Já Adotados ❤️
                          </button>
                        </div>

                        {/* Pets Loop */}
                        <div className="space-y-4">
                          <h4 className="font-black text-xs text-gray-400 uppercase tracking-widest ml-1">{adoptionTab === 'available' ? 'Pets Disponíveis' : 'Finais Felizes 🎉'}</h4>
                          <div className="grid grid-cols-1 gap-6">
                            {(() => {
                              const cityName = selectedCity && !isAdmin ? selectedCity.split(' - ')[0].trim().toLowerCase() : '';
                              const visiblePets = adoptionPets.filter(p => {
                                const isTargetTab = adoptionTab === 'adopted' ? p.status === 'adopted' : (p.status === 'available' || p.status === undefined);
                                if (!isTargetTab) return false;
                                if (!cityName) return true;
                                return (p.location || '').toLowerCase().includes(cityName) || (p.city || '').toLowerCase().includes(cityName);
                              });
                              return visiblePets.length > 0 ? visiblePets.map((pet, i) => (
                              <div key={i} className={`bg-white rounded-[2rem] overflow-hidden shadow-sm mb-6 ${adoptionTab === 'adopted' ? 'opacity-80 grayscale-[0.2]' : ''}`}>
                                {/* ── Header: Owner Info ── */}
                                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                                  <div className="flex items-center gap-3">
                                    <div className="relative">
                                      {pet.ownerPhotoUrl ? (
                                        <img src={pet.ownerPhotoUrl} alt="Tutor" className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                                      ) : (
                                        <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center border border-pink-100">
                                          <UserIcon className="w-5 h-5 text-pink-300" />
                                        </div>
                                      )}
                                      <div className="absolute -bottom-1 -right-1 bg-pink-500 rounded-full p-1 border-2 border-white">
                                        <Heart className="w-2.5 h-2.5 text-white" />
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1">
                                        {pet.ownerUsername || pet.ownerName || 'Tutor do Pet'}
                                        <CheckCircle2 className="w-4 h-4 text-pink-500" />
                                      </h4>
                                      <p className="text-[10px] text-gray-500 font-bold">
                                        {pet.city || 'Desconhecido'}
                                      </p>
                                    </div>
                                  </div>
                                  {/* 3 dots menu for admin */}
                                  {isAdmin && (
                                    <div className="relative">
                                      <button 
                                        onClick={() => setOpenMenuId(openMenuId === `adoption-${pet.id}` ? null : `adoption-${pet.id}`)}
                                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-50"
                                      >
                                        <MoreVertical className="w-5 h-5" />
                                      </button>
                                      {openMenuId === `adoption-${pet.id}` && (
                                        <>
                                        <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                                          <button
                                            onClick={() => {
                                              setOpenMenuId(null);
                                              setEditingAdoptionPetId(pet.id);
                                              setNewAdoptionPet({ ...pet });
                                              setIsAddingAdoptionPet(true);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                          >
                                            <Edit2 className="w-4 h-4" /> Editar
                                          </button>
                                          <button
                                            onClick={() => {
                                              setOpenMenuId(null);
                                              handleUpdateAdoptionStatus(pet.id, adoptionTab === 'available' ? 'adopted' : 'available');
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                          >
                                            <CheckCircle2 className={`w-4 h-4 ${adoptionTab === 'available' ? 'text-green-500' : 'text-gray-400'}`} /> {adoptionTab === 'available' ? 'Marcar Adotado' : 'Voltar p/ Disponível'}
                                          </button>
                                          <button
                                            onClick={async () => {
                                              setOpenMenuId(null);
                                              if (window.confirm('Excluir ' + pet.name + ' para adoção?')) {
                                                await supabase.from('adoption_pets').delete().eq('id', pet.id);
                                                setAdoptionPets(prev => prev.filter(p => p.id !== pet.id));
                                              }
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                                          >
                                            <Trash2 className="w-4 h-4" /> Excluir
                                          </button>
                                        </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* ── Full-width Photo ── */}
                                <div className="w-full aspect-square bg-gray-100 relative cursor-pointer" onClick={() => setLightboxImage(pet.gallery && pet.gallery.length > 0 ? pet.gallery[0] : pet.photoUrl || '')}>
                                  {pet.gallery && pet.gallery.length > 1 ? (
                                    <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] h-full">
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
                                  
                                  {/* Instagram-style multi-photo indicator */}
                                  {pet.gallery && pet.gallery.length > 1 && (
                                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md rounded-full p-1.5 shadow-lg pointer-events-none">
                                      <Copy className="w-3.5 h-3.5 text-white" />
                                    </div>
                                  )}
                                </div>

                                {/* ── Action Buttons ── */}
                                <div className="flex items-center gap-4 px-4 pt-3 pb-1">
                                  <div className={`flex items-center gap-1.5 font-bold text-sm ${adoptionTab === 'available' ? 'text-green-600' : 'text-gray-500'}`}>
                                    <CheckCircle2 className="w-6 h-6" />
                                    {adoptionTab === 'available' ? 'Disponível' : 'Já Adotado'}
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (navigator.share) {
                                        try {
                                          await navigator.share({
                                            title: `Ação de Adoção: ${pet.name}`,
                                            text: `Conheça ${pet.name}, um pet lindo que está na plataforma!`,
                                            url: window.location.href,
                                          });
                                        } catch (err) {
                                          console.log('Error sharing:', err);
                                        }
                                      } else {
                                        alert('O compartilhamento não é suportado neste dispositivo.');
                                      }
                                    }}
                                    className="flex items-center gap-1.5 text-gray-500 font-bold text-sm hover:text-gray-700 transition-colors"
                                  >
                                    <Share2 className="w-5 h-5" />
                                    Compartilhar
                                  </button>
                                  {adoptionTab === 'available' && (
                                    <button
                                      onClick={() => {
                                        const phone = (pet.contactPhone || '').replace(/\D/g, '');
                                        if (!phone) { alert('Este pet não possui telefone de contato.'); return; }
                                        window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(`Olá! Queria falar sobre a adoção do ${pet.name}.`)}`, '_blank');
                                      }}
                                      className="ml-auto flex items-center gap-1.5 text-pink-600 font-bold text-sm hover:text-pink-700 transition-colors"
                                    >
                                      <MessageCircle className="w-5 h-5" />
                                      Adotar
                                    </button>
                                  )}
                                </div>

                                {/* ── Caption ── */}
                                <div className="px-4 pb-4 pt-1 space-y-2">
                                  <p className="text-sm text-gray-800 font-medium leading-snug">
                                    <span className="font-black text-gray-900">{pet.name}</span>{' '}
                                    <span className="text-gray-600 font-bold">({pet.breed} • {pet.gender} • {pet.age || 'Idade desconhecida'})</span>{' '}
                                    {pet.description}
                                  </p>
                                  <p className="text-[11px] text-gray-400 font-medium pt-1">
                                    {pet.createdAt ? new Date(pet.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Recentemente'}
                                  </p>
                                </div>
                              </div>
                            )) : (
                                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem] p-8 text-center">
                                  <p className="text-gray-400 text-sm font-medium">Nenhum pet disponível para adoção {selectedCity && !isAdmin ? `em ${selectedCity.split(' - ')[0]}` : ''} no momento.</p>
                                  {selectedCity && !isAdmin && (
                                    <button
                                      onClick={() => { setCityInputTemp(''); setSelectedCity(''); localStorage.removeItem('focinho_selected_city'); }}
                                      className="mt-3 text-xs font-bold text-orange-500 underline"
                                    >
                                      Ver de todas as cidades
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
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
                                    tagId = `${getRandom(letters, 3)}${getRandom(numbers, 3)}`;
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

                        {/* Bulk selection toolbar */}
                        {selectedTagIds.size > 0 && (
                          <div className="flex items-center gap-2 bg-orange-500 text-white rounded-2xl px-4 py-3 shadow-lg shadow-orange-200 mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <CheckCircle2 className="w-5 h-5 shrink-0" />
                              <span className="text-sm font-black truncate">{selectedTagIds.size} selecionado(s)</span>
                            </div>
                            <button
                              onClick={() => {
                                const pageIds = allTags.slice((adminTagsPage - 1) * 20, adminTagsPage * 20).map(t => t.id);
                                const allPageSelected = pageIds.every(id => selectedTagIds.has(id));
                                setSelectedTagIds(prev => {
                                  const next = new Set(prev);
                                  if (allPageSelected) {
                                    pageIds.forEach(id => next.delete(id));
                                  } else {
                                    pageIds.forEach(id => next.add(id));
                                  }
                                  return next;
                                });
                              }}
                              className="text-[11px] font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl transition-colors shrink-0"
                            >
                              {allTags.slice((adminTagsPage - 1) * 20, adminTagsPage * 20).every(t => selectedTagIds.has(t.id)) ? 'Desmarcar pág.' : 'Selecionar pág.'}
                            </button>
                            <button
                              onClick={() => setSelectedTagIds(new Set())}
                              className="text-[11px] font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl transition-colors shrink-0"
                            >
                              Limpar
                            </button>
                            <button
                              onClick={async () => {
                                if (selectedTagIds.size === 0) return;
                                setLoading(true);
                                try {
                                  const zip = new JSZip();
                                  const folder = zip.folder('qrcodes-focinho')!;
                                  const ids = Array.from(selectedTagIds);
                                  for (const tagId of ids) {
                                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent('https://focinhoapp.vercel.app' + '/?tag=' + tagId)}`;
                                    try {
                                      const res = await fetch(qrUrl);
                                      const blob = await res.blob();
                                      folder.file(`${tagId}.png`, blob);
                                    } catch { /* skip failed */ }
                                  }
                                  const content = await zip.generateAsync({ type: 'blob' });
                                  saveAs(content, `qrcodes-focinho-${Date.now()}.zip`);
                                  setSelectedTagIds(new Set());
                                } catch (err) {
                                  setError('Erro ao gerar o arquivo ZIP.');
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              className="flex items-center gap-1.5 text-[11px] font-black bg-white text-orange-600 hover:bg-orange-50 px-3 py-1.5 rounded-xl transition-colors shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Baixar ZIP
                            </button>
                          </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 min-h-[200px] relative z-10">
                          {allTags.slice((adminTagsPage - 1) * 20, adminTagsPage * 20).map((tag) => {
                            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('https://focinhoapp.vercel.app' + '/?tag=' + tag.id)}`;
                            const isSelected = selectedTagIds.has(tag.id);
                            return (
                              <div
                                key={tag.id}
                                onClick={() => {
                                  setSelectedTagIds(prev => {
                                    const next = new Set(prev);
                                    if (next.has(tag.id)) next.delete(tag.id);
                                    else next.add(tag.id);
                                    return next;
                                  });
                                }}
                                className={`p-3 rounded-2xl border text-center shadow-sm relative group flex flex-col items-center justify-center cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-400'
                                    : 'bg-white border-gray-100 hover:border-orange-200'
                                }`}
                              >
                                {/* Checkbox indicator */}
                                <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                  isSelected ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-300'
                                }`}>
                                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                                </div>
                                <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${tag.activated ? 'bg-green-500' : 'bg-gray-300'}`} title={tag.activated ? 'Ativada' : 'Inativa'} />
                                <img src={qrUrl} alt={tag.id} className="w-full aspect-square mb-2 rounded-xl" />
                                <p className="text-[10px] font-black text-gray-700 w-full truncate">{tag.id}</p>
                                <a
                                  href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent('https://focinhoapp.vercel.app' + '/?tag=' + tag.id)}`}
                                  download={`${tag.id}.png`}
                                  onClick={e => e.stopPropagation()}
                                  className="text-[9px] text-orange-500 font-bold hover:underline py-1 block"
                                >
                                  Baixar QR
                                </a>
                                <div className="flex gap-1 w-full mt-1 justify-center" onClick={e => e.stopPropagation()}>
                                  <button
                                    title="Editar ID"
                                    onClick={() => setEditingTag({ id: tag.id, newId: tag.id })}
                                    className="w-8 h-8 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg flex items-center justify-center transition-colors"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    title="Excluir tag"
                                    onClick={async () => {
                                      if (!window.confirm(`Excluir tag ${tag.id}? Se ativada, o pet será desvinculado.`)) return;
                                      setLoading(true);
                                      try {
                                        if (tag.petId) {
                                          await supabase.from('pets').update({ tagId: null }).eq('tagId', tag.id);
                                        }
                                        await supabase.from('tags').delete().eq('id', tag.id);
                                        setAllTags(prev => prev.filter(t => t.id !== tag.id));
                                        setSelectedTagIds(prev => { const next = new Set(prev); next.delete(tag.id); return next; });
                                      } catch { setError('Erro ao excluir tag.'); }
                                      finally { setLoading(false); }
                                    }}
                                    className="w-8 h-8 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg flex items-center justify-center transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {allTags.length === 0 && !isFetchingAllTags && (
                             <p className="col-span-full text-center text-sm text-gray-400 py-8 font-medium">Nenhuma tag gerada ainda.</p>
                          )}
                        </div>
                      </div>

                      {/* Banners Manager */}
                      <div className="border border-orange-100 rounded-[2rem] p-6 bg-gradient-to-br from-indigo-50 to-white relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4 relative z-10">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-indigo-600" />
                            <h4 className="font-bold text-gray-800">Gerenciador de Banners</h4>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mb-6 relative z-10">
                          Adicione banners para o carrossel do aplicativo. Resolução Recomendada: <strong>800x320 pixels (Proporção 2.5:1)</strong>.
                        </p>

                        <div className="bg-white p-4 rounded-3xl border border-gray-100 flex flex-col gap-4 mb-6 shadow-sm">
                          {bannerMessage && <p className="text-xs text-indigo-600 font-bold bg-indigo-50 p-2 rounded-lg text-center">{bannerMessage}</p>}
                          
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setBannerForm(prev => ({ ...prev, file }));
                            }}
                            className="text-sm font-medium text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                          />
                          <div className="flex flex-col sm:flex-row gap-3">
                            <input 
                              type="text" 
                              placeholder="URL Link do evento" 
                              value={bannerForm.link_url}
                              onChange={(e) => setBannerForm(prev => ({ ...prev, link_url: e.target.value }))}
                              className="flex-1 bg-gray-50 border-none px-4 py-3 rounded-2xl outline-none text-sm focus:ring-2 focus:ring-indigo-100"
                            />
                            <div className="flex-1 max-w-[200px]">
                              <span className="text-[10px] uppercase font-bold text-gray-400 mb-1 block px-2">Expira em:</span>
                              <input 
                                type="datetime-local" 
                                value={bannerForm.expires_at}
                                onChange={(e) => setBannerForm(prev => ({ ...prev, expires_at: e.target.value }))}
                                className="w-full bg-gray-50 border-none px-4 py-3 rounded-2xl outline-none text-xs focus:ring-2 focus:ring-indigo-100"
                              />
                            </div>
                          </div>

                          <Button 
                            loading={loading}
                            onClick={async () => {
                              if (!bannerForm.file || !bannerForm.link_url || !bannerForm.expires_at) {
                                setError("Preencha a imagem, o link e a data de expiração.");
                                return;
                              }
                              setLoading(true);
                              try {
                                const ext = bannerForm.file.name.split('.').pop();
                                const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                                
                                const { data: uploadData, error: uploadError } = await supabase.storage
                                  .from('banners')
                                  .upload(filename, bannerForm.file);

                                if (uploadError) throw uploadError;

                                const { data: urlData } = supabase.storage.from('banners').getPublicUrl(uploadData.path);
                                
                                const { data: currData, error: insertError } = await supabase.from('banners').insert({
                                  image_url: urlData.publicUrl,
                                  link_url: bannerForm.link_url,
                                  expires_at: new Date(bannerForm.expires_at).toISOString()
                                }).select('*').single();

                                if (insertError) throw insertError;

                                setAdminBanners(prev => [currData, ...prev]);
                                setBannerMessage("Banner adicionado com sucesso!");
                                setBannerForm({ image_url: '', link_url: '', expires_at: '', file: null });
                                setTimeout(() => setBannerMessage(null), 3000);
                              } catch (err) {
                                setError("Erro ao enviar banner.");
                              } finally {
                                setLoading(false);
                              }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 w-full md:w-auto self-end"
                          >
                            + Adicionar Banner
                          </Button>
                        </div>

                        {/* List Banners */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {adminBanners.map(banner => {
                            const isExpired = new Date(banner.expires_at).getTime() < Date.now();
                            return (
                              <div key={banner.id} className="bg-white rounded-3xl p-3 border border-gray-100 shadow-sm relative group">
                                <span className={`absolute top-4 right-4 text-[9px] font-black uppercase px-2 py-1 rounded-md z-10 ${isExpired ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                  {isExpired ? 'Expirado' : 'Ativo'}
                                </span>
                                <div className="w-full h-24 rounded-2xl overflow-hidden bg-gray-100 mb-3 relative">
                                  <img src={banner.image_url} className="w-full h-full object-cover" />
                                </div>
                                <a href={banner.link_url} target="_blank" className="text-[10px] text-indigo-500 font-bold hover:underline truncate block mb-1">🔗 {banner.link_url}</a>
                                <p className="text-[10px] text-gray-400 font-medium">Expira: {new Date(banner.expires_at).toLocaleString()}</p>
                                
                                {/* Hover Delete action */}
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center pointer-events-none group-hover:pointer-events-auto">
                                  <button 
                                    onClick={async () => {
                                      if(!window.confirm('Excluir este banner permanentemente?')) return;
                                      setLoading(true);
                                      try {
                                        // Delete from storage
                                        const path = banner.image_url.split('/').pop();
                                        if (path) await supabase.storage.from('banners').remove([path]);
                                        // Delete from DB
                                        await supabase.from('banners').delete().eq('id', banner.id);
                                        setAdminBanners(prev => prev.filter(b => b.id !== banner.id));
                                      } catch (e) {
                                        setError('Erro ao deletar banner');
                                      } finally {
                                        setLoading(false);
                                      }
                                    }}
                                    className="bg-red-100 text-red-500 p-3 rounded-2xl hover:bg-red-200 transition-colors shadow-lg"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
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
                                  <p className="text-[10px] text-gray-400 font-bold truncate mt-0.5">Tutor: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-500">{pet.ownerId}</span></p>
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

                      {/* Events Management */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-gray-400" /> Eventos ({petEvents.length})
                          </h4>
                        </div>
                        <div className="bg-gray-50/50 border border-gray-100 rounded-[2rem] p-4">
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
                              } catch { setError('Erro ao salvar evento.'); }
                            }}
                            className="flex flex-col gap-3 mb-6"
                          >
                            <Input
                              placeholder="Título do Evento"
                              icon={Calendar}
                              value={eventForm.title || ''}
                              onChange={(v: string) => setEventForm(prev => ({ ...prev, title: v }))}
                            />
                            <Input
                              placeholder="Descrição (opcional)"
                              value={eventForm.description || ''}
                              onChange={(v: string) => setEventForm(prev => ({ ...prev, description: v }))}
                            />
                            <div className="flex gap-3">
                              <Input
                                placeholder="Data (ex: 2026-04-15)"
                                value={eventForm.event_date || ''}
                                onChange={(v: string) => setEventForm(prev => ({ ...prev, event_date: v }))}
                              />
                              <Input
                                placeholder="Local / Cidade"
                                icon={MapPin}
                                value={eventForm.location || ''}
                                onChange={(v: string) => setEventForm(prev => ({ ...prev, location: v }))}
                              />
                            </div>

                            {/* Image Upload */}
                            <div className="flex flex-col gap-1.5">
                              <label className="text-sm font-medium text-gray-600 ml-1">Imagem do Evento</label>
                              <div className="flex gap-2">
                                {eventForm.imageUrl && (
                                  <div className="w-20 h-20 rounded-xl overflow-hidden relative group shrink-0 border border-gray-200">
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
                                  <label className="w-20 h-20 bg-gray-50 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-gray-200 hover:border-orange-300 transition-all cursor-pointer shrink-0">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = (ev) => setEventForm(prev => ({ ...prev, imageUrl: ev.target?.result as string }));
                                        reader.readAsDataURL(file);
                                      }}
                                    />
                                    <Camera className="w-5 h-5 text-gray-300" />
                                    <span className="text-[8px] text-gray-400 font-bold uppercase mt-1">Foto</span>
                                  </label>
                                )}
                              </div>
                            </div>

                            {eventMessage && (
                              <div className="bg-green-50 text-green-600 p-3 rounded-xl text-center text-sm font-bold border border-green-200 mt-1">
                                {eventMessage}
                              </div>
                            )}

                            <div className="flex gap-2 mt-1">
                              <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 shadow-blue-100">
                                {eventForm.id ? 'Salvar Alterações' : 'Criar Evento'}
                              </Button>
                              {eventForm.id && (
                                <button
                                  type="button"
                                  onClick={() => setEventForm({ id: '', title: '', description: '', imageUrl: '', event_date: '', location: '' })}
                                  className="px-6 rounded-2xl border-2 border-gray-100 text-gray-500 font-bold hover:bg-gray-50"
                                >
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </form>

                          <div className="flex flex-col gap-3">
                            {petEvents.map(ev => (
                              <div key={ev.id} className="bg-white p-4 rounded-3xl border border-gray-200 flex justify-between items-center shadow-sm gap-3">
                                {ev.imageUrl ? (
                                  <img src={ev.imageUrl} className="w-14 h-14 rounded-2xl object-cover border border-gray-100 shrink-0" alt={ev.title} />
                                ) : (
                                  <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-gray-100 flex items-center justify-center shrink-0">
                                    <Calendar className="w-6 h-6 text-blue-300" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <h5 className="font-bold text-gray-900 truncate text-sm">{ev.title}</h5>
                                  <p className="text-[10px] text-gray-500 font-bold truncate">
                                    {ev.event_date && `📅 ${ev.event_date}`}{ev.location && ` • 📍 ${ev.location}`}
                                  </p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  <button
                                    onClick={() => setEventForm({ id: ev.id, title: ev.title, description: ev.description || '', imageUrl: ev.imageUrl || '', event_date: ev.event_date || '', location: ev.location || '' })}
                                    className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!window.confirm('Excluir este evento?')) return;
                                      await supabase.from('events').delete().eq('id', ev.id);
                                      setPetEvents(prev => prev.filter(e => e.id !== ev.id));
                                    }}
                                    className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {petEvents.length === 0 && <p className="text-center text-xs text-gray-400 font-medium py-4">Nenhum evento cadastrado.</p>}
                          </div>
                        </div>
                      </div>

                      {/* Promo Events Management */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            <Star className="w-5 h-5 text-gray-400" /> Banners Destaque ({promoEvents.length})
                          </h4>
                        </div>
                        <div className="bg-gray-50/50 border border-gray-100 rounded-[2rem] p-4">
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (!promoEventForm.image_url || !promoEventForm.link_url || !promoEventForm.expires_at) return;
                              try {
                                const payload = {
                                  title: promoEventForm.title || null,
                                  image_url: promoEventForm.image_url,
                                  link_url: promoEventForm.link_url,
                                  expires_at: promoEventForm.expires_at
                                };
                                if (promoEventForm.id) {
                                  await supabase.from('promo_events').update(payload).eq('id', promoEventForm.id);
                                  setPromoMessage('Banner atualizado!');
                                } else {
                                  await supabase.from('promo_events').insert(payload);
                                  setPromoMessage('Banner criado!');
                                }
                                setPromoEventForm({ id: '', title: '', image_url: '', link_url: '', expires_at: '' });
                                setTimeout(() => setPromoMessage(null), 3000);
                              } catch { setError('Erro ao salvar banner em destaque'); }
                            }}
                            className="flex flex-col gap-3 mb-6"
                          >
                            <Input
                              placeholder="Título Interno (ex: Mega Feirão)"
                              value={promoEventForm.title || ''}
                              onChange={(v: string) => setPromoEventForm(prev => ({ ...prev, title: v }))}
                            />
                            
                            <Input
                              placeholder="Link de Redirecionamento (https://...)"
                              value={promoEventForm.link_url || ''}
                              onChange={(v: string) => setPromoEventForm(prev => ({ ...prev, link_url: v }))}
                            />

                            <div className="flex flex-col">
                              <label className="text-xs text-gray-500 ml-2 mb-1 font-bold">Data/Hora de Expiração (Quando vai sair do formato DD/MM/AAAA HH:MM):</label>
                              <div className="bg-white border rounded-2xl flex items-center px-4 relative overflow-hidden transition-all duration-300">
                                <input
                                  type="datetime-local"
                                  className="w-full py-4 bg-transparent outline-none text-gray-800 font-medium placeholder-gray-400"
                                  value={promoEventForm.expires_at || ''}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPromoEventForm(prev => ({ ...prev, expires_at: e.target.value }))}
                                />
                              </div>
                            </div>

                            {/* Image Upload */}
                            <div className="flex flex-col gap-1.5">
                              <label className="text-sm font-medium text-gray-600 ml-1">Imagem do Banner</label>
                              <div className="flex gap-2">
                                {promoEventForm.image_url && (
                                  <div className="w-full h-32 rounded-xl overflow-hidden relative group shrink-0 border border-gray-200">
                                    <img src={promoEventForm.image_url} className="w-full h-full object-cover" alt="Banner" />
                                    <button
                                      type="button"
                                      onClick={() => setPromoEventForm(prev => ({ ...prev, image_url: '' }))}
                                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="w-5 h-5" />
                                    </button>
                                  </div>
                                )}
                                {!promoEventForm.image_url && (
                                  <label className="w-full h-24 bg-gray-50 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-gray-200 hover:border-orange-300 transition-all cursor-pointer shrink-0">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = (ev) => setPromoEventForm(prev => ({ ...prev, image_url: ev.target?.result as string }));
                                        reader.readAsDataURL(file);
                                      }}
                                    />
                                    <Camera className="w-5 h-5 text-gray-300" />
                                    <span className="text-[10px] text-gray-400 font-bold uppercase mt-1">Carregar Banner Destaque</span>
                                  </label>
                                )}
                              </div>
                            </div>

                            {promoMessage && (
                              <div className="bg-green-50 text-green-600 p-3 rounded-xl text-center text-sm font-bold border border-green-200 mt-1">
                                {promoMessage}
                              </div>
                            )}

                            <div className="flex gap-2 mt-1">
                              <Button type="submit" className="w-full bg-indigo-500 hover:bg-indigo-600 shadow-indigo-100">
                                {promoEventForm.id ? 'Salvar Alterações' : 'Criar Banner Destaque'}
                              </Button>
                              {promoEventForm.id && (
                                <button
                                  type="button"
                                  onClick={() => setPromoEventForm({ id: '', title: '', image_url: '', link_url: '', expires_at: '' })}
                                  className="px-6 rounded-2xl border-2 border-gray-100 text-gray-500 font-bold hover:bg-gray-50"
                                >
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </form>

                          <div className="flex flex-col gap-3">
                            {promoEvents.map(ev => (
                              <div key={ev.id} className="bg-white p-4 rounded-3xl border border-gray-200 flex justify-between items-center shadow-sm gap-3">
                                {ev.image_url ? (
                                  <img src={ev.image_url} className="w-14 h-14 rounded-2xl object-cover border border-gray-100 shrink-0" alt={ev.title} />
                                ) : (
                                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-gray-100 flex items-center justify-center shrink-0">
                                    <Star className="w-6 h-6 text-indigo-300" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <h5 className="font-bold text-gray-900 truncate text-sm">{ev.title || 'Sem título'}</h5>
                                  <p className="text-[10px] text-gray-500 font-bold truncate">
                                    Expira em: {new Date(ev.expires_at).toLocaleString()}
                                  </p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  <button
                                    onClick={() => setPromoEventForm({ id: ev.id, title: ev.title || '', image_url: ev.image_url || '', link_url: ev.link_url || '', expires_at: new Date(ev.expires_at).toISOString().slice(0,16) })}
                                    className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!window.confirm('Excluir este banner?')) return;
                                      await supabase.from('promo_events').delete().eq('id', ev.id);
                                      setPromoEvents(prev => prev.filter(e => e.id !== ev.id));
                                    }}
                                    className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {promoEvents.length === 0 && <p className="text-center text-xs text-gray-400 font-medium py-4">Nenhum banner ativo.</p>}
                          </div>
                        </div>
                      </div>

                      {/* Adoption Management */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            <Heart className="w-5 h-5 text-gray-400" /> Pets para Adoção ({adoptionPets.length})
                          </h4>
                          <Button
                            onClick={() => setIsAddingAdoptionPet(true)}
                            variant="secondary"
                            className="!px-4 !py-2 text-xs"
                          >
                            <Plus className="w-4 h-4" /> Divulgar Pet
                          </Button>
                        </div>
                        <div className="bg-gray-50/50 border border-gray-100 rounded-[2rem] p-4">
                           <div className="flex flex-col gap-3">
                             {adoptionPets.map(pet => (
                               <div key={pet.id} className="bg-white p-4 rounded-3xl border border-gray-200 flex justify-between items-center shadow-sm">
                                 <div className="flex items-center gap-3 w-full pr-2 overflow-hidden">
                                   {pet.gallery && pet.gallery.length > 0 ? (
                                      <img src={pet.gallery[0]} className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0" />
                                   ) : (
                                      <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                                        <Heart className="w-4 h-4 text-gray-300" />
                                      </div>
                                   )}
                                   <div className="min-w-0 flex-1">
                                     <h5 className="font-bold text-gray-900 truncate text-sm">{pet.name}</h5>
                                     <p className="text-[10px] text-gray-500 font-bold truncate">
                                       {pet.animalType} • {pet.breed} {pet.city && '\u2022 ' + pet.city}
                                     </p>
                                   </div>
                                 </div>
                                 <div className="flex gap-2 shrink-0">
                                   <button 
                                     onClick={() => {
                                        setEditingAdoptionPetId(pet.id);
                                        setNewAdoptionPet(pet);
                                        setIsAddingAdoptionPet(true);
                                     }} 
                                     className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                                   >
                                     <Edit2 className="w-4 h-4" />
                                   </button>
                                   <button 
                                     onClick={async () => {
                                        if(window.confirm('Excluir ' + pet.name + ' para adoção?')) {
                                            await supabase.from('adoption_pets').delete().eq('id', pet.id);
                                            setAdoptionPets(prev => prev.filter(p => p.id !== pet.id));
                                        }
                                     }} 
                                     className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                                   >
                                     <Trash2 className="w-4 h-4" />
                                   </button>
                                 </div>
                               </div>
                             ))}
                             {adoptionPets.length === 0 && <p className="text-center text-xs text-gray-400 font-medium py-4">Nenhum pet para adoção.</p>}
                           </div>
                        </div>
                      </div>


                    </div>
                    <div className="h-20" />
                  </div>
                )}
              </motion.div>
            )}
                    {/* Add Adoption Pet Modal */}
                    {/* Tag Edit Modal */}
                    {editingTag && (
                      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-6">
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl"
                        >
                          <h3 className="font-black text-gray-900 text-xl mb-1">Editar ID da Tag</h3>
                          <p className="text-xs text-gray-400 font-medium mb-5">O QR Code será atualizado automaticamente.</p>
                          <div className="bg-gray-50 rounded-2xl px-4 flex items-center mb-4 border border-gray-200">
                            <input
                              value={editingTag.newId}
                              onChange={e => setEditingTag(prev => prev ? { ...prev, newId: e.target.value.toUpperCase() } : null)}
                              className="flex-1 py-3 bg-transparent outline-none text-gray-800 font-mono font-bold text-sm"
                              placeholder="Ex: ABC-1234"
                              maxLength={10}
                            />
                          </div>
                          <div className="flex gap-3">
                            <Button
                              onClick={async () => {
                                if (!editingTag.newId.trim() || editingTag.newId === editingTag.id) {
                                  setEditingTag(null);
                                  return;
                                }
                                setLoading(true);
                                try {
                                  const { data: existing } = await supabase.from('tags').select('id').eq('id', editingTag.newId).single();
                                  if (existing) { setError('Esse ID já existe. Escolha outro.'); setLoading(false); return; }
                                  const oldTag = allTags.find(t => t.id === editingTag.id);
                                  await supabase.from('tags').insert({ ...oldTag, id: editingTag.newId });
                                  if (oldTag?.petId) {
                                    await supabase.from('pets').update({ tagId: editingTag.newId }).eq('tagId', editingTag.id);
                                  }
                                  await supabase.from('tags').delete().eq('id', editingTag.id);
                                  setAllTags(prev => prev.map(t => t.id === editingTag.id ? { ...t, id: editingTag.newId } : t));
                                  setEditingTag(null);
                                } catch { setError('Erro ao atualizar tag.'); }
                                finally { setLoading(false); }
                              }}
                              loading={loading}
                              className="flex-1 bg-orange-500 hover:bg-orange-600"
                            >
                              Salvar
                            </Button>
                            <button
                              onClick={() => setEditingTag(null)}
                              className="px-6 rounded-2xl border-2 border-gray-100 text-gray-500 font-bold hover:bg-gray-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    )}
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
                                <CityStatePicker
                                  label="Estado / Cidade"
                                  state={newAdoptionPet.state || ''}
                                  city={newAdoptionPet.city || ''}
                                  onStateChange={(v) => setNewAdoptionPet(prev => ({ ...prev, state: v }))}
                                  onCityChange={(v) => setNewAdoptionPet(prev => ({ ...prev, city: v }))}
                                />
                                <Input
                                  label="Endereço"
                                  placeholder="Rua, Bairro..."
                                  value={newAdoptionPet.address || ''}
                                  onChange={(v: string) => setNewAdoptionPet(prev => ({ ...prev, address: v }))}
                                  icon={MapPin}
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

            {/* Activate Tag */}
            {view === 'activate' && (
              <motion.div
                key="activate"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8 py-8"
              >
                <AnimatePresence mode="wait">
                  {tagVerifiedSuccess ? (
                    /* ---- SUCCESS STATE ---- */
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="flex flex-col items-center text-center gap-6 py-6"
                    >
                      {/* Animated check circle */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.15, type: 'spring', stiffness: 400, damping: 18 }}
                        className="w-28 h-28 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-2xl shadow-orange-300"
                      >
                        <motion.div
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ delay: 0.3, duration: 0.5 }}
                        >
                          <CheckCircle2 className="w-14 h-14 text-white" />
                        </motion.div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="space-y-2"
                      >
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Pingente Verificado!</h2>
                        <p className="text-gray-500 font-medium">O pingente está pronto para ser vinculado ao seu pet.</p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-orange-50 border border-orange-200 rounded-2xl px-6 py-4 flex items-center gap-3"
                      >
                        <QrCode className="w-6 h-6 text-orange-500 shrink-0" />
                        <div className="text-left">
                          <p className="text-[11px] text-orange-400 font-bold uppercase tracking-wider">ID do Pingente</p>
                          <p className="text-xl font-black text-orange-700 tracking-widest">{tagIdToActivate}</p>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.65 }}
                        className="w-full pt-2"
                      >
                        <Button
                          onClick={() => {
                            setTagVerifiedSuccess(false);
                            setView('profile');
                          }}
                          className="w-full py-4 text-base shadow-lg shadow-orange-500/20"
                        >
                          Cadastrar Meu Pet <ChevronRight className="w-5 h-5 ml-1" />
                        </Button>
                      </motion.div>
                    </motion.div>
                  ) : (
                    /* ---- FORM STATE ---- */
                    <motion.div
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6"
                    >
                      <div className="text-center space-y-2">
                        <h2 className="text-3xl font-bold">Ativar Pingente</h2>
                        <p className="text-gray-400">Insira o ID que veio com o seu Pingente</p>
                      </div>
                      <div className="space-y-6">
                        <Input
                          label="ID do Pingente"
                          placeholder="Ex: CAF943"
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
                          Verificar Pingente
                        </Button>
                        <Button onClick={() => setView(user ? 'dashboard' : 'install_pwa')} variant="secondary" className="w-full">
                          {user ? 'Cancelar' : 'Voltar'}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                  {/* Ocultar botão voltar quando usuário veio do fluxo de verificação de tag */}
                  {!( !user || (localStorage.getItem('focinho_pending_tag') && !selectedPet?.id) || (selectedPet?.tagId && !selectedPet?.id) ) && (
                    <button
                      onClick={() => {
                        setView(user ? 'dashboard' : 'install_pwa');
                      }}
                      className="p-2 bg-white rounded-xl shadow-sm"
                    >
                      <ChevronRight className="w-6 h-6 rotate-180" />
                    </button>
                  )}
                  <h2 className="text-2xl font-bold">
                    {userPets.some(p => p.id === selectedPet?.id) ? 'Editar Perfil' : 'Cadastrar Novo Pet'}
                  </h2>
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
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="text-xs font-bold text-green-800">PINGENTE VINCULADO</p>
                            <p className="text-[10px] text-green-600">ID: {selectedPet.tagId}</p>
                          </div>
                        </div>
                        {/* Botão de desativar apenas na edição de pet já salvo */}
                        {userPets.some(p => p.id === selectedPet?.id) && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              if (selectedPet.id && selectedPet.tagId) {
                                handleDeactivateTag(selectedPet.tagId, selectedPet.id);
                              }
                            }}
                            className="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 py-2 px-3 rounded-xl transition-colors border border-red-100 w-full text-center"
                          >
                            Perdeu o pingente? Desativar agora
                          </button>
                        )}
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
                          onClick={() => { setTagIdToActivate(''); setView('activate'); }}
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
                      {user ? 'Salvar Perfil' : 'Criar Conta'}
                    </Button>
                    {user && selectedPet && (
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


                    <div className="bg-gray-50 rounded-3xl p-6 text-left space-y-4 mb-8">
                      <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-4">
                        {/* Row 1: Raça | Peso */}
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Raça</p>
                          <p className="text-sm font-bold">{finderPet.breed || 'Não informada'}</p>
                        </div>
                        {finderPet.privacySettings?.showAgeAndWeight !== false && finderPet.weight ? (
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Peso</p>
                            <p className="text-sm font-bold">{finderPet.weight} kg</p>
                          </div>
                        ) : <div />}

                        {/* Row 2: Sexo | Cor */}
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Sexo</p>
                          <p className="text-sm font-bold">{finderPet.gender || 'Não informado'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Cor Predominante</p>
                          <p className="text-sm font-bold">{finderPet.color || 'Não informada'}</p>
                        </div>

                        {/* Row 3: Porte | Aniversário */}
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
                      </div>

                      {finderPet.privacySettings?.showAddress !== false ? (
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-black mt-1 shrink-0" />
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
                              O tutor ativou o modo privado para este campo.
                            </p>
                          </div>
                        </div>
                      )}

                      {finderPet.privacySettings?.showObservations !== false && finderPet.observations && (
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-black mt-1 shrink-0" />
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
                            <button
                              onClick={() => window.open(`https://wa.me/55${finderPet.ownerPhone!.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Encontrei seu pet ${finderPet.name}.`)}`, '_blank')}
                              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-black font-bold text-[14px] rounded-lg flex items-center justify-center transition-colors"
                            >
                              <MessageCircle className="w-5 h-5 mr-2" /> Falar no WhatsApp
                            </button>
                            <button
                              onClick={() => window.open(`tel:${finderPet.ownerPhone?.replace(/\D/g, '')}`, '_blank')}
                              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-black font-bold text-[14px] rounded-lg flex items-center justify-center transition-colors"
                            >
                              <Phone className="w-5 h-5 mr-2" /> Ligar para o Tutor
                            </button>
                            <button
                              onClick={sendLocation}
                              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-black font-bold text-[14px] rounded-lg flex items-center justify-center transition-colors"
                            >
                              <MapPin className="w-5 h-5 mr-2" /> Enviar Localização
                            </button>
                          </>
                        ) : (
                          <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-center">
                            <p className="text-sm text-red-600 font-bold">Telefone de contato não disponível.</p>
                          </div>
                        )
                      ) : (
                        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-center">
                          <p className="text-sm text-orange-600 font-bold">O tutor optou por ocultar o número de telefone.</p>
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
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const croppedBlob = await requestCrop(file, 1, false);
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setNewPost(prev => ({ ...prev, imageUrl: reader.result as string }));
                                };
                                reader.readAsDataURL(croppedBlob);
                              } catch (err) {
                                console.error(err);
                              }
                            }
                            e.target.value = '';
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
        {user && view !== 'finder' && view !== 'install_pwa' && (
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-3 flex justify-around items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <button
              onClick={() => {
                if (view === 'dashboard') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  setView('dashboard');
                  window.scrollTo(0, 0);
                }
              }}
              onDoubleClick={() => window.location.reload()}
              className={`flex flex-col items-center gap-1 transition-colors flex-1 min-h-[44px] justify-center ${view === 'dashboard' ? 'text-orange-500' : 'text-gray-300'}`}
            >
              <Home className="w-6 h-6" />
              <span translate="no" className="text-[11px] font-bold uppercase">Início</span>
            </button>

            <button
              onClick={() => setView('reminders')}
              className={`flex flex-col items-center gap-1 transition-colors flex-1 min-h-[44px] justify-center ${view === 'reminders' ? 'text-orange-500' : 'text-gray-300'}`}
            >
              <Bell className="w-6 h-6" />
              <span translate="no" className="text-[11px] font-bold uppercase">Lembretes</span>
            </button>

            <button
              onClick={() => setView('walk')}
              className="flex flex-col items-center -mt-12 flex-1 min-h-[44px] justify-center"
            >
              <div className="w-[60px] h-[60px] bg-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-200 border-4 border-white active:scale-90 transition-transform">
                <PawPrint className="w-7 h-7 text-white" />
              </div>
              <span translate="no" className="text-[11px] font-bold uppercase text-orange-500 mt-1">Passeio</span>
            </button>

            <button
              onClick={() => {
                setView('lost_pets');
                setHasNewUnreadSOS(false);
              }}
              className={`flex flex-col items-center gap-1 transition-colors flex-1 min-h-[44px] justify-center relative ${view === 'lost_pets' ? 'text-orange-500' : 'text-gray-300'}`}
            >
              <Megaphone className={`w-6 h-6 ${hasNewUnreadSOS && view !== 'lost_pets' ? 'text-red-500 animate-pulse' : ''}`} />
              <span translate="no" className="text-[11px] font-bold uppercase">Alertas</span>
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
              <div className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all ${view === 'account' ? 'border-orange-500' : 'border-gray-200'}`}>
                {ownerProfile?.photoUrl ? (
                  <img src={ownerProfile.photoUrl} alt="Minha conta" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
              <span translate="no" className="text-[11px] font-bold uppercase">Conta</span>
            </button>
          </nav>
        )}

        {/* Lightbox */}
        <AnimatePresence>
          <ImageCropperModal
        isOpen={cropModalConfig.isOpen}
        imageSrc={cropModalConfig.imageSrc}
        aspectRatio={cropModalConfig.aspectRatio}
        circularCrop={cropModalConfig.circularCrop}
        onClose={() => setCropModalConfig(prev => ({ ...prev, isOpen: false }))}
        onCropComplete={cropModalConfig.onConfirm}
      />

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

        {/* City Picker Modal — Estado → Cidade via IBGE */}
        <AnimatePresence>
          {showCityPicker && (
            <div className="fixed inset-0 z-[200] flex items-end justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { setShowCityPicker(false); setPickerStep('state'); setPickerSelectedState(null); setPickerCities([]); setPickerCitySearch(''); setPickerStateSearch(''); }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative bg-white w-full max-w-lg rounded-t-[3rem] p-6 shadow-2xl z-10 flex flex-col"
                style={{ maxHeight: '85vh' }}
              >
                {/* Header */}
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-3">
                    {pickerStep === 'city' && (
                      <button
                        onClick={() => { setPickerStep('state'); setPickerSelectedState(null); setPickerCities([]); setPickerCitySearch(''); }}
                        className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </button>
                    )}
                    <div>
                      <h3 className="text-xl font-black text-gray-900">
                        {pickerStep === 'state' ? 'Selecionar Estado' : pickerSelectedState?.nome}
                      </h3>
                      <p className="text-xs text-gray-400 font-medium mt-0.5">
                        {pickerStep === 'state' ? 'Escolha o estado primeiro' : 'Agora escolha a cidade'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowCityPicker(false); setPickerStep('state'); setPickerSelectedState(null); setPickerCities([]); setPickerCitySearch(''); setPickerStateSearch(''); }}
                    className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Ver todos / Localização atual */}
                {pickerStep === 'state' && (
                  <div className="space-y-2 mb-4">
                    {selectedCity && (
                      <button
                        onClick={() => { setSelectedCity(''); localStorage.removeItem('focinho_selected_city'); setShowCityPicker(false); setPickerStep('state'); }}
                        className="w-full flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-2xl hover:bg-gray-100 transition-colors text-left"
                      >
                        <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-sm font-bold text-gray-500">Ver de todas as cidades</span>
                      </button>
                    )}
                    {userCity && (
                      <button
                        onClick={() => {
                          setSelectedCity(userCity);
                          localStorage.setItem('focinho_selected_city', userCity);
                          setShowCityPicker(false);
                          setPickerStep('state');
                        }}
                        className="w-full flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-2xl hover:bg-orange-100 transition-colors text-left"
                      >
                        <Navigation className="w-4 h-4 text-orange-500 shrink-0" />
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Minha localização atual</p>
                          <p className="text-sm font-bold text-gray-800">{userCity.split(' - ')[0]}</p>
                        </div>
                      </button>
                    )}
                  </div>
                )}

                {/* Search bar */}
                <div className="relative mb-3">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                  <input
                    type="text"
                    placeholder={pickerStep === 'state' ? 'Buscar estado...' : 'Buscar cidade...'}
                    value={pickerStep === 'state' ? pickerStateSearch : pickerCitySearch}
                    onChange={e => pickerStep === 'state' ? setPickerStateSearch(e.target.value) : setPickerCitySearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:outline-none focus:border-orange-400 transition-all"
                    autoFocus
                  />
                </div>

                {/* States list */}
                {pickerStep === 'state' && (
                  <div className="overflow-y-auto flex-1 space-y-1 pr-1">
                    {([
                      { sigla: 'AC', nome: 'Acre' },
                      { sigla: 'AL', nome: 'Alagoas' },
                      { sigla: 'AP', nome: 'Amapá' },
                      { sigla: 'AM', nome: 'Amazonas' },
                      { sigla: 'BA', nome: 'Bahia' },
                      { sigla: 'CE', nome: 'Ceará' },
                      { sigla: 'DF', nome: 'Distrito Federal' },
                      { sigla: 'ES', nome: 'Espírito Santo' },
                      { sigla: 'GO', nome: 'Goiás' },
                      { sigla: 'MA', nome: 'Maranhão' },
                      { sigla: 'MT', nome: 'Mato Grosso' },
                      { sigla: 'MS', nome: 'Mato Grosso do Sul' },
                      { sigla: 'MG', nome: 'Minas Gerais' },
                      { sigla: 'PA', nome: 'Pará' },
                      { sigla: 'PB', nome: 'Paraíba' },
                      { sigla: 'PR', nome: 'Paraná' },
                      { sigla: 'PE', nome: 'Pernambuco' },
                      { sigla: 'PI', nome: 'Piauí' },
                      { sigla: 'RJ', nome: 'Rio de Janeiro' },
                      { sigla: 'RN', nome: 'Rio Grande do Norte' },
                      { sigla: 'RS', nome: 'Rio Grande do Sul' },
                      { sigla: 'RO', nome: 'Rondônia' },
                      { sigla: 'RR', nome: 'Roraima' },
                      { sigla: 'SC', nome: 'Santa Catarina' },
                      { sigla: 'SP', nome: 'São Paulo' },
                      { sigla: 'SE', nome: 'Sergipe' },
                      { sigla: 'TO', nome: 'Tocantins' },
                    ] as {sigla: string, nome: string}[])
                      .filter(s => s.nome.toLowerCase().includes(pickerStateSearch.toLowerCase()) || s.sigla.toLowerCase().includes(pickerStateSearch.toLowerCase()))
                      .map(state => (
                        <button
                          key={state.sigla}
                          onClick={async () => {
                            setPickerSelectedState(state);
                            setPickerStep('city');
                            setPickerCitySearch('');
                            setIsLoadingCities(true);
                            try {
                              const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state.sigla}/municipios?orderBy=nome`);
                              const data = await res.json();
                              setPickerCities(data.map((m: {nome: string}) => m.nome));
                            } catch {
                              setPickerCities([]);
                            } finally {
                              setIsLoadingCities(false);
                            }
                          }}
                          className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-orange-50 hover:border-orange-200 border border-transparent transition-all text-left active:scale-[0.98]"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-10 h-10 bg-orange-50 text-orange-600 font-black text-xs rounded-xl flex items-center justify-center shrink-0">{state.sigla}</span>
                            <span className="font-bold text-gray-800 text-sm">{state.nome}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </button>
                      ))}
                  </div>
                )}

                {/* Cities list */}
                {pickerStep === 'city' && (
                  <div className="overflow-y-auto flex-1 pr-1">
                    {isLoadingCities ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                        <p className="text-sm text-gray-400 font-medium">Carregando cidades...</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {pickerCities
                          .filter(c => c.toLowerCase().includes(pickerCitySearch.toLowerCase()))
                          .map(city => (
                            <button
                              key={city}
                              onClick={() => {
                                const newCity = `${city} - ${pickerSelectedState?.sigla}`;
                                setSelectedCity(newCity);
                                localStorage.setItem('focinho_selected_city', newCity);
                                setShowCityPicker(false);
                                setPickerStep('state');
                                setPickerSelectedState(null);
                                setPickerCities([]);
                                setPickerCitySearch('');
                                setPickerStateSearch('');
                              }}
                              className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left active:scale-[0.98] ${
                                selectedCity === `${city} - ${pickerSelectedState?.sigla}`
                                  ? 'bg-orange-50 border-orange-300 text-orange-700'
                                  : 'border-transparent hover:bg-orange-50 hover:border-orange-200'
                              }`}
                            >
                              <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
                              <span className="font-bold text-gray-800 text-sm">{city}</span>
                              {selectedCity === `${city} - ${pickerSelectedState?.sigla}` && (
                                <span className="ml-auto text-orange-500 text-xs font-black">✓ Selecionada</span>
                              )}
                            </button>
                          ))}
                        {pickerCities.filter(c => c.toLowerCase().includes(pickerCitySearch.toLowerCase())).length === 0 && (
                          <div className="text-center py-8">
                            <p className="text-gray-400 text-sm">Nenhuma cidade encontrada.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showScanner && (
            <QRScanner
              onScan={handleScan}
              onClose={() => setShowScanner(false)}
            />
          )}
        </AnimatePresence>

      </div>
    </ErrorBoundary>
  );
}




