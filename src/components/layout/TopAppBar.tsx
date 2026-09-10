import React, { useState } from 'react';
import { User, NavScreen } from '../../types';

interface TopAppBarProps {
  currentUser: User;
  onLogout: () => void;
  onOpenProfile: () => void;
  // Whether this user's own role name(s) can be resolved at all — GET /users,
  // GET /users/{id}, and GET /roles are all gated on users.read with no
  // self-service exception, so a user without it has no endpoint that can tell
  // them their own role name. Distinguishes "confirmed no roles" from "can't
  // tell" rather than showing the same "No role assigned" label for both.
  canSeeOwnRole: boolean;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  isChangingPassword: boolean;
  changePasswordError: string | null;
  currentScreen: NavScreen;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToggleMobileNav?: () => void;
  onOpenAIAssistant: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  currentUser,
  onLogout,
  onOpenProfile,
  canSeeOwnRole,
  onChangePassword,
  isChangingPassword,
  changePasswordError,
  currentScreen,
  searchQuery,
  onSearchChange,
  onToggleMobileNav,
  onOpenAIAssistant,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [confirmMismatch, setConfirmMismatch] = useState(false);

  const closeChangePasswordModal = () => {
    setShowChangePassword(false);
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setConfirmMismatch(false);
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasswordInput !== confirmPasswordInput) {
      setConfirmMismatch(true);
      return;
    }
    setConfirmMismatch(false);
    const ok = await onChangePassword(currentPasswordInput, newPasswordInput);
    if (ok) closeChangePasswordModal();
  };

  const notifications = [
    {
      id: 'n1',
      title: 'Automated check completed',
      time: '12 mins ago',
      unread: true,
      icon: 'check_circle',
      color: 'text-primary',
    },
    {
      id: 'n2',
      title: 'Sarah J. requested approval for Customer Data',
      time: '2 hours ago',
      unread: true,
      icon: 'pending_actions',
      color: 'text-secondary',
    },
    {
      id: 'n3',
      title: 'Marketing CSVs FTP sync failed',
      time: '1 day ago',
      unread: false,
      icon: 'error',
      color: 'text-error',
    },
  ];

  const getSearchPlaceholder = () => {
    switch (currentScreen) {
      case 'data-sources':
        return 'Search data sources, hosts...';
      case 'dataset-overview':
      case 'dataset-preview':
        return 'Search Customer Data records, emails...';
      case 'data-explorer':
        return 'Search schemas, datasets, columns...';
      case 'data-profiling':
        return 'Search columns...';
      case 'validation-workspace':
      case 'validation-run-details':
        return 'Search validation runs...';
      case 'quality-rules':
        return 'Search rules, categories, SQL...';
      case 'review-corrections':
        return 'Search suggested corrections...';
      case 'approval-center':
        return 'Search requests, users, tables...';
      case 'staging-publish':
        return 'Search staging attempts, publish targets...';
      case 'data-lineage':
        return 'Search lineage nodes...';
      case 'run-history':
        return 'Search run history...';
      case 'reports':
        return 'Search reports...';
      case 'insights':
        return 'Search AI insights...';
      case 'user-management':
        return 'Search users...';
      case 'settings':
        return 'Search settings...';
      default:
        return 'Search datasets, queries, rules...';
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-surface border-b border-outline-variant shadow-xs flex justify-between items-center h-16 px-4 md:px-8">
      {/* Left side: Mobile Toggle + Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        {onToggleMobileNav && (
          <button
            onClick={onToggleMobileNav}
            className="md:hidden p-2 rounded text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
            title="Open Menu"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
        )}

        <div className="relative w-full focus-within:ring-2 focus-within:ring-primary/15 rounded-md transition-all group">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-xl">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={getSearchPlaceholder()}
            className="w-full bg-surface-container-low border border-outline-variant text-on-surface rounded-md pl-10 pr-4 py-2 text-xs md:text-sm focus:outline-none focus:border-primary focus:bg-white transition-all placeholder:text-outline"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Right side: Notifications, AI Assistant, User Profile */}
      <div className="flex items-center gap-2 md:gap-3 ml-4">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors rounded-full relative cursor-pointer"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-2xl">
              notifications
            </span>
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-secondary rounded-full border-2 border-surface" />
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest rounded-lg shadow-xl border border-outline-variant py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2 border-b border-surface-container flex items-center justify-between">
                <span className="font-editorial font-bold text-base text-on-surface">
                  Notifications
                </span>
                <span className="text-[10px] bg-surface-container-high text-primary px-2 py-0.5 rounded-full font-semibold">
                  2 New
                </span>
              </div>
              <div className="divide-y divide-surface-container max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 hover:bg-surface-container-low transition-colors flex items-start gap-3 cursor-pointer ${
                      n.unread ? 'bg-surface' : ''
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-lg mt-0.5 ${
                        n.id === 'n1' ? 'text-primary' : n.id === 'n2' ? 'text-secondary' : 'text-on-error-container'
                      }`}
                    >
                      {n.icon}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-on-surface leading-snug">
                        {n.title}
                      </p>
                      <p className="text-[11px] text-outline mt-1">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Assistant Button */}
        <button
          onClick={onOpenAIAssistant}
          className="flex items-center gap-1.5 px-3 py-1.5 text-primary hover:bg-surface-container-high bg-surface-container-low border border-outline-variant transition-all rounded-full cursor-pointer shadow-2xs"
          title="DataCraft AI Assistant"
        >
          <span
            className="material-symbols-outlined text-lg text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            smart_toy
          </span>
          <span className="hidden sm:inline text-xs font-semibold">AI Copilot</span>
        </button>

        <div className="h-6 w-px bg-outline-variant mx-1 hidden sm:block" />

        {/* User Account Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1 rounded-full hover:bg-surface-container transition-colors border border-transparent hover:border-outline-variant cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center overflow-hidden border border-outline-variant">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="font-semibold text-xs text-white">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <span className="hidden md:inline font-semibold text-xs text-on-surface">
              {currentUser.name}
            </span>
            <span className="material-symbols-outlined text-sm text-outline hidden md:inline">
              arrow_drop_down
            </span>
          </button>

          {/* User dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-outline-variant py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-3 border-b border-surface-container">
                <p className="font-editorial font-bold text-base text-on-surface">
                  {currentUser.name}
                </p>
                <p className="text-xs text-outline truncate">
                  {currentUser.email}
                </p>
                <span className="inline-block mt-1 text-[10px] font-medium bg-surface-container-low text-primary px-2 py-0.5 rounded-md border border-outline-variant">
                  {currentUser.roleNames.length > 0
                    ? currentUser.roleNames.join(', ')
                    : canSeeOwnRole
                    ? 'No role assigned'
                    : 'Role info unavailable'}
                </span>
              </div>

              <div className="px-2 py-2">
                <button
                  onClick={() => {
                    onOpenProfile();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">
                    person
                  </span>
                  Profile
                </button>
                <button
                  onClick={() => {
                    setShowChangePassword(true);
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">
                    lock_reset
                  </span>
                  Change Password
                </button>
              </div>

              <div className="border-t border-surface-container pt-2 px-2">
                <button
                  onClick={() => {
                    onLogout();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-secondary hover:bg-secondary-fixed rounded-md transition-colors text-left cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">
                    logout
                  </span>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-lg border border-outline-variant shadow-2xl max-w-sm w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-surface-container pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-surface-container-high text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">lock_reset</span>
                </div>
                <div>
                  <h3 className="font-editorial text-xl font-bold text-on-surface">Change Password</h3>
                  <p className="text-xs text-outline">You'll need to sign in again after this.</p>
                </div>
              </div>
              <button
                onClick={closeChangePasswordModal}
                className="p-1 text-outline hover:text-on-surface rounded transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              {changePasswordError && (
                <div className="p-3.5 rounded-md flex items-start gap-2.5 text-xs bg-error-container text-on-error-container">
                  <span className="material-symbols-outlined text-lg mt-0.5">error</span>
                  <span className="font-medium leading-relaxed">{changePasswordError}</span>
                </div>
              )}
              {confirmMismatch && (
                <div className="p-3.5 rounded-md flex items-start gap-2.5 text-xs bg-error-container text-on-error-container">
                  <span className="material-symbols-outlined text-lg mt-0.5">error</span>
                  <span className="font-medium leading-relaxed">New password and confirmation don't match.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-xs text-on-surface focus:outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-xs text-on-surface focus:outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-xs text-on-surface focus:outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div className="pt-2 border-t border-surface-container flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeChangePasswordModal}
                  className="px-4 py-2.5 rounded-md border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-colors cursor-pointer shadow-ambient disabled:opacity-50"
                >
                  {isChangingPassword ? 'Changing…' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
