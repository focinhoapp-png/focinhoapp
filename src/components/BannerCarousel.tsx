import React, { useRef, useEffect, useState } from 'react';
import { supabase } from '../supabase';

interface Banner {
  id: string;
  image_url: string;
  link_url: string;
  expires_at: string;
}

export function BannerCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const { data, error } = await supabase
          .from('banners')
          .select('*')
          .gte('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setBanners(data || []);
      } catch (err) {
        console.error('Error fetching banners:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();

    // Setup realtime subscription
    const subscription = supabase.channel('banners_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, () => {
        fetchBanners();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    if (banners.length <= 1) return;
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
    }, 4000); // 4 seconds delay
    return () => clearInterval(interval);
  }, [banners]);

  if (loading || banners.length === 0) return null;

  return (
    <div className="w-full">
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar"
        style={{ scrollBehavior: 'smooth' }}
      >
        {banners.map(banner => (
          <div 
            key={banner.id} 
            className="shrink-0 w-full snap-center"
          >
            <div 
              onClick={() => window.open(banner.link_url, '_blank')}
              className="w-full h-[150px] sm:h-[160px] rounded-[20px] overflow-hidden cursor-pointer shadow-sm border border-gray-100 flex items-center justify-center bg-gray-100 relative group"
            >
              <img 
                src={banner.image_url} 
                alt="Banner Promocional" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
