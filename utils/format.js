const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { getInstanceById } = require('./botPool');

const BOT_TYPE_LABELS = {
  GAME: '🎮 Games',
  MUSIC_10: '🎵 Music_10x',
  MUSIC_20: '🎵 Music_20x',
  TICKET: '🎫 Tickets',
  GROUP: '👥 Groups',
};

const STATUS_LABELS = {
  active: '🟢 مفعّل',
  paused: '⏸️ متوقف مؤقتاً',
  expired: '🔴 منتهي',
};

function fmtDate(ms) {
  return `<t:${Math.floor(ms / 1000)}:F>`;
}

function remainingDaysText(sub) {
  if (sub.status === 'paused') {
    const remaining = sub.remainingMsAtPause ?? 0;
    return `${Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)))} يوم (متوقف)`;
  }
  const remaining = sub.expiresAt - Date.now();
  if (remaining <= 0) return '0 يوم';
  return `${Math.ceil(remaining / (24 * 60 * 60 * 1000))} يوم`;
}

function instanceLabel(sub) {
  const instance = getInstanceById(sub.botInstanceId);
  return instance ? instance.label : (BOT_TYPE_LABELS[sub.botType] || sub.botType);
}

function buildSubscriptionEmbed(sub) {
  const embed = new EmbedBuilder()
    .setColor(sub.status === 'active' ? 0xF5A623 : sub.status === 'paused' ? 0x808080 : 0xE74C3C)
    .setTitle('⭐ - تفاصيل الاشتراك')
    .addFields(
      { name: '🎫 معرّف الاشتراك', value: `\`${sub.subId}\``, inline: true },
      { name: '📦 اسم البوت', value: instanceLabel(sub), inline: true },
      { name: '👤 صاحب الاشتراك', value: `<@${sub.ownerId}>`, inline: true },
      { name: '🖥️ آيدي السيرفر', value: `\`${sub.targetServerId}\``, inline: true },
      { name: '📅 تاريخ الإنشاء', value: fmtDate(sub.createdAt), inline: false },
      { name: '⏳ تاريخ الانتهاء', value: sub.status === 'paused' ? '—' : fmtDate(sub.expiresAt), inline: false },
      { name: '📆 الأيام المتبقية', value: remainingDaysText(sub), inline: true },
      { name: '🔎 حالة الاشتراك', value: STATUS_LABELS[sub.status] || sub.status, inline: true },
    )
    .setFooter({ text: `Local #${sub.localId}` })
    .setTimestamp();

  return embed;
}

function buildInviteUrl(sub) {
  const instance = getInstanceById(sub.botInstanceId);
  if (!instance || !instance.clientId || instance.clientId.startsWith('ضع_')) return null;
  const params = new URLSearchParams({
    client_id: instance.clientId,
    guild_id: sub.targetServerId,
    permissions: '8', // عدّلها حسب الصلاحيات المطلوبة فعلياً
    scope: 'bot applications.commands',
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

function buildSubscriptionButtons(sub) {
  const inviteUrl = buildInviteUrl(sub);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`sub:transferOwner:${sub.subId}`)
      .setLabel('تغيير مالك البوت')
      .setEmoji('👑')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`sub:changeServer:${sub.subId}`)
      .setLabel('تغيير السيرفر')
      .setEmoji('🔗')
      .setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`sub:pauseToggle:${sub.subId}`)
      .setLabel(sub.status === 'paused' ? 'استئناف الاشتراك' : 'إيقاف مؤقت')
      .setEmoji(sub.status === 'paused' ? '▶️' : '⏸️')
      .setStyle(sub.status === 'paused' ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(sub.status === 'expired'),
    new ButtonBuilder()
      .setCustomId(`sub:reset:${sub.subId}`)
      .setLabel('إعادة تشغيل')
      .setEmoji('🔁')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(sub.status === 'expired'),
    new ButtonBuilder()
      .setCustomId(`sub:details:${sub.subId}`)
      .setLabel('اكتشاف الاشتراك')
      .setEmoji('🔍')
      .setStyle(ButtonStyle.Secondary),
  );

  if (inviteUrl) {
    row1.addComponents(
      new ButtonBuilder()
        .setLabel('الحصول على رابط الانفايت')
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Link)
        .setURL(inviteUrl),
    );
  }

  return [row1, row2];
}

// ===== لوحة الدخول الرئيسية (زر "اشتراكاتي") =====

function buildMainPanelEmbed() {
  return new EmbedBuilder()
    .setColor(0xF5A623)
    .setTitle('⚙️ تَحكّم في اشتراكاتك!')
    .setDescription('تحكم بخياراتك من خلال الزر بالأسفل، وانقل الملكية أو السيرفر بسهولة تامة، كل شيء عن اشتراكاتك في مكان واحد!');
}

function buildMainPanelButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('panel:mySubs')
      .setLabel('اشتراكاتي')
      .setEmoji('🔶')
      .setStyle(ButtonStyle.Secondary),
  );
}

// ===== قائمة اختيار الاشتراك (Select Menu) =====

function buildSubscriptionListEmbed(subs) {
  const embed = new EmbedBuilder()
    .setColor(0xF5A623)
    .setTitle('⭐ - اشتراكاتي')
    .setDescription('اشتراكاتك النشطة 📁')
    .setTimestamp();

  for (const sub of subs) {
    const daysLeft = sub.status === 'active'
      ? `في ${Math.max(0, Math.ceil((sub.expiresAt - Date.now()) / 86400000))} يوم`
      : STATUS_LABELS[sub.status];
    embed.addFields({
      name: instanceLabel(sub),
      value: `ينتهي ${daysLeft}`,
      inline: false,
    });
  }
  return embed;
}

function buildSubscriptionSelectMenu(subs) {
  const options = subs.slice(0, 25).map(sub => {
    const statusTag = sub.status !== 'active' ? ` [${STATUS_LABELS[sub.status]}]` : '';
    return {
      label: `${instanceLabel(sub)}${statusTag}`.slice(0, 100),
      description: `آيدي السيرفر: ${sub.targetServerId}`.slice(0, 100),
      value: sub.subId,
    };
  });

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('panel:selectSub')
      .setPlaceholder('اختر اشتراكاً لعرض تفاصيله')
      .addOptions(options),
  );
}

module.exports = {
  BOT_TYPE_LABELS,
  STATUS_LABELS,
  fmtDate,
  remainingDaysText,
  buildSubscriptionEmbed,
  buildSubscriptionButtons,
  buildInviteUrl,
  buildMainPanelEmbed,
  buildMainPanelButton,
  buildSubscriptionListEmbed,
  buildSubscriptionSelectMenu,
};
