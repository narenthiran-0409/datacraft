import React from 'react';
import { WorkflowStatusTone } from './WorkflowStatusBadge';

export interface WorkflowSummaryItem {
  label: string;
  value: number | string;
  tone?: WorkflowStatusTone;
}

const TONE_ACCENT: Record<WorkflowStatusTone, string> = {
  neutral: 'text-on-surface',
  info: 'text-secondary',
  warning: 'text-on-tertiary-fixed-variant',
  success: 'text-primary',
  danger: 'text-error',
};

interface WorkflowSummaryCardsProps {
  items: WorkflowSummaryItem[];
}

/**
 * Compact "what needs my attention" summary strip above a master table.
 * Every value here must come from real, already-loaded data — never a
 * placeholder metric added just to fill space.
 */
export const WorkflowSummaryCards: React.FC<WorkflowSummaryCardsProps> = ({ items }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
    {items.map((item) => (
      <div key={item.label} className="bg-white border border-outline-variant rounded-lg p-4">
        <p className={`text-2xl font-editorial font-bold ${TONE_ACCENT[item.tone ?? 'neutral']}`}>{item.value}</p>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-outline mt-0.5">{item.label}</p>
      </div>
    ))}
  </div>
);
