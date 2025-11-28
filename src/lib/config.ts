/* Resolves API base URL in both Vite (import.meta.env) and Next (process.env) runtimes. */
function resolveApiBaseUrl(): string {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  try {
    const viteEnv = (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env;
    if (viteEnv && typeof viteEnv.VITE_API_BASE_URL === "string" && viteEnv.VITE_API_BASE_URL.length > 0) {
      return viteEnv.VITE_API_BASE_URL;
    }
  } catch (error) {
    // import.meta might not exist; ignore and fall back to default.
  }

  return "/api";
}

export const API_BASE_URL = resolveApiBaseUrl();
