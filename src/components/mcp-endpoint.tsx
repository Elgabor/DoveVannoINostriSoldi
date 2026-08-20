"use client";

import { useState, useSyncExternalStore } from "react";
import styles from "@/app/mcp/mcp.module.css";

export function McpEndpoint() {
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(
    () => () => undefined,
    () => window.location.origin,
    () => "",
  );
  const endpoint = `${origin}/api/mcp`;

  async function copyEndpoint() {
    await navigator.clipboard.writeText(endpoint);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className={styles.endpointRow}>
      <code>{endpoint}</code>
      <button className="btn" type="button" onClick={copyEndpoint}>
        {copied ? "Copiato" : "Copia endpoint"}
      </button>
    </div>
  );
}
