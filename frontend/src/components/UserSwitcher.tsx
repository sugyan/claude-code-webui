import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon, UserIcon, ShieldCheckIcon, ArrowRightOnRectangleIcon, MagnifyingGlassIcon, CogIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { getApiUrl } from "../config/api";
import { UserManagementModal } from "./UserManagementModal";
import type { PrivilegeCheckResponse, ListUsersResponse, UserSwitchResponse, UserInfo } from "../../shared/types";

interface UserSwitcherProps {
  onUserSwitch?: (targetUser: string) => void;
}

export function UserSwitcher({ onUserSwitch }: UserSwitcherProps) {
  const { user, token, originalUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasPrivileges, setHasPrivileges] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedUserForManagement, setSelectedUserForManagement] = useState<UserInfo | null>(null);
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
  const [isRoot, setIsRoot] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    checkPrivileges();
  }, []);

  const checkPrivileges = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/api/user/privileges'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to check privileges');
      }

      const data: PrivilegeCheckResponse = await response.json();
      
      if (data.success && data.privileges) {
        const canSwitch = data.privileges.isRoot || data.privileges.hasSudo;
        setHasPrivileges(canSwitch);
        setIsRoot(data.privileges.isRoot);
        
        if (canSwitch) {
          await loadAvailableUsers();
        }
      }
    } catch (err) {
      console.error('Failed to check privileges:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const response = await fetch(getApiUrl('/api/user/switchable-users'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const data: ListUsersResponse = await response.json();
      
      if (data.success && data.users) {
        setAvailableUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleToggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    // Clear search when closing dropdown
    if (!newIsOpen) {
      setSearchFilter("");
    }
  };

  // Filter users based on search input
  const filteredUsers = availableUsers.filter(user =>
    user.username.toLowerCase().includes(searchFilter.toLowerCase()) ||
    user.homeDirectory.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleUserSwitch = async (targetUser: string) => {
    try {
      setSwitching(true);
      setError(null);
      
      const response = await fetch(getApiUrl('/api/user/switch'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUser }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to switch user');
      }

      const data: UserSwitchResponse = await response.json();
      
      if (data.success && data.switched && data.user && data.token) {
        // Close the dropdown
        setIsOpen(false);
        
        // Update the auth context with the new user session
        localStorage.setItem('auth_token', data.token);
        
        // Notify parent component
        onUserSwitch?.(targetUser);
        
        // Show success message and reload the page to reflect the new user
        alert(`Successfully switched to user '${targetUser}'! The page will refresh to show ${targetUser}'s projects.`);
        
        // Reload the page to refresh with new user context
        window.location.reload();
      } else {
        throw new Error(data.error || 'User switch failed');
      }
    } catch (err) {
      console.error('User switch failed:', err);
      setError(err instanceof Error ? err.message : 'User switch failed');
    } finally {
      setSwitching(false);
    }
  };

  const handleManageUser = (user: UserInfo, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent user switch when clicking manage button
    setSelectedUserForManagement(user);
    setIsManagementModalOpen(true);
    setIsOpen(false); // Close the dropdown
  };

  const handleCloseManagementModal = () => {
    setIsManagementModalOpen(false);
    setSelectedUserForManagement(null);
  };

  // Don't render anything if still loading
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-base-content/50">
        <span className="loading loading-spinner loading-sm"></span>
        <span className="text-xs">Checking privileges...</span>
      </div>
    );
  }

  // Only show if original login was root
  if (!originalUser || originalUser.username !== 'root') {
    return null;
  }

  // Don't render if original user doesn't have privileges
  if (!hasPrivileges) {
    return null;
  }

  return (
    <div className="relative z-50">
      {/* User Switch Button */}
      <button
        ref={buttonRef}
        onClick={handleToggleDropdown}
        className="btn btn-ghost btn-sm flex items-center gap-2 hover:bg-primary/10 transition-all duration-300 relative overflow-hidden group"
        title="Switch User (Root/Sudo Access)"
        disabled={switching}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative flex items-center gap-2">
          <ShieldCheckIcon className="w-4 h-4 text-primary" />
          <span className="hidden sm:inline text-xs">Switch User</span>
          <ChevronDownIcon className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && createPortal(
        <div 
          className="fixed w-64 backdrop-blur-xl bg-base-100/95 border border-base-300/50 rounded-xl shadow-2xl z-[9999] overflow-hidden"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
          }}
        >
          {/* Header */}
          <div className="p-3 border-b border-base-300/30 bg-gradient-to-r from-primary/5 to-secondary/5">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-base-content">Switch to User</span>
            </div>
            <p className="text-xs text-base-content/60 mt-1">
              Current: <span className="font-mono text-primary">{user?.username}</span>
            </p>
          </div>

          {/* Search Filter */}
          <div className="p-3 border-b border-base-300/30">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-10 pr-3 py-2 text-sm bg-base-200/50 border border-base-300/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                autoFocus
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-error/10 border-b border-error/20">
              <p className="text-xs text-error">{error}</p>
            </div>
          )}

          {/* User List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((availableUser, index) => (
                <div 
                  key={availableUser.username}
                  className="w-full p-3 hover:bg-primary/5 transition-colors duration-200 flex items-center gap-3 group"
                  style={{
                    animationDelay: `${index * 0.05}s`,
                    animation: 'fadeInUp 0.3s ease-out forwards',
                  }}
                >
                  <button
                    onClick={(e) => isRoot ? handleManageUser(availableUser, e) : handleUserSwitch(availableUser.username)}
                    disabled={switching}
                    className="relative flex-shrink-0 group/icon disabled:opacity-50"
                    title={isRoot ? `Manage ${availableUser.username}` : `Switch to ${availableUser.username}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-lg blur-sm opacity-0 group-hover/icon:opacity-30 transition-opacity" />
                    <div className="relative bg-base-200 hover:bg-base-300 rounded-lg p-2 transition-colors duration-200">
                      {/* Show management icon if root, otherwise user icon */}
                      {isRoot ? (
                        <CogIcon className="w-5 h-5 text-accent group-hover/icon:text-accent/80 transition-colors" />
                      ) : (
                        <UserIcon className="w-5 h-5 text-base-content/70 group-hover/icon:text-primary transition-colors" />
                      )}
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleUserSwitch(availableUser.username)}
                    disabled={switching}
                    className="flex-1 text-left min-w-0 p-1 rounded hover:bg-base-200/50 transition-colors duration-200 disabled:opacity-50"
                    title={`Switch to ${availableUser.username}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-base-content truncate">
                        {availableUser.username}
                      </span>
                      <div className="flex items-center gap-2">
                        {switching && (
                          <span className="loading loading-spinner loading-xs text-primary"></span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-base-content/50 font-mono truncate">
                        {availableUser.homeDirectory}
                      </span>
                      <ArrowRightOnRectangleIcon className="w-3 h-3 text-base-content/30 group-hover:text-primary transition-colors flex-shrink-0" />
                    </div>
                  </button>
                </div>
              ))
            ) : (
              <div className="p-6 text-center">
                {searchFilter ? (
                  <>
                    <MagnifyingGlassIcon className="w-8 h-8 text-base-content/30 mx-auto mb-2" />
                    <p className="text-sm text-base-content/60">No users found</p>
                    <p className="text-xs text-base-content/40 mt-1">
                      No users match "{searchFilter}"
                    </p>
                  </>
                ) : (
                  <>
                    <UserIcon className="w-8 h-8 text-base-content/30 mx-auto mb-2" />
                    <p className="text-sm text-base-content/60">No users available</p>
                    <p className="text-xs text-base-content/40 mt-1">
                      No other users with shell access found
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-base-300/30 bg-base-200/30">
            <div className="flex justify-between items-center text-xs text-base-content/50">
              <span>
                {searchFilter && filteredUsers.length < availableUsers.length 
                  ? `${filteredUsers.length} of ${availableUsers.length} users`
                  : `${availableUsers.length} users`
                }
              </span>
              <span>Requires root/sudo</span>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Backdrop */}
      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => setIsOpen(false)}
        />,
        document.body
      )}

      {/* User Management Modal */}
      <UserManagementModal
        isOpen={isManagementModalOpen}
        onClose={handleCloseManagementModal}
        selectedUser={selectedUserForManagement}
      />
    </div>
  );
}