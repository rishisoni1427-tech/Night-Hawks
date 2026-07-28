// script.js — fetches live data from the Express backend and renders it

const fmt = n => n.toLocaleString('en-US');

const iconMap = {
  trophy: '🏆', block: '🧱', gift: '🎁',
  join: '👋', message: '💬', role: '⭐'
};

async function loadLinks() {
  try {
    const res = await fetch('/api/links');
    const l = await res.json();
    const navBtn = document.getElementById('navDiscordBtn');
    const heroBtn = document.getElementById('heroDiscordBtn');
    const heroYt = document.getElementById('heroYoutubeBtn');
    const ftDiscord = document.getElementById('footerDiscord');
    const ftYoutube = document.getElementById('footerYoutube');
    const ftInstagram = document.getElementById('footerInstagram');
    if (navBtn) navBtn.href = l.discord;
    if (heroBtn) heroBtn.href = l.discord;
    if (heroYt) heroYt.href = l.youtube;
    if (ftDiscord) ftDiscord.href = l.discord;
    if (ftYoutube) ftYoutube.href = l.youtube;
    if (ftInstagram) ftInstagram.href = l.instagram;
  } catch (e) { console.error('Failed to load links', e); }
}

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const s = await res.json();
    document.getElementById('membersOnline').textContent = fmt(s.membersOnline);
    document.getElementById('totalMembers').textContent = fmt(s.totalMembers);
    document.getElementById('voiceChannels').textContent = fmt(s.voiceChannels);
    document.getElementById('uptime').textContent = s.uptime + '%';
    document.getElementById('statusText').textContent = s.online ? 'ONLINE' : 'OFFLINE';
    drawSparkline(s.trend);
  } catch (e) {
    console.error('Failed to load stats', e);
  }
}

function drawSparkline(data) {
  const svg = document.getElementById('sparkline');
  const w = 260, h = 60;
  const max = Math.max(...data), min = Math.min(...data);
  const step = w / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / (max - min || 1)) * (h - 10) - 5;
    return `${x},${y}`;
  }).join(' ');

  svg.innerHTML = `
    <defs>
      <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c084fc" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="#c084fc" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <polyline points="${points}" fill="none" stroke="#c084fc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <polygon points="0,${h} ${points} ${w},${h}" fill="url(#sparkGrad)" opacity="0.6"/>
  `;
}

async function loadEvents() {
  try {
    const res = await fetch('/api/events');
    const events = await res.json();
    const list = document.getElementById('eventsList');
    list.innerHTML = events.map(e => `
      <div class="row-item">
        <div class="row-icon">${iconMap[e.icon] || '📌'}</div>
        <div class="row-main"><strong>${e.title}</strong><span>${e.subtitle}</span></div>
        <div class="row-side">${e.day}<small>${e.month}</small></div>
      </div>
    `).join('');
  } catch (e) { console.error(e); }
}

async function loadActivity() {
  try {
    const res = await fetch('/api/activity');
    const items = await res.json();
    const list = document.getElementById('activityList');
    list.innerHTML = items.map(a => `
      <div class="row-item">
        <div class="row-icon">${iconMap[a.icon] || '🔔'}</div>
        <div class="row-main"><strong>${a.text}</strong><span>${a.time}</span></div>
      </div>
    `).join('');
  } catch (e) { console.error(e); }
}

async function loadTopMembers() {
  try {
    const res = await fetch('/api/members/top');
    const members = await res.json();
    const rankClass = r => r === 1 ? 'gold' : r === 2 ? 'silver' : r === 3 ? 'bronze' : '';
    const roleTag = t => t.toLowerCase();
    const list = document.getElementById('membersList');
    list.innerHTML = members.map(m => `
      <div class="row-item">
        <div class="rank-badge ${rankClass(m.rank)}">${m.rank}</div>
        <div class="row-main"><strong>${m.name}</strong></div>
        <div class="role-tag role-${roleTag(m.tag)}">${m.tag}</div>
      </div>
    `).join('');
  } catch (e) { console.error(e); }
}

async function loadAnnouncements() {
  try {
    const res = await fetch('/api/announcements');
    const items = await res.json();
    const list = document.getElementById('announceList');
    const [hero, ...rest] = items;
    list.innerHTML = `
      <div class="announce-hero">
        ${hero.tag ? `<span class="new-tag">${hero.tag}</span>` : ''}
        <strong style="padding:0 16px;text-align:center;font-size:0.85rem;">${hero.title}</strong>
      </div>
      ${rest.map(a => `
        <div class="row-item">
          <div class="row-icon">📢</div>
          <div class="row-main"><strong>${a.title}</strong><span>${a.time}</span></div>
        </div>
      `).join('')}
    `;
  } catch (e) { console.error(e); }
}

function renderAvatarStack() {
  const names = ['P', 'S', 'R', 'V'];
  const stack = document.getElementById('avatarStack');
  stack.innerHTML = names.map(n => `<div class="av">${n}</div>`).join('');
}

// ---------- init ----------
renderAvatarStack();
loadLinks();
loadStats();
loadEvents();
loadActivity();
loadTopMembers();
loadAnnouncements();

// refresh live stats every 8s to feel "alive"
setInterval(loadStats, 8000);
