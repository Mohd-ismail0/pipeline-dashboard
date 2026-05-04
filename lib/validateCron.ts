import { CronExpressionParser } from "cron-parser";

export function isValidCron(expression: string): boolean {
  const trimmed = expression.trim();
  if (!trimmed) return false;
  try {
    CronExpressionParser.parse(trimmed, { currentDate: new Date() });
    return true;
  } catch {
    return false;
  }
}
