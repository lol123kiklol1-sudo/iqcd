const { getAllSubscriptions, updateSubscription } = require('./storage');

async function checkExpiredSubscriptions(client) {
  const subs = getAllSubscriptions();
  const now = Date.now();

  for (const sub of subs) {
    if (sub.status === 'active' && sub.expiresAt <= now) {
      const updated = updateSubscription(sub.subId, { status: 'expired' }, { action: 'expired' });

      try {
        const owner = await client.users.fetch(updated.ownerId);
        await owner.send({
          content: `⚠️ انتهى اشتراكك \`${updated.subId}\`. تواصل مع الإدارة للتجديد.`,
        }).catch(() => {});
      } catch (e) {
        // تجاهل لو ما نقدر نوصله
      }

      const logChannelId = process.env.LOG_CHANNEL_ID;
      if (logChannelId) {
        try {
          const logChannel = await client.channels.fetch(logChannelId);
          await logChannel.send({ content: `🔴 انتهى اشتراك <@${updated.ownerId}> — \`${updated.subId}\` (${updated.botType})` });
        } catch (e) {
          console.error('تعذر الإرسال لروم اللوق:', e.message);
        }
      }
    }
  }
}

function startExpiryChecker(client) {
  const minutes = parseInt(process.env.CHECK_INTERVAL_MINUTES || '30', 10);
  checkExpiredSubscriptions(client); // فحص فوري عند التشغيل
  setInterval(() => checkExpiredSubscriptions(client), minutes * 60 * 1000);
  console.log(`🕒 فحص انتهاء الاشتراكات كل ${minutes} دقيقة.`);
}

module.exports = { startExpiryChecker, checkExpiredSubscriptions };
