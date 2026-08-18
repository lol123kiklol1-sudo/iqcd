const { getSubscription, updateSubscription } = require('../utils/storage');
const { buildSubscriptionEmbed, buildSubscriptionButtons } = require('../utils/format');
const { isOwnerOrAdmin } = require('./buttons');

const ID_REGEX = /^\d{15,25}$/;

async function handleModal(interaction) {
  const [, action, subId] = interaction.customId.split(':');
  const sub = getSubscription(subId);

  if (!sub) {
    return interaction.reply({ content: '❌ الاشتراك غير موجود.', ephemeral: true });
  }
  if (!isOwnerOrAdmin(interaction, sub)) {
    return interaction.reply({ content: '🚫 ما تقدر تعدل هذا الاشتراك.', ephemeral: true });
  }

  let updated;

  if (action === 'transferOwner') {
    const newOwnerId = interaction.fields.getTextInputValue('newOwnerId').trim();
    if (!ID_REGEX.test(newOwnerId)) {
      return interaction.reply({ content: '❌ آيدي غير صحيح.', ephemeral: true });
    }
    updated = updateSubscription(subId, { ownerId: newOwnerId },
      { action: 'owner_transferred', by: interaction.user.id, to: newOwnerId });
  } else if (action === 'changeServer') {
    const newServerId = interaction.fields.getTextInputValue('newServerId').trim();
    if (!ID_REGEX.test(newServerId)) {
      return interaction.reply({ content: '❌ آيدي غير صحيح.', ephemeral: true });
    }
    updated = updateSubscription(subId, { targetServerId: newServerId },
      { action: 'server_changed', by: interaction.user.id, to: newServerId });
  } else {
    return interaction.reply({ content: '❌ إجراء غير معروف.', ephemeral: true });
  }

  const embed = buildSubscriptionEmbed(updated);
  const rows = buildSubscriptionButtons(updated);

  // النافذة (Modal) تفتح من داخل الرسالة الشخصية (Ephemeral) اللي عرضت تفاصيل الاشتراك،
  // فنعدلها مباشرة بنفس الإنتراكشن بدل ما نرسل رد جديد
  if (typeof interaction.isFromMessageComponent === 'function' && interaction.isFromMessageComponent()) {
    return interaction.update({ embeds: [embed], components: rows });
  }

  await interaction.reply({ content: '✅ تم تنفيذ التعديل بنجاح.', ephemeral: true, embeds: [embed], components: rows });
}

module.exports = { handleModal };
