import React from 'react';
import { DatasetStagingStatus } from '../../types';
import { DatasetStatusBadge } from './DatasetStatusBadge';

interface MetaField {
  label: string;
  value: React.ReactNode;
}

interface DatasetWorkspaceHeaderProps {
  datasetName: string;
  connectionName: string;
  schemaName: string;
  status: DatasetStagingStatus;
  sourceRowCount: number | null;
  approvedCorrectionCount: number;
  keyStrategy: string | null;
  lastValidationLabel: string | null;
  approvalStatusLabel: string | null;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  primaryActionDisabled?: boolean;
}

export const DatasetWorkspaceHeader: React.FC<DatasetWorkspaceHeaderProps> = ({
  datasetName,
  connectionName,
  schemaName,
  status,
  sourceRowCount,
  approvedCorrectionCount,
  keyStrategy,
  lastValidationLabel,
  approvalStatusLabel,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionDisabled = false,
}) => {
  const metaFields: MetaField[] = [
    { label: 'Source Connection', value: connectionName || '—' },
    { label: 'Source Schema', value: schemaName || '—' },
    { label: 'Primary Key / Key Strategy', value: keyStrategy || '—' },
    { label: 'Last Validation', value: lastValidationLabel || 'Never validated' },
    { label: 'Approval Status', value: approvalStatusLabel || 'Not yet submitted' },
    { label: 'Approved Corrections', value: approvedCorrectionCount.toLocaleString() },
  ];

  return (
    <div className="bg-white rounded-lg border border-outline-variant shadow-ambient p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-mono text-outline truncate">
            {connectionName} / {schemaName} / {datasetName}
          </p>
          <h2 className="font-editorial text-2xl font-bold text-on-surface tracking-tight mt-0.5 truncate">
            {datasetName}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-on-surface-variant">
            <span>{sourceRowCount != null ? `${sourceRowCount.toLocaleString()} source rows` : 'Row count unknown'}</span>
            <span className="text-outline">&bull;</span>
            <span>
              {approvedCorrectionCount.toLocaleString()} approved correction{approvedCorrectionCount === 1 ? '' : 's'}
            </span>
            <span className="text-outline">&bull;</span>
            <DatasetStatusBadge status={status} />
          </div>
        </div>

        <button
          type="button"
          onClick={onPrimaryAction}
          disabled={primaryActionDisabled}
          className="shrink-0 flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary px-5 py-2.5 rounded-md font-semibold text-xs transition-all shadow-ambient active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          <span className="material-symbols-outlined text-lg">visibility</span>
          {primaryActionLabel}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-4 border-t border-surface-container">
        {metaFields.map((f) => (
          <div key={f.label} className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">{f.label}</p>
            <p className="text-xs font-semibold text-on-surface mt-0.5 truncate">{f.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
