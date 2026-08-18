const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getAvailabilitySummary } = require('../utils/botPool');
const { BOT_TYPE_LABELS } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('available')
    .setDescription('عرض عدد البوتات المتاحة والمشغولة من كل نوع')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const summary = getAvailabilitySummary();
    const types = Object.keys(summary);

    if (types.length === 0) {
      return interaction.reply({ content: '⚠️ ملف `config/bots.json` فاضي أو ما فيه نسخ بوتات مسجلة.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0xF5A623)
      .setTitle('📦 حالة مخزون البوتات')
      .setTimestamp();

    for (const type of types) {
      const { total, available } = summary[type];
      embed.addFields({
        name: BOT_TYPE_LABELS[type] || type,
        value: `متاح: **${available}** / إجمالي: **${total}**`,
        inline: true,
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
