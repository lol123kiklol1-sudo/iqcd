const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getSubscription, updateSubscription } = require('../utils/storage');
const { buildSubscriptionEmbed, buildSubscriptionButtons } = require('../utils/format');

function isOwnerOrAdmin(interaction, sub) {
  const isOwner = interaction.user.id === sub.ownerId;
  const isAdmin = interaction.member?.permissions?.has('Administrator');
  return isOwner || isAdmin;
}

async function refreshMessage(interaction, sub) {
  const embed = buildSubscriptionEmbed(sub);
  const rows = buildSubscriptionButtons(sub);
  await interaction.update({ embeds: [embed], components: rows });
}

async function handleButton(interaction) {
  const [, action, subId] = interaction.customId.split(':');
  const sub = getSubscription(subId);

  if (!sub) {
    return interaction.reply({ content: '❌ الاشتراك غير موجود (ربما تم حذفه).', ephemeral: true });
  }

  if (!isOwnerOrAdmin(interaction, sub)) {
    return interaction.reply({ content: '🚫 هذا الاشتراك ليس لك، فقط صاحب الاشتراك أو الأدمن يقدر يتحكم فيه.', ephemeral: true });
  }

  if (sub.status === 'expired' && action !== 'details') {
    return interaction.reply({ content: '⛔ هذا الاشتراك منتهي، تواصل مع الإدارة للتجديد.', ephemeral: true });
  }

  switch (action) {
    case 'pauseToggle': {
      if (sub.status === 'active') {
        const remainingMs = sub.expiresAt - Date.now();
        const updated = updateSubscription(subId,
          { status: 'paused', remainingMsAtPause: Math.max(remainingMs, 0) },
          { action: 'paused', by: interaction.user.id });
        return refreshMessage(interaction, updated);
      } else if (sub.status === 'paused') {
        const newExpiresAt = Date.now() + (sub.remainingMsAtPause ?? 0);
        const updated = updateSubscription(subId,
          { status: 'active', expiresAt: newExpiresAt, remainingMsAtPause: null },
          { action: 'resumed', by: interaction.user.id });
        return refreshMessage(interaction, updated);
      }
      break;
    }

    case 'reset': {
      // إعادة تشغيل: هنا مكان استدعاء منطق إعادة تشغيل العملية/الاتصال الفعلي بالبوت (PM2 / API) إن وجد
      const updated = updateSubscription(subId, {},
        { action: 'reset_requested', by: interaction.user.id });
      await interaction.reply({ content: `🔁 تم إرسال طلب إعادة تشغيل بوت \`${sub.botType}\` الخاص بالسيرفر \`${sub.targetServerId}\`.`, ephemeral: true });
      return; // ما نعدل الرسالة الأصلية، بس نأكد للمستخدم
    }

    case 'transferOwner': {
      const modal = new ModalBuilder()
        .setCustomId(`modal:transferOwner:${subId}`)
        .setTitle('تغيير مالك الاشتراك');
      const input = new TextInputBuilder()
        .setCustomId('newOwnerId')
        .setLabel('آيدي الشخص الجديد')
        .setPlaceholder('مثال: 123456789012345678')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    case 'changeServer': {
      const modal = new ModalBuilder()
        .setCustomId(`modal:changeServer:${subId}`)
        .setTitle('تغيير سيرفر الاشتراك');
      const input = new TextInputBuilder()
        .setCustomId('newServerId')
        .setLabel('آيدي السيرفر الجديد')
        .setPlaceholder('مثال: 123456789012345678')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    case 'details': {
      const embed = buildSubscriptionEmbed(sub);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    default:
      return interaction.reply({ content: '❌ إجراء غير معروف.', ephemeral: true });
  }
}

module.exports = { handleButton, isOwnerOrAdmin, refreshMessage };
