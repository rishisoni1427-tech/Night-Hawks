// server.js — Night Hawks community site backend
// Express API + static file server, backed by MongoDB.

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const { Staff, Role, Rule, Config } = require('./models');
const seedDatabase = require('./models/seed');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// static (non-DB) content — kept simple since these aren't admin-editable yet
const eventsData = [
  { id: 1, title: 'Hawks Championship', subtitle: 'Valorant Tournament', day: '24', month: 'JUN', icon: 'trophy' },
  { id: 2, title: 'Minecraft Build Battle', subtitle: 'Creative Challenge', day: '28', month: 'JUN', icon: 'block' },
  { id: 3, title: 'Night Hawks Giveaway', subtitle: 'Nitro + Game Keys', day: '05', month: 'JUL', icon: 'gift' }
];
const activityData = [
  { id: 1, text: 'Phoenix just joined the server', time: '2 minutes ago', icon: 'join' },
  { id: 2, text: 'Solaris sent a message in #general', time: '5 minutes ago', icon: 'message' },
  { id: 3, text: 'Raven earned the level 10 role', time: '10 minutes ago', icon: 'role' },
  { id: 4, text: 'Viper just joined the server', time: '12 minutes ago', icon: 'join' }
];
const announcementsData = [
  { id: 1, tag: 'NEW', title: 'Welcome to Night Hawks 2.0', body: "We've completely upgraded our server for a better experience.", time: '2 days ago' },
  { id: 2, title: 'Double XP Event This Weekend!', time: '4 days ago' },
  { id: 3, title: 'New Giveaway Live Now', time: '5 days ago' }
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
    online: c.online, membersOnline: c.membersOnline, totalMembers: c.totalMembers,
    voiceChannels: c.voiceChannels, uptime: c.uptime, trend: c.trend
  });
}));

app.get('/api/events', (req, res) => res.json(eventsData));
app.get('/api/activity', (req, res) => res.json(activityData));
app.get('/api/announcements', (req, res) => res.json(announcementsData));

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
    membersOnline: c.membersOnline, totalMembers: c.totalMembers,
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
  app.listen(PORT, () => {
    console.log(`🦅 Night Hawks server running at http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
