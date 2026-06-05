/**
 * Diner table-session for the public menu (`/r/[slug]`).
 *
 * A table's QR code is static, so the 20-minute window can't live in the QR.
 * Instead, scanning (`/r/{slug}?table=N`) mints a short-lived, HMAC-signed token
 * that the proxy stores in an httpOnly cookie; the menu page verifies it on each
 * load. The signature stops a diner from hand-editing the expiry. The menu data
 * itself is public, so this is a soft "are you actually at the table?" gate.
 */

export const MENU_SESSION_COOKIE = "menu_session";
export const MENU_SESSION_DURATION_MS = 20 * 60 * 1000;
export const MENU_SESSION_DURATION_SECONDS = MENU_SESSION_DURATION_MS / 1000;

export interface MenuSession {
  /** Restaurant slug the session was opened for. */
  slug: string;
  /** Table number the diner scanned. */
  table: number;
  /** Expiry as epoch milliseconds. */
  exp: number;
}

const encoder = new TextEncoder();

function getSecret(): string {
  const secret = process.env.MENU_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "MENU_SESSION_SECRET is not set — required to sign menu table sessions.",
    );
  }
  return secret;
}

function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(value: string): Uint8Array<ArrayBuffer> {
  const padding = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + padding;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Signs a session into a `payload.signature` token (both base64url). */
export async function createMenuSessionToken(
  session: MenuSession,
): Promise<string> {
  const payload = base64urlEncode(encoder.encode(JSON.stringify(session)));
  const key = await importKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  return `${payload}.${base64urlEncode(new Uint8Array(signature))}`;
}

/**
 * Verifies a token's signature and shape. Returns the session (expiry not yet
 * checked — callers compare `exp` against the current time), or null if the
 * token is missing, malformed, or tampered with.
 */
export async function verifyMenuSessionToken(
  token: string,
): Promise<MenuSession | null> {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const key = await importKey();
  let valid: boolean;
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlDecode(signature),
      encoder.encode(payload),
    );
  } catch {
    return null;
  }
  if (!valid) return null;

  try {
    const session = JSON.parse(
      new TextDecoder().decode(base64urlDecode(payload)),
    ) as MenuSession;
    if (
      typeof session.slug !== "string" ||
      typeof session.table !== "number" ||
      typeof session.exp !== "number"
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/** Whether a verified session is for `slug` and has not yet expired. */
export function isMenuSessionActive(
  session: MenuSession,
  slug: string,
): boolean {
  return session.slug === slug && session.exp > Date.now();
}
