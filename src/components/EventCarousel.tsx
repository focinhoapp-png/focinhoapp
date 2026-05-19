import React, { useRef, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Calendar } from 'lucide-react';

interface PetEvent {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  event_date?: string;
  location?: string;
  slides?: { url: string; publishAt: string }[];
  created_at: any;
}

interface EventCarouselProps {
  onEventClick: (event: PetEvent) => void;
}

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchEvents)
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (events.length <= 1) return;
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
    }, 4500);
    return () => clearInterval(interval);
  }, [events]);

  if (loading || events.length === 0) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short',
    });
  };

  return (
    <div className="w-full">

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar"
        style={{ scrollBehavior: 'smooth' }}
      >
        {events.map(event => (
          <div
            key={event.id}
            className="shrink-0 w-full snap-center"
            onClick={() => onEventClick(event)}
          >
            <div className="w-full h-[150px] sm:h-[160px] rounded-[20px] overflow-hidden cursor-pointer shadow-sm border border-gray-100 flex items-center justify-center bg-gray-100 relative group">
              {/* Image */}
              {event.imageUrl ? (
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-amber-500">
                  <Calendar className="w-12 h-12 text-white/60" />
                </div>
              )}
              {/* Overlay hover effect */}
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
