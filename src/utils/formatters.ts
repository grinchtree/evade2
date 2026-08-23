export function formatPermissions(permissions: string[]): string {
  // convert discord's camelcase permission names into readable snake_case
  return permissions
    .map((perm) => {
      return perm
        .replace(/([A-Z])/g, "_$1")
        .toLowerCase()
        .replace(/^_/, "");
    })
    .join(", ");
}

export function clampNumber(value: number, min: number, max: number): number {
  // keep a number within a specific minimum and maximum limit
  return Math.min(Math.max(value, min), max);
}

export function stringToSeconds(input: string): number {
  // convert shorthand time strings (like 1d2h30m) into total seconds
  if (!input) {
    throw new Error("No time string provided.");
  }

  const regex = /(\d+)(d|h|m|s)/gi;
  let totalSeconds = 0;
  let match;
  let hasMatch = false;

  // loop through every matching time unit in the string
  while ((match = regex.exec(input)) !== null) {
    hasMatch = true;
    const value = parseInt(match[1]!, 10);
    const unit = match[2]?.toLowerCase();

    switch (unit) {
      case "d":
        totalSeconds += value * 60 * 60 * 24;
        break;
      case "h":
        totalSeconds += value * 60 * 60;
        break;
      case "m":
        totalSeconds += value * 60;
        break;
      case "s":
        totalSeconds += value;
        break;
    }
  }

  if (!hasMatch) {
    throw new Error(
      `Invalid time format: \`${input}\`. Please use formats like \`10m, 1d2h, or 30s\`.`,
    );
  }

  return totalSeconds;
}

export function stringFromSeconds(
  seconds: number,
  real: boolean = false,
  separator: string = real ? ", " : " ",
): string {
  // turn total seconds back into a readable time string
  if (seconds <= 0) return real ? "0 seconds" : "0s";

  // calculate each time unit from the remaining seconds
  const d = Math.floor(seconds / (60 * 60 * 24));
  let remainder = seconds % (60 * 60 * 24);

  const h = Math.floor(remainder / (60 * 60));
  remainder %= 60 * 60;

  const m = Math.floor(remainder / 60);
  const s = Math.floor(remainder % 60);

  const parts: string[] = [];

  // quick helper to format full words and add an "s" if it's not exactly 1
  const pluralize = (val: number, word: string) =>
    `${val} ${word}${val === 1 ? "" : "s"}`;

  // push either the real word format or the short format
  if (d > 0) parts.push(real ? pluralize(d, "day") : `${d}d`);
  if (h > 0) parts.push(real ? pluralize(h, "hour") : `${h}h`);
  if (m > 0) parts.push(real ? pluralize(m, "minute") : `${m}m`);

  if (s > 0 || parts.length === 0) {
    parts.push(real ? pluralize(s, "second") : `${s}s`);
  }

  // join the parts using the customized separator
  return parts.join(separator);
}
