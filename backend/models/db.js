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

const muteRuleSchema = new mongoose.Schema({
  platform: String,
  contactId: String,
  name: String,
  muted: Boolean,
  category: String, // friends, family, work
});

const MuteRule = mongoose.model("MuteRule", muteRuleSchema);

module.exports = {
  ActivityLog,
  CustomSite,
  MuteRule,
};
