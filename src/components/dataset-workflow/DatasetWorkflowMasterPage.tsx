import React from 'react';
import { WorkflowSummaryCards, WorkflowSummaryItem } from './WorkflowSummaryCards';

interface DatasetWorkflowMasterPageProps {
  title: string;
  subtitle?: string;
  summary?: WorkflowSummaryItem[];
  filters?: React.ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  error?: string | null;
  children: React.ReactNode;
}

/**
 * Shared full-width scaffold for every master ("which datasets need my
 * attention") screen: title, subtitle, summary strip, filter bar, then
 * whatever table content the module passes as children. Uses the same
 * max-w-7xl content width as every other screen in the app (Dashboard,
 * Review & Corrections, etc.) — full width relative to the small 280px
 * explorer sidebar this replaces, not a layout change from the rest of the
 * product.
 */
export const DatasetWorkflowMasterPage: React.FC<DatasetWorkflowMasterPageProps> = ({
  title,
  subtitle,
  summary,
  filters,
  loading = false,
  loadingLabel = 'Loading…',
  error,
  children,
}) => (
  <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
    <div className="border-b border-outline-variant pb-6">
      <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">{title}</h1>
      {subtitle && <p className="text-xs text-on-surface-variant mt-1 font-sans max-w-2xl">{subtitle}</p>}
    </div>

    {error && (
      <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
        <span className="material-symbols-outlined text-base shrink-0">error</span>
        <span>{error}</span>
      </div>
    )}

    {loading ? (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-outline">{loadingLabel}</p>
      </div>
    ) : (
      !error && (
        <>
          {summary && summary.length > 0 && <WorkflowSummaryCards items={summary} />}
          {filters}
          {children}
        </>
      )
    )}
  </div>
);
