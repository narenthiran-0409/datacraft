import React from 'react';
import { NavScreen } from '../../types';
import { PublishRunResponse, StagingRecordResponse, StagingRunResponse } from '../../api/client';

interface StagingPublishViewProps {
  onNavigate: (screen: NavScreen) => void;
  stagingRun: StagingRunResponse | null;
  stagingRecords: StagingRecordResponse[];
  driftOnly: boolean;
  onToggleDriftOnly: (value: boolean) => void;
  publishRun: PublishRunResponse | null;
  canCreateStaging: boolean;
  canPublish: boolean;
  isActionPending: boolean;
  actionError: string | null;
  onCreateStagingRun: () => void;
  onPublish: () => void;
  onAcknowledgeDrift: () => void;
}

const STAGING_STATUS_STYLES: Record<string, string> = {
  NOT_STARTED: 'bg-surface-container text-on-surface-variant',
  BUILDING: 'bg-secondary-fixed text-on-secondary-fixed',
  READY: 'bg-primary-fixed text-on-primary-fixed',
  FAILED: 'bg-error-container text-on-error-container',
};

const PUBLISH_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-surface-container text-on-surface-variant',
  PUBLISHING: 'bg-secondary-fixed text-on-secondary-fixed',
  PUBLISHED: 'bg-primary-fixed text-on-primary-fixed',
  FAILED: 'bg-error-container text-on-error-container',
};

