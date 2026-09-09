import React, { useState } from 'react';
import { User, NavScreen } from '../../types';
import { TEAM_MEMBERS } from '../../data/mockData';

interface TopAppBarProps {
  currentUser: User;
  onSwitchUser: (user: User) => void;
  onLogout: () => void;
  currentScreen: NavScreen;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToggleMobileNav?: () => void;
  onOpenAIAssistant: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  currentUser,
  onSwitchUser,
  onLogout,
  currentScreen,
  searchQuery,
  onSearchChange,
  onToggleMobileNav,
  onOpenAIAssistant,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

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
                  {currentUser.role}
                </span>
              </div>

              <div className="px-2 py-2">
                <p className="px-2 py-1 text-[10px] font-semibold text-outline uppercase tracking-wider">
                  Switch User (Demo)
                </p>
                {TEAM_MEMBERS.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => {
                      onSwitchUser(member);
                      setShowUserMenu(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left text-xs transition-colors cursor-pointer ${
                      member.id === currentUser.id
                        ? 'bg-surface-container text-on-surface font-bold'
                        : 'text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="w-6 h-6 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 truncate">
                      <div>{member.name}</div>
                      <div className="text-[10px] text-outline">{member.role}</div>
                    </div>
                  </button>
                ))}
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
                  Sign Out to Login Screen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
