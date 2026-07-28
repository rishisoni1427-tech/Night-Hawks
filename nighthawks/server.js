// server.js — Night Hawks community site backend
// Express API + static file server, backed by MongoDB.

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// ---------- Live Discord stats ----------
const DISCORD_INVITE_CODE = 'rUXS2UUyvV';
let liveDiscordStats = { membersOnline: 0, totalMembers: 0 };

async function refreshDiscordStats() {
  try {
    const res = await fetch(`https://discord.com/api/v10/invites/${DISCORD_INVITE_CODE}?with_counts=true`);
    const data = await res.json();
    liveDiscordStats = {
      membersOnline: data.approximate_presence_count ?? liveDiscordStats.membersOnline,
      totalMembers: data.approximate_member_count ?? liveDiscordStats.totalMembers
    };
    console.log('🔄 Discord stats updated:', liveDiscordStats);
  } catch (err) {
    console.error('Discord stats fetch failed:', err.message);
  }
}

const { Staff, Role, Rule, Config, Event, Announcement } = require('./models');
const seedDatabase = require('./models/seed');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// static (non-DB) content — kept simple since these aren't admin-editable yet
const activityData = [
  { id: 1, text: 'Phoenix just joined the server', time: '2 minutes ago', icon: 'join' },
  { id: 2, text: 'Solaris sent a message in #general', time: '5 minutes ago', icon: 'message' },
  { id: 3, text: 'Raven earned the level 10 role', time: '10 minutes ago', icon: 'role' },
  { id: 4, text: 'Viper just joined the server', time: '12 minutes ago', icon: 'join' }
];

// ---------- Admin auth (tokens are in-memory — re-login after a server restart) ----------
const adminTokens = new Set();

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (token && adminTokens.has(token)) return next();
  res.status(401).json({ message: 'Unauthorized. Please log in again.' });
}

function asyncRoute(fn) {
  return (req, res) => fn(req, res).catch(err => {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  });
}

app.post('/api/admin/login', asyncRoute(async (req, res) => {
  const { username, password } = req.body || {};
  const config = await Config.findOne({ key: 'main' });
  if (!config) return res.status(503).json({ success: false, message: 'Server not ready yet, try again shortly.' });

  const match = username === config.adminUsername && await bcrypt.compare(password || '', config.adminPasswordHash);
  if (match) {
    const token = crypto.randomBytes(24).toString('hex');
    adminTokens.add(token);
    return res.json({ success: true, token, username: config.adminUsername });
  }
  res.status(401).json({ success: false, message: 'Invalid username or password.' });
}));

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  adminTokens.delete(req.headers['x-admin-token']);
  res.json({ success: true });
});

app.put('/api/admin/password', requireAdmin, asyncRoute(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const config = await Config.findOne({ key: 'main' });
  const ok = await bcrypt.compare(currentPassword || '', config.adminPasswordHash);
  if (!ok) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
  if (!newPassword) return res.status(400).json({ success: false, message: 'New password cannot be empty.' });
  config.adminPasswordHash = await bcrypt.hash(newPassword, 10);
  await config.save();
  res.json({ success: true });
}));

// ---------- Public read routes ----------
app.get('/api/stats', asyncRoute(async (req, res) => {
  const c = await Config.findOne({ key: 'main' });
  res.json({
    online: c.online,
    membersOnline: liveDiscordStats.membersOnline,
    totalMembers: liveDiscordStats.totalMembers,
    voiceChannels: c.voiceChannels, uptime: c.uptime, trend: c.trend
  });
}));

app.get('/api/events', asyncRoute(async (req, res) => {
  res.json(await Event.find().sort({ _id: 1 }));
}));
app.get('/api/activity', (req, res) => res.json(activityData));
app.get('/api/announcements', asyncRoute(async (req, res) => {
  res.json(await Announcement.find().sort({ _id: 1 }));
}));

app.get('/api/links', asyncRoute(async (req, res) => {
  const c = await Config.findOne({ key: 'main' });
  res.json({ discord: c.discord, youtube: c.youtube, instagram: c.instagram });
}));

app.get('/api/rules', asyncRoute(async (req, res) => {
  res.json(await Rule.find().sort({ _id: 1 }));
}));

app.get('/api/roles', asyncRoute(async (req, res) => {
  res.json(await Role.find().sort({ _id: 1 }));
}));

app.get('/api/staff', asyncRoute(async (req, res) => {
  res.json(await Staff.find().sort({ _id: 1 }));
}));

// homepage "Staff Team" leaderboard panel — derived from staff list
app.get('/api/members/top', asyncRoute(async (req, res) => {
  const staffList = await Staff.find().sort({ _id: 1 }).limit(6);
  const top = staffList.map((m, i) => ({ rank: i + 1, name: m.name, tag: m.role }));
  res.json(top);
}));

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now(), dbConnected: mongoose.connection.readyState === 1 }));

// ---------- Admin: overview ----------
app.get('/api/admin/overview', requireAdmin, asyncRoute(async (req, res) => {
  const c = await Config.findOne({ key: 'main' });
  const staffCount = await Staff.countDocuments();
  const rolesCount = await Role.countDocuments();
  res.json({
    membersOnline: liveDiscordStats.membersOnline, totalMembers: liveDiscordStats.totalMembers,
    voiceChannels: c.voiceChannels, uptime: c.uptime,
    staffCount, rolesCount
  });
}));

