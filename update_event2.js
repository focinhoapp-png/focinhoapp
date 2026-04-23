import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://ooqewkpsxdzbfnjrezur.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vcWV3a3BzeGR6YmZuanJlenVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0OTM2MDcsImV4cCI6MjA4OTA2OTYwN30.JNeaxqcXFmUr4btsBvwdsY32_AWhj0jmO_QkmpyOdIM');

async function updateEvent() {
  const { data: fetch, error: fetchErr } = await supabase
    .from('events')
    .select('*')
    .ilike('title', '%junina%');
    
  if (fetch && fetch.length > 0) {
    // Tenta atualizar a coluna "description" ou algo que possa mostrar a data de fim. 
    // Como no h end_date, vou tentar ver o schema usando query, se eu puder. Mas a Supabase key annima no roda ALTER TABLE.
    // O backend ou App.tsx pode usar event_date como inicio e podemos adicionar o fim no ttulo ou descrio?
    // Ou talvez haja um admin que a gente possa usar.
    console.log('Preciso adicionar a coluna no db ou colocar no ttulo/descrio.');
  }
}

updateEvent();
