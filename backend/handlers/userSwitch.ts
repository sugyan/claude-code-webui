/**
 * User switching handler for root/sudo users
 * Provides secure user switching functionality via sudo su
 */

import { Context } from "hono";
import type { ConfigContext } from "../middleware/config.ts";
import { logger } from "../utils/logger.ts";
import { spawn } from "child_process";
import { getPlatform } from "../utils/os.ts";
import { 
  checkWindowsUserPrivileges, 
  listSwitchableWindowsUsers, 
  switchToWindowsUser, 
  createWindowsUserSession,
  type WindowsUserInfo,
  type WindowsPrivilegeInfo 
} from "./userSwitch-windows.ts";

interface UserInfo {
  username: string;
  uid: number;
  gid: number;
  homeDirectory: string;
  shell: string;
  hasShellAccess: boolean;
}

interface UserSwitchRequest {
  targetUser: string;
}

interface PrivilegeInfo {
  isRoot: boolean;
  hasSudo: boolean;
  currentUser: string;
  uid: number;
  gid: number;
}

/**
 * Cross-platform privilege checking
 */
async function checkUserPrivileges(): Promise<PrivilegeInfo> {
  const platform = getPlatform();
  
  logger.userSwitch.debug("Checking user privileges on platform: {platform}", { platform });
  
  switch (platform) {
    case "windows":
      return await checkWindowsUserPrivilegesWrapper();
    case "linux":
    case "darwin":
    default:
      return await checkUnixUserPrivileges();
  }
}

/**
 * Wrapper to convert Windows privileges to Unix format
 */
async function checkWindowsUserPrivilegesWrapper(): Promise<PrivilegeInfo> {
  const windowsPrivileges = await checkWindowsUserPrivileges();
  
  return {
    isRoot: windowsPrivileges.isAdmin,
    hasSudo: windowsPrivileges.isAdmin,
    currentUser: windowsPrivileges.currentUser,
    uid: windowsPrivileges.uid,
    gid: windowsPrivileges.gid,
  };
}

/**
 * Check if current user is root or has sudo privileges on Unix systems
 */
async function checkUnixUserPrivileges(): Promise<PrivilegeInfo> {
  return new Promise((resolve, reject) => {
    const child = spawn('id', [], {
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
          // Parse output like: uid=0(root) gid=0(root) groups=...
          const uidMatch = stdout.match(/uid=(\d+)\(([^)]+)\)/);
          const gidMatch = stdout.match(/gid=(\d+)\(([^)]+)\)/);
          
          if (!uidMatch || !gidMatch) {
            logger.userSwitch.error("Failed to parse id command output: {stdout}", { stdout: stdout.trim() });
            reject(new Error("Failed to parse user information"));
            return;
          }

          const uid = parseInt(uidMatch[1], 10);
          const currentUser = uidMatch[2];
          const gid = parseInt(gidMatch[1], 10);
          const isRoot = uid === 0;

          // Check sudo access for non-root users
          let hasSudo = isRoot;
          if (!isRoot) {
            hasSudo = await checkSudoAccess();
          }

          resolve({
            isRoot,
            hasSudo,
            currentUser,
            uid,
            gid,
          });
        } catch (error) {
          logger.userSwitch.error("Failed to parse user privileges: {error}", { error });
          reject(error);
        }
      } else {
        logger.userSwitch.error("Failed to get user privileges: {stderr}", { stderr: stderr.trim() });
        reject(new Error("Failed to get user information"));
      }
    });

    child.on('error', (error) => {
      logger.userSwitch.error("Error checking user privileges: {error}", { error });
      reject(error);
    });
  });
}

/**
 * Check if user has sudo access
 */
