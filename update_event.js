import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://ooqewkpsxdzbfnjrezur.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vcWV3a3BzeGR6YmZuanJlenVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0OTM2MDcsImV4cCI6MjA4OTA2OTYwN30.JNeaxqcXFmUr4btsBvwdsY32_AWhj0jmO_QkmpyOdIM');

async function updateEvent() {
  const { data: fetch, error: fetchErr } = await supabase
    .from('events')
    .select('*')
    .ilike('title', '%junina%');
    
  if (fetch && fetch.length > 0) {
    const { data, error } = await supabase
      .from('events')
      .update({ 
        event_date: '2026-04-22', // Must be YYYY-MM-DD
        description: 'Vista seu pet com fantasia junina e concorra a prêmios incríveis! Envie sua foto. (Até 31/07/2026)',
        location: 'Até 31/07/2026 — Todo o Brasil'
      })
      .eq('id', fetch[0].id)
      .select();
      
    console.log('Updated:', data);
    console.log('Update Error:', error);
  } else {
    console.log('Evento não encontrado');
  }
}

updateEvent();
