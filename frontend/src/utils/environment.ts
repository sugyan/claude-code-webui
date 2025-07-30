/**
 * Environment utility functions for development/production detection
 */

/**
 * Check if the app is running in development mode
 * @returns true if in development mode, false in production
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV;
}

/**
 * Check if the app is running in production mode
 * @returns true if in production mode, false in development
 */
export function isProduction(): boolean {
  return import.meta.env.PROD;
}
