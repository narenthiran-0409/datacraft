import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewCorrectionsView } from '../ReviewCorrectionsView';
import { Issue, ReviewRun } from '../../../types';
import { AITraceResponse } from '../../../api/client';

const REVIEW_RUN: ReviewRun = {
  id: 'run-1',
  name: 'Customer_Orders_PK_Test',
  status: 'IN_REVIEW',
  datasetName: 'Customer_Orders_PK_Test',
  validationRunLabel: 'val-1',
  totalIssues: 1,
  resolvedIssues: 0,
  createdAt: '2026-01-01',
};

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'issue-1',
    reviewRunId: 'run-1',
    recordRef: 'id=1',
    columnName: 'email',
    severity: 'HIGH',
    originalValue: 'suresh-invalid-email',
    suggestedValue: 'suresh.kumar@gmail.com',
    suggestionSource: 'AI',
    suggestionCategory: 'AI_HIGH_CONFIDENCE',
    suggestionReasoning: 'Matches the dominant email template for this dataset.',
    confidence: 1.0,
    status: 'PENDING',
    finalValue: null,
    ruleTriggered: 'Email format invalid',
    suggestionId: 'sugg-1',
    suggestionStrategy: 'STRING_TEMPLATE',
    suggestionEvidence: {
      available: true,
      ambiguous: false,
      strategies_attempted: ['STRING_TEMPLATE'],
      strategies_agreeing: ['STRING_TEMPLATE'],
      recommended_candidate: 'suresh.kumar@gmail.com',
      recommended_strategy: 'STRING_TEMPLATE',
      confidence: 1.0,
      supporting_count: 10,
      contradicting_count: 0,
      reason: null,
    },
    ...overrides,
  };
}

function baseProps(overrides: Partial<React.ComponentProps<typeof ReviewCorrectionsView>> = {}) {
  return {
    onNavigate: vi.fn(),
    reviewRuns: [REVIEW_RUN],
    selectedReviewId: REVIEW_RUN.id,
    onSelectReview: vi.fn(),
    issues: [makeIssue()],
    canEdit: true,
    actionError: null,
    pendingIssueIds: [],
    onGenerateSuggestions: vi.fn(),
    isGeneratingSuggestions: false,
    canUseAISuggestions: true,
    onGenerateAISuggestions: vi.fn(),
    isGeneratingAISuggestions: false,
    aiSuggestionsError: null,
    onAcceptIssue: vi.fn(),
    onEditIssue: vi.fn(),
    onRejectIssue: vi.fn(),
    onSkipIssue: vi.fn(),
    onBulkAccept: vi.fn(),
    onBulkReject: vi.fn(),
    onSubmitForApproval: vi.fn(),
    aiTraceBySuggestionId: new Map<string, AITraceResponse>(),
    aiTraceLoadingIds: new Set<string>(),
    aiTraceErrorBySuggestionId: new Map<string, string>(),
    onLoadAiTrace: vi.fn(),
    ...overrides,
  };
}

const SUCCESS_TRACE: AITraceResponse = {
  correction_suggestion_id: 'sugg-1',
  ai_suggestion_id: 'ai-sugg-1',
  is_llm_backed: true,
  linkage_status: 'OK',
  provider: 'anthropic',
  model: 'claude-sonnet-4-5',
  prompt: { id: 'prompt-1', key: 'ai_correction', version_number: 4 },
  usage: [
    {
      id: 'usage-1',
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      prompt_version_id: 'prompt-1',
      input_tokens: 2748,
      output_tokens: 123,
      total_tokens: 2871,
      latency_ms: 3700,
      status: 'SUCCESS',
      created_at: '2026-01-02T10:00:00Z',
    },
  ],
};

const FAILED_TRACE: AITraceResponse = {
  ...SUCCESS_TRACE,
  usage: [
    {
      id: 'usage-2',
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      prompt_version_id: 'prompt-1',
      input_tokens: null,
      output_tokens: null,
      total_tokens: null,
      latency_ms: 900,
      status: 'FAILED',
      created_at: '2026-01-02T10:05:00Z',
    },
  ],
};

const DETERMINISTIC_TRACE: AITraceResponse = {
  correction_suggestion_id: 'sugg-1',
  ai_suggestion_id: null,
  is_llm_backed: false,
  linkage_status: 'NO_AI_CALL',
  provider: null,
  model: null,
  prompt: null,
  usage: [],
};

