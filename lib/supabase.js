// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vaohcvsqfrabhnizecre.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2hjdnNxZnJhYmhuaXplY3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MDQ1ODYsImV4cCI6MjA2NDQ4MDU4Nn0.ndArm1QYUY_Hxgra_ldIUMSahFl1dRgAHyG8ZySrW8A'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
