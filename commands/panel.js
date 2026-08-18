const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { buildMainPanelEmbed, buildMainPanelButton } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('نشر لوحة التحكم بالاشتراكات (زر اشتراكاتي)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const embed = buildMainPanelEmbed();
    const row = buildMainPanelButton();

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ تم نشر لوحة التحكم.', ephemeral: true });
  },
};
