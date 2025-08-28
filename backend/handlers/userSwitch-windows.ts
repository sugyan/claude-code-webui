/**
 * Windows user switching utilities
 * Provides Windows-specific user privilege checking and user listing
 */

import { spawn } from "child_process";
import { logger } from "../utils/logger.ts";
import { listWindowsUsers } from "./auth-windows.ts";

export interface WindowsUserInfo {
  username: string;
  uid: number;
  gid: number;
  homeDirectory: string;
  shell: string;
  hasShellAccess: boolean;
  fullName?: string;
  description?: string;
}

export interface WindowsPrivilegeInfo {
  isRoot: boolean; // Administrator equivalent
  hasSudo: boolean; // User Account Control (UAC) equivalent
  currentUser: string;
  uid: number;
  gid: number;
  isAdmin: boolean;
  hasElevatedToken: boolean;
}

/**
 * Check if current user has administrator privileges on Windows
 */
export async function checkWindowsUserPrivileges(): Promise<WindowsPrivilegeInfo> {
  return new Promise((resolve, reject) => {
    // PowerShell script to check administrator privileges
    const powershellScript = `
try {
  # Get current user information
  $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent();
  $principal = New-Object System.Security.Principal.WindowsPrincipal($currentUser);
  
  # Check if user is in Administrator role
  $isAdmin = $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator);
  
  # Check if process is elevated (running as administrator)
  $isElevated = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator");
  
  # Get user SID for UID equivalent
  $userSID = $currentUser.User.Value;
  $sidParts = $userSID.Split('-');
  $uid = [int]$sidParts[-1];
  
  # Create result object
  $result = @{
    currentUser = $currentUser.Name.Split('\\')[-1];
    isAdmin = $isAdmin;
    isElevated = $isElevated;
    userSID = $userSID;
    uid = $uid;
    gid = $uid; # Windows doesn't have exact GID equivalent, use UID
    fullUserName = $currentUser.Name;
  };
  
  $result | ConvertTo-Json -Depth 2;
} catch {
  $errorInfo = @{
    error = $_.Exception.Message;
    currentUser = $env:USERNAME;
    isAdmin = $false;
    isElevated = $false;
    uid = 1000;
    gid = 1000;
  };
  $errorInfo | ConvertTo-Json -Depth 2;
}
`;

    const child = spawn('powershell', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-Command', powershellScript
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
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
      try {
        const result = JSON.parse(stdout.trim());
        
        const privileges: WindowsPrivilegeInfo = {
          isRoot: result.isAdmin || false,
          hasSudo: result.isAdmin || false, // On Windows, admin privileges cover both
          currentUser: result.currentUser || process.env.USERNAME || 'unknown',
          uid: result.uid || 1000,
          gid: result.gid || 1000,
          isAdmin: result.isAdmin || false,
          hasElevatedToken: result.isElevated || false,
        };

        logger.auth.debug("Windows privilege check result: {result}", { result: privileges });
        resolve(privileges);
      } catch (error) {
        logger.auth.error("Failed to parse Windows privilege check result: {error}", { error });
        // Fallback to non-privileged user
        resolve({
          isRoot: false,
          hasSudo: false,
          currentUser: process.env.USERNAME || 'unknown',
          uid: 1000,
          gid: 1000,
          isAdmin: false,
          hasElevatedToken: false,
        });
      }
    });

    child.on('error', (error) => {
      logger.auth.error("Windows privilege check spawn error: {error}", { error });
      reject(error);
    });
  });
}

/**
 * List switchable Windows users (requires administrator privileges)
 */
export async function listSwitchableWindowsUsers(): Promise<WindowsUserInfo[]> {
  try {
    const windowsUsers = await listWindowsUsers();
    
    // Convert WindowsUser to WindowsUserInfo format
    const userInfos: WindowsUserInfo[] = windowsUsers.map(user => ({
      username: user.username,
      uid: user.uid,
      gid: user.uid, // Use UID as GID equivalent
      homeDirectory: user.homeDirectory,
      shell: 'cmd.exe', // Default Windows shell
      hasShellAccess: true, // Assume all local users have shell access
      fullName: user.fullName,
      description: user.description,
    }));

    return userInfos;
  } catch (error) {
    logger.auth.error("Failed to list switchable Windows users: {error}", { error });
    return [];
  }
}

/**
 * Windows user switching using runas command
 * Note: This is more limited than Unix su, as it requires password or stored credentials
 */
export async function switchToWindowsUser(targetUser: string, currentUser: string): Promise<boolean> {
  logger.auth.info("Windows user switching requested from {currentUser} to {targetUser}", {
    currentUser,
    targetUser
  });

  // For Windows, user switching is more complex and typically requires:
  // 1. Administrator privileges
  // 2. Target user password (for runas)
  // 3. Or configured credentials in Credential Manager
  
  // In this implementation, we'll validate that the target user exists
  // and return success if the current user has admin privileges
  try {
    const privileges = await checkWindowsUserPrivileges();
    
    if (!privileges.isAdmin) {
      logger.auth.warn("User switching denied: current user {currentUser} lacks administrator privileges", {
        currentUser
      });
      return false;
    }

    const users = await listSwitchableWindowsUsers();
    const targetUserExists = users.some(user => user.username.toLowerCase() === targetUser.toLowerCase());
    
    if (!targetUserExists) {
      logger.auth.warn("User switching failed: target user {targetUser} not found or not accessible", {
        targetUser
      });
      return false;
    }

    logger.auth.info("Windows user switching validated for {targetUser}", { targetUser });
    return true;
  } catch (error) {
    logger.auth.error("Windows user switching error: {error}", { error });
    return false;
  }
}

/**
 * Create a new Windows user session token
 * This simulates user switching by creating a new authentication session
 * In a real implementation, this would integrate with Windows authentication APIs
 */
export async function createWindowsUserSession(targetUser: string): Promise<{
  user: WindowsUserInfo;
  switched: boolean;
} | null> {
  try {
    const users = await listSwitchableWindowsUsers();
    const user = users.find(u => u.username.toLowerCase() === targetUser.toLowerCase());
    
    if (!user) {
      return null;
    }

    logger.auth.info("Created Windows user session for {targetUser}", { targetUser });
    
    return {
      user,
      switched: true
    };
  } catch (error) {
    logger.auth.error("Failed to create Windows user session: {error}", { error });
    return null;
  }
}