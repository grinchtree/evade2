import os from "os";
import chalk from "chalk";

let previousCpu = process.cpuUsage();
let previousTime = Date.now();

function setupScrollRegion() {
  // get current terminal height (default to 100 if unsupported)
  const rows = process.stdout.rows || 100;
  process.stdout.write(`\x1b[5;${rows}r`);
}

export function startConsoleDashboard() {
  // guardrail: don't start the dashboard if running as a background service (e.g., pm2, docker)
  if (!process.stdout.isTTY) return;

  // clear the screen completely
  process.stdout.write("\x1b[2J");

  // set up the scroll margins
  setupScrollRegion();

  // handle window resizes (so the scroll region adapts if you resize your terminal)
  if (process.stdout.on) {
    process.stdout.on("resize", setupScrollRegion);
  }

  // move the cursor to line 5 so the first logs don't overwrite our header
  process.stdout.write("\x1b[5;1H");

  // update the dashboard every 2 seconds
  setInterval(() => {
    const memoryMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

    const currentCpu = process.cpuUsage(previousCpu);
    const currentTime = Date.now();
    const timeDiff = currentTime - previousTime;

    // convert microseconds to milliseconds
    const cpuTimeMs = (currentCpu.user + currentCpu.system) / 1000;

    // calculate percentage of cpu utilized by the bot
    const cpuPercent = ((cpuTimeMs / timeDiff) * 100).toFixed(1);

    previousCpu = process.cpuUsage();
    previousTime = currentTime;

    const header = [
      `\x1b[K${chalk.gray("--------------------------------------------------------")}`,
      `\x1b[K ${chalk.magenta("Runtime:")} Bun ${process.version} | ${chalk.magenta("Platform:")} ${process.platform} (${os.release()})`,
      `\x1b[K ${chalk.magenta("Memory:")} ${memoryMB} MB | ${chalk.magenta("Bot CPU:")} ${cpuPercent}%`,
      `\x1b[K${chalk.gray("--------------------------------------------------------")}`,
    ].join("\n");

    process.stdout.write(`\x1b7\x1b[1;1H${header}\x1b8`);
  }, 2000);
}
