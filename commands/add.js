const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addSubscription } = require('../utils/storage');
const { getFirstAvailableInstance, getAvailableInstances } = require('../utils/botPool');
const { BOT_TYPE_LABELS } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('إضافة اشتراك بوت جديد لشخص')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // يمكن تغييرها لرتبة معينة بدل الأدمن الكامل
    .addIntegerOption(opt =>
      opt.setName('الايام')
        .setDescription('عدد أيام الاشتراك')
        .setRequired(true)
        .setMinValue(1))
    .addStringOption(opt =>
      opt.setName('ايدي_السيرفر')
        .setDescription('آيدي السيرفر اللي راح يشتغل فيه البوت')
        .setRequired(true))
    .addUserOption(opt =>
      opt.setName('الشخص')
        .setDescription('الشخص صاحب الاشتراك')
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName('نوع_البوت')
        .setDescription('نوع البوت المطلوب')
        .setRequired(true)
        .addChoices(
          { name: '🎮 Games', value: 'GAME' },
          { name: '🎵 Music_10x', value: 'MUSIC_10' },
          { name: '🎵 Music_20x', value: 'MUSIC_20' },
          { name: '🎫 Tickets', value: 'TICKET' },
          { name: '👥 Groups', value: 'GROUP' },
        )),

  async execute(interaction) {
    const days = interaction.options.getInteger('الايام');
    const targetServerId = interaction.options.getString('ايدي_السيرفر');
    const owner = interaction.options.getUser('الشخص');
    const botType = interaction.options.getString('نوع_البوت');

    // تحقق بسيط من صيغة آيدي السيرفر
    if (!/^\d{15,25}$/.test(targetServerId)) {
      return interaction.reply({
        content: '❌ آيدي السيرفر غير صحيح، تأكد من نسخه بشكل صحيح (يجب أن يكون أرقام فقط).',
        ephemeral: true,
      });
    }

    // ندور على نسخة بوت متاحة (غير محجوزة بأي اشتراك نشط/موقوف) من نفس النوع
    const availableInstance = getFirstAvailableInstance(botType);

    if (!availableInstance) {
      return interaction.reply({
        content: `⛔ لا يوجد بوتات متاحة حالياً من نوع **${BOT_TYPE_LABELS[botType] || botType}** — كل النسخ محجوزة باشتراكات نشطة. انتظر انتهاء اشتراك أحدهم أو أضف نسخة جديدة بملف \`config/bots.json\`.`,
        ephemeral: true,
      });
    }

    const sub = addSubscription({
      botType,
      botInstanceId: availableInstance.instanceId,
      days,
      targetServerId,
      ownerId: owner.id,
      createdBy: interaction.user.id,
    });

    // ما ننشر كرت منفصل بالروم - الشخص يشوف اشتراكه عبر زر "اشتراكاتي" بلوحة التحكم (/panel)
    await interaction.reply({
      content: `✅ تم إنشاء الاشتراك بنجاح لـ <@${owner.id}> — تم ربطه بـ **${availableInstance.label}** — معرّف الاشتراك: \`${sub.subId}\`.\nيقدر يشوفه بالضغط على زر "اشتراكاتي" بروم الكنترول.`,
      ephemeral: true,
    });

    // إشعار خاص اختياري للشخص
    await owner.send({
      content: `🎉 تم تفعيل اشتراك جديد لك (\`${sub.subId}\` - ${availableInstance.label})! تقدر تدير اشتراكك من خلال زر "اشتراكاتي" بروم الكنترول.`,
    }).catch(() => {});
  },
};
