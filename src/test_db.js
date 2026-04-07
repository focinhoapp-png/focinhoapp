import { createClient } from "@supabase/supabase-js";
export const supabase = createClient("https://ooqewkpsxdzbfnjrezur.supabase.co", process.env.VITE_SUPABASE_ANON_KEY);
supabase.from("lost_alerts").select("*").then(console.log).catch(console.error);
