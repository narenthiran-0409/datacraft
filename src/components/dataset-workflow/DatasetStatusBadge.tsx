import React from 'react';
import { DatasetStagingStatus } from '../../types';
import { DATASET_STATUS_META } from '../../data/datasetStagingWorkflow';

interface DatasetStatusBadgeProps {
  status: DatasetStagingStatus;
  className?: string;
}

export const DatasetStatusBadge: React.FC<DatasetStatusBadgeProps> = ({ status, className = '' }) => {
  const meta = DATASET_STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full whitespace-nowrap ${meta.badgeClass} ${className}`}
    >
      {meta.label}
    </span>
  );
};
