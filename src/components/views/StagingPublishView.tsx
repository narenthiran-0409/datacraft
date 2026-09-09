import React, { useState } from 'react';
import { NavScreen, PublishRun, StagingRun } from '../../types';

interface StagingPublishViewProps {
  onNavigate: (screen: NavScreen) => void;
  stagingRuns: StagingRun[];
  publishRuns: PublishRun[];
  onPublish: () => void;
}

const DATASET_NAME = 'Customer Data';

const PIPELINE_STEPS = ['Approved', 'Staging', 'Ready', 'Published'];

const STAGING_STATUS_STYLES: Record<StagingRun['status'], string> = {
  NOT_STARTED: 'bg-surface-container text-on-surface-variant',
  BUILDING: 'bg-secondary-fixed text-on-secondary-fixed',
  READY: 'bg-primary-fixed text-on-primary-fixed',
  FAILED: 'bg-error-container text-on-error-container',
};

const PUBLISH_STATUS_STYLES: Record<PublishRun['status'], string> = {
  PENDING: 'bg-surface-container text-on-surface-variant',
  PUBLISHING: 'bg-secondary-fixed text-on-secondary-fixed',
  PUBLISHED: 'bg-primary-fixed text-on-primary-fixed',
  FAILED: 'bg-error-container text-on-error-container',
};

