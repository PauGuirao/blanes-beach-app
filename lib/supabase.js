// lib/supabase.js
import { SUPABASEANONKEY, SUPABASEURL } from '@env';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(SUPABASEURL, SUPABASEANONKEY)
