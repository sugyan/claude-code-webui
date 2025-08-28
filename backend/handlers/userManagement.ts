/**
 * User management handler for root users
 * Provides comprehensive user administration functionality
 */

import { Context } from "hono";
import type { ConfigContext } from "../middleware/config.ts";
import { logger } from "../utils/logger.ts";
import { spawn } from "child_process";

interface UserManagementRequest {
  username: string;
  action: "updatePassword" | "updateEmail" | "updateHomePath" | "toggleShell" | "getUserDetails";
  newPassword?: string;
  newEmail?: string;
  newHomePath?: string;
  enableShell?: boolean;
}

interface UserDetails {
  username: string;
  uid: number;
  gid: number;
  homeDirectory: string;
  shell: string;
  email?: string;
  lastLogin?: string;
  accountLocked?: boolean;
  passwordExpiry?: string;
  groups?: string[];
}

interface UserManagementResponse {
  success: boolean;
  message?: string;
  user?: UserDetails;
  error?: string;
}

/**
 * Check if current user has root privileges
 */
async function checkRootPrivileges(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('id', ['-u'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        const uid = parseInt(stdout.trim(), 10);
        resolve(uid === 0); // Root has UID 0
      } else {
        resolve(false);
      }
    });

    child.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Get detailed user information
 */
async function getUserDetails(username: string): Promise<UserDetails | null> {
  return new Promise((resolve, reject) => {
    // Get basic user info with id command
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

    child.on('close', async (code) => {
      if (code === 0) {
        try {
          // Parse passwd entry: username:x:uid:gid:gecos:home:shell
          const parts = stdout.trim().split(':');
          if (parts.length >= 7) {
            const userDetails: UserDetails = {
              username: parts[0],
              uid: parseInt(parts[2], 10),
              gid: parseInt(parts[3], 10),
              homeDirectory: parts[5],
              shell: parts[6],
            };

            // Get additional details
            await enrichUserDetails(userDetails);
            resolve(userDetails);
          } else {
            logger.userManagement.error("Invalid passwd entry format: {stdout}", { stdout });
            resolve(null);
          }
        } catch (error) {
          logger.userManagement.error("Failed to parse user details: {error}", { error });
          reject(error);
        }
      } else {
        logger.userManagement.error("Failed to get user details for {username}: {stderr}", {
          username,
          stderr: stderr.trim(),
        });
        resolve(null);
      }
    });

    child.on('error', (error) => {
      logger.userManagement.error("Error getting user details: {error}", { error });
      reject(error);
    });
  });
}

/**
 * Enrich user details with additional information
 */
async function enrichUserDetails(userDetails: UserDetails): Promise<void> {
  // Get user groups
  try {
    userDetails.groups = await getUserGroups(userDetails.username);
  } catch (error) {
    logger.userManagement.warn("Failed to get groups for user {username}: {error}", {
      username: userDetails.username,
      error,
    });
  }

  // Check account status
  try {
    userDetails.accountLocked = await isAccountLocked(userDetails.username);
  } catch (error) {
    logger.userManagement.warn("Failed to check account lock status for {username}: {error}", {
      username: userDetails.username,
      error,
    });
  }

  // Get last login info
  try {
    userDetails.lastLogin = await getLastLogin(userDetails.username);
  } catch (error) {
    logger.userManagement.warn("Failed to get last login for {username}: {error}", {
      username: userDetails.username,
      error,
    });
  }
}

/**
 * Get user groups
 */
async function getUserGroups(username: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const child = spawn('groups', [username], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        const groups = stdout.trim().split(':')[1]?.trim().split(' ') || [];
        resolve(groups.filter(group => group.length > 0));
      } else {
        resolve([]);
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Check if account is locked
 */
async function isAccountLocked(username: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('passwd', ['-S', username], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        // passwd -S output: username L/P/NP date
        const status = stdout.trim().split(' ')[1];
        resolve(status === 'L'); // L = Locked
      } else {
        resolve(false);
      }
    });

    child.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Get last login information
 */
async function getLastLogin(username: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const child = spawn('lastlog', ['-u', username], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        const lines = stdout.trim().split('\n');
        if (lines.length > 1) {
          const lastLoginLine = lines[1];
          const parts = lastLoginLine.split(/\s+/);
          if (parts.length >= 4 && parts[1] !== '**Never') {
            resolve(parts.slice(3).join(' '));
          }
        }
      }
      resolve(undefined);
    });

    child.on('error', () => {
      resolve(undefined);
    });
  });
}

/**
 * Update user password
 */
async function updateUserPassword(username: string, newPassword: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const child = spawn('chpasswd', [], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        logger.userManagement.info("Password updated successfully for user {username}", { username });
        resolve(true);
      } else {
        logger.userManagement.error("Failed to update password for user {username}: {stderr}", {
          username,
          stderr: stderr.trim(),
        });
        resolve(false);
      }
    });

    child.on('error', (error) => {
      logger.userManagement.error("Error updating password for user {username}: {error}", { username, error });
      reject(error);
    });

    // Send username:password to chpasswd
    child.stdin?.write(`${username}:${newPassword}\n`);
    child.stdin?.end();
  });
}

