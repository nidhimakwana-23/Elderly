/**
 * Local-storage key for the JWT bearer token.
 * Used by the axios interceptor and the AuthContext.
 */
export const AUTH_TOKEN_KEY = 'elderly_auth_token';

/**
 * Local-storage key for persisting the logged-in user's profile.
 * Avoids decoding the JWT on every render.
 */
export const AUTH_USER_KEY = 'elderly_auth_user';
