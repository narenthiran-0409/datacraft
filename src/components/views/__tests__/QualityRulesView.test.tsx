import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QualityRulesView } from '../QualityRulesView';
import { DatasetResponse, RuleAssignmentResponse, RuleResponse } from '../../../api/client';

function makeDataset(id: string, name: string): DatasetResponse {
  return {
    id,
    schema_id: 'schema-1',
    name,
    object_type: 'TABLE',
    key_strategy: 'SINGLE_COLUMN',
    row_count_estimate: 10,
    column_count: 5,
    last_quality_score: null,
    is_active: true,
    discovered_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
  };
}

function makeRule(): RuleResponse {
  return {
    id: 'rule-1',
    name: 'Email format',
    description: null,
    category: null,
    rule_type: 'PATTERN',
    origin: 'CUSTOM',
    status: 'ACTIVE',
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
  };
}

function makeAssignment(datasetId: string): RuleAssignmentResponse {
  return {
    id: 'assignment-1',
    rule_version_id: 'v-1',
    dataset_id: datasetId,
    assignment_scope: 'DATASET_LEVEL',
    column_id: null,
    cross_column_key: null,
    template_id: null,
    is_enabled: true,
    paused_at: null,
    assigned_by: null,
    assigned_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
  };
}

function baseProps(overrides: Partial<React.ComponentProps<typeof QualityRulesView>> = {}) {
  return {
    onNavigate: () => {},
    datasets: [makeDataset('ds-1', 'DataCraft_AI_Test'), makeDataset('ds-2', 'Customer_Orders')],
    rules: [makeRule()],
    ruleAssignments: [makeAssignment('ds-1')],
    ruleVersionIdsByRuleId: { 'rule-1': ['v-1'] },
    canManageRules: true,
    canManageAssignments: true,
    onOpenRuleCreator: () => {},
    onOpenAssignmentForm: () => {},
    onDisableAssignment: () => {},
    onOpenVersionForm: () => {},
    onOpenDatasetOverview: () => {},
    actionError: null,
    ...overrides,
  };
}

describe('QualityRulesView', () => {
  it('shows the dataset picker when no focusDatasetId is given (legacy path)', () => {
    render(<QualityRulesView {...baseProps()} />);
    expect(screen.getByPlaceholderText('Search datasets...')).toBeInTheDocument();
    expect(screen.getByText('Select a dataset on the left to see the rules applied to it.')).toBeInTheDocument();
  });

  it('hides the dataset picker and shows that dataset\'s rules directly when focusDatasetId is set', () => {
    render(<QualityRulesView {...baseProps({ focusDatasetId: 'ds-1' })} />);
    expect(screen.queryByPlaceholderText('Search datasets...')).not.toBeInTheDocument();
    expect(screen.getByText('Email format')).toBeInTheDocument();
  });
});
