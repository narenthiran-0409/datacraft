import React, { useState } from 'react';
import { AppSettings, NavScreen, User } from '../../types';

interface SettingsViewProps {
  onNavigate: (screen: NavScreen) => void;
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  currentUser: User;
  onUpdateProfile: (updates: { name: string; email: string }) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  currentUser,
  onUpdateProfile,
}) => {
  const [sampleSize, setSampleSize] = useState(String(settings.validationDefaultSampleSize));
  const [maxSyncRecords, setMaxSyncRecords] = useState(String(settings.stagingMaxSyncRecords));
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profileEmail, setProfileEmail] = useState(currentUser.email);

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
    if (!profileName.trim() || !profileEmail.trim()) return;
    onUpdateProfile({ name: profileName.trim(), email: profileEmail.trim() });
  };

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

      {/* AI Section */}
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
            <p className="text-sm font-semibold text-on-surface">Enable AI Features</p>
            <p className="text-[11px] text-outline mt-0.5">
              Off by default — matches the platform's safe default until explicitly turned on.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onUpdateSettings({ aiEnabled: !settings.aiEnabled })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.aiEnabled ? 'bg-primary' : 'bg-outline-variant'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                settings.aiEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
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

      {/* Validation / Staging Defaults */}
      <form
        onSubmit={handleSaveDefaults}
        className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient space-y-4"
      >
        <div>
          <h3 className="font-editorial text-xl font-bold text-on-surface">
            Validation &amp; Staging Defaults
          </h3>
          <p className="text-xs text-on-surface-variant mt-1">
            Applied to new validation runs and staging attempts unless overridden.
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
            <p className="text-xs text-on-surface-variant mt-0.5">{currentUser.role}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              required
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:bg-white transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              required
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-colors cursor-pointer shadow-ambient"
          >
            Save Profile
          </button>
        </div>
      </form>
    </div>
  );
};
