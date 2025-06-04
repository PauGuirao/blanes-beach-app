// lib/supabase.js
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config()

const supabaseUrl = process.env.SUPABASEURL
const supabaseAnonKey = process.env.SUPABASEANONKEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
