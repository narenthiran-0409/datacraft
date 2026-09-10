import React, { useState } from 'react';
import { DataSource, NavScreen } from '../../types';
import { DataSourceUpdateRequest } from '../../api/client';

interface DataSourcesViewProps {
  dataSources: DataSource[];
  onNavigate: (screen: NavScreen) => void;
  onOpenAddSource: () => void;
  onSyncSource: (id: string) => void;
  canManage: boolean;
  actionPendingId: string | null;
  actionError: string | null;
  onUpdateSource: (id: string, input: DataSourceUpdateRequest) => Promise<boolean>;
  onDeleteSource: (id: string) => Promise<boolean>;
}

export const DataSourcesView: React.FC<DataSourcesViewProps> = ({
  dataSources,
  onNavigate,
  onOpenAddSource,
  onSyncSource,
  canManage,
  actionPendingId,
  actionError,
  onUpdateSource,
  onDeleteSource,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'database' | 'api' | 'file'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);
  const [editForm, setEditForm] = useState({ description: '', ownerTeam: '', businessDomain: '' });
  const [deletingSource, setDeletingSource] = useState<DataSource | null>(null);

  const inactiveCount = dataSources.filter((s) => !s.isActive).length;

  const filteredSources = dataSources.filter((s) => {
    const matchesFilter = filterType === 'all' || s.type === filterType;
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.typeLabel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActive = showInactive || s.isActive;
    return matchesFilter && matchesSearch && matchesActive;
  });

  const handleSyncClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSyncingId(id);
    onSyncSource(id);
    setTimeout(() => {
      setSyncingId(null);
    }, 1200);
  };

  const openEdit = (source: DataSource, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSource(source);
    setEditForm({
      description: source.description === 'No description provided.' ? '' : source.description,
      ownerTeam: source.ownerTeam ?? '',
      businessDomain: source.businessDomain ?? '',
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSource) return;
    const ok = await onUpdateSource(editingSource.id, {
      description: editForm.description || null,
      owner_team: editForm.ownerTeam || null,
      business_domain: editForm.businessDomain || null,
    });
    if (ok) setEditingSource(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSource) return;
    const ok = await onDeleteSource(deletingSource.id);
    if (ok) setDeletingSource(null);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-6">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1 block">
            Where does my data come from?
          </span>
          <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
            Data Sources
          </h1>
          <p className="text-sm text-on-surface-variant mt-1 max-w-2xl font-sans">
            Connect, monitor, and configure ingest pipelines across all enterprise
            databases, cloud APIs, and storage buckets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAddSource}
            className="flex items-center gap-2 bg-primary hover:bg-primary-container text-white px-5 py-2.5 rounded-md font-medium text-xs transition-all shadow-ambient active:scale-[0.98] cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span>Add Data Source</span>
          </button>
        </div>
      </div>

      {!canManage && (
        <div className="bg-surface-container-low rounded-md border border-outline-variant p-3.5 flex items-center gap-2 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-base text-outline">lock</span>
          You have read-only access to data sources — editing or removing them requires the
          data_sources.manage permission.
        </div>
      )}

      {actionError && (
        <div className="bg-error-container border border-outline-variant rounded-lg p-3.5 text-xs text-on-error-container">
          {actionError}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Type Filter Buttons */}
        <div className="inline-flex bg-surface-container-low p-1 rounded-md border border-outline-variant shadow-2xs self-start">
          {(
            [
              { key: 'all', label: 'All Sources' },
              { key: 'database', label: 'Databases' },
              { key: 'api', label: 'APIs' },
              { key: 'file', label: 'File Uploads' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setFilterType(t.key)}
              className={`px-3.5 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                filterType === t.key
                  ? 'bg-white text-on-surface shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {inactiveCount > 0 && (
            <label className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="cursor-pointer"
              />
              Show inactive ({inactiveCount})
            </label>
          )}

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-base">
            filter_list
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Find a source..."
            className="w-full bg-surface-container-low border border-outline-variant rounded-md pl-9 pr-3 py-1.5 text-xs text-on-surface placeholder-outline focus:outline-none focus:bg-white focus:border-primary transition-colors"
          />
        </div>
        </div>
      </div>

      {/* Grid of Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSources.map((source) => {
          const isSyncing = syncingId === source.id;
          const isFailed = source.status === 'failed';
          const isInactive = source.status === 'inactive';
          const isActionPending = actionPendingId === source.id;

          return (
            <div
              key={source.id}
              onClick={() => onNavigate('dataset-overview')}
              className={`bg-white rounded-lg p-6 border border-outline-variant shadow-ambient shadow-ambient-hover cursor-pointer flex flex-col justify-between group transition-all ${
                isInactive ? 'opacity-60' : ''
              }`}
            >
              <div>
                {/* Card Header: Icon & Status */}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-11 h-11 rounded-md flex items-center justify-center transition-transform group-hover:scale-105 ${
                      isFailed
                        ? 'bg-secondary-fixed text-secondary'
                        : 'bg-surface-container-high text-primary'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {source.icon}
                    </span>
                  </div>

                  {/* Status badge */}
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      isInactive
                        ? 'bg-surface-container text-outline border-outline-variant'
                        : isFailed
                        ? 'bg-error-container text-on-error-container border-on-error-container/20'
                        : 'bg-primary-fixed text-on-primary-fixed border-transparent'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isInactive ? 'bg-outline' : isFailed ? 'bg-on-error-container' : 'bg-on-primary-fixed animate-pulse'
                      }`}
                    />
                    <span>{isInactive ? 'Inactive' : isFailed ? 'Sync Failed' : 'Connected'}</span>
                  </div>
                </div>

                {/* Source Name & Description */}
                <h3 className="font-editorial text-xl font-bold text-on-surface group-hover:text-primary transition-colors">
                  {source.name}
                </h3>
                <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">
                  {source.description}
                </p>

                {/* Meta details */}
                <div className="mt-4 pt-4 border-t border-surface-container space-y-1.5 text-xs text-outline">
                  <div className="flex items-center justify-between">
                    <span>Datasets found:</span>
                    <span className="font-semibold text-on-surface">
                      {source.datasetsCount} datasets
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Host / Target:</span>
                    <span className="font-mono text-[11px] text-on-surface-variant truncate max-w-[150px]">
                      {source.host || source.typeLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last checked:</span>
                    <span className={isFailed ? 'text-on-error-container font-medium' : 'text-on-surface-variant'}>
                      {source.lastSync}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-6 pt-4 border-t border-surface-container flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={(e) => handleSyncClick(source.id, e)}
                  disabled={isSyncing || isInactive}
                  title={isInactive ? 'Inactive data sources cannot be synced' : undefined}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isFailed
                      ? 'border-on-error-container/30 text-on-error-container hover:bg-error-container'
                      : 'border-outline-variant text-primary hover:bg-surface-container-low'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-base ${
                      isSyncing ? 'animate-spin' : ''
                    }`}
                  >
                    sync
                  </span>
                  <span>{isSyncing ? 'Syncing...' : isFailed ? 'Retry Sync' : 'Sync Now'}</span>
                </button>

                <div className="flex items-center gap-3">
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => openEdit(source, e)}
                        disabled={isActionPending}
                        title="Edit data source"
                        className="p-1.5 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      {source.isActive && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingSource(source);
                          }}
                          disabled={isActionPending}
                          title="Delete data source"
                          className="p-1.5 rounded text-on-surface-variant hover:text-error hover:bg-error-container transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate('dataset-overview');
                    }}
                    className="text-xs font-semibold text-on-surface-variant hover:text-on-surface flex items-center gap-1 group-hover:translate-x-0.5 transition-transform cursor-pointer"
                  >
                    <span>View Datasets</span>
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Configure New Source Dashed Card */}
        <div
          onClick={onOpenAddSource}
          className="border-2 border-dashed border-outline-variant hover:border-primary bg-surface/60 hover:bg-white rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[260px] group shadow-2xs hover:shadow-ambient"
        >
          <div className="w-12 h-12 rounded-full bg-surface-container group-hover:bg-surface-container-high text-on-surface-variant group-hover:text-primary flex items-center justify-center mb-3 transition-colors">
            <span className="material-symbols-outlined text-2xl">add</span>
          </div>
          <h4 className="font-editorial font-bold text-lg text-on-surface group-hover:text-primary transition-colors">
            Configure New Source
          </h4>
          <p className="text-xs text-outline max-w-xs mt-1">
            Add PostgreSQL, Snowflake, BigQuery, S3 Parquet/CSV, or Custom REST Webhooks.
          </p>
        </div>
      </div>

      {/* Edit Modal */}
      {editingSource && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-lg border border-outline-variant shadow-2xl max-w-lg w-full p-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-surface-container pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-surface-container-high text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">edit</span>
                </div>
                <div>
                  <h3 className="font-editorial text-xl font-bold text-on-surface">Edit Data Source</h3>
                  <p className="text-xs text-outline">{editingSource.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingSource(null)}
                className="p-1 text-outline hover:text-on-surface rounded transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {actionError && (
                <div className="p-3.5 rounded-md flex items-start gap-2.5 text-xs bg-error-container text-on-error-container">
                  <span className="material-symbols-outlined text-lg mt-0.5">error</span>
                  <span className="font-medium leading-relaxed">{actionError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Name
                </label>
                <input
                  type="text"
                  disabled
                  value={editingSource.name}
                  title="Name cannot be changed after a data source is created"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-xs text-on-surface disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What is this data source used for?"
                  rows={3}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-xs text-on-surface placeholder-outline focus:outline-none focus:bg-white focus:border-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Owner Team
                </label>
                <input
                  type="text"
                  value={editForm.ownerTeam}
                  onChange={(e) => setEditForm((f) => ({ ...f, ownerTeam: e.target.value }))}
                  placeholder="e.g. Data Platform"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-xs text-on-surface placeholder-outline focus:outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Business Domain
                </label>
                <input
                  type="text"
                  value={editForm.businessDomain}
                  onChange={(e) => setEditForm((f) => ({ ...f, businessDomain: e.target.value }))}
                  placeholder="e.g. Customer Operations"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-xs text-on-surface placeholder-outline focus:outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div className="pt-4 border-t border-surface-container flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingSource(null)}
                  className="px-4 py-2.5 rounded-md border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionPendingId === editingSource.id}
                  className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-colors cursor-pointer shadow-ambient disabled:opacity-50"
                >
                  {actionPendingId === editingSource.id ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete (Deactivate) Confirmation Modal */}
      {deletingSource && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-lg border border-outline-variant shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-error-container text-on-error-container flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">delete</span>
              </div>
              <h3 className="font-editorial text-xl font-bold text-on-surface">Delete Data Source</h3>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              This will deactivate <strong className="text-on-surface">"{deletingSource.name}"</strong> and
              remove it from the active data sources list. Its record isn't deleted — you can still find it
              under "Show inactive" — but there is currently no way to reactivate it from within DataCraft;
              doing so would require direct administrator/database intervention.
            </p>

            {actionError && (
              <div className="p-3.5 rounded-md flex items-start gap-2.5 text-xs bg-error-container text-on-error-container">
                <span className="material-symbols-outlined text-lg mt-0.5">error</span>
                <span className="font-medium leading-relaxed">{actionError}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingSource(null)}
                className="px-4 py-2.5 rounded-md border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={actionPendingId === deletingSource.id}
                className="px-5 py-2.5 rounded-md bg-error hover:opacity-90 text-white text-xs font-semibold transition-colors cursor-pointer shadow-ambient disabled:opacity-50"
              >
                {actionPendingId === deletingSource.id ? 'Removing…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
