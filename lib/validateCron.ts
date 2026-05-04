import { parseExpression } from "cron-parser";

export function isValidCron(expression: string): boolean {
  const trimmed = expression.trim();
  if (!trimmed) return false;
  try {
    parseExpression(trimmed, { currentDate: new Date() });
    return true;
  } catch {
    return false;
  }
}
