/**
 * Security middleware for Claude Code Web UI
 * 
 * Provides comprehensive security measures including:
 * - Rate limiting
 * - Request size limits
 * - Security headers
 * - IP filtering
 * - Attack prevention
 */

import type { Context } from "hono";
import type { ConfigContext } from "./config.ts";
import { logger } from "../utils/logger.ts";

// Rate limiting store - in production, use Redis or database
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS_PER_MINUTE = 60;
const MAX_LOGIN_ATTEMPTS_PER_MINUTE = 5;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

// Failed login attempts tracking
const failedLoginAttempts = new Map<string, { count: number; lastAttempt: number; blockUntil?: number }>();
const MAX_FAILED_LOGINS = 5;
const LOGIN_BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Get client IP address from various headers
 */
function getClientIP(c: Context): string {
  return (
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
    c.req.header('X-Real-IP') ||
    c.req.header('X-Client-IP') ||
    c.req.header('CF-Connecting-IP') ||
    'unknown'
  );
}

/**
 * Clean up expired rate limit entries
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Clean up expired failed login attempts
 */
function cleanupFailedLogins() {
  const now = Date.now();
  for (const [ip, data] of failedLoginAttempts.entries()) {
    if (data.blockUntil && data.blockUntil < now) {
      failedLoginAttempts.delete(ip);
    }
  }
}

/**
 * General rate limiting middleware
 */
export function rateLimitMiddleware() {
  return async (c: Context<ConfigContext>, next: () => Promise<void>) => {
    const ip = getClientIP(c);
    const now = Date.now();
    const key = `general:${ip}`;
    
    // Clean up expired entries periodically
    if (Math.random() < 0.01) { // 1% chance
      cleanupRateLimitStore();
    }

    let rateLimitData = rateLimitStore.get(key);
    
    if (!rateLimitData || rateLimitData.resetTime < now) {
      rateLimitData = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
      rateLimitStore.set(key, rateLimitData);
    } else {
      rateLimitData.count++;
    }

    if (rateLimitData.count > MAX_REQUESTS_PER_MINUTE) {
      logger.auth.warn("Rate limit exceeded", {
        ip,
        path: c.req.path,
        count: rateLimitData.count,
        resetTime: new Date(rateLimitData.resetTime).toISOString(),
      });
      
      return c.json({
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: Math.ceil((rateLimitData.resetTime - now) / 1000),
      }, 429);
    }

    // Add rate limit headers
    c.header('X-RateLimit-Limit', MAX_REQUESTS_PER_MINUTE.toString());
    c.header('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS_PER_MINUTE - rateLimitData.count).toString());
    c.header('X-RateLimit-Reset', Math.ceil(rateLimitData.resetTime / 1000).toString());

    await next();
  };
}

/**
 * Login rate limiting middleware
 */
export function loginRateLimitMiddleware() {
  return async (c: Context<ConfigContext>, next: () => Promise<void>) => {
    const ip = getClientIP(c);
    const now = Date.now();
    
    // Clean up expired entries
    if (Math.random() < 0.1) { // 10% chance
      cleanupFailedLogins();
    }

    const failedData = failedLoginAttempts.get(ip);
    
    // Check if IP is currently blocked
    if (failedData?.blockUntil && failedData.blockUntil > now) {
      logger.auth.warn("Login attempt from blocked IP", {
        ip,
        blockUntil: new Date(failedData.blockUntil).toISOString(),
      });
      
      return c.json({
        message: "Too many failed login attempts. Please try again later.",
        retryAfter: Math.ceil((failedData.blockUntil - now) / 1000),
      }, 429);
    }

    // Rate limit login attempts
    const loginKey = `login:${ip}`;
    let loginRateData = rateLimitStore.get(loginKey);
    
    if (!loginRateData || loginRateData.resetTime < now) {
      loginRateData = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
      rateLimitStore.set(loginKey, loginRateData);
    } else {
      loginRateData.count++;
    }

    if (loginRateData.count > MAX_LOGIN_ATTEMPTS_PER_MINUTE) {
      logger.auth.warn("Login rate limit exceeded", {
        ip,
        count: loginRateData.count,
      });
      
      return c.json({
        message: "Too many login attempts. Please try again later.",
        retryAfter: Math.ceil((loginRateData.resetTime - now) / 1000),
      }, 429);
    }

    await next();
  };
}

/**
 * Track failed login attempts
 */
export function trackFailedLogin(ip: string) {
  const now = Date.now();
  let failedData = failedLoginAttempts.get(ip);
  
  if (!failedData || (now - failedData.lastAttempt) > LOGIN_BLOCK_DURATION) {
    failedData = { count: 1, lastAttempt: now };
  } else {
    failedData.count++;
    failedData.lastAttempt = now;
  }

  if (failedData.count >= MAX_FAILED_LOGINS) {
    failedData.blockUntil = now + LOGIN_BLOCK_DURATION;
    logger.auth.warn("IP blocked due to failed login attempts", {
      ip,
      failedAttempts: failedData.count,
      blockUntil: new Date(failedData.blockUntil).toISOString(),
    });
  }

  failedLoginAttempts.set(ip, failedData);
}

/**
 * Clear failed login attempts for successful login
 */
export function clearFailedLogin(ip: string) {
  failedLoginAttempts.delete(ip);
}

/**
 * Security headers middleware
 */
export function securityHeadersMiddleware() {
  return async (c: Context<ConfigContext>, next: () => Promise<void>) => {
    // Set security headers
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "img-src 'self' data: blob:; " +
      "connect-src 'self' ws: wss:; " +
      "frame-ancestors 'none';"
    );
    
    await next();
  };
}

