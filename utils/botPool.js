const fs = require('fs');
const path = require('path');
const { getAllSubscriptions } = require('./storage');

const BOTS_PATH = path.join(__dirname, '..', 'config', 'bots.json');

function readBotsConfig() {
  try {
    const raw = fs.readFileSync(BOTS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.bots) ? parsed.bots : [];
  } catch (e) {
    console.error('تعذر قراءة config/bots.json:', e.message);
    return [];
  }
}

// الحالات اللي تعتبر "البوت مشغول فيها" - نشط أو موقوف مؤقتاً (الموقوف لسا محجوز لصاحبه)
const OCCUPIED_STATUSES = ['active', 'paused'];

function getOccupiedInstanceIds() {
  const subs = getAllSubscriptions();
  return new Set(
    subs
      .filter(s => OCCUPIED_STATUSES.includes(s.status) && s.botInstanceId)
      .map(s => s.botInstanceId),
  );
}

/** يرجع كل نسخ البوتات المتاحة (غير محجوزة) من نوع معين */
function getAvailableInstances(botType) {
  const allBots = readBotsConfig().filter(b => b.type === botType);
  const occupied = getOccupiedInstanceIds();
  return allBots.filter(b => !occupied.has(b.instanceId));
}

/** يرجع أول نسخة متاحة من نوع معين، أو null إذا ما فيه شي متاح */
function getFirstAvailableInstance(botType) {
  const available = getAvailableInstances(botType);
  return available.length > 0 ? available[0] : null;
}

/** يرجع تفاصيل نسخة بوت معينة بالآيدي تبعها */
function getInstanceById(instanceId) {
  if (!instanceId) return null;
  return readBotsConfig().find(b => b.instanceId === instanceId) || null;
}

/** إحصائية سريعة: عدد المتاح مقابل الإجمالي لكل نوع */
function getAvailabilitySummary() {
  const allBots = readBotsConfig();
  const occupied = getOccupiedInstanceIds();

  const summary = {};
  for (const bot of allBots) {
    if (!summary[bot.type]) summary[bot.type] = { total: 0, available: 0 };
    summary[bot.type].total += 1;
    if (!occupied.has(bot.instanceId)) summary[bot.type].available += 1;
  }
  return summary;
}

module.exports = {
  readBotsConfig,
  getAvailableInstances,
  getFirstAvailableInstance,
  getInstanceById,
  getAvailabilitySummary,
};
