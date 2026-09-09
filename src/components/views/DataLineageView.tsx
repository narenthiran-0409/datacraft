import React, { useMemo } from 'react';
import { LineageEdge, LineageNode, NavScreen } from '../../types';

interface DataLineageViewProps {
  onNavigate: (screen: NavScreen) => void;
  nodes: LineageNode[];
  edges: LineageEdge[];
}

const ENTITY_ICON: Record<string, string> = {
  data_source: 'database',
  connection: 'cable',
  schema: 'folder_open',
  dataset: 'table_chart',
  column: 'view_column',
  validation_run: 'checklist',
  review_run: 'fact_check',
  issue: 'warning',
  correction: 'auto_fix_high',
  approval_request: 'verified',
  staging_run: 'inventory',
  publish_run: 'cloud_upload',
};

const ENTITY_SCREEN: Record<string, NavScreen | undefined> = {
  data_source: 'data-sources',
  connection: 'data-sources',
  schema: 'data-explorer',
  dataset: 'dataset-overview',
  column: 'data-profiling',
  validation_run: 'validation-workspace',
  review_run: 'review-corrections',
  issue: 'review-corrections',
  correction: 'review-corrections',
  approval_request: 'approval-center',
  staging_run: 'staging-publish',
  publish_run: 'staging-publish',
};

const formatEntityType = (entityType: string) =>
  entityType
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export const DataLineageView: React.FC<DataLineageViewProps> = ({ onNavigate, nodes, edges }) => {
  const columns = useMemo(() => {
    const parentCount = new Map<string, number>();
    const childrenMap = new Map<string, string[]>();

    nodes.forEach((n) => parentCount.set(n.id, 0));
    edges.forEach((e) => {
      childrenMap.set(e.parentId, [...(childrenMap.get(e.parentId) ?? []), e.childId]);
      parentCount.set(e.childId, (parentCount.get(e.childId) ?? 0) + 1);
    });

    const roots = nodes.filter((n) => (parentCount.get(n.id) ?? 0) === 0);
    const depth = new Map<string, number>();
    const queue: { id: string; d: number }[] = roots.map((r) => ({ id: r.id, d: 0 }));
    roots.forEach((r) => depth.set(r.id, 0));

    while (queue.length > 0) {
      const { id, d } = queue.shift()!;
      (childrenMap.get(id) ?? []).forEach((childId) => {
        if (!depth.has(childId) || (depth.get(childId) as number) < d + 1) {
          depth.set(childId, d + 1);
          queue.push({ id: childId, d: d + 1 });
        }
      });
    }

    const maxDepth = nodes.length > 0 ? Math.max(...Array.from(depth.values()), 0) : -1;
    const cols: LineageNode[][] = Array.from({ length: maxDepth + 1 }, () => []);
    nodes.forEach((n) => {
      const d = depth.get(n.id) ?? 0;
      cols[d].push(n);
    });
    return cols;
  }, [nodes, edges]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-outline-variant pb-6">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1 block">
          End-to-End Traceability
        </span>
        <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
          Data Lineage
        </h1>
        <p className="text-xs text-on-surface-variant mt-1 font-sans max-w-2xl">
          Trace a record from its source connection all the way through validation, review,
          approval, staging, and publish. Click a node to open that entity where a screen exists
          for it.
        </p>
      </div>

      {/* Layered Graph */}
      <div className="bg-white rounded-lg border border-outline-variant shadow-ambient p-6 overflow-x-auto">
        <div className="flex items-start gap-2 min-w-max">
          {columns.map((col, colIdx) => (
            <React.Fragment key={colIdx}>
              <div className="flex flex-col gap-3 w-44 shrink-0">
                {col.map((node) => {
                  const targetScreen = ENTITY_SCREEN[node.entityType];
                  return (
                    <div
                      key={node.id}
                      role={targetScreen ? 'button' : undefined}
                      tabIndex={targetScreen ? 0 : undefined}
                      onClick={targetScreen ? () => onNavigate(targetScreen) : undefined}
                      className={`text-left p-3.5 rounded-md border bg-surface-container-low border-outline-variant transition-colors ${
                        targetScreen ? 'hover:border-primary hover:bg-white cursor-pointer' : ''
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                        <span className="material-symbols-outlined text-sm">
                          {ENTITY_ICON[node.entityType] ?? 'radio_button_unchecked'}
                        </span>
                        {formatEntityType(node.entityType)}
                      </span>
                      <span className="block text-xs font-semibold text-on-surface leading-snug break-words">
                        {node.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {colIdx < columns.length - 1 && (
                <div className="flex items-center h-10 shrink-0 pt-8">
                  <span className="material-symbols-outlined text-outline">arrow_forward</span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
