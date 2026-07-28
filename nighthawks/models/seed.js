// models/seed.js — populates the database with default data on first run

const bcrypt = require('bcryptjs');
const { Staff, Role, Rule, Config, Event } = require('./index');

async function seedDatabase() {
  const roleCount = await Role.countDocuments();
  if (roleCount === 0) {
    await Role.insertMany([
      { name: 'Owner', color: '#facc15' },
      { name: 'Admin', color: '#f87171' },
      { name: 'Moderator', color: '#a855f7' }
    ]);
    console.log('Seeded default roles');
  }

  const staffCount = await Staff.countDocuments();
  if (staffCount === 0) {
    await Staff.insertMany([
      { name: '! Aʀᴘɪᴛ | Owner 👑', role: 'Owner', bio: 'Founder & final word on everything Night Hawks.' },
      { name: 'Storm', role: 'Admin', bio: 'Runs day-to-day operations and the events calendar.' },
      { name: 'Ataku', role: 'Moderator', bio: 'Keeps chat friendly and handles reports.' }
    ]);
    console.log('Seeded default staff');
  }

  const ruleCount = await Rule.countDocuments();
  if (ruleCount === 0) {
    await Rule.insertMany([
      { title: 'Be Respectful', description: 'Treat every member with respect. No harassment, hate speech, or discrimination of any kind.' },
      { title: 'No Spam', description: 'Avoid spamming messages, links, emojis, or mentions in any channel.' },
      { title: 'Follow Discord ToS', description: 'All Discord Terms of Service and Community Guidelines apply here as well.' },
      { title: 'No NSFW Content', description: 'Keep all content safe for work across every channel.' },
      { title: 'Listen to Staff', description: 'Staff decisions are final. Contact an Admin if you have a concern.' }
    ]);
    console.log('Seeded default rules');
  }

  const eventCount = await Event.countDocuments();
  if (eventCount === 0) {
    await Event.insertMany([
      { title: 'Hawks Championship', subtitle: 'Valorant Tournament', day: '24', month: 'JUN', icon: 'trophy' },
      { title: 'Minecraft Build Battle', subtitle: 'Creative Challenge', day: '28', month: 'JUN', icon: 'block' },
      { title: 'Night Hawks Giveaway', subtitle: 'Nitro + Game Keys', day: '05', month: 'JUL', icon: 'gift' }
    ]);
    console.log('Seeded default events');
  }

  const config = await Config.findOne({ key: 'main' });
  if (!config) {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_DEFAULT_PASSWORD || '1', 10);
    await Config.create({
      key: 'main',
      discord: 'https://discord.gg/rUXS2UUyvV',
      youtube: 'https://youtube.com/@rajthehacker?si=Pg3YERT8jTL70lfJ',
      instagram: 'https://www.instagram.com/itz_arpit_17_?igsh=MXFzNzZkMW40aGluNQ==',
      adminUsername: process.env.ADMIN_DEFAULT_USERNAME || 'Arpit',
      adminPasswordHash: passwordHash
    });
    console.log('Seeded default config (admin credentials included)');
  }
}

module.exports = seedDatabase;
