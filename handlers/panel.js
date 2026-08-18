const { getSubscriptionsByOwner, getSubscription } = require('../utils/storage');
const {
  buildSubscriptionListEmbed,
  buildSubscriptionSelectMenu,
  buildSubscriptionEmbed,
  buildSubscriptionButtons,
} = require('../utils/format');

async function handleMySubscriptionsButton(interaction) {
  const subs = getSubscriptionsByOwner(interaction.user.id);

  if (subs.length === 0) {
    return interaction.reply({ content: '📭 ما عندك أي اشتراك حالياً.', ephemeral: true });
  }

  const embed = buildSubscriptionListEmbed(subs);
  const row = buildSubscriptionSelectMenu(subs);

  return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function handleSelectSubscription(interaction) {
  const subId = interaction.values[0];
  const sub = getSubscription(subId);

  if (!sub) {
    return interaction.update({ content: '❌ الاشتراك غير موجود (ربما تم حذفه).', embeds: [], components: [] });
  }

  const isOwner = interaction.user.id === sub.ownerId;
  const isAdmin = interaction.member?.permissions?.has('Administrator');
  if (!isOwner && !isAdmin) {
    return interaction.reply({ content: '🚫 هذا الاشتراك ليس لك.', ephemeral: true });
  }

  const embed = buildSubscriptionEmbed(sub);
  const rows = buildSubscriptionButtons(sub);

  return interaction.update({ embeds: [embed], components: rows });
}

module.exports = { handleMySubscriptionsButton, handleSelectSubscription };
