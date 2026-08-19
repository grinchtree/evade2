import chalk from "chalk";

function getTimestamp(): string {
  // used for formatting e.g '25/12/09 [INFO]: It's Christmas!'

  const now = new Date();

  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear().toString().slice(-2);
  const dateStr = `${day}/${month}/${year}`; // british 🤓

  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const timeStr = `${hours}:${minutes}${ampm}`;

  return chalk.gray(`${timeStr} ${dateStr}`);
}

export const logging = {
  info: (message: string) => {
    console.log(`${getTimestamp()} ${chalk.gray("[INFO]")}: ${message}`);
  },
  approve: (message: string) => {
    console.log(`${getTimestamp()} ${chalk.green("[APPROVE]")}: ${message}`);
  },
  warn: (message: string) => {
    console.log(`${getTimestamp()} ${chalk.yellow("[INFO]")}: ${message}`);
  },
  error: (message: string) => {
    console.log(`${getTimestamp()} ${chalk.red("[ERROR]")}: ${message}`);
  },
  debug: (message: string) => {
    console.log(`${getTimestamp()} ${chalk.green("[DEBUG]")}: ${message}`);
  },
};
