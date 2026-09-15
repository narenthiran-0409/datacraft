import React, { useState } from 'react';

interface DatasetWorkflowLayoutProps {
  title: string;
  subtitle?: string;
  /** The ConnectionDatasetExplorer (or any left-pane content) for this screen. */
  explorer: React.ReactNode;
  /** The dataset workspace content for whatever is currently selected. */
  children: React.ReactNode;
}

/**
 * Generic "left dataset explorer + right dataset workspace" shell. Built for
 * Staging & Publish but deliberately free of any staging-specific concept, so
 * Validation, Data Quality Rules, Review & Corrections, and Approval Center can
 * reuse the same shell around their own explorer/workspace content.
 *
 * The workspace (right pane) is a normal flowing block — it relies on the
 * app's own scrollable <main>, exactly like every other screen, rather than
 * a second nested scroll container (which clipped short content behind an
 * unnecessary scrollbar). Only the explorer gets its own bounded,
 * independently-scrollable height (sticky, capped in viewport units), per
 * the "scrollable independently if long" requirement for a long dataset list.
 *
 * Desktop: explorer + workspace side by side. Tablet: a narrower explorer.
 * Mobile: the explorer becomes a slide-over sheet toggled by a header button.
 */
export const DatasetWorkflowLayout: React.FC<DatasetWorkflowLayoutProps> = ({
  title,
  subtitle,
  explorer,
  children,
}) => {
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);

  return (
    <div className="flex flex-col">
      <div className="px-6 md:px-10 pt-6 md:pt-10 pb-4 border-b border-outline-variant flex items-start justify-between gap-4">
        <div>
          <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-on-surface-variant mt-1 font-sans">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setIsExplorerOpen(true)}
          className="lg:hidden shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md border border-outline-variant bg-white text-xs font-semibold text-on-surface cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">account_tree</span>
          Datasets
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 p-6 md:p-10 pt-6">
        {/* Desktop / tablet explorer — sticky; the explorer itself caps its own
            height and scrolls internally (see its lg:max-h-* className below). */}
        <div className="hidden lg:block lg:w-72 xl:w-80 shrink-0">
          <div className="lg:sticky lg:top-6">{explorer}</div>
        </div>

        {/* Mobile explorer sheet */}
        {isExplorerOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setIsExplorerOpen(false)} />
            <div className="relative w-[85vw] max-w-sm h-full bg-surface flex flex-col p-4 animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h2 className="font-editorial text-lg font-bold text-on-surface">Datasets</h2>
                <button
                  type="button"
                  onClick={() => setIsExplorerOpen(false)}
                  className="p-1 text-on-surface-variant cursor-pointer"
                  aria-label="Close dataset explorer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="flex-1 min-h-0 flex flex-col">{explorer}</div>
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
};
