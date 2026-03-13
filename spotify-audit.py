import requests
import json
import base64

# Supabase Config
SUPABASE_URL = "https://tyflhzwrwzfakwedipig.supabase.co"
SUPABASE_ANON_KEY = "sb_publishable_OkJhaPak_fd0nNg1vxRLPQ_gOiaI6Tb"

def get_monthly_listeners(spotify_url):
    if not spotify_url or 'artist/' not in spotify_url:
        return None
    
    artist_id = spotify_url.split('artist/')[1].split('?')[0]
    
    # Spotify Frontend API (Public endpoint often used by widgets)
    api_url = f"https://spclient.wg.spotify.com/open-backend-2/v1/artist/{artist_id}"
    
    try:
        # Wir müssen so tun, als wären wir ein Browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'app-platform': 'WebPlayer'
        }
        r = requests.get(api_url, headers=headers, timeout=10)
        
        # Falls dieser Endpunkt nicht geht, nutzen wir den oembed-Weg für die UI-Zahlen
        if r.status_code == 200:
            data = r.json()
            return data.get('monthly_listeners', 0)
        
        # Fallback: Scrape the public page with a more robust regex
        r = requests.get(spotify_url, headers=headers, timeout=10)
        import re
        # Suche nach der Zahl vor "monatliche Hörer" oder "monthly listeners"
        match = re.search(r'([0-9.,]+)\s+(monatliche H\u00f6rer|monthly listeners)', r.text)
        if match:
            # Wir müssen Punkte/Kommas entfernen, um eine echte Zahl zu kriegen
            num_str = match.group(1).replace('.', '').replace(',', '')
            return int(num_str)
            
        return None
    except Exception as e:
        return None

def run_audit():
    print("🕵️‍♂️ Starte Untergrund-Audit (v2 Python)...")
    
    # Hole Artists von Supabase
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    }
    r = requests.get(f"{SUPABASE_URL}/rest/v1/artists_public?select=id,name,spotify_url", headers=headers)
    artists = r.json()
    
    print(f"🔍 Prüfe {len(artists)} Artists...\n")
    
    for a in artists:
        name = a['name']
        url = a['spotify_url']
        listeners = get_monthly_listeners(url)
        
        if listeners is not None:
            status = "❌ ZU GROß" if listeners > 10000 else "✅ OK"
            print(f"{status} | {name:<25} | {listeners:,} Hörer")
        else:
            print(f"⚠️  {name:<25} | Link/Data Error")

if __name__ == "__main__":
    run_audit()
