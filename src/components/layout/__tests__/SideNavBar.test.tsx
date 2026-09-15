import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SideNavBar } from '../SideNavBar';

describe('SideNavBar', () => {
  it('hides Reports, AI Insights, and Data Lineage from the visible navigation', () => {
    render(<SideNavBar currentScreen="dashboard" onNavigate={vi.fn()} />);
    expect(screen.queryByText('Reports')).not.toBeInTheDocument();
    expect(screen.queryByText('AI Insights')).not.toBeInTheDocument();
    expect(screen.queryByText('Data Lineage')).not.toBeInTheDocument();
  });

  it('still shows Staging and other unaffected nav items', () => {
    render(<SideNavBar currentScreen="dashboard" onNavigate={vi.fn()} />);
    expect(screen.getByText('Staging')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renamed "Data" to "Data Sources" and "Staging & Publish" to "Staging"', () => {
    render(<SideNavBar currentScreen="dashboard" onNavigate={vi.fn()} />);
    expect(screen.getByText('Data Sources')).toBeInTheDocument();
    expect(screen.queryByText('Staging & Publish')).not.toBeInTheDocument();
  });

  it('shows the v1.0 version label exactly once, near the product branding', () => {
    render(<SideNavBar currentScreen="dashboard" onNavigate={vi.fn()} />);
    expect(screen.getAllByText('v1.0')).toHaveLength(1);
  });

  it('orders Validation immediately before Data Quality Rules', () => {
    render(<SideNavBar currentScreen="dashboard" onNavigate={vi.fn()} />);
    const labels = screen.getAllByRole('button').map((b) => b.textContent);
    const validationIndex = labels.findIndex((l) => l?.includes('Validation'));
    const rulesIndex = labels.findIndex((l) => l?.includes('Data Quality'));
    expect(validationIndex).toBeGreaterThanOrEqual(0);
    expect(rulesIndex).toBe(validationIndex + 1);
  });
});
