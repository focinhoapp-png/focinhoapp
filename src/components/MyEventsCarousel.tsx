import React, { useRef, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Calendar } from 'lucide-react';

interface PromoEvent {
  id: string;
  title?: string;
  image_url: string;
  link_url: string;
  expires_at: string;
}

export function MyEventsCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [promoEvents, setPromoEvents] = useState<PromoEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromo = async () => {
      try {
        const { data, error } = await supabase
          .from('promo_events')
          .select('*')
          .gte('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });
        if (error) throw error;
        setPromoEvents(data || []);
      } catch (err) {
        console.error('Error fetching promo events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPromo();

    const subscription = supabase
      .channel('promo_events_carousel_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promo_events' }, fetchPromo)
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (promoEvents.length <= 1) return;
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const cur = scrollRef.current.scrollLeft;
        const width = scrollRef.current.clientWidth;
        const max = scrollRef.current.scrollWidth - width;
        scrollRef.current.scrollTo({
          left: cur >= max - 10 ? 0 : cur + width,
          behavior: 'smooth',
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [promoEvents]);

  if (loading || promoEvents.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between px-0 mb-2">
        <span className="text-[13px] font-black text-gray-800 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-indigo-500" /> Destaques
        </span>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar"
        style={{ scrollBehavior: 'smooth' }}
      >
        {promoEvents.map(promo => (
          <div key={promo.id} className="shrink-0 w-full snap-center">
            <div
              onClick={() => window.open(promo.link_url, '_blank')}
              className="w-full h-[150px] sm:h-[160px] rounded-[20px] overflow-hidden cursor-pointer shadow-sm border border-gray-100 flex items-center justify-center bg-gray-100 relative group"
            >
              <img
                src={promo.image_url}
                alt={promo.title || 'Destaque'}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
