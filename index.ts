import { ActivityType, Events, GatewayIntentBits } from "discord.js";
import { evClient } from "./src/structs/Client";
import { logging } from "./src/utils/logging";
import { config } from "./config";
import { verifyDatabaseConnection } from "./src/database/database";

async function bootstrap() {
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
