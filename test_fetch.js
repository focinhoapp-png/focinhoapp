import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://ooqewkpsxdzbfnjrezur.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vcWV3a3BzeGR6YmZuanJlenVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0OTM2MDcsImV4cCI6MjA4OTA2OTYwN30.JNeaxqcXFmUr4btsBvwdsY32_AWhj0jmO_QkmpyOdIM');

async function testFetch() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });
  console.log('Events:', data);
  console.log('Error:', error);
}

testFetch();
