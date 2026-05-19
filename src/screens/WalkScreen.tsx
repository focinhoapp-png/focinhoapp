import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Dog, Camera, Download, ChevronLeft, MapPin, Loader2, Play, Square, Trophy, PawPrint, Megaphone } from 'lucide-react';
import { Button } from './ui/button';
import L from 'leaflet';
import { supabase } from '../supabase';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';

// Helper component for map updates
const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  React.useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

export interface WalkScreenProps {
  // State
  walkSubView: 'record' | 'history';
  isWalking: boolean;
  walkPath: { lat: number, lng: number, timestamp: number }[];
  walkMarkers: { type: 'water' | 'poop', lat: number, lng: number, timestamp: number }[];
  walkStartTime: number | null;
  walkDistance: number;
  walkHistory: any[];
  walkSummary: any | null;
  selectedWalkPets: string[];
  userPets: any[];
  generatedWalkImage: string | null;
  isGeneratingImage: boolean;
  currentLocation: [number, number] | null;
  user: any;
  ownerProfile: any;

  // Handlers
  setView: (view: string) => void;
  setWalkSubView: (view: 'record' | 'history') => void;
  setWalkSummary: (summary: any | null) => void;
  setSelectedWalkPets: (pets: string[]) => void;
  toggleWalkPetSelection: (id: string) => void;
  handleStartWalk: () => void;
  handleStopWalk: () => void;
  handleEndWalk: () => void;
  handleAddMarker: (type: 'water' | 'poop') => void;
  generateSummaryImage: () => Promise<string | null>;
  setIsGeneratingImage: (val: boolean) => void;
  setPosts: (posts: any[]) => void;
  resetWalkState: () => void;
  handleDownloadWalkImage: () => void;
  formatTime: (sec: number) => string;
  generateId: () => string;
}

export function WalkScreen(props: WalkScreenProps) {
  const {
    walkSubView, isWalking, walkPath, walkMarkers, walkStartTime, walkDistance,
    walkHistory, walkSummary, selectedWalkPets, userPets, generatedWalkImage,
    isGeneratingImage, currentLocation, user, ownerProfile,
    setView, setWalkSubView, setWalkSummary, setSelectedWalkPets, toggleWalkPetSelection,
    handleStartWalk, handleStopWalk, handleEndWalk, handleAddMarker,
    generateSummaryImage, setIsGeneratingImage, setPosts, resetWalkState,
    handleDownloadWalkImage, formatTime, generateId
  } = props;

  return (
    <motion.div
      key="walk"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 h-[calc(100vh-180px)] flex flex-col"
    >
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => setView('dashboard')} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <ChevronLeft className="w-[22px] h-[22px]" />
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
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-32 no-scrollbar">
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

          {/* Activity Chart */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-6">Atividade Recente (km)</h3>
            <div className="flex items-end justify-between h-32 gap-2 mt-4 px-2">
              {(() => {
                const last7Walks = [...walkHistory].slice(0, 7).reverse();
                const maxDistChart = Math.max(0.1, ...last7Walks.map(w => w.distance || 0));
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
                    <PawPrint className="w-[22px] h-[22px]" />
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

                  <Marker position={currentLocation}>
                    {/* popup omitted for clarity in mobile view if needed */}
                  </Marker>

                  {walkPath.length > 1 && (
                    <Polyline
                      positions={walkPath.map(p => [p.lat, p.lng])}
                      color="#f97316"
                      weight={5}
                      opacity={0.8}
                    />
                  )}

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
                      {formatTime(Math.floor((Date.now() - (walkStartTime || Date.now())) / 1000))}
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
                        <div className="flex items-center justify-center w-[22px] h-[22px] mr-1">
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
                  </div>
                </div>
                
                <Button 
                  onClick={handleStartWalk} 
                  disabled={selectedWalkPets.length === 0 && userPets.length > 0}
                  className="w-full py-6 text-xl rounded-[2rem] shadow-2xl shadow-orange-200"
                >
                  Iniciar Passeio
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-32 no-scrollbar">
          {generatedWalkImage ? (
            <div className="flex flex-col">
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
                  {walkSummary.markers.map((m: any, i: number) => (
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
                  <span className="font-bold text-gray-600">{walkSummary.markers.filter((m: any) => m.type === 'water').length}x Água</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💩</span>
                  <span className="font-bold text-gray-600">{walkSummary.markers.filter((m: any) => m.type === 'poop').length}x Cocô</span>
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

                  const response = await fetch(imgToUpload);
                  const blob = await response.blob();
                  const fileName = `passeio-${user.id}-${Date.now()}.png`;

                  const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('media')
                    .upload(fileName, blob, { contentType: 'image/png', upsert: true });

                  if (uploadError) throw uploadError;

                  const { data: publicData } = supabase.storage.from('media').getPublicUrl(uploadData.path);
                  const publicUrl = publicData.publicUrl;

                  const postId = generateId() + '-walk';
                  const pet = userPets.find((p: any) => p.id === selectedWalkPets[0]);
                  const postData = {
                    id: postId,
                    userId: user.id,
                    userName: ownerProfile?.username || ownerProfile?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
                    userPhoto: typeof ownerProfile?.photoUrl === 'string' ? ownerProfile.photoUrl : user.user_metadata?.avatar_url || '',
                    type: 'walk',
                    content: `Completamos um passeio de ${walkSummary.distance} km em ${Math.floor(walkSummary.duration / 60)}m! 🐾✨`,
                    imageUrl: publicUrl,
                    likes: [],
                    createdAt: new Date().toISOString(),
                    petId: pet?.id || '',
                    petName: pet?.name || ''
                  };

                  const { error: insertError } = await supabase.from('posts').insert(postData);
                  if (insertError) throw insertError;

                  const { data: updatedPosts } = await supabase.from('posts').select('*').order('createdAt', { ascending: false });
                  if (updatedPosts) setPosts(updatedPosts);

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
              <button
                onClick={resetWalkState}
                className="flex-1 py-4 clay-btn-secondary text-sm font-bold rounded-2xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
