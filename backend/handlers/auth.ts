/**
 * Authentication handler for shell user login
 * Provides secure authentication against system users
 */

import { Context } from "hono";
import type { ConfigContext } from "../middleware/config.ts";
import { logger } from "../utils/logger.ts";
import { spawn } from "child_process";
import { promisify } from "util";
import { createHash, randomBytes } from "crypto";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { trackFailedLogin, clearFailedLogin } from "../middleware/security.ts";
import { getPlatform } from "../utils/os.ts";
import { verifyWindowsUser, type WindowsUser } from "./auth-windows.ts";

interface AuthRequest {
  username: string;
  password: string;
}

interface User {
  username: string;
  uid: number;
  homeDirectory: string;
  projectsPath: string;
  authenticated: true;
  fullName?: string;
  description?: string;
}

interface SessionData {
  user: User;
  createdAt: number;
  expiresAt: number;
}

// In-memory session store (in production, use Redis or database)
export const sessions = new Map<string, SessionData>();
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

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
 * Cross-platform user credential verification
 */
async function verifyUser(username: string, password: string): Promise<User | null> {
  const platform = getPlatform();
  
  logger.auth.debug("Verifying user credentials on platform: {platform}", { platform, username });
  
  switch (platform) {
    case "windows":
      return await verifyWindowsUser(username, password);
    case "linux":
    case "darwin":
    default:
      return await verifyUnixUser(username, password);
  }
}

/**
 * Verify Unix/Linux shell user credentials using system authentication
 */
async function verifyUnixUser(username: string, password: string): Promise<User | null> {
  return new Promise((resolve, reject) => {
    // Use shell command to pipe password to su
    // This is a secure way to authenticate against system users
    const command = `echo "${password}" | su ${username} -c "whoami" 2>/dev/null`;
    const child = spawn('sh', ['-c', command], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', async (code) => {
      logger.auth.debug("Authentication command completed for user {username}: code={code}, stdout='{stdout}', stderr='{stderr}'", {
        username,
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });

      if (code === 0 && stdout.trim() === username) {
        try {
          // Get user info using `id` command
          const userInfo = await getUserInfo(username);
          if (userInfo) {
            logger.auth.info("User {username} authenticated successfully", { username });
            resolve(userInfo);
          } else {
            logger.auth.warn("Failed to get user info for authenticated user {username}", { username });
            resolve(null);
          }
        } catch (error) {
          logger.auth.error("Failed to get user info: {error}", { error });
          resolve(null);
        }
      } else {
        logger.auth.debug("Authentication failed for user {username}: code={code}, expected username but got '{stdout}'", {
          username,
          code,
          stdout: stdout.trim(),
        });
        resolve(null);
      }
    });

    child.on('error', (error) => {
      logger.auth.error("Spawn error during authentication: {error}", { error });
      reject(error);
    });
  });
}

/**
 * Get user's actual home directory from passwd
 */
async function getActualHomeDirectory(username: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const child = spawn('getent', ['passwd', username], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        try {
          // Parse output like: username:x:uid:gid:gecos:home:shell
          const parts = stdout.trim().split(':');
          if (parts.length >= 6) {
            resolve(parts[5]); // home directory is the 6th field (index 5)
          } else {
            logger.auth.error("Invalid passwd entry format: {stdout}", { stdout: stdout.trim() });
            resolve(null);
          }
        } catch (error) {
          logger.auth.error("Failed to parse passwd entry: {error}", { error });
          resolve(null);
        }
      } else {
        logger.auth.error("Failed to get passwd info for user {username}: {stderr}", {
          username,
          stderr: stderr.trim(),
        });
        resolve(null);
      }
    });

    child.on('error', (error) => {
      logger.auth.error("Error getting passwd info: {error}", { error });
      reject(error);
    });
  });
}

/**
 * Get detailed user information
 */
async function getUserInfo(username: string): Promise<User | null> {
  return new Promise((resolve, reject) => {
    const child = spawn('id', [username], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', async (code) => {
      if (code === 0) {
        try {
          // Parse output like: uid=1000(username) gid=1000(groupname) groups=...
          const uidMatch = stdout.match(/uid=(\d+)/);
          if (!uidMatch) {
            logger.auth.error("Failed to parse uid from id command output: {stdout}", { stdout: stdout.trim() });
            resolve(null);
            return;
          }

          const uid = parseInt(uidMatch[1], 10);
          
          // Get actual home directory from getent passwd
          const homeDirectory = await getActualHomeDirectory(username);
          if (!homeDirectory) {
            logger.auth.error("Could not determine home directory for user {username}", { username });
            resolve(null);
            return;
          }
          
          // Check if home directory exists
          if (!existsSync(homeDirectory)) {
            logger.auth.warn("Home directory {homeDirectory} does not exist for user {username}", { homeDirectory, username });
          }

          resolve({
            username,
            uid,
            homeDirectory,
            projectsPath: homeDirectory, // Projects will be in user's home directory
            authenticated: true,
          });
        } catch (error) {
          logger.auth.error("Failed to parse user info: {error}", { error });
          resolve(null);
        }
      } else {
        logger.auth.error("Failed to get user info for {username}: {stderr}", {
          username,
          stderr: stderr.trim(),
        });
        resolve(null);
      }
    });

    child.on('error', (error) => {
      logger.auth.error("Error getting user info: {error}", { error });
      reject(error);
    });
  });
}

