// admin-dashboard.js — full CRUD logic for the admin panel

const token = sessionStorage.getItem('nh_admin_token');
if (!token) window.location.href = 'admin-login.html';

const adminName = sessionStorage.getItem('nh_admin_name') || 'Admin';
document.getElementById('adminNameLabel').textContent = adminName;
document.getElementById('welcomeName').textContent = adminName;
document.getElementById('avatarInitial').textContent = adminName.charAt(0).toUpperCase();

function authHeaders(json = true) {
  const h = { 'x-admin-token': token };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function apiGet(url) {
  const res = await fetch(url, { headers: authHeaders(false) });
  if (res.status === 401) return handleUnauthorized();
  return res.json();
}
async function apiSend(url, method, body) {
  const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body || {}) });
  if (res.status === 401) return handleUnauthorized();
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}
function handleUnauthorized() {
  sessionStorage.removeItem('nh_admin_token');
  window.location.href = 'admin-login.html';
}

// ---------- Tab switching ----------
document.querySelectorAll('.admin-nav-item').forEach(item => {
  item.addEventListener('click', () => goToTab(item.dataset.tab));
});
document.querySelectorAll('[data-goto]').forEach(btn => {
  btn.addEventListener('click', () => goToTab(btn.dataset.goto));
});
function goToTab(tab) {
  document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.toggle('active', i.dataset.tab === tab));
  document.querySelectorAll('.admin-section').forEach(s => s.classList.toggle('active', s.id === 'tab-' + tab));
}

// ---------- Logout ----------
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST', headers: authHeaders() }).catch(() => {});
  sessionStorage.removeItem('nh_admin_token');
  sessionStorage.removeItem('nh_admin_name');
  window.location.href = 'admin-login.html';
});

// ---------- Overview ----------
async function loadOverview() {
  const data = await apiGet('/api/admin/overview');
  if (!data) return;
  document.getElementById('ovMembersOnline').textContent = data.membersOnline?.toLocaleString('en-US') ?? '—';
  document.getElementById('ovTotalMembers').textContent = data.totalMembers?.toLocaleString('en-US') ?? '—';
  document.getElementById('ovStaffCount').textContent = data.staffCount ?? '—';
  document.getElementById('ovRolesCount').textContent = data.rolesCount ?? '—';
}

