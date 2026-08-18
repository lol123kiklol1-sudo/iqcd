require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const { handleButton } = require('./handlers/buttons');
const { handleModal } = require('./handlers/modals');
const { handleMySubscriptionsButton, handleSelectSubscription } = require('./handlers/panel');
const { startExpiryChecker } = require('./utils/expiryChecker');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, (c) => {
  console.log(`✅ تم تسجيل الدخول باسم ${c.user.tag}`);
  startExpiryChecker(client);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
    } else if (interaction.isButton() && interaction.customId.startsWith('sub:')) {
      await handleButton(interaction);
    } else if (interaction.isButton() && interaction.customId === 'panel:mySubs') {
      await handleMySubscriptionsButton(interaction);
    } else if (interaction.isStringSelectMenu() && interaction.customId === 'panel:selectSub') {
      await handleSelectSubscription(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId.startsWith('modal:')) {
      await handleModal(interaction);
    }
  } catch (err) {
    console.error(err);
    const errMsg = { content: '❌ صار خطأ أثناء تنفيذ العملية، حاول مرة ثانية.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errMsg).catch(() => {});
    } else {
      await interaction.reply(errMsg).catch(() => {});
    }
  }
});

client.login(process.env.MAIN_BOT_TOKEN);
