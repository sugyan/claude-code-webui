/**
 * Windows user authentication utilities
 * Provides secure authentication against Windows user accounts
 */

import { spawn } from "child_process";
import { logger } from "../utils/logger.ts";

export interface WindowsUser {
  username: string;
  uid: number; // SID converted to number for compatibility
  homeDirectory: string;
  projectsPath: string;
  authenticated: true;
  fullName?: string;
  description?: string;
}

/**
 * Verify Windows user credentials using PowerShell
 * Uses PowerShell's System.DirectoryServices.AccountManagement for secure authentication
 */
export async function verifyWindowsUser(username: string, password: string): Promise<WindowsUser | null> {
  return new Promise((resolve, reject) => {
    // PowerShell script for secure Windows authentication
    const powershellScript = `
Add-Type -AssemblyName System.DirectoryServices.AccountManagement;
try {
  # Create PrincipalContext for local machine
  $context = New-Object System.DirectoryServices.AccountManagement.PrincipalContext([System.DirectoryServices.AccountManagement.ContextType]::Machine);
  
  # Validate credentials
  $isValid = $context.ValidateCredentials('${username}', '${password}');
  
  if ($isValid) {
    # Get user information
    $user = [System.DirectoryServices.AccountManagement.UserPrincipal]::FindByIdentity($context, '${username}');
    if ($user) {
      # Get additional user details
      $userInfo = Get-LocalUser -Name '${username}' -ErrorAction SilentlyContinue;
      
      # Output user information as JSON
      $result = @{
        valid = $true;
        username = $user.SamAccountName;
        fullName = $user.DisplayName;
        description = $user.Description;
        homeDirectory = $user.HomeDirectory;
        sid = $user.Sid.Value;
        enabled = $user.Enabled;
      };
      
      # If HomeDirectory is null, use default Windows user profile path
      if (-not $result.homeDirectory) {
        $result.homeDirectory = "$env:HOMEDRIVE$env:HOMEPATH".Replace($env:USERNAME, $user.SamAccountName);
      }
      
      # Convert to JSON and output
      $result | ConvertTo-Json -Depth 2;
    } else {
      '{"valid":false,"error":"User not found"}' | Write-Output;
    }
  } else {
    '{"valid":false,"error":"Invalid credentials"}' | Write-Output;
  }
  
  $context.Dispose();
} catch {
  $errorInfo = @{
    valid = $false;
    error = $_.Exception.Message;
  };
  $errorInfo | ConvertTo-Json -Depth 2;
}
`;

    logger.auth.debug("Starting Windows authentication for user: {username}", { username });

    const child = spawn('powershell', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-Command', powershellScript
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true // Hide PowerShell window
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
      logger.auth.debug("Windows authentication command completed for user {username}: code={code}", {
        username,
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });

      if (code === 0) {
        try {
          const result = JSON.parse(stdout.trim());
          
          if (result.valid === true) {
            // Convert Windows SID to a numeric UID for compatibility
            const sidParts = result.sid.split('-');
            const uid = parseInt(sidParts[sidParts.length - 1], 10) || 1000;
            
            const windowsUser: WindowsUser = {
              username: result.username,
              uid,
              homeDirectory: result.homeDirectory || `C:\\Users\\${result.username}`,
              projectsPath: result.homeDirectory || `C:\\Users\\${result.username}`,
              authenticated: true,
              fullName: result.fullName,
              description: result.description,
            };
            
            logger.auth.info("Windows user {username} authenticated successfully", { username });
            resolve(windowsUser);
          } else {
            logger.auth.warn("Windows authentication failed for user {username}: {error}", { 
              username, 
              error: result.error || 'Unknown error' 
            });
            resolve(null);
          }
        } catch (error) {
          logger.auth.error("Failed to parse Windows authentication response: {error}", { error });
          resolve(null);
        }
      } else {
        logger.auth.error("Windows authentication command failed for user {username}: code={code}, stderr={stderr}", {
          username,
          code,
          stderr: stderr.trim(),
        });
        resolve(null);
      }
    });

    child.on('error', (error) => {
      logger.auth.error("Windows authentication spawn error: {error}", { error });
      reject(error);
    });
  });
}

/**
 * Get Windows user information using PowerShell
 */
