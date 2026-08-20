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
  return (
    <span className={styles.wrapper}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-describedby={id}
      >
        i
      </button>
      <span className={styles.tooltip} id={id} role="tooltip">
        {children}
      </span>
    </span>
  );
}
