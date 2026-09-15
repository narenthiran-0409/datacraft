import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select, SelectOption } from '../Select';

const OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'All Connections' },
  { value: 'conn-1', label: 'CBE_OnPrem' },
  { value: 'conn-2', label: 'Test' },
];

function Controlled({ onChangeSpy }: { onChangeSpy?: (v: string) => void }) {
  const [value, setValue] = useState('ALL');
  return (
    <Select
      value={value}
      onChange={(v) => {
        setValue(v);
        onChangeSpy?.(v);
      }}
      options={OPTIONS}
    />
  );
}

describe('Select', () => {
  it('renders the trigger showing the selected option label', () => {
    render(<Select value="ALL" onChange={vi.fn()} options={OPTIONS} />);
    expect(screen.getByRole('button', { name: /All Connections/ })).toBeInTheDocument();
  });

  it('shows a placeholder when no value is selected', () => {
    render(<Select value="" onChange={vi.fn()} options={OPTIONS} placeholder="Select connection" />);
    expect(screen.getByRole('button')).toHaveTextContent('Select connection');
  });

  it('opens the menu and renders every option on click', async () => {
    const user = userEvent.setup();
    render(<Select value="ALL" onChange={vi.fn()} options={OPTIONS} aria-label="Connection filter" />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByRole('option', { name: 'CBE_OnPrem' })).toBeInTheDocument();
  });

  it('marks the selected option with aria-selected and a check indicator', async () => {
    const user = userEvent.setup();
    render(<Select value="conn-1" onChange={vi.fn()} options={OPTIONS} aria-label="Connection filter" />);
    await user.click(screen.getByRole('button'));
    const selected = screen.getByRole('option', { name: /CBE_OnPrem/ });
    expect(selected).toHaveAttribute('aria-selected', 'true');
    expect(selected.textContent).toContain('check');
  });

  it('calls onChange with the option value and closes the menu on click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Select value="ALL" onChange={onChange} options={OPTIONS} aria-label="Connection filter" />);
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('option', { name: 'Test' }));
    expect(onChange).toHaveBeenCalledWith('conn-2');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('reflects the new value after a real onChange round-trip (controlled)', async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn();
    render(<Controlled onChangeSpy={onChangeSpy} />);
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('option', { name: 'Test' }));
    expect(onChangeSpy).toHaveBeenCalledWith('conn-2');
    expect(screen.getByRole('button', { name: /Test/ })).toBeInTheDocument();
  });

  it('supports keyboard navigation: ArrowDown to highlight, Enter to select', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Select value="ALL" onChange={onChange} options={OPTIONS} aria-label="Connection filter" />);
    const trigger = screen.getByRole('button');
    trigger.focus();
    await user.keyboard('{ArrowDown}'); // opens, highlights current (ALL, index 0)
    await user.keyboard('{ArrowDown}'); // moves to conn-1
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('conn-1');
  });

  it('closes the menu on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<Select value="ALL" onChange={vi.fn()} options={OPTIONS} aria-label="Connection filter" />);
    const trigger = screen.getByRole('button');
    await user.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('does not open when disabled', async () => {
    const user = userEvent.setup();
    render(<Select value="ALL" onChange={vi.fn()} options={OPTIONS} disabled aria-label="Connection filter" />);
    const trigger = screen.getByRole('button');
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('skips disabled options during keyboard navigation and selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const options: SelectOption[] = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', disabled: true },
      { value: 'c', label: 'C' },
    ];
    render(<Select value="a" onChange={onChange} options={options} aria-label="Letter" />);
    const trigger = screen.getByRole('button');
    trigger.focus();
    await user.keyboard('{ArrowDown}'); // opens, highlights current (a, index 0)
    await user.keyboard('{ArrowDown}'); // should skip disabled 'b' and land on 'c'
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('closes the menu when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Select value="ALL" onChange={vi.fn()} options={OPTIONS} />
        <button>Outside</button>
      </div>
    );
    await user.click(screen.getByRole('button', { name: /All Connections/ }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });
});
