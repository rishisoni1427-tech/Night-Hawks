// events.js — fetches and renders the full events list

const iconMap = { trophy: '🏆', block: '🧱', gift: '🎁' };

async function loadFullEvents() {
  try {
    const res = await fetch('/api/events');
    const events = await res.json();
    const list = document.getElementById('eventsFullList');
    if (!events.length) {
      list.innerHTML = `<div class="row-item"><div class="row-main"><strong>No events yet</strong><span>Check back soon!</span></div></div>`;
      return;
    }
    list.innerHTML = events.map(e => `
      <div class="row-item">
        <div class="row-icon">${iconMap[e.icon] || '📌'}</div>
        <div class="row-main"><strong>${e.title}</strong><span>${e.subtitle}</span></div>
        <div class="row-side">${e.day}<small>${e.month}</small></div>
      </div>
    `).join('');
  } catch (e) { console.error('Failed to load events', e); }
}

loadFullEvents();
