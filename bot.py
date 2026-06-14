import os
import json
import requests
from datetime import datetime, timezone
from PIL import Image, ImageDraw, ImageFont
import tweepy

# Configuration
SPORTS_JSON_PATH = "sports.json"
MATCHES_JSON_PATH = "matches.json"
POSTER_PATH = "poster.jpg"

def fetch_today_matches():
    print("Fetching today's matches...")
    football_token = os.environ.get('FOOTBALL_API_TOKEN')
    matches = []
    
    if not football_token:
        print("Warning: FOOTBALL_API_TOKEN is missing. Returning empty matches.")
        with open(MATCHES_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(matches, f, ensure_ascii=False, indent=2)
        return matches

    try:
        headers = {"X-Auth-Token": football_token}
        url = "https://api.football-data.org/v4/matches"
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            for match in data.get('matches', []):
                matches.append({
                    "homeTeam": match['homeTeam']['name'],
                    "awayTeam": match['awayTeam']['name'],
                    "time": match['utcDate'],
                    "competition": match['competition']['name']
                })
            
            with open(MATCHES_JSON_PATH, "w", encoding="utf-8") as f:
                json.dump(matches, f, ensure_ascii=False, indent=2)
            print(f"Saved {len(matches)} matches.")
        else:
            print(f"Error fetching matches: {response.status_code}")
    except Exception as e:
        print(f"Exception while fetching matches: {e}")
        
    return matches

def fetch_iptv_sports():
    print("Fetching IPTV sports channels...")
    url = "https://iptv-org.github.io/api/channels.json"
    
    try:
        response = requests.get(url)
        if response.status_code == 200:
            channels = response.json()
            sports_channels = []
            
            for channel in channels:
                categories = channel.get('categories', [])
                if 'sports' in [c.lower() for c in categories]:
                    sports_channels.append({
                        "id": channel.get('id'),
                        "name": channel.get('name'),
                        "url": channel.get('url', ''),
                        "country": channel.get('country')
                    })
                    
            with open(SPORTS_JSON_PATH, "w", encoding="utf-8") as f:
                json.dump(sports_channels, f, ensure_ascii=False, indent=2)
            print(f"Saved {len(sports_channels)} sports channels.")
        else:
            print(f"Error fetching IPTV channels: {response.status_code}")
    except Exception as e:
        print(f"Exception while fetching IPTV channels: {e}")

def run_marketing_bots(matches):
    print("Running Marketing Bots...")
    if not matches:
        print("No matches to market today.")
        return

    # Create dynamic match poster
    img = Image.new('RGB', (800, 400), color='#0f172a') # Solid dark-blue background
    d = ImageDraw.Draw(img)
    
    try:
        # Attempt to load a default font
        font_large = ImageFont.truetype("arial.ttf", 36)
        font_small = ImageFont.truetype("arial.ttf", 24)
    except IOError:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Draw the top matches (up to 3)
    y_offset = 50
    d.text((50, 20), "Today's Top Matches", fill=(255, 255, 255), font=font_large)
    
    for i, match in enumerate(matches[:3]):
        match_text = f"{match['homeTeam']} vs {match['awayTeam']}"
        d.text((50, y_offset + (i+1)*50), match_text, fill=(200, 200, 200), font=font_small)
        
    # Bottom banner text
    d.text((50, 320), "KoraWave \ud83c\udf0a\u26bd - Watch Live Now!", fill=(59, 130, 246), font=font_large)
    img.save(POSTER_PATH)

    promo_text = "🔥 لا تفوتوا مباريات اليوم! شاهد البث المباشر مجاناً وبدون تقطيع على منصة KoraWave \ud83c\udf0a\u26bd\n\nالرابط: https://korawave.pages.dev"
    
    # FIX: Sanitize surrogate pairs for Python requests payload
    safe_promo_text = promo_text.encode('utf-16', 'surrogatepass').decode('utf-16')
    
    # Telegram Integration
    telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    telegram_chat_id = "@KoraWave0"
    
    if telegram_token:
        print("Posting to Telegram...")
        try:
            tg_url = f"https://api.telegram.org/bot{telegram_token}/sendPhoto"
            with open(POSTER_PATH, 'rb') as photo:
                requests.post(tg_url, data={'chat_id': telegram_chat_id, 'caption': safe_promo_text}, files={'photo': photo})
            print("Successfully posted to Telegram.")
        except Exception as e:
            print(f"Telegram Post Error: {e}")
    else:
        print("TELEGRAM_BOT_TOKEN missing, skipping Telegram.")

    # Twitter Integration
    print("Posting to Twitter...")
    try:
        tw_api_key = os.environ.get('TWITTER_API_KEY')
        tw_api_secret = os.environ.get('TWITTER_API_SECRET')
        tw_access_token = os.environ.get('TWITTER_ACCESS_TOKEN')
        tw_access_secret = os.environ.get('TWITTER_ACCESS_SECRET')
        
        if all([tw_api_key, tw_api_secret, tw_access_token, tw_access_secret]):
            auth = tweepy.OAuth1UserHandler(
                tw_api_key, tw_api_secret, 
                tw_access_token, tw_access_secret
            )
            api = tweepy.API(auth)
            
            client = tweepy.Client(
                consumer_key=tw_api_key,
                consumer_secret=tw_api_secret,
                access_token=tw_access_token,
                access_token_secret=tw_access_secret
            )
            
            media = api.media_upload(POSTER_PATH)
            # Use safe sanitized text here too for tweepy compatibility
            client.create_tweet(text=safe_promo_text, media_ids=[media.media_id])
            print("Successfully posted to Twitter.")
        else:
            print("Twitter credentials missing. Skipping Twitter integration.")
    except Exception as e:
        # Gracefully catch API limits, missing keys, or any Twitter-related error
        print(f"Twitter Post Error (Gracefully handled): {e}")

if __name__ == "__main__":
    matches = fetch_today_matches()
    fetch_iptv_sports()
    run_marketing_bots(matches)
