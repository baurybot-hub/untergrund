const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Supabase Config
const SUPABASE_URL = "https://tyflhzwrwzfakwedipig.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_OkJhaPak_fd0nNg1vxRLPQ_gOiaI6Tb";
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AUDIT_LIMIT = 10000; // Alles über 10k wird markiert

async function getMonthlyListeners(spotifyUrl) {
  if (!spotifyUrl || !spotifyUrl.includes('artist/')) return null;
  const artistId = spotifyUrl.split('artist/')[1].split('?')[0];
  
  try {
    // Wir nutzen einen öffentlichen Metadaten-Endpunkt (GQL), der oft von Widgets genutzt wird
    // Hinweis: Falls Spotify diesen blockt, müssen wir auf einen anderen Resolver ausweichen
    const response = await fetch(`https://api-partner.spotify.com/pathfinder/v1/query?operationName=getArtist&variables=%7B%22uri%22%3A%22spotify%3Aartist%3A${artistId}%22%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%223126ed3728646b97f0ba4a4b868670cb253e7d5669b764b8a1c97f48518dfae0%22%7D%7D`, {
      headers: { 'app-platform': 'WebPlayer' }
    });
    const data = await response.json();
    return data?.data?.artistUnion?.stats?.monthlyListeners || 0;
  } catch (e) {
    return null;
  }
}

async function auditUnderground() {
  console.log("🕵️‍♂️ Starte Untergrund-Audit...");
  
  const { data: artists, error } = await client
    .from('artists_public')
    .select('id, name, spotify_url');

  if (error) {
    console.error("Fehler beim Laden der Artists:", error);
    return;
  }

  console.log(`🔍 Prüfe ${artists.length} Artists...\n`);

  for (const artist of artists) {
    const listeners = await getMonthlyListeners(artist.spotify_url);
    
    if (listeners === null) {
      console.log(`⚠️  ${artist.name.padEnd(25)} | Link ungültig oder geblockt.`);
    } else {
      const status = listeners > AUDIT_LIMIT ? "❌ ZU GROß" : "✅ OK";
      console.log(`${status} | ${artist.name.padEnd(25)} | ${listeners.toLocaleString('de-DE')} Hörer`);
      
      if (listeners > AUDIT_LIMIT) {
        // Hier könnten wir theoretisch direkt in die DB schreiben (z.B. stage_unlocked = false)
        // Aber erst mal nur Anzeigen zur Kontrolle
      }
    }
  }
  console.log("\n✅ Audit beendet.");
}

auditUnderground();