export const StagingPublishView: React.FC<StagingPublishViewProps> = ({
  onNavigate,
  stagingRuns,
  publishRuns,
  onPublish,
}) => {
  const [driftAcknowledged, setDriftAcknowledged] = useState(false);

  const sortedAttempts = [...stagingRuns].sort((a, b) => a.attemptNumber - b.attemptNumber);
  const currentStagingRun = stagingRuns.find((s) => s.isCurrent);
  const publishForCurrent = currentStagingRun
    ? publishRuns.find((p) => p.stagingRunAttempt === currentStagingRun.attemptNumber)
    : undefined;
  const isPublished = publishForCurrent?.status === 'PUBLISHED';
  const isPublishing = publishForCurrent?.status === 'PUBLISHING';

  const stepIndex = isPublished
    ? 3
    : currentStagingRun?.status === 'READY'
    ? 2
    : currentStagingRun?.status === 'BUILDING' || currentStagingRun?.status === 'NOT_STARTED'
    ? 1
    : 1;

  const driftGateOpen = !!currentStagingRun?.hasSourceDrift && !driftAcknowledged;
  const canPublish =
    !!currentStagingRun &&
    currentStagingRun.status === 'READY' &&
    !driftGateOpen &&
    !isPublished &&
    !isPublishing;

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
        <p className="text-xs text-on-surface-variant mt-1 font-sans">{DATASET_NAME}</p>
      </div>

      {/* Pipeline Stepper */}
      <div className="bg-white rounded-lg border border-outline-variant shadow-ambient p-6">
        <div className="flex items-center">
          {PIPELINE_STEPS.map((label, idx) => {
            const isComplete = idx < stepIndex || (idx === stepIndex && isPublished);
            const isCurrent = idx === stepIndex && !isPublished;
            return (
              <React.Fragment key={label}>
                <div className="flex items-center gap-2.5 shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isComplete
                        ? 'bg-primary text-on-primary'
                        : isCurrent
                        ? 'bg-secondary text-white'
                        : 'bg-surface-container-high text-outline'
                    }`}
                  >
                    {isComplete ? (
                      <span className="material-symbols-outlined text-base">check</span>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      isComplete || isCurrent ? 'text-on-surface' : 'text-outline'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {idx < PIPELINE_STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-3 ${idx < stepIndex ? 'bg-primary' : 'bg-outline-variant'}`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Source Drift Gate */}
      {currentStagingRun?.hasSourceDrift && (
        <div
          className={`rounded-lg border p-6 flex items-start gap-3 ${
            driftAcknowledged
              ? 'bg-primary-fixed border-transparent text-on-primary-fixed'
              : 'bg-error-container border-on-error-container/20 text-on-error-container'
          }`}
        >
          <span className="material-symbols-outlined text-2xl mt-0.5">
            {driftAcknowledged ? 'check_circle' : 'warning'}
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold">
              {driftAcknowledged ? 'Source drift acknowledged' : 'Source drift detected'}
            </p>
            <p className="text-xs mt-1 leading-relaxed max-w-2xl">
              The source table's shape has changed since this review run was approved. Publishing
              now will export the current staged snapshot even though the underlying source has
              moved on. This must be explicitly acknowledged before you can publish.
            </p>
            {!driftAcknowledged && (
              <button
                type="button"
                onClick={() => setDriftAcknowledged(true)}
                className="mt-3 px-4 py-2 rounded-md bg-on-error-container text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
              >
                Acknowledge Drift &amp; Continue
              </button>
            )}
          </div>
        </div>
      )}

      {/* Publish Action */}
      <div className="bg-white rounded-lg border border-outline-variant shadow-ambient p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="font-editorial font-bold text-lg text-on-surface">Publish</h3>
          <p className="text-xs text-on-surface-variant mt-1 max-w-lg">
            {isPublished
              ? `Published ${publishForCurrent?.publishedRecordCount?.toLocaleString()} records to ${publishForCurrent?.targetReference}.`
              : isPublishing
              ? 'Publishing the current staged snapshot to its file export target...'
              : !currentStagingRun || currentStagingRun.status !== 'READY'
              ? 'Staging must be READY before this dataset can be published.'
              : driftGateOpen
              ? 'Acknowledge the source drift warning above before publishing.'
              : `Ready to publish ${currentStagingRun.recordCount.toLocaleString()} records as a FILE_EXPORT.`}
          </p>
        </div>
        <button
          type="button"
          onClick={onPublish}
          disabled={!canPublish}
          className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold transition-all shadow-ambient active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-2"
        >
          {isPublishing && <span className="material-symbols-outlined text-base animate-spin">sync</span>}
          {isPublished ? 'Published' : isPublishing ? 'Publishing...' : 'Publish'}
        </button>
      </div>

      {/* Staging Attempt History */}
      <div className="space-y-3">
        <h3 className="font-editorial font-bold text-lg text-on-surface">Staging Attempts</h3>
        {sortedAttempts.map((run) => (
          <div
            key={run.id}
            className={`bg-white rounded-lg p-5 border shadow-ambient flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              run.isCurrent ? 'border-primary ring-1 ring-primary/25' : 'border-outline-variant'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-semibold text-outline">Attempt #{run.attemptNumber}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${STAGING_STATUS_STYLES[run.status]}`}>
                {run.status.replace('_', ' ')}
              </span>
              {run.isCurrent && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed">
                  Current
                </span>
              )}
              {run.hasSourceDrift && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed">
                  Drift
                </span>
              )}
            </div>

            <div className="text-xs text-on-surface-variant flex flex-wrap items-center gap-3">
              {run.status === 'FAILED' && run.errorMessage ? (
                <span className="text-on-error-container">{run.errorMessage}</span>
              ) : (
                <span>
                  {run.recordCount.toLocaleString()} records &bull; {run.fieldCount} fields
                </span>
              )}
              <span className="text-outline">{run.createdAt}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Publish History */}
      {publishRuns.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-editorial font-bold text-lg text-on-surface">Publish History</h3>
          {publishRuns.map((pub) => (
            <div
              key={pub.id}
              className="bg-white rounded-lg p-5 border border-outline-variant shadow-ambient flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-semibold text-outline">
                  Attempt #{pub.stagingRunAttempt}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${PUBLISH_STATUS_STYLES[pub.status]}`}>
                  {pub.status}
                </span>
              </div>
              <div className="text-xs text-on-surface-variant flex flex-wrap items-center gap-3">
                <span className="font-mono truncate max-w-xs">{pub.targetReference}</span>
                {pub.publishedRecordCount !== null && (
                  <span>{pub.publishedRecordCount.toLocaleString()} records</span>
                )}
                <span className="text-outline">{pub.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