describe('ReviewCorrectionsView — suggestion card', () => {
  it('renders the suggested value for an AI_HIGH_CONFIDENCE suggestion', () => {
    render(<ReviewCorrectionsView {...baseProps()} />);
    expect(screen.getByText('suresh.kumar@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('suresh-invalid-email')).toBeInTheDocument();
    expect(screen.getByText('AI-assisted · High confidence')).toBeInTheDocument();
  });

  it('renders "No reliable correction found" for CANNOT_INFER', () => {
    const issue = makeIssue({
      suggestedValue: null,
      suggestionCategory: 'CANNOT_INFER',
      suggestionSource: null,
      suggestionStrategy: null,
      suggestionEvidence: null,
      confidence: 0,
    });
    render(<ReviewCorrectionsView {...baseProps({ issues: [issue] })} />);
    expect(screen.getByText('No reliable correction found')).toBeInTheDocument();
    expect(screen.queryByText('suresh.kumar@gmail.com')).not.toBeInTheDocument();
  });

  it('maps the strategy constant to its friendly display label', () => {
    render(<ReviewCorrectionsView {...baseProps()} />);
    expect(screen.getByText('String Template')).toBeInTheDocument();
  });

  it('renders evidence supporting/contradicting counts', () => {
    render(<ReviewCorrectionsView {...baseProps()} />);
    expect(screen.getByText(/10 supporting records/)).toBeInTheDocument();
    expect(screen.getByText(/0 contradictions/)).toBeInTheDocument();
  });

  it('does not render an Evidence section when evidence is unavailable', () => {
    const issue = makeIssue({ suggestionEvidence: null });
    render(<ReviewCorrectionsView {...baseProps({ issues: [issue] })} />);
    expect(screen.queryByText('View Evidence')).not.toBeInTheDocument();
    expect(screen.queryByText(/supporting record/)).not.toBeInTheDocument();
  });

  it('never renders raw evidence/trace JSON in the DOM', () => {
    const { container } = render(<ReviewCorrectionsView {...baseProps()} />);
    expect(container.textContent).not.toMatch(/[{[]"\w+":/);
  });

  it('Accept, Edit, Reject, and Skip all invoke their handlers', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<ReviewCorrectionsView {...props} />);

    await user.click(screen.getByRole('button', { name: 'Accept' }));
    expect(props.onAcceptIssue).toHaveBeenCalledWith('issue-1');

    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(props.onSkipIssue).toHaveBeenCalledWith('issue-1');

    await user.click(screen.getByRole('button', { name: 'Reject' }));
    expect(props.onRejectIssue).toHaveBeenCalledWith('issue-1');

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const input = screen.getByLabelText('Final value');
    await user.clear(input);
    await user.type(input, 'corrected@example.com');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(props.onEditIssue).toHaveBeenCalledWith('issue-1', 'corrected@example.com');
  });
});

describe('ReviewCorrectionsView — AI Details (AI Trace)', () => {
  it('lazy-loads the trace only when the user opens AI Details, never on mount', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<ReviewCorrectionsView {...props} />);
    expect(props.onLoadAiTrace).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /AI Details/ }));
    expect(props.onLoadAiTrace).toHaveBeenCalledWith('sugg-1');
    expect(props.onLoadAiTrace).toHaveBeenCalledTimes(1);

    // Collapsing and re-expanding must not refetch (already cached upstream).
    await user.click(screen.getByRole('button', { name: /AI Details/ }));
    await user.click(screen.getByRole('button', { name: /AI Details/ }));
    expect(props.onLoadAiTrace).toHaveBeenCalledTimes(2);
  });

  it('never fires a trace request for every issue on initial render (no N+1)', () => {
    const issues = Array.from({ length: 20 }, (_, i) =>
      makeIssue({ id: `issue-${i}`, suggestionId: `sugg-${i}` })
    );
    const props = baseProps({ issues });
    render(<ReviewCorrectionsView {...props} />);
    expect(props.onLoadAiTrace).not.toHaveBeenCalled();
  });

  it('renders "AI Used: No" for a deterministic (non-AI-backed) trace', async () => {
    const user = userEvent.setup();
    const props = baseProps({
      aiTraceBySuggestionId: new Map([['sugg-1', DETERMINISTIC_TRACE]]),
    });
    render(<ReviewCorrectionsView {...props} />);
    await user.click(screen.getByRole('button', { name: /AI Details/ }));
    expect(screen.getByText('Deterministic')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.queryByText('Provider')).not.toBeInTheDocument();
  });

  it('renders provider/model/prompt/tokens/latency for a successful AI trace', async () => {
    const user = userEvent.setup();
    const props = baseProps({
      aiTraceBySuggestionId: new Map([['sugg-1', SUCCESS_TRACE]]),
    });
    render(<ReviewCorrectionsView {...props} />);
    await user.click(screen.getByRole('button', { name: /AI Details/ }));
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
    expect(screen.getByText('claude-sonnet-4-5')).toBeInTheDocument();
    expect(screen.getByText('ai_correction v4')).toBeInTheDocument();
    expect(screen.getByText('2,748')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
    expect(screen.getByText('2,871')).toBeInTheDocument();
    expect(screen.getByText('3.7 s')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('renders a truthful failure state for a failed AI attempt, never "Deterministic"', async () => {
    const user = userEvent.setup();
    const props = baseProps({
      aiTraceBySuggestionId: new Map([['sugg-1', FAILED_TRACE]]),
    });
    render(<ReviewCorrectionsView {...props} />);
    await user.click(screen.getByRole('button', { name: /AI Details/ }));
    expect(screen.getByText('AI attempt failed')).toBeInTheDocument();
    expect(screen.queryByText('Deterministic')).not.toBeInTheDocument();
    expect(screen.queryByText('Success')).not.toBeInTheDocument();
  });

  it('shows a retry affordance on trace load error', async () => {
    const user = userEvent.setup();
    const props = baseProps({
      aiTraceErrorBySuggestionId: new Map([['sugg-1', 'Request failed']]),
    });
    render(<ReviewCorrectionsView {...props} />);
    await user.click(screen.getByRole('button', { name: /AI Details/ }));
    expect(screen.getByText('Request failed')).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: 'Retry' });
    await user.click(retry);
    expect(props.onLoadAiTrace).toHaveBeenCalledWith('sugg-1');
  });
});

