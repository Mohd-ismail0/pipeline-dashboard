export function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" ? value : undefined;
}

export function readEnvTrimmed(name: string): string | undefined {
  return readEnv(name)?.trim();
}

export function isEnvTrue(name: string): boolean {
  return readEnv(name) === "true";
}
