/**
 * Key Vault wiring placeholder: use Managed Identity + DefaultAzureCredential
 * in Azure Functions / Container Apps workers. For Next.js BFF, prefer
 * referencing secrets by name in App Service / Container Apps configuration
 * (Key Vault references) rather than fetching at runtime here.
 */
export async function getSecretFromEnvOrPlaceholder(
  envVarName: string,
): Promise<string | undefined> {
  return process.env[envVarName]?.trim();
}
