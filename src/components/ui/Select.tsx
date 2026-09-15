import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  /** 'sm' for compact toolbar/filter usage, 'md' (default) for forms. Both stay within a 40-44px closed height. */
  size?: 'sm' | 'md';
  /** Stretch to the width of its container (typical for form fields). Defaults to false (fits content, typical for toolbar filters). */
  fullWidth?: boolean;
  error?: boolean;
  id?: string;
  'aria-label'?: string;
  /** Extra classes on the trigger button — for width overrides ("w-48" etc). */
  className?: string;
}

const SIZE_CLASSES: Record<'sm' | 'md', string> = {
  sm: 'h-10 px-3 text-sm',
  md: 'h-11 px-3.5 text-sm',
};

let idCounter = 0;
function useStableId(prefix: string, provided?: string): string {
  const ref = useRef<string | null>(null);
  if (!ref.current) ref.current = provided ?? `${prefix}-${++idCounter}`;
  return provided ?? ref.current;
}

/**
 * DataCraft's standard dropdown/select control — a floating, portal-rendered
 * menu styled to match the app's cards/inputs (rounded corners, soft shadow,
 * subtle border) instead of the native OS <select> popup. Built from scratch
 * (no headless-UI dependency is installed in this project, and the task
 * explicitly says not to add a large library just for this) following the
 * WAI-ARIA "Collapsible Dropdown Listbox" pattern: a single focusable
 * combobox button, DOM focus stays on it the whole time, and
 * aria-activedescendant marks the keyboard-highlighted option — so screen
 * readers and keyboard users get equivalent behavior to a native select
 * without needing focus to jump onto individual menu items.
 *
 * Deliberately single-select only — see AddDataSourceView's cross-column
 * multi-select, which stays a native <select multiple> for exactly this
 * reason (documented in the migration report).
 */
export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled = false,
  size = 'md',
  fullWidth = false,
  error = false,
  id,
  'aria-label': ariaLabel,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(
    null
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useStableId('select-listbox');
  const selectedIndex = options.findIndex((o) => o.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const reposition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const estimatedMenuHeight = Math.min(options.length * 36 + 12, 288);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < estimatedMenuHeight + 8 && rect.top > spaceBelow;
    setMenuRect({
      top: openUp ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      openUp,
    });
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    reposition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => reposition();
    // capture:true so scroll on any ancestor scrollable container (a card, a
    // table, a modal body) repositions the menu too, not just window scroll.
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  const openMenu = () => {
    if (disabled) return;
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
  };

  const closeMenu = (refocusTrigger = true) => {
    setIsOpen(false);
    if (refocusTrigger) triggerRef.current?.focus();
  };

  const commitSelection = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    closeMenu();
  };

  const moveHighlight = (delta: number) => {
    setHighlightedIndex((prev) => {
      let next = prev;
      for (let i = 0; i < options.length; i++) {
        next = (next + delta + options.length) % options.length;
        if (!options[next]?.disabled) return next;
      }
      return prev;
    });
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveHighlight(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveHighlight(-1);
        break;
      case 'Home':
        e.preventDefault();
        setHighlightedIndex(options.findIndex((o) => !o.disabled));
        break;
      case 'End':
        e.preventDefault();
        for (let i = options.length - 1; i >= 0; i--) {
          if (!options[i].disabled) {
            setHighlightedIndex(i);
            break;
          }
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        commitSelection(highlightedIndex);
        break;
      case 'Escape':
        e.preventDefault();
        closeMenu();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const menu = isOpen && menuRect && (
    <div
      ref={menuRef}
      id={listboxId}
      role="listbox"
      tabIndex={-1}
      style={{
        position: 'fixed',
        left: menuRect.left,
        top: menuRect.openUp ? undefined : menuRect.top,
        bottom: menuRect.openUp ? window.innerHeight - menuRect.top : undefined,
        minWidth: menuRect.width,
        maxWidth: Math.max(menuRect.width, 320),
      }}
      className="z-[1000] rounded-xl border border-outline-variant bg-white shadow-lg py-1.5 max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
    >
      {options.length === 0 ? (
        <p className="px-3 py-2 text-sm text-outline italic">No options</p>
      ) : (
        options.map((option, index) => {
          const isSelected = option.value === value;
          const isHighlighted = index === highlightedIndex;
          return (
            <div
              key={option.value}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={isSelected}
              aria-disabled={option.disabled || undefined}
              onMouseEnter={() => !option.disabled && setHighlightedIndex(index)}
              onClick={() => commitSelection(index)}
              className={`mx-1.5 flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm transition-colors ${
                option.disabled
                  ? 'text-outline opacity-50 cursor-not-allowed'
                  : 'cursor-pointer text-on-surface'
              } ${
                !option.disabled && (isHighlighted || isSelected) ? 'bg-primary-fixed/35' : ''
              } ${!option.disabled && isHighlighted && !isSelected ? 'bg-surface-container-low' : ''}`}
            >
              <span className={`truncate ${isSelected ? 'font-semibold' : ''}`}>{option.label}</span>
              {isSelected && <span className="material-symbols-outlined text-primary text-base shrink-0">check</span>}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={isOpen && highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined}
        aria-label={ariaLabel}
        onClick={() => (isOpen ? closeMenu() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        className={`${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} inline-flex items-center justify-between gap-2 rounded-[11px] border bg-white text-left text-on-surface transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-container-low ${
          error
            ? 'border-error focus-visible:ring-2 focus-visible:ring-error/30'
            : 'border-outline-variant hover:border-outline focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25'
        } focus-visible:outline-none ${className}`}
      >
        <span className={`truncate ${selectedOption ? '' : 'text-outline'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span
          className={`material-symbols-outlined text-lg text-outline shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>
      {menu && createPortal(menu, document.body)}
    </>
  );
};
