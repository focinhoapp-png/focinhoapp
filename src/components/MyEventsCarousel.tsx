import React, { useRef, useEffect, useState } from 'react';
import { supabase } from '../supabase';

interface PromoEvent {
  id: string;
  title?: string;
  image_url: string;
  link_url: string;
  expires_at: string;
}

export function MyEventsCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<PromoEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Load events from Supabase
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('promo_events')
          .select('*')
          .gte('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setEvents(data || []);
      } catch (err) {
        console.error('Error fetching promo events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();

    // Setup realtime subscription
    const subscription = supabase.channel('promo_events_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promo_events' }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Auto-scroll logic com efeito de slide contínuo
  useEffect(() => {
    if (events.length <= 1) return;
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const currentScroll = scrollRef.current.scrollLeft;
        const width = scrollRef.current.clientWidth;
        const maxScroll = scrollRef.current.scrollWidth - width;
        
        if (currentScroll >= maxScroll - 10) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollTo({ left: currentScroll + width, behavior: 'smooth' });
        }
      }
    }, 4500); // 4.5 seconds delay
    return () => clearInterval(interval);
  }, [events]);

  if (loading || events.length === 0) return null;

  return (
    <div className="w-full">
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar"
        style={{ scrollBehavior: 'smooth' }}
      >
        {events.map(ev => (
          <div 
            key={ev.id} 
            className="shrink-0 w-full snap-center px-1"
          >
            <div 
              onClick={() => window.open(ev.link_url, '_blank')}
              className="w-full h-[240px] rounded-[24px] overflow-hidden cursor-pointer shadow-md border border-gray-100/50 flex items-center justify-center bg-gray-100 relative group"
            >
              <img 
                src={ev.image_url} 
                alt={ev.title || "Meu Evento"} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* Gradiente sutil em cima da imagem */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-80 transition-opacity group-hover:opacity-100"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
