const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'subscriptions.json');

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ subscriptions: [], lastId: 0 }, null, 2), 'utf8');
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    // نسخة احتياطية تلقائية لو الملف تعطل
    const backupPath = DB_PATH + '.corrupt-' + Date.now();
    fs.copyFileSync(DB_PATH, backupPath);
    const fresh = { subscriptions: [], lastId: 0 };
    fs.writeFileSync(DB_PATH, JSON.stringify(fresh, null, 2), 'utf8');
    return fresh;
  }
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function generateSubId(botType) {
  // مثال: 3129787187190824-4711  (timestamp مختصر - رقم عشوائي)
  const ts = Date.now().toString().slice(-13);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${ts}-${rand}`;
}

function addSubscription({ botType, botInstanceId, days, targetServerId, ownerId, createdBy }) {
  const db = readDb();
  db.lastId += 1;

  const now = Date.now();
  const expiresAt = now + days * 24 * 60 * 60 * 1000;

  const sub = {
    localId: db.lastId,
    subId: generateSubId(botType),
    botType,               // GAME / MUSIC_10 / MUSIC_20 / TICKET / GROUP
    botInstanceId,          // آيدي نسخة البوت الفعلية المحجوزة من config/bots.json
    ownerId,                // آيدي الشخص صاحب الاشتراك
    targetServerId,         // آيدي السيرفر اللي فيه البوت
    status: 'active',       // active | paused | expired
    createdAt: now,
    createdBy,
    expiresAt,
    remainingMsAtPause: null, // يستخدم لحفظ الوقت المتبقي وقت التوقيف المؤقت
    messageId: null,          // آيدي رسالة الامبد بروم الكنترول
    channelId: null,
    history: [
      { action: 'created', at: now, by: createdBy }
    ]
  };

  db.subscriptions.push(sub);
  writeDb(db);
  return sub;
}

function getSubscription(subId) {
  const db = readDb();
  return db.subscriptions.find(s => s.subId === subId);
}

function getSubscriptionsByOwner(ownerId) {
  const db = readDb();
  return db.subscriptions.filter(s => s.ownerId === ownerId);
}

function updateSubscription(subId, patch, historyEntry) {
  const db = readDb();
  const idx = db.subscriptions.findIndex(s => s.subId === subId);
  if (idx === -1) return null;

  db.subscriptions[idx] = { ...db.subscriptions[idx], ...patch };
  if (historyEntry) {
    db.subscriptions[idx].history.push({ ...historyEntry, at: Date.now() });
  }
  writeDb(db);
  return db.subscriptions[idx];
}

function getAllSubscriptions() {
  return readDb().subscriptions;
}

module.exports = {
  addSubscription,
  getSubscription,
  getSubscriptionsByOwner,
  updateSubscription,
  getAllSubscriptions,
};
