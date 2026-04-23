import React, { useRef, useEffect, useState } from 'react';
import { Calendar, MapPin } from 'lucide-react';
import { supabase } from '../supabase';

interface PetEvent {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  event_date?: string;
  location?: string;
  created_at?: string;
}

interface EventCarouselProps {
  onEventClick?: (event: PetEvent) => void;
}

const formatEventDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
};

export function EventCarousel({ onEventClick }: EventCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<PetEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setEvents(data || []);
      } catch (err) {
        console.error('Error fetching events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();

    const subscription = supabase
      .channel('events_carousel_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Auto-scroll logic
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
    }, 4500);
    return () => clearInterval(interval);
  }, [events]);

  if (loading || events.length === 0) return null;

  return (
    <div className="-mx-4 sm:mx-0">
      <h2 className="font-semibold text-[22px] leading-[28px] mx-4 sm:mx-0 text-gray-800">
        Eventos
      </h2>
      <div
        ref={scrollRef}
        className="flex overflow-x-auto gap-4 px-4 pb-6 pt-3 no-scrollbar snap-x snap-mandatory"
        style={{ scrollBehavior: 'smooth' }}
      >
        {events.map(evt => (
          <div
            key={evt.id}
            onClick={() => onEventClick && onEventClick(evt)}
            className={`w-[358px] h-[190px] shrink-0 bg-white rounded-[22px] relative overflow-hidden snap-center border border-gray-100 group shadow-md ${onEventClick ? 'cursor-pointer' : ''}`}
          >
            {/* Background image or placeholder gradient */}
            {evt.imageUrl ? (
              <img
                src={evt.imageUrl}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                alt={evt.title}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600" />
            )}

            {/* Gradient overlay for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            {/* Tap indicator */}
            {onEventClick && (
              <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                <span className="text-white text-[10px] font-bold">Ver evento</span>
              </div>
            )}

            {/* Content */}
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="text-white font-bold text-lg drop-shadow-md leading-tight line-clamp-2">
                {evt.title}
              </h3>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {evt.event_date && (
                  <span className="flex items-center gap-1 text-white/90 text-xs font-medium drop-shadow-sm">
                    <Calendar className="w-3 h-3" />
                    {formatEventDate(evt.event_date)}
                  </span>
                )}
                {evt.location && (
                  <span className="flex items-center gap-1 text-white/90 text-xs font-medium drop-shadow-sm">
                    <MapPin className="w-3 h-3" />
                    {evt.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