/**
 * Generate a secure session token
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Clean expired sessions
 */
function cleanExpiredSessions(): void {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(token);
    }
  }
}

/**
 * Handle login request
 */
export async function handleLoginRequest(c: Context<ConfigContext>) {
  const debugMode = c.get("debugMode");
  const clientIP = getClientIP(c);
  
  try {
    const body = await c.req.json() as AuthRequest;
    const { username, password } = body;

    if (!username || !password) {
      logger.auth.warn("Login attempt with missing credentials from IP: {ip}", { ip: clientIP });
      return c.json({ message: "Username and password are required" }, 400);
    }

    // Validate username format (prevent injection)
    if (!/^[a-z_][a-z0-9_-]*$/.test(username) || username.length > 32) {
      logger.auth.warn("Invalid username format: {username} from IP: {ip}", { username, ip: clientIP });
      return c.json({ message: "Invalid username format" }, 400);
    }

    logger.auth.info("Login attempt for user: {username} from IP: {ip}", { username, ip: clientIP });

    // Verify user credentials (cross-platform)
    const user = await verifyUser(username, password);
    
    if (!user) {
      logger.auth.warn("Authentication failed for user: {username} from IP: {ip}", { username, ip: clientIP });
      
      // Track failed login attempt
      trackFailedLogin(clientIP);
      
      return c.json({ message: "Invalid username or password" }, 401);
    }

    // Generate session token
    const token = generateSessionToken();
    const expiresAt = Date.now() + SESSION_DURATION;
    
    // Store session
    sessions.set(token, {
      user,
      createdAt: Date.now(),
      expiresAt,
    });

    logger.auth.info("Login successful for user: {username} from IP: {ip}", { username, ip: clientIP });

    // Clear failed login attempts for successful login
    clearFailedLogin(clientIP);

    // Clean expired sessions periodically
    if (Math.random() < 0.1) { // 10% chance
      cleanExpiredSessions();
    }

    return c.json({
      message: "Login successful",
      token,
      user,
      expiresAt,
    });

  } catch (error) {
    logger.auth.error("Login error: {error}", { error });
    return c.json({ message: "Internal server error" }, 500);
  }
}

/**
 * Handle token verification request
 */
export async function handleVerifyRequest(c: Context<ConfigContext>) {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ message: "No valid token provided" }, 401);
    }

    const token = authHeader.substring(7);
    const session = sessions.get(token);

    if (!session) {
      return c.json({ message: "Invalid token" }, 401);
    }

    if (session.expiresAt < Date.now()) {
      sessions.delete(token);
      return c.json({ message: "Token expired" }, 401);
    }

    return c.json(session.user);
  } catch (error) {
    logger.auth.error("Token verification error: {error}", { error });
    return c.json({ message: "Internal server error" }, 500);
  }
}

/**
 * Handle logout request
 */
export async function handleLogoutRequest(c: Context<ConfigContext>) {
  try {
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      sessions.delete(token);
    }

    return c.json({ message: "Logout successful" });
  } catch (error) {
    logger.auth.error("Logout error: {error}", { error });
    return c.json({ message: "Internal server error" }, 500);
  }
}

/**
 * Middleware to require authentication
 */
export function requireAuth() {
  return async (c: Context<ConfigContext>, next: () => Promise<void>) => {
    try {
      // Check for Authorization header
      const authHeader = c.req.header('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.auth.warn("Authentication attempt without valid Bearer token", {
          ip: c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP') || 'unknown',
          userAgent: c.req.header('User-Agent'),
          path: c.req.path,
        });
        return c.json({ message: "Authentication required" }, 401);
      }

      const token = authHeader.substring(7);
      
      // Validate token format (should be a valid session token)
      if (!token || token.length < 32) {
        logger.auth.warn("Authentication attempt with invalid token format", {
          ip: c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP') || 'unknown',
          tokenLength: token?.length || 0,
        });
        return c.json({ message: "Invalid token format" }, 401);
      }

      const session = sessions.get(token);

      if (!session) {
        logger.auth.warn("Authentication attempt with non-existent token", {
          ip: c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP') || 'unknown',
          path: c.req.path,
        });
        return c.json({ message: "Invalid or expired token" }, 401);
      }

      if (session.expiresAt < Date.now()) {
        sessions.delete(token);
        logger.auth.info("Session expired and removed", {
          username: session.user.username,
          expiredAt: new Date(session.expiresAt).toISOString(),
        });
        return c.json({ message: "Session expired" }, 401);
      }

      // Optional: Update session expiry on activity (sliding session)
      session.expiresAt = Date.now() + SESSION_DURATION;

      // Add user to context for handlers to use
      c.set('user', session.user);
      
      logger.auth.debug("Authentication successful", {
        username: session.user.username,
        path: c.req.path,
      });
      
      await next();
    } catch (error) {
      logger.auth.error("Authentication middleware error: {error}", { error });
      return c.json({ message: "Authentication error" }, 500);
    }
  };
}