import React from 'react';
import { StagingDestination } from '../../data/datasetStagingWorkflow';

export interface TableStructureColumn {
  name: string;
  dataType: string;
  isPrimaryKey?: boolean;
}

interface StagingConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  sourceConnectionName: string;
  sourceSchemaName: string;
  sourceDatasetName: string;
  destination: StagingDestination;
  tableColumns: TableStructureColumn[];
  rowsToCopy: number;
  approvedCorrections: number;
  rowsAffected: number;
}

export const StagingConfirmationModal: React.FC<StagingConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  sourceConnectionName,
  sourceSchemaName,
  sourceDatasetName,
  destination,
  tableColumns,
  rowsToCopy,
  approvedCorrections,
  rowsAffected,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Create Staging Dataset"
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={isSubmitting ? undefined : onClose} />
      <div className="relative bg-surface rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] my-auto overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-outline-variant">
          <h2 className="font-editorial text-2xl font-bold text-on-surface">Create Staging Dataset</h2>
        </div>

        <div className="p-6 space-y-5">
          {/* Source -> Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
            <div className="bg-surface-container-low rounded-md p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-outline mb-1.5">Source</p>
              <p className="text-sm font-bold text-on-surface">{sourceConnectionName}</p>
              <p className="text-xs font-mono text-on-surface-variant mt-0.5">
                {sourceSchemaName}.{sourceDatasetName}
              </p>
            </div>
            <span className="material-symbols-outlined text-2xl text-outline justify-self-center rotate-90 sm:rotate-0">
              arrow_forward
            </span>
            <div className="bg-primary-fixed/30 rounded-md p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-outline mb-1.5">Destination</p>
              <p className="text-sm font-bold text-on-surface">{destination.database}</p>
              <p className="text-xs font-mono text-on-surface-variant mt-0.5 break-all">{destination.table}</p>
            </div>
          </div>

          {/* Table structure preview */}
          <div>
            <p className="text-xs font-bold text-on-surface mb-2">Staging Table Structure</p>
            <div className="border border-outline-variant rounded-md overflow-hidden max-h-56 overflow-y-auto">
              <table className="min-w-full text-xs">
                <tbody>
                  {tableColumns.map((col) => (
                    <tr key={col.name} className="border-b border-surface-container last:border-0">
                      <td className="px-3 py-1.5 font-mono text-on-surface">{col.name}</td>
                      <td className="px-3 py-1.5 font-mono text-on-surface-variant">{col.dataType}</td>
                      <td className="px-3 py-1.5 text-right">
                        {col.isPrimaryKey && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed">
                            Primary Key
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-container-low rounded-md p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">Rows to Copy</p>
              <p className="text-lg font-bold text-on-surface mt-0.5">{rowsToCopy.toLocaleString()}</p>
            </div>
            <div className="bg-surface-container-low rounded-md p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">Approved Corrections</p>
              <p className="text-lg font-bold text-on-surface mt-0.5">{approvedCorrections.toLocaleString()}</p>
            </div>
            <div className="bg-surface-container-low rounded-md p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">Rows Affected</p>
              <p className="text-lg font-bold text-on-surface mt-0.5">{rowsAffected.toLocaleString()}</p>
            </div>
          </div>

          {/* Source-not-modified warning */}
          <div className="flex items-center gap-2.5 rounded-md border border-primary/20 bg-primary-fixed/20 px-4 py-3">
            <span className="material-symbols-outlined text-primary text-lg shrink-0">shield</span>
            <p className="text-xs font-semibold text-on-surface">Source data will not be modified.</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold transition-all shadow-ambient cursor-pointer disabled:opacity-60 flex items-center gap-2"
          >
            {isSubmitting && <span className="material-symbols-outlined text-base animate-spin">sync</span>}
            Create Staging Dataset
          </button>
        </div>
      </div>
    </div>
  );
};
