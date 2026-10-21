import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  if (typeof window !== 'undefined') throw new Error('Cliente administrativo do Supabase só pode rodar no servidor.');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('Supabase não configurado.');
  if (key.startsWith('sb_publishable_')) throw new Error('Use a Secret Key do Supabase no backend, não a publishable key.');

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'X-Client-Info': 'wastzera-sorteios-server' } },
  });
}
