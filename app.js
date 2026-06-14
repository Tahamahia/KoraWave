document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video-player');
    const playerContainer = document.getElementById('player-container');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const antiAdblockOverlay = document.getElementById('anti-adblock-overlay');
    
    // 1. CLOUDFLARE WORKER PROXY (Live)
    const WORKER_URL = 'https://korawave-proxy.tahamax028.workers.dev/?url=';

    let hls = null;

    // 1. Fullscreen Logic (iOS & General)
    fullscreenBtn.addEventListener('click', () => {
        playerContainer.classList.toggle('fullscreen');
        if (playerContainer.classList.contains('fullscreen')) {
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        } else {
            document.body.style.overflow = '';
        }
    });

    // 2. Playback Logic
    function playStream(m3u8Url) {
        const proxiedUrl = `${WORKER_URL}${encodeURIComponent(m3u8Url)}`;

        if (Hls.isSupported()) {
            if (hls) hls.destroy();
            hls = new Hls();
            hls.loadSource(proxiedUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(e => console.log('Autoplay blocked', e));
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native fallback (E.g. Safari)
            video.src = proxiedUrl;
            video.addEventListener('loadedmetadata', () => {
                video.play().catch(e => console.log('Autoplay blocked', e));
            });
        }
    }

    // 3. Timezone Converter
    function convertUTCToLocal(utcTimeString) {
        const date = new Date(utcTimeString);
        return date.toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    // 4. Fetch and Display Data
    async function init() {
        try {
            // 2. PREMIUM CUSTOM MATCHES (GIST BACKDOOR)
            const gistBaseUrl = 'https://gist.githubusercontent.com/Tahamahia/c8ba1be831bd6f9d41a2c3c0220f809f/raw/custom-matches.json';
            const cacheBuster = `?t=${new Date().getTime()}`;
            
            try {
                // Force fetch of latest file using cache-buster and no-store
                const gistRes = await fetch(gistBaseUrl + cacheBuster, { cache: "no-store" });
                if (gistRes.ok) {
                    const premiumData = await gistRes.json();
                    renderMatches(premiumData, 'premium-matches', true);
                }
            } catch (e) {
                console.log('No premium matches currently or fetch failed.');
            }

            // Fetch Today's Matches with 404 Fallback
            try {
                const matchesRes = await fetch(`matches.json?v=${new Date().getTime()}`, { cache: "no-store" });
                if (!matchesRes.ok) throw new Error(`HTTP error! status: ${matchesRes.status}`);
                const matchesData = await matchesRes.json();
                renderMatches(matchesData, 'matches-container', false);
            } catch (e) {
                console.error('Error loading matches:', e);
                const container = document.getElementById('matches-container');
                container.innerHTML = "<p style='text-align:center; color:gray;'>جاري تحديث جدول المباريات... يرجى تحديث الصفحة بعد قليل.</p>";
            }

            // Fetch Sports Channels with 404 Fallback
            try {
                const channelsRes = await fetch(`sports.json?v=${new Date().getTime()}`, { cache: "no-store" });
                if (!channelsRes.ok) throw new Error(`HTTP error! status: ${channelsRes.status}`);
                const channelsData = await channelsRes.json();
                renderChannels(channelsData);
            } catch (e) {
                console.error('Error loading channels:', e);
                const container = document.getElementById('channels-container');
                container.innerHTML = "<p style='text-align:center; color:gray;'>جاري جلب القنوات الرياضية...</p>";
            }

        } catch (error) {
            console.error('Initialization error:', error);
        }
    }

    function renderMatches(matches, containerId, isPremium) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        matches.forEach(match => {
            const el = document.createElement('div');
            el.className = `card ${isPremium ? 'premium' : ''}`;
            const localTime = match.utcDate ? convertUTCToLocal(match.utcDate) : match.time || 'Live';
            
            // Handle JSON structure discrepancies between Gist and Football API
            const matchTitleHTML = match.title 
                ? match.title 
                : `${match.homeTeam} ضد ${match.awayTeam}`;
            
            el.innerHTML = `
                <div class="match-time">${localTime}</div>
                <div class="match-teams">${matchTitleHTML}</div>
                ${isPremium ? '<div style="margin-top: 8px;"><span style="background: #ef4444; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: bold; display: inline-block;">🔴 بث كأس العالم المباشر</span></div>' : ''}
            `;
            
            if (match.url) {
                el.addEventListener('click', () => {
                    playStream(match.url);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            }
            container.appendChild(el);
        });
    }

    function renderChannels(channels) {
        const container = document.getElementById('channels-container');
        container.innerHTML = '';

        // Limit to 50 channels to prevent DOM lag
        channels.slice(0, 50).forEach(channel => {
            const el = document.createElement('div');
            el.className = 'card';
            el.innerHTML = `<div class="match-teams">${channel.name || 'قناة رياضية'}</div>`;
            
            el.addEventListener('click', () => {
                if (channel.url) {
                    playStream(channel.url);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
            container.appendChild(el);
        });
    }

    // 5. Anti-Adblock System
    function checkAdblock() {
        const ads = document.querySelectorAll('.ad-container');
        let adblockDetected = false;

        ads.forEach(ad => {
            const adStyles = window.getComputedStyle(ad);
            // Check if ad is hidden, display none, visibility hidden, or height is forced to 0
            if (adStyles.display === 'none' || adStyles.visibility === 'hidden' || ad.offsetHeight === 0) {
                adblockDetected = true;
            }
        });

        if (adblockDetected) {
            if (!video.paused) video.pause();
            video.style.filter = 'blur(10px)';
            antiAdblockOverlay.classList.remove('hidden');
        } else {
            video.style.filter = 'none';
            antiAdblockOverlay.classList.add('hidden');
        }
    }

    // Run check periodically
    setInterval(checkAdblock, 2000);

    init();
});
