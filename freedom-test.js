import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function loginAsFreedom() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.FREEDOM_EMAIL,
    password: process.env.FREEDOM_PASSWORD,
  });

  if (error) {
    console.error('Freedom login failed:', error.message);
    return null;
  }

  console.log('Freedom logged in as:', data.user.id);
  return data.user;
}

async function insertTestArtist() {
  const { data, error } = await supabase
    .from('artists')
    .insert({
      name: 'Freedom Test Artist',
      spotify_url: 'https://open.spotify.com/artist/TESTFREEDOM',
    })
    .select('*')
    .single();

  if (error) {
    console.error('Insert failed:', error.message);
    return;
  }

  console.log('Inserted artist:', data);
}

(async () => {
  const user = await loginAsFreedom();
  if (!user) return;
  await insertTestArtist();
})();