async function checkSudoAccess(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('sudo', ['-n', 'true'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Cross-platform function to get list of system users with shell access
 */
async function getSystemUsersWithShell(): Promise<UserInfo[]> {
  const platform = getPlatform();
  
  logger.userSwitch.debug("Getting system users on platform: {platform}", { platform });
  
  switch (platform) {
    case "windows":
      return await getWindowsUsersWithShell();
    case "linux":
    case "darwin":
    default:
      return await getUnixUsersWithShell();
  }
}

/**
 * Convert Windows users to UserInfo format
 */
async function getWindowsUsersWithShell(): Promise<UserInfo[]> {
  try {
    const windowsUsers = await listSwitchableWindowsUsers();
    
    // Convert WindowsUserInfo to UserInfo format
    const users: UserInfo[] = windowsUsers.map(user => ({
      username: user.username,
      uid: user.uid,
      gid: user.gid,
      homeDirectory: user.homeDirectory,
      shell: user.shell,
      hasShellAccess: user.hasShellAccess,
    }));

    return users;
  } catch (error) {
    logger.userSwitch.error("Failed to get Windows users: {error}", { error });
    return [];
  }
}

/**
 * Get list of Unix/Linux system users with shell access
 */
async function getUnixUsersWithShell(): Promise<UserInfo[]> {
  return new Promise((resolve, reject) => {
    const child = spawn('getent', ['passwd'], {
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
          const users: UserInfo[] = [];
          const lines = stdout.trim().split('\n');

          for (const line of lines) {
            const parts = line.split(':');
            if (parts.length >= 7) {
              const username = parts[0];
              const uid = parseInt(parts[2], 10);
              const gid = parseInt(parts[3], 10);
              const homeDirectory = parts[5];
              const shell = parts[6];
              
              // Check if user has shell access (not /usr/sbin/nologin, /bin/false, etc.)
              const hasShellAccess = shell.match(/\/(bash|sh|zsh|fish|csh|tcsh)$/) !== null;
              
              // Skip system users (uid < 1000) except root
              if (hasShellAccess && (uid >= 1000 || uid === 0)) {
                users.push({
                  username,
                  uid,
                  gid,
                  homeDirectory,
                  shell,
                  hasShellAccess,
                });
              }
            }
          }

          // Sort by username
          users.sort((a, b) => a.username.localeCompare(b.username));
          resolve(users);
        } catch (error) {
          logger.userSwitch.error("Failed to parse passwd output: {error}", { error });
          reject(error);
        }
      } else {
        logger.userSwitch.error("Failed to get passwd info: {stderr}", { stderr: stderr.trim() });
        reject(new Error("Failed to get system users"));
      }
    });

    child.on('error', (error) => {
      logger.userSwitch.error("Error getting system users: {error}", { error });
      reject(error);
    });
  });
}

/**
 * Switch to target user using sudo su
 */
async function switchToUser(targetUser: string, currentUser: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Validate target user format (prevent injection)
    if (!/^[a-z_][a-z0-9_-]*$/.test(targetUser) || targetUser.length > 32) {
      logger.userSwitch.warn("Invalid target username format: {targetUser}", { targetUser });
      reject(new Error("Invalid username format"));
      return;
    }

    // Test if we can switch to the target user
    const child = spawn('sudo', ['su', '-', targetUser, '-c', 'whoami'], {
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
      if (code === 0 && stdout.trim() === targetUser) {
        logger.userSwitch.info("Successfully verified user switch capability for {targetUser}", { targetUser });
        resolve(true);
      } else {
        logger.userSwitch.warn("Failed to switch to user {targetUser}: code={code}, stdout='{stdout}', stderr='{stderr}'", {
          targetUser,
          code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
        resolve(false);
      }
    });

    child.on('error', (error) => {
      logger.userSwitch.error("Error testing user switch to {targetUser}: {error}", { targetUser, error });
      reject(error);
    });
  });
}

/**
 * Handle privilege check request
 */
export async function handlePrivilegeCheckRequest(c: Context<ConfigContext>) {
  try {
    const privileges = await checkUserPrivileges();
    
    logger.userSwitch.info("Privilege check for user {currentUser}: isRoot={isRoot}, hasSudo={hasSudo}", {
      currentUser: privileges.currentUser,
      isRoot: privileges.isRoot,
      hasSudo: privileges.hasSudo,
    });

    return c.json({
      success: true,
      privileges,
    });
  } catch (error) {
    logger.userSwitch.error("Failed to check user privileges: {error}", { error });
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
}

/**
 * Handle list users request
 */
export async function handleListUsersRequest(c: Context<ConfigContext>) {
  try {
    // First check if user has privileges
    const privileges = await checkUserPrivileges();
    
    if (!privileges.isRoot && !privileges.hasSudo) {
      return c.json({
        success: false,
        error: "Insufficient privileges. Root or sudo access required.",
      }, 403);
    }

    const users = await getSystemUsersWithShell();
    
    // Remove current user from the list since we're already logged in as them
    const filteredUsers = users.filter(user => user.username !== privileges.currentUser);
    
    logger.userSwitch.info("Found {count} switchable users for {currentUser}", {
      count: filteredUsers.length,
      currentUser: privileges.currentUser,
    });

    return c.json({
      success: true,
      users: filteredUsers,
      currentUser: privileges.currentUser,
    });
  } catch (error) {
    logger.userSwitch.error("Failed to list users: {error}", { error });
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
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
            logger.userSwitch.error("Invalid passwd entry format: {stdout}", { stdout: stdout.trim() });
            resolve(null);
          }
        } catch (error) {
          logger.userSwitch.error("Failed to parse passwd entry: {error}", { error });
          resolve(null);
        }
      } else {
        logger.userSwitch.error("Failed to get passwd info for user {username}: {stderr}", {
          username,
          stderr: stderr.trim(),
        });
        resolve(null);
      }
    });

    child.on('error', (error) => {
      logger.userSwitch.error("Error getting passwd info: {error}", { error });
      reject(error);
    });
  });
}

