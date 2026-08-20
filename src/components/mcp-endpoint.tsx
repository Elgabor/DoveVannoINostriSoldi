"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "@/app/mcp/mcp.module.css";

export function McpEndpoint() {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const resetTimer = useRef<number | null>(null);
  const origin = useSyncExternalStore(
    () => () => undefined,
    () => window.location.origin,
    () => "",
  );
  const endpoint = `${origin}/api/mcp`;

  useEffect(() => () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
  }, []);

  async function copyEndpoint() {
    if (!origin) return;
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    try {
      await navigator.clipboard.writeText(endpoint);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
    resetTimer.current = window.setTimeout(() => setStatus("idle"), 2400);
  }

  return (
    <div className={styles.endpointRow}>
      <code>{endpoint}</code>
      <button className="btn" type="button" onClick={copyEndpoint} disabled={!origin}>
        {status === "copied" ? "Copiato" : status === "error" ? "Copia non riuscita" : "Copia endpoint"}
      </button>
      <span className={styles.srStatus} role="status" aria-live="polite">
        {status === "copied" ? "Endpoint MCP copiato negli appunti." : status === "error" ? "Copia non riuscita. Seleziona e copia manualmente l’indirizzo." : ""}
      </span>
    </div>
  );
}
