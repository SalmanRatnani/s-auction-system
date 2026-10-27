"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, Search, X, type LucideIcon } from "lucide-react";

export type QuickDestination = {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
} & (
  | { href: string; onSelect?: never }
  | { href?: never; onSelect: () => void }
);

/** Navigation only. No bidding or auction mutations can be triggered here. */
export function QuickNavigation({ items }: { items: QuickDestination[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const previousOverflow = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const id = useId();
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = items.filter((item) =>
    words.every((word) =>
      `${item.label} ${item.description ?? ""}`.toLowerCase().includes(word),
    ),
  );

  const show = useCallback(() => {
    if (
      !dialog.current ||
      dialog.current.open ||
      document.querySelector("dialog[open]")
    )
      return;
    setQuery("");
    returnFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : trigger.current;
    previousOverflow.current = document.body.style.overflow;
    dialog.current.showModal();
    document.body.style.overflow = "hidden";
    setOpen(true);
    input.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        event.shiftKey
      )
        return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        if (document.querySelector("dialog[open]") && !dialog.current?.open)
          return;
        event.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else show();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previousOverflow.current !== null)
        document.body.style.overflow = previousOverflow.current;
    };
  }, [show]);

  function close() {
    dialog.current?.close();
  }
  function resultNodes() {
    return Array.from(
      dialog.current?.querySelectorAll<HTMLElement>("[data-quick-result]") ??
        [],
    );
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="quick-trigger"
        onClick={show}
        aria-label="Quick navigation"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
      >
        <Search size={17} aria-hidden="true" />
        <span>Jump to…</span>
        <kbd aria-hidden="true">⌘ / Ctrl K</kbd>
      </button>
      <dialog
        ref={dialog}
        id={id}
        className="quick-dialog"
        aria-labelledby={`${id}-title`}
        onClose={() => {
          if (previousOverflow.current !== null)
            document.body.style.overflow = previousOverflow.current;
          previousOverflow.current = null;
          setOpen(false);
          if (
            returnFocus.current?.isConnected &&
            returnFocus.current.getClientRects().length
          )
            returnFocus.current.focus();
          else trigger.current?.focus();
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            close();
        }}
      >
        <div className="quick-heading">
          <div>
            <span className="eyebrow">FIND YOUR NEXT MOVE</span>
            <h2 id={`${id}-title`}>Quick navigation</h2>
          </div>
          <button
            type="button"
            className="icon-control"
            aria-label="Close quick navigation"
            onClick={close}
          >
            <X size={19} />
          </button>
        </div>
        <div className="quick-search">
          <Search size={20} aria-hidden="true" />
          <input
            ref={input}
            autoFocus
            type="search"
            value={query}
            autoComplete="off"
            spellCheck={false}
            aria-label="Search destinations"
            placeholder="Where would you like to go?"
            aria-describedby={`${id}-count`}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const nodes = resultNodes();
                (event.key === "ArrowDown" ? nodes[0] : nodes.at(-1))?.focus();
              } else if (event.key === "Enter") {
                event.preventDefault();
                resultNodes()[0]?.click();
              }
            }}
          />
        </div>
        <p id={`${id}-count`} className="quick-result-count" role="status">
          {matches.length}{" "}
          {matches.length === 1 ? "destination" : "destinations"}
        </p>
        <ul
          className="quick-results"
          onKeyDown={(event) => {
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
              return;
            const nodes = resultNodes();
            const index = nodes.indexOf(document.activeElement as HTMLElement);
            if (index < 0) return;
            event.preventDefault();
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? nodes.length - 1
                  : (index +
                      (event.key === "ArrowDown" ? 1 : nodes.length - 1)) %
                    nodes.length;
            nodes[next]?.focus();
          }}
        >
          {matches.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                <span className="quick-result-icon">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <span>
                  <strong>{item.label}</strong>
                  {item.description && <small>{item.description}</small>}
                </span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </>
            );
            return (
              <li key={item.id}>
                {item.href !== undefined ? (
                  <Link href={item.href} data-quick-result onClick={close}>
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    data-quick-result
                    onClick={() => {
                      close();
                      item.onSelect();
                    }}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {!matches.length && (
          <div className="quick-empty">
            <Search size={28} aria-hidden="true" />
            <h3>No matching destinations</h3>
            <p>Try a shorter phrase or clear your search.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                input.current?.focus();
              }}
            >
              Clear search
            </button>
          </div>
        )}
        <footer className="quick-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> to explore
          </span>
          <span>
            <kbd>Enter</kbd> to open
          </span>
          <span>
            <kbd>Esc</kbd> to close
          </span>
        </footer>
      </dialog>
    </>
  );
}