/**
 * Create a switched user session
 */
async function createSwitchedUserSession(targetUser: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = spawn('id', [targetUser], {
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
            logger.userSwitch.error("Failed to parse uid from id command output: {stdout}", { stdout: stdout.trim() });
            reject(new Error("Failed to parse user information"));
            return;
          }

          const uid = parseInt(uidMatch[1], 10);
          
          // Get actual home directory from getent passwd
          const homeDirectory = await getActualHomeDirectory(targetUser);
          if (!homeDirectory) {
            logger.userSwitch.error("Could not determine home directory for user {username}", { username: targetUser });
            reject(new Error("Failed to determine home directory"));
            return;
          }

          resolve({
            username: targetUser,
            uid,
            homeDirectory,
            projectsPath: homeDirectory, // Projects will be in user's home directory
            authenticated: true,
            switchedFrom: 'root', // Track original user
          });
        } catch (error) {
          logger.userSwitch.error("Failed to create switched user session: {error}", { error });
          reject(error);
        }
      } else {
        logger.userSwitch.error("Failed to get user info for {username}: {stderr}", {
          username: targetUser,
          stderr: stderr.trim(),
        });
        reject(new Error("Failed to get user information"));
      }
    });

    child.on('error', (error) => {
      logger.userSwitch.error("Error getting user info: {error}", { error });
      reject(error);
    });
  });
}

/**
 * Handle user switch request
 */
export async function handleUserSwitchRequest(c: Context<ConfigContext>) {
  try {
    const body = await c.req.json() as UserSwitchRequest;
    const { targetUser } = body;

    if (!targetUser) {
      return c.json({
        success: false,
        error: "Target user is required",
      }, 400);
    }

    // Check if user has privileges
    const privileges = await checkUserPrivileges();
    
    if (!privileges.isRoot && !privileges.hasSudo) {
      return c.json({
        success: false,
        error: "Insufficient privileges. Root or sudo access required.",
      }, 403);
    }

    // Test user switch capability
    const canSwitch = await switchToUser(targetUser, privileges.currentUser);
    
    if (!canSwitch) {
      return c.json({
        success: false,
        error: `Cannot switch to user '${targetUser}'. User may not exist or access may be denied.`,
      }, 400);
    }

    // Create a new session for the target user
    const switchedUserData = await createSwitchedUserSession(targetUser);

    // Generate a new session token for the switched user
    const { generateSessionToken } = await import('./auth.ts');
    const newToken = generateSessionToken();
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

    // Store the new session in the session store
    const { sessions } = await import('./auth.ts');
    sessions.set(newToken, {
      user: switchedUserData,
      createdAt: Date.now(),
      expiresAt,
    });
    
    logger.userSwitch.info("User switch successful: {currentUser} -> {targetUser}", {
      currentUser: privileges.currentUser,
      targetUser,
    });

    return c.json({
      success: true,
      message: `Successfully switched to user '${targetUser}'`,
      user: switchedUserData,
      token: newToken,
      expiresAt,
      switched: true,
    });
  } catch (error) {
    logger.userSwitch.error("Failed to process user switch request: {error}", { error });
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
}