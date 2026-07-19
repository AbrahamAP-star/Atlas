// How many authorized uploads (signed sessions) are allowed per IP per window.
// Change only this number to adjust the limit.
export const MAX_UPLOADS_PER_IP_PER_WINDOW = 1;

// Quota window duration. DEV: 1 minute to iterate fast without waiting a
// full day. Revert to 24h (24 * 60 * 60 * 1000) before production.
export const UPLOAD_QUOTA_WINDOW_MS = 60 * 1000;

// How long the user has to sign the nonce before it expires.
export const NONCE_TTL_MS = 5 * 60 * 1000;

// How long the session (token) lasts once the signature is verified. Within
// this time, image + document + metadata can all be uploaded without signing again.
export const SESSION_TTL_MS = 15 * 60 * 1000;
