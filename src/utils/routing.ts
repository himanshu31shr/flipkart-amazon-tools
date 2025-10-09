/**
 * Get the base path for routing based on the platform
 * - Returns "" for Capacitor (native mobile apps)
 * - Returns "/flipkart-amazon-tools" for web browsers
 */
export function getBasePath(): string {
  return '';
}

/**
 * Create a route path with the appropriate base path
 * @param path - The route path (e.g., "/login", "/home")
 * @returns The full path with base path prepended
 *
 * @example
 * // On mobile: createRoutePath("/login") => "/login"
 * // On web: createRoutePath("/login") => "/flipkart-amazon-tools/login"
 */
export function createRoutePath(path: string): string {
  const basePath = getBasePath();
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
}
