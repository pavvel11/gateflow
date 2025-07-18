// config.example.js
// TEMPLATE: Copy this file to config.js and paste your real Supabase credentials

const SUPABASE_URL = 'https://your-project.supabase.co'; // Replace with your Supabase project URL
const SUPABASE_ANON_KEY = 'your-anon-key-here'; // Replace with your Supabase anon key

// The Supabase CDN script creates a global 'supabase' object on the window.
// We initialize the client here and assign it to a constant with the same name.
// We must refer to window.supabase to avoid a ReferenceError.
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Note: This is an example configuration. Update with your real credentials before use.
