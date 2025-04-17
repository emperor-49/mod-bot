const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  PermissionsBitField,
} = require("discord.js");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

const mediaChannels = new Set();

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (!message.content.startsWith("!") || message.author.bot) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const target = message.mentions.members?.first();
  const reason = args.slice(1).join(" ") || "No reason provided";

  const logEmbed = (action, targetUser, moderator, reason) => {
    return new EmbedBuilder()
      .setTitle(`Moderation | ${action}`)
      .setColor(0xff5733)
      .addFields(
        { name: "User", value: `${targetUser.user.tag}`, inline: true },
        { name: "Moderator", value: `${moderator.tag}`, inline: true },
        { name: "Reason", value: reason },
      )
      .setTimestamp();
  };

  const sendLog = async (embed) => {
    let logChannel = message.guild.channels.cache.find(
      (c) => c.name === "mod-logs",
    );
    if (!logChannel) {
      logChannel = await message.guild.channels.create({
        name: "mod-logs",
        type: 0,
      });
    }
    logChannel.send({ embeds: [embed] });
  };

  switch (command) {
    case "avatar": {
      if (!target) return message.reply("Mention a user!");
      const embed = new EmbedBuilder()
        .setTitle(`${target.user.username}'s Avatar`)
        .setImage(target.user.displayAvatarURL({ dynamic: true, size: 512 }))
        .setColor(0x3498db);
      message.channel.send({ embeds: [embed] });
      break;
    }

    case "mute": {
      if (!target) return message.reply("Mention a user to mute!");
      const muteRole =
        message.guild.roles.cache.find((r) => r.name === "Muted") ||
        (await message.guild.roles.create({ name: "Muted", permissions: [] }));
      message.guild.channels.cache.forEach((c) =>
        c.permissionOverwrites
          .create(muteRole, { SendMessages: false })
          .catch(() => {}),
      );
      await target.roles.add(muteRole);
      message.channel.send(`${target.user.tag} has been muted.`);
      sendLog(logEmbed("Mute", target, message.author, reason));
      break;
    }

    case "massmute": {
      const mentioned = message.mentions.members;
      if (!mentioned.size) return message.reply("Mention users to mute!");
      const muteRole =
        message.guild.roles.cache.find((r) => r.name === "Muted") ||
        (await message.guild.roles.create({ name: "Muted", permissions: [] }));
      message.guild.channels.cache.forEach((c) =>
        c.permissionOverwrites
          .create(muteRole, { SendMessages: false })
          .catch(() => {}),
      );
      mentioned.forEach((member) => {
        member.roles.add(muteRole);
        sendLog(logEmbed("Mass Mute", member, message.author, reason));
      });
      message.channel.send(`Muted ${mentioned.size} users.`);
      break;
    }

    case "kick": {
      if (!target) return message.reply("Mention a user to kick!");
      await target.kick(reason);
      message.channel.send(`${target.user.tag} has been kicked.`);
      sendLog(logEmbed("Kick", target, message.author, reason));
      break;
    }

    case "masskick": {
      const mentioned = message.mentions.members;
      if (!mentioned.size) return message.reply("Mention users to kick!");
      mentioned.forEach((member) => {
        member.kick(reason);
        sendLog(logEmbed("Mass Kick", member, message.author, reason));
      });
      message.channel.send(`Kicked ${mentioned.size} users.`);
      break;
    }

    case "ban": {
      if (!target) return message.reply("Mention a user to ban!");
      await target.ban({ reason });
      message.channel.send(`${target.user.tag} has been banned.`);
      sendLog(logEmbed("Ban", target, message.author, reason));
      break;
    }

    case "massban": {
      const mentioned = message.mentions.members;
      if (!mentioned.size) return message.reply("Mention users to ban!");
      mentioned.forEach((member) => {
        member.ban({ reason });
        sendLog(logEmbed("Mass Ban", member, message.author, reason));
      });
      message.channel.send(`Banned ${mentioned.size} users.`);
      break;
    }

    case "say": {
      const text = args.join(" ");
      if (!text) return message.reply("Provide a message to send.");
      message.delete().catch(() => {});
      message.channel.send(text);
      break;
    }

    case "giverole": {
      const role = message.mentions.roles.first();
      if (!target || !role) return message.reply("Mention a user and a role!");
      await target.roles.add(role);
      message.channel.send(`${role.name} role given to ${target.user.tag}.`);
      sendLog(
        logEmbed("Give Role", target, message.author, `Role: ${role.name}`),
      );
      break;
    }

    case "removerole": {
      const role = message.mentions.roles.first();
      if (!target || !role) return message.reply("Mention a user and a role!");
      await target.roles.remove(role);
      message.channel.send(
        `${role.name} role removed from ${target.user.tag}.`,
      );
      sendLog(
        logEmbed("Remove Role", target, message.author, `Role: ${role.name}`),
      );
      break;
    }

    case "setmedia": {
      mediaChannels.add(message.channel.id);
      message.reply(`This channel is now media-only.`);
      break;
    }

    case "clear": {
      const count = parseInt(args[0], 10);
      if (!count || count < 1 || count > 100)
        return message.reply("Enter a number between 1 and 100.");
      await message.channel.bulkDelete(count, true);
      message.channel
        .send(`Cleared ${count} messages.`)
        .then((m) => setTimeout(() => m.delete(), 3000));
      break;
    }

    case "help": {
      const helpEmbed = new EmbedBuilder()
        .setTitle("Moderation Bot Commands")
        .setColor(0x00bfff)
        .setDescription("Here are all the available `!` commands:")
        .addFields(
          { name: "!avatar @user", value: "Show user avatar" },
          { name: "!mute @user [reason]", value: "Mute user" },
          {
            name: "!massmute @user1 @user2 [...]",
            value: "Mute multiple users",
          },
          { name: "!kick @user [reason]", value: "Kick a user" },
          {
            name: "!masskick @user1 @user2 [...]",
            value: "Kick multiple users",
          },
          { name: "!ban @user [reason]", value: "Ban a user" },
          { name: "!massban @user1 @user2 [...]", value: "Ban multiple users" },
          { name: "!say message", value: "Bot sends your message" },
          { name: "!giverole @user @role", value: "Give role to user" },
          { name: "!removerole @user @role", value: "Remove role from user" },
          { name: "!setmedia", value: "Make channel media-only" },
          { name: "!clear <1-100>", value: "Clear messages in bulk" },
          { name: "!help", value: "Show this help message" },
        )
        .setFooter({ text: "Bot by You" });

      message.channel.send({ embeds: [helpEmbed] });
      break;
    }
  }
});

client.on("messageCreate", (message) => {
  if (
    mediaChannels.has(message.channel.id) &&
    !message.attachments.size &&
    !message.author.bot
  ) {
    message.delete().catch(() => {});
    message.channel
      .send(`${message.author}, only media is allowed here.`)
      .then((m) => setTimeout(() => m.delete(), 5000));
  }
});

client.login(
  "MTMyNDM1MjI5MDY5MzMyMDc1NA.Ga1WaJ.UqKlgLl4LQKjFdEqZyM3p4n1g8pxgjoFv7RrG4",
);
