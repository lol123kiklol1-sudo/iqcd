require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST().setToken(process.env.MAIN_BOT_TOKEN);

(async () => {
  try {
    console.log(`⏳ جاري نشر ${commands.length} أمر...`);

    // clientId مطلوب - نجيبه من التوكن مباشرة عبر فك تشفيره أو نطلبه من .env
    const clientId = process.env.CLIENT_ID;
    if (!clientId) {
      console.error('❌ الرجاء إضافة CLIENT_ID في ملف .env (آيدي تطبيق البوت من Discord Developer Portal).');
      process.exit(1);
    }

    if (process.env.GUILD_ID) {
      // نشر فوري على سيرفر واحد (أسرع للتجربة)
      await rest.put(
        Routes.applicationGuildCommands(clientId, process.env.GUILD_ID),
        { body: commands },
      );
      console.log('✅ تم نشر الأوامر على السيرفر بنجاح.');
    } else {
      // نشر عام (يحتاج وقت حتى يظهر - إلى ساعة)
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      );
      console.log('✅ تم نشر الأوامر بشكل عام بنجاح.');
    }
  } catch (error) {
    console.error(error);
  }
})();
