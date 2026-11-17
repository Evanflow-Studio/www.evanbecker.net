/**
 * Where API calls go, and how. Every call to the API goes through these, so the rules
 * below hold everywhere (tests/unit/apiBase.test.ts checks no call site bypasses them).
 */

/**
 * The API's base URL, without a trailing slash. `serverUrl` is NUXT_API_BASE_SERVER: the
 * API's address on the host's own network, used during server-side rendering so those
 * calls never go out through Cloudflare Access, which refuses them on test. In the
 * browser, and when it's unset, the public URL (NUXT_PUBLIC_API_URL) is used.
 */
export function resolveApiBase(publicUrl?: string | null, serverUrl?: string | null): string {
  return (serverUrl || publicUrl || '').replace(/\/+$/, '')
}

/**
 * Sent with every API request. The API is on another origin, and on test it sits behind
 * Cloudflare Access, which refuses a request without its cookie; browsers send cookies
 * cross-origin only with `credentials: 'include'`. The API's CORS policy allows
 * credentials for its own origins.
 */
export const apiRequestDefaults = {
  mode: 'cors',
  credentials: 'include',
} as const satisfies RequestInit