// ---------- Roles cache (used in staff dropdown too) ----------
let rolesCache = [];
async function loadRoles() {
  rolesCache = await apiGet('/api/roles') || [];
  renderRolesTable();
  populateStaffRoleSelect();
}
function renderRolesTable() {
  const body = document.getElementById('rolesTableBody');
  if (!rolesCache.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="3">No roles yet.</td></tr>`;
    return;
  }
  body.innerHTML = rolesCache.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.name)}</strong></td>
      <td><span class="role-chip" style="color:${r.color};border-color:${r.color};background:${r.color}22;">${escapeHtml(r.name)}</span></td>
      <td>
        <div class="row-actions">
          <button class="icon-btn edit" data-edit-role="${r.id}">✏️</button>
          <button class="icon-btn delete" data-del-role="${r.id}">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
  body.querySelectorAll('[data-edit-role]').forEach(b => b.addEventListener('click', () => openRoleModal(b.dataset.editRole)));
  body.querySelectorAll('[data-del-role]').forEach(b => b.addEventListener('click', () => deleteRole(b.dataset.delRole)));
}
function populateStaffRoleSelect() {
  const sel = document.getElementById('staffRole');
  sel.innerHTML = rolesCache.map(r => `<option value="${escapeAttr(r.name)}">${escapeHtml(r.name)}</option>`).join('');
}

// ---------- Roles modal ----------
const roleModal = document.getElementById('roleModal');
let editingRoleId = null;
document.getElementById('addRoleBtn').addEventListener('click', () => openRoleModal());
document.getElementById('roleCancel').addEventListener('click', () => roleModal.classList.remove('open'));
function openRoleModal(id) {
  editingRoleId = id || null;
  document.getElementById('roleModalTitle').textContent = id ? 'Edit Role' : 'Add Role';
  const existing = rolesCache.find(r => r.id === id);
  document.getElementById('roleName').value = existing ? existing.name : '';
  document.getElementById('roleColor').value = existing ? existing.color : '#a855f7';
  roleModal.classList.add('open');
}
document.getElementById('roleSave').addEventListener('click', async () => {
  const name = document.getElementById('roleName').value.trim();
  const color = document.getElementById('roleColor').value;
  if (!name) return;
  if (editingRoleId) {
    await apiSend(`/api/admin/roles/${editingRoleId}`, 'PUT', { name, color });
  } else {
    await apiSend('/api/admin/roles', 'POST', { name, color });
  }
  roleModal.classList.remove('open');
  await loadRoles();
  await loadOverview();
});
async function deleteRole(id) {
  if (!confirm('Delete this role?')) return;
  await apiSend(`/api/admin/roles/${id}`, 'DELETE');
  await loadRoles();
  await loadOverview();
}

// ---------- Staff ----------
let staffCache = [];
async function loadStaff() {
  staffCache = await apiGet('/api/staff') || [];
  renderStaffTable();
}
function roleColor(roleName) {
  const r = rolesCache.find(r => r.name === roleName);
  return r ? r.color : '#a855f7';
}
function renderStaffTable() {
  const body = document.getElementById('staffTableBody');
  if (!staffCache.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="4">No staff members yet.</td></tr>`;
    return;
  }
  body.innerHTML = staffCache.map(m => {
    const c = roleColor(m.role);
    return `
    <tr>
      <td><strong>${escapeHtml(m.name)}</strong></td>
      <td><span class="role-chip" style="color:${c};border-color:${c};background:${c}22;">${escapeHtml(m.role)}</span></td>
      <td>${escapeHtml(m.bio || '')}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn edit" data-edit-staff="${m.id}">✏️</button>
          <button class="icon-btn delete" data-del-staff="${m.id}">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
  body.querySelectorAll('[data-edit-staff]').forEach(b => b.addEventListener('click', () => openStaffModal(b.dataset.editStaff)));
  body.querySelectorAll('[data-del-staff]').forEach(b => b.addEventListener('click', () => deleteStaff(b.dataset.delStaff)));
}

const staffModal = document.getElementById('staffModal');
let editingStaffId = null;
document.getElementById('addStaffBtn').addEventListener('click', () => openStaffModal());
document.getElementById('staffCancel').addEventListener('click', () => staffModal.classList.remove('open'));
function openStaffModal(id) {
  editingStaffId = id || null;
  document.getElementById('staffModalTitle').textContent = id ? 'Edit Staff Member' : 'Add Staff Member';
  const existing = staffCache.find(m => m.id === id);
  document.getElementById('staffName').value = existing ? existing.name : '';
  document.getElementById('staffBio').value = existing ? (existing.bio || '') : '';
  if (existing) document.getElementById('staffRole').value = existing.role;
  staffModal.classList.add('open');
}
document.getElementById('staffSave').addEventListener('click', async () => {
  const name = document.getElementById('staffName').value.trim();
  const role = document.getElementById('staffRole').value;
  const bio = document.getElementById('staffBio').value.trim();
  if (!name || !role) return;
  if (editingStaffId) {
    await apiSend(`/api/admin/staff/${editingStaffId}`, 'PUT', { name, role, bio });
  } else {
    await apiSend('/api/admin/staff', 'POST', { name, role, bio });
  }
  staffModal.classList.remove('open');
  await loadStaff();
  await loadOverview();
});
async function deleteStaff(id) {
  if (!confirm('Remove this staff member?')) return;
  await apiSend(`/api/admin/staff/${id}`, 'DELETE');
  await loadStaff();
  await loadOverview();
}

// ---------- Links ----------
async function loadLinksTab() {
  const data = await apiGet('/api/links');
  if (!data) return;
  document.getElementById('linkDiscord').value = data.discord || '';
  document.getElementById('linkYoutube').value = data.youtube || '';
  document.getElementById('linkInstagram').value = data.instagram || '';
}
document.getElementById('saveLinksBtn').addEventListener('click', async () => {
  const discord = document.getElementById('linkDiscord').value.trim();
  const youtube = document.getElementById('linkYoutube').value.trim();
  const instagram = document.getElementById('linkInstagram').value.trim();
  const { ok } = await apiSend('/api/admin/links', 'PUT', { discord, youtube, instagram });
  showMsg('linksMsg', ok ? 'Saved!' : 'Something went wrong.', ok);
});

// ---------- Rules ----------
let rulesCache = [];
async function loadRules() {
  rulesCache = await apiGet('/api/rules') || [];
  renderRulesTable();
}
function renderRulesTable() {
  const body = document.getElementById('rulesTableBody');
  if (!rulesCache.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="3">No rules yet.</td></tr>`;
    return;
  }
  body.innerHTML = rulesCache.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.title)}</strong></td>
      <td>${escapeHtml(r.description || '')}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn edit" data-edit-rule="${r.id}">✏️</button>
          <button class="icon-btn delete" data-del-rule="${r.id}">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
  body.querySelectorAll('[data-edit-rule]').forEach(b => b.addEventListener('click', () => openRuleModal(b.dataset.editRule)));
  body.querySelectorAll('[data-del-rule]').forEach(b => b.addEventListener('click', () => deleteRule(b.dataset.delRule)));
}
const ruleModal = document.getElementById('ruleModal');
let editingRuleId = null;
document.getElementById('addRuleBtn').addEventListener('click', () => openRuleModal());
document.getElementById('ruleCancel').addEventListener('click', () => ruleModal.classList.remove('open'));
function openRuleModal(id) {
  editingRuleId = id || null;
  document.getElementById('ruleModalTitle').textContent = id ? 'Edit Rule' : 'Add Rule';
  const existing = rulesCache.find(r => r.id === id);
  document.getElementById('ruleTitle').value = existing ? existing.title : '';
  document.getElementById('ruleDescription').value = existing ? (existing.description || '') : '';
  ruleModal.classList.add('open');
}
document.getElementById('ruleSave').addEventListener('click', async () => {
  const title = document.getElementById('ruleTitle').value.trim();
  const description = document.getElementById('ruleDescription').value.trim();
  if (!title) return;
  if (editingRuleId) {
    await apiSend(`/api/admin/rules/${editingRuleId}`, 'PUT', { title, description });
  } else {
    await apiSend('/api/admin/rules', 'POST', { title, description });
  }
  ruleModal.classList.remove('open');
  await loadRules();
});
async function deleteRule(id) {
  if (!confirm('Delete this rule?')) return;
  await apiSend(`/api/admin/rules/${id}`, 'DELETE');
  await loadRules();
}
// ---------- Events ----------
let eventsCache = [];
async function loadEvents() {
  eventsCache = await apiGet('/api/events') || [];
  renderEventsTable();
}
function renderEventsTable() {
  const body = document.getElementById('eventsTableBody');
  if (!eventsCache.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="4">No events yet.</td></tr>`;
    return;
  }
  body.innerHTML = eventsCache.map(ev => `
    <tr>
      <td><strong>${escapeHtml(ev.title)}</strong></td>
      <td>${escapeHtml(ev.subtitle || '')}</td>
      <td>${escapeHtml(ev.day)} ${escapeHtml(ev.month)}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn edit" data-edit-event="${ev.id}">✏️</button>
          <button class="icon-btn delete" data-del-event="${ev.id}">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
  body.querySelectorAll('[data-edit-event]').forEach(b => b.addEventListener('click', () => openEventModal(b.dataset.editEvent)));
  body.querySelectorAll('[data-del-event]').forEach(b => b.addEventListener('click', () => deleteEvent(b.dataset.delEvent)));
}
const eventModal = document.getElementById('eventModal');
let editingEventId = null;
document.getElementById('addEventBtn').addEventListener('click', () => openEventModal());
document.getElementById('eventCancel').addEventListener('click', () => eventModal.classList.remove('open'));
function openEventModal(id) {
  editingEventId = id || null;
  document.getElementById('eventModalTitle').textContent = id ? 'Edit Event' : 'Add Event';
  const existing = eventsCache.find(ev => ev.id === id);
  document.getElementById('eventTitle').value = existing ? existing.title : '';
  document.getElementById('eventSubtitle').value = existing ? (existing.subtitle || '') : '';
  document.getElementById('eventDay').value = existing ? existing.day : '';
  document.getElementById('eventMonth').value = existing ? existing.month : '';
  document.getElementById('eventIcon').value = existing ? existing.icon : 'trophy';
  eventModal.classList.add('open');
}
document.getElementById('eventSave').addEventListener('click', async () => {
  const title = document.getElementById('eventTitle').value.trim();
  const subtitle = document.getElementById('eventSubtitle').value.trim();
  const day = document.getElementById('eventDay').value.trim();
  const month = document.getElementById('eventMonth').value.trim();
  const icon = document.getElementById('eventIcon').value;
  if (!title || !day || !month) return;
  if (editingEventId) {
    await apiSend(`/api/admin/events/${editingEventId}`, 'PUT', { title, subtitle, day, month, icon });
  } else {
    await apiSend('/api/admin/events', 'POST', { title, subtitle, day, month, icon });
  }
  eventModal.classList.remove('open');
  await loadEvents();
});
async function deleteEvent(id) {
  if (!confirm('Delete this event?')) return;
  await apiSend(`/api/admin/events/${id}`, 'DELETE');
  await loadEvents();
}

// ---------- Announcements ----------
let announcementsCache = [];
async function loadAnnouncements() {
  announcementsCache = await apiGet('/api/announcements') || [];
  renderAnnouncementsTable();
}
function renderAnnouncementsTable() {
  const body = document.getElementById('announcementsTableBody');
  if (!announcementsCache.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="4">No announcements yet.</td></tr>`;
    return;
  }
  body.innerHTML = announcementsCache.map(a => `
    <tr>
      <td>${escapeHtml(a.tag || '')}</td>
      <td><strong>${escapeHtml(a.title)}</strong></td>
      <td>${escapeHtml(a.time || '')}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn edit" data-edit-announcement="${a.id}">✏️</button>
          <button class="icon-btn delete" data-del-announcement="${a.id}">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
  body.querySelectorAll('[data-edit-announcement]').forEach(b => b.addEventListener('click', () => openAnnouncementModal(b.dataset.editAnnouncement)));
  body.querySelectorAll('[data-del-announcement]').forEach(b => b.addEventListener('click', () => deleteAnnouncement(b.dataset.delAnnouncement)));
}
const announcementModal = document.getElementById('announcementModal');
let editingAnnouncementId = null;
document.getElementById('addAnnouncementBtn').addEventListener('click', () => openAnnouncementModal());
document.getElementById('announcementCancel').addEventListener('click', () => announcementModal.classList.remove('open'));
function openAnnouncementModal(id) {
  editingAnnouncementId = id || null;
  document.getElementById('announcementModalTitle').textContent = id ? 'Edit Announcement' : 'Add Announcement';
  const existing = announcementsCache.find(a => a.id === id);
  document.getElementById('announcementTag').value = existing ? (existing.tag || '') : '';
  document.getElementById('announcementTitle').value = existing ? existing.title : '';
  document.getElementById('announcementBody').value = existing ? (existing.body || '') : '';
  document.getElementById('announcementTime').value = existing ? (existing.time || '') : '';
  announcementModal.classList.add('open');
}
document.getElementById('announcementSave').addEventListener('click', async () => {
  const tag = document.getElementById('announcementTag').value.trim();
  const title = document.getElementById('announcementTitle').value.trim();
  const body = document.getElementById('announcementBody').value.trim();
  const time = document.getElementById('announcementTime').value.trim();
  if (!title) return;
  if (editingAnnouncementId) {
    await apiSend(`/api/admin/announcements/${editingAnnouncementId}`, 'PUT', { tag, title, body, time });
  } else {
    await apiSend('/api/admin/announcements', 'POST', { tag, title, body, time });
  }
  announcementModal.classList.remove('open');
  await loadAnnouncements();
});
async function deleteAnnouncement(id) {
  if (!confirm('Delete this announcement?')) return;
  await apiSend(`/api/admin/announcements/${id}`, 'DELETE');
  await loadAnnouncements();
}

// ---------- Settings: stats ----------
async function loadStatsForm() {
  const data = await apiGet('/api/stats');
  if (!data) return;
  document.getElementById('statMembersOnline').value = data.membersOnline;
  document.getElementById('statTotalMembers').value = data.totalMembers;
  document.getElementById('statVoiceChannels').value = data.voiceChannels;
  document.getElementById('statUptime').value = data.uptime;
}
document.getElementById('saveStatsBtn').addEventListener('click', async () => {
  const body = {
    membersOnline: document.getElementById('statMembersOnline').value,
    totalMembers: document.getElementById('statTotalMembers').value,
    voiceChannels: document.getElementById('statVoiceChannels').value,
    uptime: document.getElementById('statUptime').value
  };
  const { ok } = await apiSend('/api/admin/stats', 'PUT', body);
  showMsg('statsMsg', ok ? 'Saved!' : 'Something went wrong.', ok);
  await loadOverview();
});

// ---------- Settings: password ----------
document.getElementById('savePasswordBtn').addEventListener('click', async () => {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const { ok, data } = await apiSend('/api/admin/password', 'PUT', { currentPassword, newPassword });
  showMsg('passwordMsg', ok ? 'Password updated!' : (data.message || 'Something went wrong.'), ok);
  if (ok) {
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
  }
});

// ---------- Helpers ----------
function showMsg(id, text, ok) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = 'form-msg ' + (ok ? 'ok' : 'err');
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3000);
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function escapeAttr(str) { return escapeHtml(str); }

// ---------- Init ----------
(async function init() {
  await loadOverview();
  await loadRoles();
  await loadStaff();
  await loadLinksTab();
  await loadRules();
  await loadEvents();
  await loadAnnouncements();
  await loadStatsForm();
})();
