import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { pathToFileURL } from "bun";
import { logging } from "../utils/logging";

export async function loadFiles(dirName: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const items = await readdir(dirName, { withFileTypes: true });

    for (const item of items) {
      const fullPath = join(dirName, item.name);

      if (item.isDirectory()) {
        files.push(...(await loadFiles(fullPath)));
      } else if (item.isFile() && extname(item.name) === ".ts") {
        files.push(pathToFileURL(fullPath).href);
      }
    }
  } catch (error) {
    logging.error(`Error reading directory '${dirName}' @ ${error}.`);
  }

  return files;
}
