import { ActivityType, Events, GatewayIntentBits, Partials } from "discord.js";
import { evClient } from "./src/structs/Client";
import { logging } from "./src/utils/logging";
import { config } from "./config";
import { verifyDatabaseConnection } from "./src/database/database";
import { startConsoleDashboard } from "./src/utils/dashboard";

async function bootstrap() {
  startConsoleDashboard();
  logging.info("Starting...");

  const client = new evClient({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.GuildMember, Partials.User],
  });

  client.once(Events.ClientReady, (readyClient) => {
    logging.info(`Connected to Discord.`);

    readyClient.user.setPresence({
      status: "online",
      activities: [
        {
          name: "🔗 evade.bot",
          type: ActivityType.Streaming,
          url: "https://www.twitch.tv/evadebotbleh",
        },
      ],
    });
  });

  await verifyDatabaseConnection();
  await client.start(config.token);
}

await bootstrap();
