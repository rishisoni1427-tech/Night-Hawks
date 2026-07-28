// models/index.js — Mongoose schemas for Night Hawks

const mongoose = require('mongoose');

function withIdJson(schema) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
    }
  });
}

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  bio: { type: String, default: '' }
});
withIdJson(staffSchema);

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  color: { type: String, default: '#a855f7' }
});
withIdJson(roleSchema);

const ruleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' }
});
withIdJson(ruleSchema);

// singleton document — holds links, stats, and admin credentials
const configSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  discord: { type: String, default: 'https://discord.gg/rUXS2UUyvV' },
  youtube: { type: String, default: 'https://youtube.com' },
  instagram: { type: String, default: 'https://instagram.com' },
  membersOnline: { type: Number, default: 12548 },
  totalMembers: { type: Number, default: 28560 },
  voiceChannels: { type: Number, default: 312 },
  uptime: { type: Number, default: 99.9 },
  online: { type: Boolean, default: true },
  trend: { type: [Number], default: [40, 55, 45, 60, 58, 70, 65, 80, 75, 90, 85, 95, 88, 100, 92, 105, 98, 110, 102, 115, 108, 120, 112, 118] },
  adminUsername: { type: String, default: 'Arpit' },
  adminPasswordHash: { type: String, required: true }
});
withIdJson(configSchema);

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  day: { type: String, required: true },
  month: { type: String, required: true },
  icon: { type: String, default: 'trophy' }
});
withIdJson(eventSchema);
const announcementSchema = new mongoose.Schema({
  tag: { type: String, default: '' },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  time: { type: String, default: 'Just now' }
});
withIdJson(announcementSchema);
const galleryImageSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  caption: { type: String, default: '' },
  isPrivate: { type: Boolean, default: false },
  uploadedAt: { type: Date, default: Date.now }
});
withIdJson(galleryImageSchema);

module.exports = {
  Staff: mongoose.model('Staff', staffSchema),
  Role: mongoose.model('Role', roleSchema),
  Rule: mongoose.model('Rule', ruleSchema),
  Config: mongoose.model('Config', configSchema),
  Event: mongoose.model('Event', eventSchema),
  Announcement: mongoose.model('Announcement', announcementSchema),
  GalleryImage: mongoose.model('GalleryImage', galleryImageSchema)
};