/**
 * Request size limiting middleware
 */
export function requestSizeLimitMiddleware(maxSize: number = 10 * 1024 * 1024) { // 10MB default
  return async (c: Context<ConfigContext>, next: () => Promise<void>) => {
    const contentLength = c.req.header('content-length');
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      logger.auth.warn("Request size limit exceeded", {
        ip: getClientIP(c),
        contentLength,
        maxSize,
        path: c.req.path,
      });
      
      return c.json({
        message: "Request too large",
        maxSize: `${Math.round(maxSize / (1024 * 1024))}MB`,
      }, 413);
    }
    
    await next();
  };
}

/**
 * Input validation middleware for common attacks
 */
export function inputValidationMiddleware() {
  return async (c: Context<ConfigContext>, next: () => Promise<void>) => {
    const path = c.req.path;
    const userAgent = c.req.header('User-Agent') || '';
    const ip = getClientIP(c);
    
    // Check for suspicious patterns in path
    const suspiciousPatterns = [
      /\.\./,                    // Directory traversal
      /\/etc\/passwd/,          // System file access
      /\/proc\//,               // Process information
      /<script/i,               // XSS attempts
      /javascript:/i,           // Javascript protocol
      /vbscript:/i,             // VBScript protocol
      /on\w+\s*=/i,            // Event handlers
      /union\s+select/i,        // SQL injection
      /drop\s+table/i,          // SQL injection
      /insert\s+into/i,         // SQL injection
      /delete\s+from/i,         // SQL injection
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(path)) {
        logger.auth.warn("Suspicious request detected", {
          ip,
          path,
          userAgent,
          pattern: pattern.toString(),
        });
        
        return c.json({ message: "Request blocked" }, 403);
      }
    }

    // Check for bot/scanner user agents
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scanner/i,
      /sqlmap/i,
      /nmap/i,
      /nikto/i,
      /dirb/i,
    ];

    const isBot = botPatterns.some(pattern => pattern.test(userAgent));
    if (isBot && !c.req.path.startsWith('/api/auth/')) {
      logger.auth.warn("Bot/scanner detected", {
        ip,
        path,
        userAgent,
      });
      
      return c.json({ message: "Access denied" }, 403);
    }

    await next();
  };
}