describe('ReviewCorrectionsView — responsive sanity', () => {
  it('renders without crashing at a narrow viewport-equivalent layout', () => {
    const { container } = render(<ReviewCorrectionsView {...baseProps()} />);
    // Cards use a stacking flex layout (flex-col by default, md:flex-row at
    // desktop widths) rather than a fixed-width table, so content reflows
    // instead of overflowing horizontally.
    expect(container.querySelector('.flex-col')).toBeInTheDocument();
  });
});

// Live-acceptance fix (Suresh/Sara, Customer_Orders_PK_Test) — the backend
// process serving the manual test predated the Phase 4.10 schema change, so
// strategy/evidence_detail never reached the browser. Fixture values below
// mirror the real rows confirmed via direct DB query after the backend
// restart: category=AI_HIGH_CONFIDENCE, strategy=STRING_TEMPLATE,
// evidence_detail={supporting_count:10, contradicting_count:0, ...}.
describe('ReviewCorrectionsView — live-acceptance fix', () => {
  const liveIssue = makeIssue({
    suggestionCategory: 'AI_HIGH_CONFIDENCE',
    suggestionStrategy: 'STRING_TEMPLATE',
    suggestionReasoning: 'The STRING_TEMPLATE strategy identified a consistent email pattern across 10 records.',
    ruleTriggered: 'email: PATTERN (ai) [baf10f]',
    suggestionEvidence: {
      available: true,
      ambiguous: false,
      strategies_attempted: ['TEMPLATE'],
      strategies_agreeing: ['STRING_TEMPLATE'],
      recommended_candidate: 'suresh.kumar@gmail.com',
      recommended_strategy: 'STRING_TEMPLATE',
      confidence: 1.0,
      supporting_count: 10,
      contradicting_count: 0,
      reason: null,
    },
  });

  it('keeps AI_HIGH_CONFIDENCE as the category badge', () => {
    render(<ReviewCorrectionsView {...baseProps({ issues: [liveIssue] })} />);
    expect(screen.getByText('AI-assisted · High confidence')).toBeInTheDocument();
  });

  it('renders Method = String Template for a STRING_TEMPLATE suggestion', () => {
    render(<ReviewCorrectionsView {...baseProps({ issues: [liveIssue] })} />);
    expect(screen.getByText('Method')).toBeInTheDocument();
    expect(screen.getByText('String Template')).toBeInTheDocument();
  });

  it('never renders "AI-assisted" as the Method value', () => {
    render(<ReviewCorrectionsView {...baseProps({ issues: [liveIssue] })} />);
    const methodLabel = screen.getByText('Method');
    // "AI-assisted" legitimately appears elsewhere (the category badge) —
    // assert it specifically isn't the Method row's own value sibling.
    expect(methodLabel.nextSibling?.textContent).toBe('String Template');
    expect(methodLabel.nextSibling?.textContent).not.toBe('AI-assisted');
  });

  it('renders the evidence summary for supporting=10 / contradicting=0', () => {
    render(<ReviewCorrectionsView {...baseProps({ issues: [liveIssue] })} />);
    expect(screen.getByText(/10 supporting records · 0 contradictions/)).toBeInTheDocument();
  });

  it('offers View Evidence whenever evidence_detail is available', () => {
    render(<ReviewCorrectionsView {...baseProps({ issues: [liveIssue] })} />);
    expect(screen.getByRole('button', { name: 'View Evidence' })).toBeInTheDocument();
  });

  it('does not show the internal rule id in the primary card', () => {
    render(<ReviewCorrectionsView {...baseProps({ issues: [liveIssue] })} />);
    expect(screen.queryByText(/\[baf10f\]/)).not.toBeInTheDocument();
    expect(screen.getByText('Email · Pattern Rule')).toBeInTheDocument();
  });

  it('does not expose the raw STRING_TEMPLATE enum in user-facing reasoning', () => {
    render(<ReviewCorrectionsView {...baseProps({ issues: [liveIssue] })} />);
    expect(screen.queryByText(/STRING_TEMPLATE/)).not.toBeInTheDocument();
    expect(screen.getByText(/String Template strategy identified/)).toBeInTheDocument();
  });
});