export async function getWindowsUserInfo(username: string): Promise<WindowsUser | null> {
  return new Promise((resolve, reject) => {
    const powershellScript = `
Add-Type -AssemblyName System.DirectoryServices.AccountManagement;
try {
  $context = New-Object System.DirectoryServices.AccountManagement.PrincipalContext([System.DirectoryServices.AccountManagement.ContextType]::Machine);
  $user = [System.DirectoryServices.AccountManagement.UserPrincipal]::FindByIdentity($context, '${username}');
  
  if ($user) {
    $result = @{
      username = $user.SamAccountName;
      fullName = $user.DisplayName;
      description = $user.Description;
      homeDirectory = $user.HomeDirectory;
      sid = $user.Sid.Value;
      enabled = $user.Enabled;
    };
    
    if (-not $result.homeDirectory) {
      $result.homeDirectory = "$env:HOMEDRIVE$env:HOMEPATH".Replace($env:USERNAME, $user.SamAccountName);
    }
    
    $result | ConvertTo-Json -Depth 2;
  } else {
    '{"error":"User not found"}' | Write-Output;
  }
  
  $context.Dispose();
} catch {
  $errorInfo = @{
    error = $_.Exception.Message;
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
      if (code === 0) {
        try {
          const result = JSON.parse(stdout.trim());
          
          if (!result.error) {
            const sidParts = result.sid.split('-');
            const uid = parseInt(sidParts[sidParts.length - 1], 10) || 1000;
            
            const windowsUser: WindowsUser = {
              username: result.username,
              uid,
              homeDirectory: result.homeDirectory || `C:\\Users\\${result.username}`,
              projectsPath: result.homeDirectory || `C:\\Users\\${result.username}`,
              authenticated: true,
              fullName: result.fullName,
              description: result.description,
            };
            
            resolve(windowsUser);
          } else {
            resolve(null);
          }
        } catch (error) {
          logger.auth.error("Failed to parse Windows user info response: {error}", { error });
          resolve(null);
        }
      } else {
        logger.auth.error("Windows user info command failed: code={code}, stderr={stderr}", {
          code,
          stderr: stderr.trim(),
        });
        resolve(null);
      }
    });

    child.on('error', (error) => {
      logger.auth.error("Windows user info spawn error: {error}", { error });
      reject(error);
    });
  });
}

/**
 * List Windows local users (for user switching functionality)
 */
export async function listWindowsUsers(): Promise<WindowsUser[]> {
  return new Promise((resolve, reject) => {
    const powershellScript = `
Get-LocalUser | Where-Object { $_.Enabled -eq $true -and $_.Name -ne "Guest" } | ForEach-Object {
  $userObj = @{
    username = $_.Name;
    fullName = $_.FullName;
    description = $_.Description;
    sid = $_.SID.Value;
    enabled = $_.Enabled;
  };
  
  # Determine home directory
  $profilePath = "$env:HOMEDRIVE$env:HOMEPATH".Replace($env:USERNAME, $_.Name);
  if (Test-Path $profilePath) {
    $userObj.homeDirectory = $profilePath;
  } else {
    $userObj.homeDirectory = "C:\\Users\\$($_.Name)";
  }
  
  $userObj;
} | ConvertTo-Json -Depth 2;
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
      if (code === 0) {
        try {
          const rawResult = stdout.trim();
          if (!rawResult) {
            resolve([]);
            return;
          }

          // Handle both single object and array responses
          let users = JSON.parse(rawResult);
          if (!Array.isArray(users)) {
            users = [users];
          }

          const windowsUsers: WindowsUser[] = users.map((user: any) => {
            const sidParts = user.sid.split('-');
            const uid = parseInt(sidParts[sidParts.length - 1], 10) || 1000;
            
            return {
              username: user.username,
              uid,
              homeDirectory: user.homeDirectory,
              projectsPath: user.homeDirectory,
              authenticated: true,
              fullName: user.fullName,
              description: user.description,
            };
          });

          resolve(windowsUsers);
        } catch (error) {
          logger.auth.error("Failed to parse Windows users list: {error}", { error });
          resolve([]);
        }
      } else {
        logger.auth.error("Windows user list command failed: code={code}, stderr={stderr}", {
          code,
          stderr: stderr.trim(),
        });
        resolve([]);
      }
    });

    child.on('error', (error) => {
      logger.auth.error("Windows user list spawn error: {error}", { error });
      reject(error);
    });
  });
}