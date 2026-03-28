const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/productivity_db";

mongoose.connect(MONGO_URI)
.then(() => console.log("🟢 Connected to MongoDB (Productivity DB)"))
.catch((err) => console.error("🔴 MongoDB connection error:", err));

// SCHEMAS & MODELS

const activityLogSchema = new mongoose.Schema({
  url: String,
  hostname: String,
  title: String,
  type: String, // productive, distraction, neutral
  action: String, // allowed, blocked
  timestamp: { type: Date, default: Date.now },
  date: String,
});

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

const customSiteSchema = new mongoose.Schema({
  site: { type: String, unique: true, required: true },
});

const CustomSite = mongoose.model("CustomSite", customSiteSchema);

const priorityKeywordSchema = new mongoose.Schema({
  keyword: { type: String, unique: true, required: true },
  category: String, // work, family, urgent
});

const PriorityKeyword = mongoose.model("PriorityKeyword", priorityKeywordSchema);

const muteRuleSchema = new mongoose.Schema({
  platform: String,
  contactId: String,
  name: String,
  muted: Boolean,
  category: String, // friends, family, work
});

const MuteRule = mongoose.model("MuteRule", muteRuleSchema);

const userSettingsSchema = new mongoose.Schema({
  focusMode: { type: Boolean, default: false },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  dailyStreak: { type: Number, default: 0 },
  lastActiveDate: String,
  totalFocusTimeMs: { type: Number, default: 0 },
  achievements: [String],
  manualOverride: { type: Boolean, default: false },
});

const UserSettings = mongoose.model("UserSettings", userSettingsSchema);

const notificationRecordSchema = new mongoose.Schema({
  platform: String,
  sender: String,
  content: String,
  decision: String, // deliver, delay, suppress
  reason: String,
  priority: Number,
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  metadata: mongoose.Schema.Types.Mixed,
});

const NotificationRecord = mongoose.model("NotificationRecord", notificationRecordSchema);

const scheduleSchema = new mongoose.Schema({
  startTime: { type: String, required: true }, // "09:00"
  endTime: { type: String, required: true },   // "18:00"
  days: [String],    // ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  type: { type: String, enum: ["daily", "weekly", "custom", "once"], default: "weekly" },
  isActive: { type: Boolean, default: true },
  label: String,
  lunchStartTime: String,
  lunchEndTime: String,
});

const Schedule = mongoose.model("Schedule", scheduleSchema);

const googleAuthSchema = new mongoose.Schema({
  accessToken: String,
  refreshToken: String,
  expiryDate: Number,
  email: String,
});

const GoogleAuth = mongoose.model("GoogleAuth", googleAuthSchema);

const WhatsAppChatSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  snippet: String,
  timestamp: String,
  unreadCount: Number,
  avatar: String,
  isMuted: { type: Boolean, default: false },
  lastSynced: { type: Date, default: Date.now }
});

const GmailEmailSchema = new mongoose.Schema({
  id: { type: String, unique: true }, // Gmail Message ID or hash
  subject: String,
  sender: String,
  snippet: String,
  time: String,
  isUnread: { type: Boolean, default: true },
  lastSynced: { type: Date, default: Date.now }
});

const WhatsAppChat = mongoose.model("WhatsAppChat", WhatsAppChatSchema);
const GmailEmail = mongoose.model("GmailEmail", GmailEmailSchema);

module.exports = {
  ActivityLog,
  CustomSite,
  MuteRule,
  PriorityKeyword,
  UserSettings,
  NotificationRecord,
  Schedule,
  GoogleAuth,
  WhatsAppChat,
  GmailEmail
};
