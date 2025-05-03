import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    hasServiceKey: !!supabaseServiceKey
  });
  throw new Error('Missing required Supabase environment variables. Check your .env file.');
}

// Create two clients - one for public access and one for admin operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Test the connection
supabase.from('projects').select('count').single().then(({ error }) => {
  if (error) {
    console.error('Failed to connect to Supabase:', error);
  } else {
    console.log('Successfully connected to Supabase');
  }
}); 