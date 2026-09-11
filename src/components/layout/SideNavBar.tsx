import React from 'react';
import { NavScreen } from '../../types';

interface SideNavBarProps {
  currentScreen: NavScreen;
  onNavigate: (screen: NavScreen) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const SideNavBar: React.FC<SideNavBarProps> = ({
  currentScreen,
  onNavigate,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavScreen,
      label: 'Dashboard',
      icon: 'dashboard',
    },
    {
      id: 'data-sources' as NavScreen,
      label: 'Data',
      icon: 'database',
      isActive: currentScreen === 'data-sources',
    },
    {
      id: 'data-explorer' as NavScreen,
      label: 'Data Explorer',
      icon: 'account_tree',
      // BUG FIX: dataset-overview/dataset-preview used to be lumped under "Data"
      // (Data Sources), which was wrong the moment Data Explorer's own dataset
      // drill-down ("Open Dataset") became a real path to the same screens —
      // clicking a dataset in Data Explorer left "Data" highlighted instead of
      // "Data Explorer". They're both dataset-detail views reached via Data
      // Explorer's own drill-down (Data Sources' "View Datasets" now routes to
      // Data Explorer itself, not to these screens directly), so Data Explorer
      // is the correct parent for both, matching the existing data-profiling
      // precedent below.
      isActive:
        currentScreen === 'data-explorer' ||
        currentScreen === 'data-profiling' ||
        currentScreen === 'dataset-overview' ||
        currentScreen === 'dataset-preview',
    },
    {
      id: 'validation-workspace' as NavScreen,
      label: 'Validation',
      icon: 'checklist',
      isActive:
        currentScreen === 'validation-workspace' ||
        currentScreen === 'validation-run-details',
    },
    {
      id: 'quality-rules' as NavScreen,
      label: 'Data Quality',
      icon: 'rule',
      isActive: currentScreen === 'quality-rules',
    },
    {
      id: 'review-corrections' as NavScreen,
      label: 'Review & Corrections',
      icon: 'fact_check',
      isActive: currentScreen === 'review-corrections',
    },
    {
      id: 'approval-center' as NavScreen,
      label: 'Approval Center',
      icon: 'verified',
      isActive: currentScreen === 'approval-center',
    },
    {
      id: 'staging-publish' as NavScreen,
      label: 'Staging & Publish',
      icon: 'cloud_upload',
      isActive: currentScreen === 'staging-publish',
    },
    {
      id: 'data-lineage' as NavScreen,
      label: 'Data Lineage',
      icon: 'hub',
      isActive: currentScreen === 'data-lineage',
    },
    {
      id: 'run-history' as NavScreen,
      label: 'Run History',
      icon: 'history',
      isActive: currentScreen === 'run-history',
    },
    {
      id: 'reports' as NavScreen,
      label: 'Reports',
      icon: 'monitoring',
      isActive: currentScreen === 'reports',
    },
    {
      id: 'insights' as NavScreen,
      label: 'AI Insights',
      icon: 'auto_awesome',
      isActive: currentScreen === 'insights',
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:sticky left-0 top-0 z-50 md:z-30 h-screen w-64 bg-deep-navy text-on-deep-navy-variant border-r border-deep-navy-outline shadow-2xl flex flex-col justify-between py-6 shrink-0 transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Brand & Title */}
        <div>
          <div className="px-6 flex items-center justify-between gap-3 mb-6">
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => {
                onNavigate('dashboard');
                onCloseMobile?.();
              }}
            >
              <div className="w-10 h-10 rounded-md bg-primary-fixed flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <span
                  className="material-symbols-outlined text-deep-navy text-2xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  dataset
                </span>
              </div>
              <div>
                <h1 className="font-editorial text-2xl font-bold tracking-tight text-on-deep-navy">
                  DataCraft
                </h1>
                <p className="text-[9px] text-on-deep-navy-variant uppercase tracking-widest font-semibold">
                  Enterprise Intelligence
                </p>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              className="md:hidden text-on-deep-navy-variant hover:text-on-deep-navy p-1"
              onClick={onCloseMobile}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Primary Navigation Links */}
          <nav className="px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-280px)]">
            {navItems.map((item) => {
              const active = item.isActive ?? currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-xs font-medium transition-all duration-200 text-left cursor-pointer ${
                    active
                      ? 'text-primary-fixed-dim font-semibold bg-primary-fixed-dim/12 border border-primary-fixed-dim/25 shadow-xs'
                      : 'text-on-deep-navy-variant hover:text-on-deep-navy hover:bg-white/5'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-lg ${
                      active ? 'fill text-primary-fixed-dim' : 'text-on-deep-navy-variant'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Navigation */}
        <div className="px-3 pt-4 border-t border-deep-navy-outline space-y-1">
          <button
            onClick={() => {
              onNavigate('user-management');
              onCloseMobile?.();
            }}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
              currentScreen === 'user-management'
                ? 'text-primary-fixed-dim font-semibold bg-primary-fixed-dim/12'
                : 'text-on-deep-navy-variant hover:text-on-deep-navy hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-lg text-on-deep-navy-variant">group</span>
            <span>User Management</span>
          </button>
          <button
            onClick={() => {
              onNavigate('settings');
              onCloseMobile?.();
            }}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
              currentScreen === 'settings'
                ? 'text-primary-fixed-dim font-semibold bg-primary-fixed-dim/12'
                : 'text-on-deep-navy-variant hover:text-on-deep-navy hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-lg text-on-deep-navy-variant">settings</span>
            <span>Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
};
