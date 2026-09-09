import React, { useState } from 'react';
import { AppSettings, NavScreen, User } from '../../types';

interface SettingsViewProps {
  onNavigate: (screen: NavScreen) => void;
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  currentUser: User;
  canReadRoles: boolean;
  rolesLoading: boolean;
  rolesError: string | null;
  currentUserRoleNames: string[];
  canUpdateProfile: boolean;
  isSavingProfile: boolean;
  profileError: string | null;
  onUpdateProfile: (updates: { name: string }) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  currentUser,
  canReadRoles,
  rolesLoading,
  rolesError,
  currentUserRoleNames,
  canUpdateProfile,
  isSavingProfile,
  profileError,
  onUpdateProfile,
}) => {
  const [sampleSize, setSampleSize] = useState(String(settings.validationDefaultSampleSize));
  const [maxSyncRecords, setMaxSyncRecords] = useState(String(settings.stagingMaxSyncRecords));
  const [profileName, setProfileName] = useState(currentUser.name);

  const handleSaveDefaults = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedSample = parseInt(sampleSize, 10);
    const parsedMaxSync = parseInt(maxSyncRecords, 10);
    onUpdateSettings({
      validationDefaultSampleSize: Number.isFinite(parsedSample) ? parsedSample : settings.validationDefaultSampleSize,
      stagingMaxSyncRecords: Number.isFinite(parsedMaxSync) ? parsedMaxSync : settings.stagingMaxSyncRecords,
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;
    onUpdateProfile({ name: profileName.trim() });
  };

  const roleDisplay = !canReadRoles
    ? null
    : rolesLoading
    ? '…'
    : rolesError
    ? null
    : currentUserRoleNames.length > 0
    ? currentUserRoleNames.join(', ')
    : 'No role assigned';

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-outline-variant pb-6">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1 block">
          Workspace Configuration
        </span>
        <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
          Settings
        </h1>
        <p className="text-xs text-on-surface-variant mt-1 font-sans">
          Manage AI features, pipeline defaults, and your own account profile.
        </p>
      </div>

      {/* AI Section — read-only/informational per product decision: AI_ENABLED is a
          backend-only env var (app/core/config.py) with no HTTP exposure at all (no
          settings/config router exists, and /auth/me doesn't carry it either), so
          there is no live value to show and no endpoint to write to. */}
      <div className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient space-y-4">
        <div>
          <h3 className="font-editorial text-xl font-bold text-on-surface">AI Features</h3>
          <p className="text-xs text-on-surface-variant mt-1">
            Controls whether AI-assisted suggestions, explanations, and summaries are generated
            across the workspace.
          </p>
        </div>

        <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-md border border-outline-variant">
          <div>
            <p className="text-sm font-semibold text-on-surface">AI Features</p>
            <p className="text-[11px] text-outline mt-0.5">
              Configured at the infrastructure level (AI_ENABLED) — off by default. There is no
              live value or control exposed here; if AI calls fail, AI is disabled for this
              deployment.
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant">
            Infrastructure-managed
          </span>
        </div>

        <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-md border border-outline-variant">
          <div>
            <p className="text-sm font-semibold text-on-surface">Default AI Provider</p>
            <p className="text-[11px] text-outline mt-0.5">Read-only for now</p>
          </div>
          <span className="font-mono text-xs font-semibold text-primary bg-primary-fixed px-3 py-1.5 rounded-md">
            {settings.defaultAiProvider}
          </span>
        </div>
      </div>

      {/* Validation / Staging Defaults — no backend table/endpoint exists for these
          at all, so this stays local-only (not fabricated as persisted; just not
          wired, since there's nothing real to wire it to). */}
      <form
        onSubmit={handleSaveDefaults}
        className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient space-y-4"
      >
        <div>
          <h3 className="font-editorial text-xl font-bold text-on-surface">
            Validation &amp; Staging Defaults
          </h3>
          <p className="text-xs text-on-surface-variant mt-1">
            Applied to new validation runs and staging attempts unless overridden. Not backed by
            a real endpoint yet — kept in this session only.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
              Validation Default Sample Size
            </label>
            <input
              type="number"
              min={1}
              value={sampleSize}
              onChange={(e) => setSampleSize(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-sm font-mono text-on-surface focus:outline-none focus:border-primary focus:bg-white transition-colors"
            />
            <p className="text-[11px] text-outline mt-1">Rows sampled when a full scan isn't used</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
              Staging Max Sync Records
            </label>
            <input
              type="number"
              min={1}
              value={maxSyncRecords}
              onChange={(e) => setMaxSyncRecords(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-sm font-mono text-on-surface focus:outline-none focus:border-primary focus:bg-white transition-colors"
            />
            <p className="text-[11px] text-outline mt-1">Safety cap per staging attempt</p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-colors cursor-pointer shadow-ambient"
          >
            Save Defaults
          </button>
        </div>
      </form>

      {/* Account Section */}
      <form
        onSubmit={handleSaveProfile}
        className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient space-y-4"
      >
        <div className="flex items-center gap-3">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.name}
            className="w-12 h-12 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div>
            <h3 className="font-editorial text-xl font-bold text-on-surface">Your Account</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {roleDisplay ?? (
                <span className="italic text-outline">
                  {rolesError ? 'Could not load role' : 'Requires the users.read permission to show your role'}
                </span>
              )}
            </p>
          </div>
        </div>

        {profileError && (
          <div className="p-3.5 rounded-md flex items-start gap-2.5 text-xs bg-error-container text-on-error-container">
            <span className="material-symbols-outlined text-lg mt-0.5">error</span>
            <span className="font-medium leading-relaxed">{profileError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              required
              disabled={!canUpdateProfile}
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              disabled
              title="Email cannot be changed here — there is no endpoint for it"
              value={currentUser.email}
              className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-sm text-on-surface opacity-60 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          {!canUpdateProfile && (
            <p className="text-[11px] text-outline flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">lock</span>
              Contact an administrator to update your profile (requires the users.manage permission)
            </p>
          )}
          <button
            type="submit"
            disabled={!canUpdateProfile || isSavingProfile}
            className="ml-auto px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-colors cursor-pointer shadow-ambient disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingProfile ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};
