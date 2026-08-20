"use client";

import { useState } from "react";
import styles from "./info-tooltip.module.css";

export function InfoTooltip({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={styles.wrapper}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          event.stopPropagation();
        }
      }}
    >
      <button
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-controls={id}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
      >
        ?
      </button>
      <span className={styles.tooltip} data-open={open} id={id} role="tooltip">
        {children}
      </span>
    </span>
  );
}
