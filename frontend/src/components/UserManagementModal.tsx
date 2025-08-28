import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  XMarkIcon,
  UserIcon,
  KeyIcon,
  AtSymbolIcon,
  HomeIcon,
  CommandLineIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  ClockIcon,
  UserGroupIcon,
  LockClosedIcon,
  LockOpenIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { getApiUrl } from "../config/api";
import type { UserDetails, UserManagementRequest, UserManagementResponse, UserInfo } from "../../shared/types";

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUser: UserInfo | null;
}

type TabType = "overview" | "password" | "email" | "home" | "shell";

interface FormState {
  newPassword: string;
  confirmPassword: string;
  newEmail: string;
  newHomePath: string;
  enableShell: boolean;
}

export function UserManagementModal({ isOpen, onClose, selectedUser }: UserManagementModalProps) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formState, setFormState] = useState<FormState>({
    newPassword: "",
    confirmPassword: "",
    newEmail: "",
    newHomePath: "",
    enableShell: true,
  });

  // Reset state when modal opens/closes or user changes
  useEffect(() => {
    if (isOpen && selectedUser) {
      setActiveTab("overview");
      setError(null);
      setSuccess(null);
      setFormState({
        newPassword: "",
        confirmPassword: "",
        newEmail: "",
        newHomePath: selectedUser.homeDirectory,
        enableShell: selectedUser.hasShellAccess,
      });
      fetchUserDetails();
    }
  }, [isOpen, selectedUser]);

  const fetchUserDetails = async () => {
    if (!selectedUser || !token) return;

    setLoading(true);
    try {
      const request: UserManagementRequest = {
        username: selectedUser.username,
        action: "getUserDetails",
      };

      const response = await fetch(getApiUrl('/api/user/manage'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data: UserManagementResponse = await response.json();

      if (data.success && data.user) {
        setUserDetails(data.user);
        setFormState(prev => ({
          ...prev,
          newEmail: data.user?.email || "",
          newHomePath: data.user?.homeDirectory || "",
          enableShell: data.user?.shell !== "/usr/sbin/nologin" && data.user?.shell !== "/bin/false",
        }));
      } else {
        setError(data.error || "Failed to fetch user details");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (action: UserManagementRequest["action"]) => {
    if (!selectedUser || !token) return;

    // Validation
    if (action === "updatePassword") {
      if (!formState.newPassword) {
        setError("Password is required");
        return;
      }
      if (formState.newPassword !== formState.confirmPassword) {
        setError("Passwords don't match");
        return;
      }
      if (formState.newPassword.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const request: UserManagementRequest = {
        username: selectedUser.username,
        action,
        ...(action === "updatePassword" && { newPassword: formState.newPassword }),
        ...(action === "updateEmail" && { newEmail: formState.newEmail }),
        ...(action === "updateHomePath" && { newHomePath: formState.newHomePath }),
        ...(action === "toggleShell" && { enableShell: formState.enableShell }),
      };

      const response = await fetch(getApiUrl('/api/user/manage'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data: UserManagementResponse = await response.json();

      if (data.success) {
        setSuccess(data.message || "Operation completed successfully");
        // Refresh user details
        await fetchUserDetails();
        // Clear password fields for security
        if (action === "updatePassword") {
          setFormState(prev => ({ ...prev, newPassword: "", confirmPassword: "" }));
        }
      } else {
        setError(data.error || "Operation failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "overview", name: "Overview", icon: UserIcon },
    { id: "password", name: "Password", icon: KeyIcon },
    { id: "email", name: "Email", icon: AtSymbolIcon },
    { id: "home", name: "Home Path", icon: HomeIcon },
    { id: "shell", name: "Shell Access", icon: CommandLineIcon },
  ] as const;

  if (!isOpen || !selectedUser) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl mx-4 bg-base-100 rounded-2xl shadow-2xl border border-base-300/30 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-b border-base-300/30">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5" />
          <div className="relative px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-xl blur-sm opacity-30" />
                  <div className="relative bg-base-100 rounded-xl p-3">
                    <UserIcon className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Manage User: {selectedUser.username}
                  </h2>
                  <p className="text-sm text-base-content/70 mt-1">
                    UID: {selectedUser.uid} • {selectedUser.homeDirectory}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="btn btn-ghost btn-sm btn-circle hover:bg-error/10 hover:text-error"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-base-300/30 bg-base-200/30">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all duration-200 border-b-2 whitespace-nowrap ${
                    isActive
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-base-content/70 hover:text-base-content hover:bg-base-200/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {/* Success/Error Messages */}
          {error && (
            <div className="alert alert-error mb-4">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success mb-4">
              <CheckCircleIcon className="w-5 h-5" />
              <span>{success}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="loading loading-spinner loading-lg text-primary"></div>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === "overview" && userDetails && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div className="card bg-base-200/30 border border-base-300/30">
                      <div className="card-body">
                        <h3 className="card-title text-lg flex items-center gap-2">
                          <UserIcon className="w-5 h-5" />
                          Basic Information
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-base-content/70">Username:</span>
                            <span className="font-mono">{userDetails.username}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-base-content/70">UID:</span>
                            <span className="font-mono">{userDetails.uid}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-base-content/70">GID:</span>
                            <span className="font-mono">{userDetails.gid}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-base-content/70">Shell:</span>
                            <span className="font-mono text-sm">{userDetails.shell}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Account Status */}
                    <div className="card bg-base-200/30 border border-base-300/30">
                      <div className="card-body">
                        <h3 className="card-title text-lg flex items-center gap-2">
                          <InformationCircleIcon className="w-5 h-5" />
                          Account Status
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-base-content/70">Shell Access:</span>
                            <div className="flex items-center gap-2">
                              {userDetails.shell !== "/usr/sbin/nologin" && userDetails.shell !== "/bin/false" ? (
                                <LockOpenIcon className="w-4 h-4 text-success" />
                              ) : (
                                <LockClosedIcon className="w-4 h-4 text-error" />
                              )}
                              <span className={
                                userDetails.shell !== "/usr/sbin/nologin" && userDetails.shell !== "/bin/false" 
                                  ? "text-success" : "text-error"
                              }>
                                {userDetails.shell !== "/usr/sbin/nologin" && userDetails.shell !== "/bin/false" ? "Enabled" : "Disabled"}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-base-content/70">Account:</span>
                            <div className="flex items-center gap-2">
                              {userDetails.accountLocked ? (
                                <LockClosedIcon className="w-4 h-4 text-error" />
                              ) : (
                                <LockOpenIcon className="w-4 h-4 text-success" />
                              )}
                              <span className={userDetails.accountLocked ? "text-error" : "text-success"}>
                                {userDetails.accountLocked ? "Locked" : "Active"}
                              </span>
                            </div>
                          </div>
                          {userDetails.lastLogin && (
                            <div className="flex justify-between items-center">
                              <span className="text-base-content/70">Last Login:</span>
                              <div className="flex items-center gap-2">
                                <ClockIcon className="w-4 h-4 text-base-content/50" />
                                <span className="text-sm">{userDetails.lastLogin}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Groups */}
                  {userDetails.groups && userDetails.groups.length > 0 && (
                    <div className="card bg-base-200/30 border border-base-300/30">
                      <div className="card-body">
                        <h3 className="card-title text-lg flex items-center gap-2">
                          <UserGroupIcon className="w-5 h-5" />
                          Group Memberships
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {userDetails.groups.map((group) => (
                            <span
                              key={group}
                              className="badge badge-primary badge-outline"
                            >
                              {group}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Password Tab */}
              {activeTab === "password" && (
                <div className="space-y-6">
                  <div className="card bg-base-200/30 border border-base-300/30">
                    <div className="card-body">
                      <h3 className="card-title text-lg flex items-center gap-2">
                        <KeyIcon className="w-5 h-5" />
                        Update Password
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="label">
                            <span className="label-text">New Password</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              value={formState.newPassword}
                              onChange={(e) => setFormState(prev => ({ ...prev, newPassword: e.target.value }))}
                              className="input input-bordered w-full pr-12"
                              placeholder="Enter new password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 btn btn-ghost btn-xs"
                            >
                              {showPassword ? (
                                <EyeSlashIcon className="w-4 h-4" />
                              ) : (
                                <EyeIcon className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="label">
                            <span className="label-text">Confirm Password</span>
                          </label>
                          <input
                            type={showPassword ? "text" : "password"}
                            value={formState.confirmPassword}
                            onChange={(e) => setFormState(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            className="input input-bordered w-full"
                            placeholder="Confirm new password"
                          />
                        </div>
                        <button
                          onClick={() => handleSave("updatePassword")}
                          disabled={saving || !formState.newPassword || !formState.confirmPassword}
                          className="btn btn-primary"
                        >
                          {saving && <span className="loading loading-spinner loading-sm"></span>}
                          Update Password
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Email Tab */}
              {activeTab === "email" && (
                <div className="space-y-6">
                  <div className="card bg-base-200/30 border border-base-300/30">
                    <div className="card-body">
                      <h3 className="card-title text-lg flex items-center gap-2">
                        <AtSymbolIcon className="w-5 h-5" />
                        Update Email
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="label">
                            <span className="label-text">Email Address</span>
                          </label>
                          <input
                            type="email"
                            value={formState.newEmail}
                            onChange={(e) => setFormState(prev => ({ ...prev, newEmail: e.target.value }))}
                            className="input input-bordered w-full"
                            placeholder="Enter email address"
                          />
                        </div>
                        <button
                          onClick={() => handleSave("updateEmail")}
                          disabled={saving}
                          className="btn btn-primary"
                        >
                          {saving && <span className="loading loading-spinner loading-sm"></span>}
                          Update Email
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Home Path Tab */}
              {activeTab === "home" && (
                <div className="space-y-6">
                  <div className="card bg-base-200/30 border border-base-300/30">
                    <div className="card-body">
                      <h3 className="card-title text-lg flex items-center gap-2">
                        <HomeIcon className="w-5 h-5" />
                        Update Home Directory
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="label">
                            <span className="label-text">Home Directory Path</span>
                          </label>
                          <input
                            type="text"
                            value={formState.newHomePath}
                            onChange={(e) => setFormState(prev => ({ ...prev, newHomePath: e.target.value }))}
                            className="input input-bordered w-full font-mono"
                            placeholder="/home/username"
                          />
                        </div>
                        <div className="alert alert-warning">
                          <ExclamationTriangleIcon className="w-5 h-5" />
                          <div>
                            <div className="font-semibold">Warning</div>
                            <div className="text-sm">Changing the home directory does not move existing files. Make sure the new directory exists and has proper permissions.</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSave("updateHomePath")}
                          disabled={saving || !formState.newHomePath}
                          className="btn btn-primary"
                        >
                          {saving && <span className="loading loading-spinner loading-sm"></span>}
                          Update Home Directory
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Shell Tab */}
              {activeTab === "shell" && (
                <div className="space-y-6">
                  <div className="card bg-base-200/30 border border-base-300/30">
                    <div className="card-body">
                      <h3 className="card-title text-lg flex items-center gap-2">
                        <CommandLineIcon className="w-5 h-5" />
                        Shell Access Control
                      </h3>
                      <div className="space-y-4">
                        <div className="form-control">
                          <label className="label cursor-pointer justify-start gap-4">
                            <input
                              type="checkbox"
                              checked={formState.enableShell}
                              onChange={(e) => setFormState(prev => ({ ...prev, enableShell: e.target.checked }))}
                              className="checkbox checkbox-primary"
                            />
                            <div>
                              <span className="label-text font-semibold">Enable Shell Access</span>
                              <div className="text-sm text-base-content/70 mt-1">
                                Allow user to log in via SSH, terminal, or other shell interfaces
                              </div>
                            </div>
                          </label>
                        </div>
                        <div className="alert alert-info">
                          <InformationCircleIcon className="w-5 h-5" />
                          <div>
                            <div className="text-sm">
                              {formState.enableShell ? (
                                <>Shell will be set to <code className="bg-base-300 px-1 rounded">/bin/bash</code></>
                              ) : (
                                <>Shell will be set to <code className="bg-base-300 px-1 rounded">/usr/sbin/nologin</code></>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSave("toggleShell")}
                          disabled={saving}
                          className={`btn ${formState.enableShell ? "btn-success" : "btn-error"}`}
                        >
                          {saving && <span className="loading loading-spinner loading-sm"></span>}
                          {formState.enableShell ? "Enable" : "Disable"} Shell Access
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-base-300/30 bg-base-200/30 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-xs text-base-content/50">
              Ultra User Management • Root Access Required
            </div>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}