export const StagingPublishView: React.FC<StagingPublishViewProps> = ({
  onNavigate,
  stagingRun,
  stagingRecords,
  driftOnly,
  onToggleDriftOnly,
  publishRun,
  canCreateStaging,
  canPublish,
  isActionPending,
  actionError,
  onCreateStagingRun,
  onPublish,
  onAcknowledgeDrift,
}) => {
  // Drift is field-level (per-record corrected-field original vs current value), not a
  // whole-row flag — surface which named fields actually drifted, not just "drift exists".
  const driftedFieldNames = Array.from(
    new Set(
      stagingRecords
        .filter((r) => r.source_drift_status !== 'NONE' && r.source_drift_fields)
        .flatMap((r) => (r.source_drift_fields as string[]) ?? [])
    )
  );

  const publishBlockedOnDrift =
    !!publishRun &&
    publishRun.status === 'PENDING' &&
    !!stagingRun?.has_source_drift &&
    !publishRun.drift_acknowledged;

  const isPublished = publishRun?.status === 'PUBLISHED';
  const isPublishing = publishRun?.status === 'PUBLISHING' || (publishRun?.status === 'PENDING' && !publishBlockedOnDrift);

  const canTriggerPublish =
    canPublish && !!stagingRun && stagingRun.status === 'READY' && (!publishRun || publishRun.status === 'FAILED');

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-outline-variant pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-outline mb-2 font-sans">
          <button
            onClick={() => onNavigate('approval-center')}
            className="hover:text-primary transition-colors cursor-pointer"
          >
            Approval Center
          </button>
          <span>/</span>
          <span className="text-on-surface font-bold">Staging &amp; Publish</span>
        </div>
        <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
          Staging &amp; Publish
        </h1>
      </div>

      {actionError && (
        <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          <span className="material-symbols-outlined text-base shrink-0">error</span>
          <span>{actionError}</span>
        </div>
      )}

      {!stagingRun ? (
        <div className="bg-white rounded-lg border border-outline-variant p-8 text-center space-y-4">
          <p className="text-sm text-on-surface-variant">No staging run exists yet for this review.</p>
          {canCreateStaging ? (
            <button
              type="button"
              onClick={onCreateStagingRun}
              disabled={isActionPending}
              className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-all shadow-ambient cursor-pointer disabled:opacity-50"
            >
              {isActionPending ? 'Creating…' : 'Create Staging Run'}
            </button>
          ) : (
            <p className="text-xs text-outline">Creating a staging run requires the staging.create permission.</p>
          )}
        </div>
      ) : (
        <>
          {/* Staging Run Status */}
          <div className="bg-white rounded-lg border border-outline-variant shadow-ambient p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-semibold text-outline">
                  Attempt #{stagingRun.attempt_number}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    STAGING_STATUS_STYLES[stagingRun.status] ?? 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {stagingRun.status.replace('_', ' ')}
                </span>
                {stagingRun.has_source_drift && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed">
                    Drift
                  </span>
                )}
              </div>
              <span className="text-xs text-on-surface-variant">
                {stagingRun.record_count.toLocaleString()} records &bull; {stagingRun.field_count} fields
              </span>
            </div>
            {stagingRun.status === 'FAILED' && stagingRun.error_message && (
              <p className="text-xs text-on-error-container mt-1">{stagingRun.error_message}</p>
            )}
          </div>

          {/* Source Drift Detail — field-level, not a whole-row flag */}
          {stagingRun.has_source_drift && (
            <div className="rounded-lg border border-on-error-container/20 bg-error-container p-6 text-on-error-container">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-2xl mt-0.5">warning</span>
                <div className="flex-1">
                  <p className="text-sm font-bold">Source drift detected</p>
                  <p className="text-xs mt-1 leading-relaxed max-w-2xl">
                    The source values for specific corrected fields have changed since this review was
                    approved. This does not mean the whole row drifted — only the fields listed below.
                  </p>
                  {driftedFieldNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {driftedFieldNames.map((f) => (
                        <span
                          key={f}
                          className="font-mono text-[11px] bg-white/60 border border-on-error-container/20 rounded px-2 py-0.5"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] mt-2 italic">
                      Drifted field names unavailable — load staging records below to see detail.
                    </p>
                  )}

                  <label className="flex items-center gap-2 mt-4 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-primary w-4 h-4"
                      checked={driftOnly}
                      onChange={(e) => onToggleDriftOnly(e.target.checked)}
                    />
                    Show only drifted records ({stagingRecords.length} loaded)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Publish */}
          <div className="bg-white rounded-lg border border-outline-variant shadow-ambient p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="font-editorial font-bold text-lg text-on-surface">Publish</h3>
              <p className="text-xs text-on-surface-variant mt-1 max-w-lg">
                {isPublished
                  ? `Published ${publishRun?.published_record_count?.toLocaleString()} records to ${publishRun?.target_reference}.`
                  : publishBlockedOnDrift
                  ? 'Publish was created but is blocked — acknowledge the source drift above to let it continue.'
                  : isPublishing
                  ? 'Publishing the current staged snapshot to its file export target...'
                  : publishRun?.status === 'FAILED'
                  ? publishRun.error_message ?? 'The previous publish attempt failed.'
                  : stagingRun.status !== 'READY'
                  ? 'Staging must be READY before this can be published.'
                  : `Ready to publish ${stagingRun.record_count.toLocaleString()} records as a FILE_EXPORT.`}
              </p>
            </div>

            {publishBlockedOnDrift ? (
              canPublish && (
                <button
                  type="button"
                  onClick={onAcknowledgeDrift}
                  disabled={isActionPending}
                  className="px-5 py-2.5 rounded-md bg-on-error-container text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isActionPending ? 'Acknowledging…' : 'Acknowledge Drift & Continue'}
                </button>
              )
            ) : (
              canPublish && (
                <button
                  type="button"
                  onClick={onPublish}
                  disabled={!canTriggerPublish || isActionPending}
                  className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold transition-all shadow-ambient active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-2"
                >
                  {isPublishing && <span className="material-symbols-outlined text-base animate-spin">sync</span>}
                  {isPublished ? 'Published' : isPublishing ? 'Publishing...' : 'Publish'}
                </button>
              )
            )}
          </div>

          {/* Staging Records */}
          {stagingRecords.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-editorial font-bold text-lg text-on-surface">
                Staging Records {driftOnly ? '(drifted only)' : ''}
              </h3>
              <div className="bg-white rounded-lg border border-outline-variant shadow-ambient divide-y divide-surface-container">
                {stagingRecords.slice(0, 25).map((r) => (
                  <div key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-on-surface-variant">{r.record_ref}</span>
                    <span
                      className={
                        r.source_drift_status !== 'NONE' ? 'text-on-error-container font-semibold' : 'text-outline'
                      }
                    >
                      {r.source_drift_status !== 'NONE' && r.source_drift_fields
                        ? `Drifted: ${(r.source_drift_fields as string[]).join(', ')}`
                        : 'No drift'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
