"use client";

// Mobile bottom sheet. Pure CSS animation, no framer-motion. Handles backdrop
// tap-to-close + ESC. Children render inside the paper-colored panel.

import { ReactNode, useEffect } from "react";

export function Sheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Prevent body scroll while open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end animate-fade-in">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        className="relative animate-sheet-up bg-paper border-t border-rule-strong shadow-2xl pb-safe"
        style={{
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        {/* Grab handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div
            className="w-9 h-1 rounded-full"
            style={{ background: "var(--c-rule-strong)", opacity: 0.4 }}
          />
        </div>
        {title && (
          <div
            className="px-5 pt-1 pb-3 border-b font-mono uppercase"
            style={{
              borderColor: "var(--c-rule)",
              fontSize: 11,
              letterSpacing: "0.24em",
              color: "var(--c-burgundy)",
            }}
          >
            {title}
          </div>
        )}
        <div className="px-5 pt-4 pb-5">{children}</div>
      </div>
    </div>
  );
}