app.put('/api/admin/stats', requireAdmin, asyncRoute(async (req, res) => {
  const { membersOnline, totalMembers, voiceChannels, uptime, online } = req.body || {};
  const c = await Config.findOne({ key: 'main' });
  if (membersOnline !== undefined) c.membersOnline = Number(membersOnline);
  if (totalMembers !== undefined) c.totalMembers = Number(totalMembers);
  if (voiceChannels !== undefined) c.voiceChannels = Number(voiceChannels);
  if (uptime !== undefined) c.uptime = Number(uptime);
  if (online !== undefined) c.online = Boolean(online);
  await c.save();
  res.json(c);
}));

// ---------- Admin: staff CRUD ----------
app.post('/api/admin/staff', requireAdmin, asyncRoute(async (req, res) => {
  const { name, role, bio } = req.body || {};
  if (!name || !role) return res.status(400).json({ message: 'Name and role are required.' });
  const member = await Staff.create({ name, role, bio: bio || '' });
  res.json(member);
}));

app.put('/api/admin/staff/:id', requireAdmin, asyncRoute(async (req, res) => {
  const { name, role, bio } = req.body || {};
  const member = await Staff.findByIdAndUpdate(req.params.id, { name, role, bio }, { new: true });
  if (!member) return res.status(404).json({ message: 'Staff member not found.' });
  res.json(member);
}));

app.delete('/api/admin/staff/:id', requireAdmin, asyncRoute(async (req, res) => {
  await Staff.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ---------- Admin: roles CRUD ----------
app.post('/api/admin/roles', requireAdmin, asyncRoute(async (req, res) => {
  const { name, color } = req.body || {};
  if (!name) return res.status(400).json({ message: 'Role name is required.' });
  const role = await Role.create({ name, color: color || '#a855f7' });
  res.json(role);
}));

app.put('/api/admin/roles/:id', requireAdmin, asyncRoute(async (req, res) => {
  const { name, color } = req.body || {};
  const role = await Role.findByIdAndUpdate(req.params.id, { name, color }, { new: true });
  if (!role) return res.status(404).json({ message: 'Role not found.' });
  res.json(role);
}));

app.delete('/api/admin/roles/:id', requireAdmin, asyncRoute(async (req, res) => {
  await Role.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));
// ---------- Admin: events CRUD ----------
app.post('/api/admin/events', requireAdmin, asyncRoute(async (req, res) => {
  const { title, subtitle, day, month, icon } = req.body || {};
  if (!title || !day || !month) return res.status(400).json({ message: 'Title, day, and month are required.' });
  const event = await Event.create({ title, subtitle, day, month, icon: icon || 'trophy' });
  res.json(event);
}));

app.put('/api/admin/events/:id', requireAdmin, asyncRoute(async (req, res) => {
  const { title, subtitle, day, month, icon } = req.body || {};
  const event = await Event.findByIdAndUpdate(req.params.id, { title, subtitle, day, month, icon }, { new: true });
  if (!event) return res.status(404).json({ message: 'Event not found.' });
  res.json(event);
}));

app.delete('/api/admin/events/:id', requireAdmin, asyncRoute(async (req, res) => {
  await Event.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));
// ---------- Admin: announcements CRUD ----------
app.post('/api/admin/announcements', requireAdmin, asyncRoute(async (req, res) => {
  const { tag, title, body, time } = req.body || {};
  if (!title) return res.status(400).json({ message: 'Title is required.' });
  const announcement = await Announcement.create({ tag: tag || '', title, body: body || '', time: time || 'Just now' });
  res.json(announcement);
}));

app.put('/api/admin/announcements/:id', requireAdmin, asyncRoute(async (req, res) => {
  const { tag, title, body, time } = req.body || {};
  const announcement = await Announcement.findByIdAndUpdate(req.params.id, { tag, title, body, time }, { new: true });
  if (!announcement) return res.status(404).json({ message: 'Announcement not found.' });
  res.json(announcement);
}));

app.delete('/api/admin/announcements/:id', requireAdmin, asyncRoute(async (req, res) => {
  await Announcement.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ---------- Admin: links ----------
app.put('/api/admin/links', requireAdmin, asyncRoute(async (req, res) => {
  const { discord, youtube, instagram } = req.body || {};
  const c = await Config.findOne({ key: 'main' });
  if (discord !== undefined) c.discord = discord;
  if (youtube !== undefined) c.youtube = youtube;
  if (instagram !== undefined) c.instagram = instagram;
  await c.save();
  res.json({ discord: c.discord, youtube: c.youtube, instagram: c.instagram });
}));

// ---------- Admin: rules CRUD ----------
app.post('/api/admin/rules', requireAdmin, asyncRoute(async (req, res) => {
  const { title, description } = req.body || {};
  if (!title) return res.status(400).json({ message: 'Rule title is required.' });
  const rule = await Rule.create({ title, description: description || '' });
  res.json(rule);
}));

app.put('/api/admin/rules/:id', requireAdmin, asyncRoute(async (req, res) => {
  const { title, description } = req.body || {};
  const rule = await Rule.findByIdAndUpdate(req.params.id, { title, description }, { new: true });
  if (!rule) return res.status(404).json({ message: 'Rule not found.' });
  res.json(rule);
}));

app.delete('/api/admin/rules/:id', requireAdmin, asyncRoute(async (req, res) => {
  await Rule.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ---------- Startup ----------
async function start() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable is not set. Add it in Render → Environment.');
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');
  await seedDatabase();
  await refreshDiscordStats();
  setInterval(refreshDiscordStats, 5 * 60 * 1000);
  app.listen(PORT, () => {
    console.log(`🦅 Night Hawks server running at http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
