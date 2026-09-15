import React from 'react';

export type WorkflowStatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

const TONE_STYLES: Record<WorkflowStatusTone, string> = {
  neutral: 'bg-surface-container text-on-surface-variant',
  info: 'bg-secondary-fixed text-on-secondary-fixed',
  warning: 'bg-tertiary-fixed text-on-tertiary-fixed',
  success: 'bg-primary-fixed text-on-primary-fixed',
  danger: 'bg-error-container text-on-error-container',
};

interface WorkflowStatusBadgeProps {
  label: string;
  tone: WorkflowStatusTone;
  className?: string;
}

/**
 * Generic status pill shared by every master/detail workflow screen
 * (Validation, Data Quality Rules, Review & Corrections, Approval Center,
 * Staging & Publish). Each module maps its own real backend status values to
 * one of a small fixed set of tones here, rather than inventing its own
 * color per screen — see each module's own STATUS_TONE map.
 */
export const WorkflowStatusBadge: React.FC<WorkflowStatusBadgeProps> = ({ label, tone, className = '' }) => (
  <span
    className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full whitespace-nowrap ${TONE_STYLES[tone]} ${className}`}
  >
    {label}
  </span>
);
