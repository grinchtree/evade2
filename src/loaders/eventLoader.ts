import { join } from "node:path";
import type { Event } from "../interfaces/Event";
import type { evClient } from "../structs/Client";
import { logging } from "../utils/logging";
import { loadFiles } from "./fileLoader";

export async function loadEvents(client: evClient) {
  const startTime = performance.now();

  const eventsPath = join(process.cwd(), "src", "events");
  const files = await loadFiles(eventsPath);

  let eventCount = 0;

  for (const file of files) {
    const eventModule = await import(file);
    const event: Event = eventModule.default;

    if (!event || !event.name || !event.execute) {
      logging.warn(`The event '${file}' is missing a required argument.`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
    eventCount++;
  }

  const timeTaken = Math.round(performance.now() - startTime);
  logging.info(`Loaded ${eventCount} events in ${timeTaken}ms.`);
}
