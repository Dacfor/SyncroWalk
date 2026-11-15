import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ComponentType, KeyboardEvent } from 'react';
import { Check, ChevronDown, Clock } from 'lucide-react';

export interface LayerItem {
  id: string;
  name: string;
  description: string;
  instrument?: string;
  res?: string;
  on: boolean;
  timeSeries?: boolean; // follows the timeline above the map
}

/**
 * One data category in the map bar ("Topography ▾ 2"): opens a drop-down with its layers.
 * Items are checkboxes (several can be on). Hovering or focusing an item shows its description
 * in a card next to the menu. The menu is rendered in a portal on <body> (position: fixed):
 * the bar scrolls sideways and has an edge-fade mask, which would otherwise clip it.
 */
export default function LayerCategoryMenu({
  label,
  icon: Icon,
  items,
  onToggle
}: {
  label: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  items: LayerItem[];
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [hover, setHover] = useState<{ item: LayerItem; top: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeCount = items.filter((i) => i.on).length;
  const MENU_W = 320;
  const DESC_W = 300;

  const place = () => {
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - MENU_W - 8));
    setPos({ top: r.bottom + 6, left });
  };

  const close = (focusButton = false) => {
    setOpen(false);
    setHover(null);
    if (focusButton) buttonRef.current?.focus();
  };

  // Close on outside click, page scroll/resize; keep the position in sync
  useEffect(() => {
    if (!open) return;
    place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) close();
    };
    const onScroll = (e: Event) => {
      if (!menuRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', onScroll, true);
    itemRefs.current[0]?.focus();
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const showDesc = (item: LayerItem, el: HTMLElement | null) => {
    if (!el || !menuRef.current) return;
    setHover({ item, top: el.offsetTop });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const idx = itemRefs.current.findIndex((el) => el === document.activeElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (idx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      itemRefs.current[next]?.focus();
    } else if (e.key === 'Tab') {
      close();
    }
  };

  // Description card goes to the right of the menu, or to the left if there is no room
  const descLeft = pos && pos.left + MENU_W + 8 + DESC_W > window.innerWidth ? -DESC_W - 8 : MENU_W + 8;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`inline-flex items-center gap-2 shrink-0 whitespace-nowrap min-h-11 px-3.5 rounded-full border text-[15px] font-medium cursor-pointer transition-colors ${
          activeCount
            ? 'bg-mh-primary-soft border-mh-primary text-mh-link'
            : 'bg-mh-card border-mh-sep text-mh-text hover:bg-mh-fill'
        } ${open ? 'ring-2 ring-mh-primary' : ''}`}
      >
        <Icon className="w-[18px] h-[18px]" aria-hidden={true} />
        <span>{label}</span>
        {activeCount > 0 && (
          <span className="min-w-5 h-5 px-1.5 rounded-full bg-mh-primary text-mh-on-primary font-mono text-xs flex items-center justify-center">
            {activeCount}
            <span className="sr-only"> on</span>
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open &&
        pos &&
        createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={`${label} layers`}
          onKeyDown={onKeyDown}
          onMouseLeave={() => setHover(null)}
          className="fixed z-[1100] bg-mh-card text-mh-text rounded-mh-md shadow-mh ring-1 ring-mh-sep p-2 flex flex-col gap-1"
          style={{ top: pos.top, left: pos.left, width: MENU_W }}
        >
          <span className="px-3 pt-1 pb-1 mh-eyebrow">{label}</span>
          {items.map((item, i) => (
            <button
              key={item.id}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="menuitemcheckbox"
              aria-checked={item.on}
              aria-describedby={hover?.item.id === item.id ? `layer-desc-${item.id}` : undefined}
              onClick={() => onToggle(item.id)}
              onMouseEnter={(e) => showDesc(item, e.currentTarget)}
              onFocus={(e) => showDesc(item, e.currentTarget)}
              className={`w-full min-h-11 px-3 py-2 rounded-mh-sm border-0 text-left cursor-pointer flex items-center gap-3 text-mh-text ${
                item.on ? 'bg-mh-fill-blue' : 'bg-transparent hover:bg-mh-fill'
              }`}
            >
              <span
                className={`w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center ${
                  item.on ? 'bg-mh-primary border-mh-primary text-mh-on-primary' : 'border-mh-text2'
                }`}
                aria-hidden="true"
              >
                {item.on && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
              </span>
              <span className="flex-1 min-w-0 text-[15px] leading-snug">{item.name}</span>
              {item.timeSeries && <Clock className="w-4 h-4 shrink-0 text-mh-text2" aria-label="follows the timeline" />}
            </button>
          ))}

          {hover && (
            <div
              id={`layer-desc-${hover.item.id}`}
              role="tooltip"
              className="absolute bg-mh-card text-mh-text rounded-mh-md shadow-mh ring-1 ring-mh-sep p-3 flex flex-col gap-1.5 pointer-events-none"
              style={{ top: hover.top, left: descLeft, width: DESC_W }}
            >
              <strong className="text-[15px] leading-snug">{hover.item.name}</strong>
              <span className="text-[14px] leading-snug text-mh-text2">{hover.item.description}</span>
              {(hover.item.instrument || hover.item.res) && (
                <span className="font-mono text-[12px] text-mh-text2">
                  {[hover.item.instrument, hover.item.res].filter(Boolean).join(' · ')}
                </span>
              )}
              {hover.item.timeSeries && (
                <span className="text-[13px] text-mh-link">Follows the timeline above the map</span>
              )}
            </div>
          )}
        </div>,
          document.body
        )}
    </>
  );
}