/**
 * Update user home directory
 */
async function updateUserHomePath(username: string, newHomePath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const child = spawn('usermod', ['-d', newHomePath, username], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        logger.userManagement.info("Home directory updated successfully for user {username} to {newHomePath}", {
          username,
          newHomePath,
        });
        resolve(true);
      } else {
        logger.userManagement.error("Failed to update home directory for user {username}: {stderr}", {
          username,
          stderr: stderr.trim(),
        });
        resolve(false);
      }
    });

    child.on('error', (error) => {
      logger.userManagement.error("Error updating home directory for user {username}: {error}", { username, error });
      reject(error);
    });
  });
}

/**
 * Toggle user shell access
 */
async function toggleUserShell(username: string, enableShell: boolean): Promise<boolean> {
  const shell = enableShell ? '/bin/bash' : '/usr/sbin/nologin';
  
  return new Promise((resolve, reject) => {
    const child = spawn('usermod', ['-s', shell, username], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        logger.userManagement.info("Shell updated successfully for user {username} to {shell}", {
          username,
          shell,
        });
        resolve(true);
      } else {
        logger.userManagement.error("Failed to update shell for user {username}: {stderr}", {
          username,
          stderr: stderr.trim(),
        });
        resolve(false);
      }
    });

    child.on('error', (error) => {
      logger.userManagement.error("Error updating shell for user {username}: {error}", { username, error });
      reject(error);
    });
  });
}

/**
 * Update user email (stored in GECOS field)
 */
async function updateUserEmail(username: string, newEmail: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Use usermod to update the comment field (GECOS)
    const child = spawn('usermod', ['-c', newEmail, username], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        logger.userManagement.info("Email updated successfully for user {username} to {newEmail}", {
          username,
          newEmail,
        });
        resolve(true);
      } else {
        logger.userManagement.error("Failed to update email for user {username}: {stderr}", {
          username,
          stderr: stderr.trim(),
        });
        resolve(false);
      }
    });

    child.on('error', (error) => {
      logger.userManagement.error("Error updating email for user {username}: {error}", { username, error });
      reject(error);
    });
  });
}

/**
 * Handle user management requests
 */
export async function handleUserManagementRequest(c: Context<ConfigContext>) {
  try {
    // Check if user is root
    const isRoot = await checkRootPrivileges();
    if (!isRoot) {
      return c.json({
        success: false,
        error: "Root privileges required for user management",
      }, 403);
    }

    const body = await c.req.json() as UserManagementRequest;
    const { username, action } = body;

    if (!username) {
      return c.json({
        success: false,
        error: "Username is required",
      }, 400);
    }

    // Validate username format
    if (!/^[a-z_][a-z0-9_-]*$/.test(username) || username.length > 32) {
      return c.json({
        success: false,
        error: "Invalid username format",
      }, 400);
    }

    let result: UserManagementResponse;

    switch (action) {
      case "getUserDetails":
        const userDetails = await getUserDetails(username);
        if (userDetails) {
          result = {
            success: true,
            user: userDetails,
            message: "User details retrieved successfully",
          };
        } else {
          result = {
            success: false,
            error: "User not found or unable to retrieve details",
          };
        }
        break;

      case "updatePassword":
        if (!body.newPassword) {
          return c.json({
            success: false,
            error: "New password is required",
          }, 400);
        }
        const passwordUpdated = await updateUserPassword(username, body.newPassword);
        result = {
          success: passwordUpdated,
          message: passwordUpdated ? "Password updated successfully" : "Failed to update password",
          error: passwordUpdated ? undefined : "Password update failed",
        };
        break;

      case "updateEmail":
        if (!body.newEmail) {
          return c.json({
            success: false,
            error: "New email is required",
          }, 400);
        }
        const emailUpdated = await updateUserEmail(username, body.newEmail);
        result = {
          success: emailUpdated,
          message: emailUpdated ? "Email updated successfully" : "Failed to update email",
          error: emailUpdated ? undefined : "Email update failed",
        };
        break;

      case "updateHomePath":
        if (!body.newHomePath) {
          return c.json({
            success: false,
            error: "New home path is required",
          }, 400);
        }
        const homePathUpdated = await updateUserHomePath(username, body.newHomePath);
        result = {
          success: homePathUpdated,
          message: homePathUpdated ? "Home directory updated successfully" : "Failed to update home directory",
          error: homePathUpdated ? undefined : "Home directory update failed",
        };
        break;

      case "toggleShell":
        if (body.enableShell === undefined) {
          return c.json({
            success: false,
            error: "Shell enable/disable flag is required",
          }, 400);
        }
        const shellToggled = await toggleUserShell(username, body.enableShell);
        result = {
          success: shellToggled,
          message: shellToggled 
            ? `Shell access ${body.enableShell ? 'enabled' : 'disabled'} successfully`
            : "Failed to update shell access",
          error: shellToggled ? undefined : "Shell update failed",
        };
        break;

      default:
        return c.json({
          success: false,
          error: "Invalid action specified",
        }, 400);
    }

    return c.json(result);

  } catch (error) {
    logger.userManagement.error("Failed to process user management request: {error}", { error });
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
}