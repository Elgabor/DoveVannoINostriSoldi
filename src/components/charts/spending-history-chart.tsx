"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StateSpendingHistoryPoint } from "@/lib/bdap-history";
import styles from "./spending-history-chart.module.css";

const exactEuro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

function compactEuro(value: number): string {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("it-IT", { maximumFractionDigits: 0 })} mld €`;
  }
  if (absolute >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("it-IT", { maximumFractionDigits: 0 })} mln €`;
  }
  return `${value.toLocaleString("it-IT", { maximumFractionDigits: 0 })} €`;
}

function TooltipCard({
  point,
  mode,
}: {
  point: StateSpendingHistoryPoint;
  mode: "cumulative" | "monthly";
}) {
  const value = mode === "cumulative" ? point.cumulativePaid : point.monthlyPaid;

  return (
    <div className={styles.tooltip}>
      <span>{point.monthName} {point.year}</span>
      <strong>{mode === "cumulative" ? "Cumulato da gennaio" : "Pagamento del mese derivato"}</strong>
      <b>{exactEuro.format(value)}</b>
    </div>
  );
}

export function SpendingHistoryChart({
  data,
}: {
  data: StateSpendingHistoryPoint[];
}) {
  if (data.length === 0) {
    return <div className={styles.empty}>Serie storica non disponibile.</div>;
  }

  return (
    <div className={styles.grid}>
      <figure className={styles.figure}>
        <div className={styles.figureHeader}>
          <div>
            <span>ANDAMENTO CUMULATIVO</span>
            <h3>Pagamenti da inizio anno</h3>
          </div>
          <b>{data.length} snapshot</b>
        </div>
        <div className={styles.chart} role="img" aria-label="Pagamenti cumulati del Bilancio dello Stato da gennaio">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 4 }} accessibilityLayer>
              <CartesianGrid vertical={false} stroke="rgba(145, 174, 192, 0.12)" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#829aa8", fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={72}
                tick={{ fill: "#829aa8", fontSize: 11 }}
                tickFormatter={compactEuro}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0]?.payload as StateSpendingHistoryPoint | undefined;
                  return point ? <TooltipCard point={point} mode="cumulative" /> : null;
                }}
                cursor={{ stroke: "rgba(171, 204, 221, 0.24)" }}
                animationDuration={120}
              />
              <Area
                type="monotone"
                dataKey="cumulativePaid"
                stroke="var(--chart-primary)"
                strokeWidth={2}
                fill="var(--chart-primary)"
                fillOpacity={0.1}
                isAnimationActive={false}
                activeDot={{ r: 4, fill: "var(--chart-primary)", stroke: "#071827", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <figcaption>
          Ogni punto è il totale ufficiale cumulato dal 1° gennaio fino alla fine del mese contabile indicato.
        </figcaption>
      </figure>

      <figure className={styles.figure}>
        <div className={styles.figureHeader}>
          <div>
            <span>FLUSSO DERIVATO</span>
            <h3>Pagamenti attribuiti al singolo mese</h3>
          </div>
          <b>Δ snapshot</b>
        </div>
        <div className={styles.chart} role="img" aria-label="Pagamenti mensili derivati dalla differenza tra snapshot cumulativi RGS">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 4 }} accessibilityLayer>
              <CartesianGrid vertical={false} stroke="rgba(145, 174, 192, 0.12)" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#829aa8", fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={72}
                tick={{ fill: "#829aa8", fontSize: 11 }}
                tickFormatter={compactEuro}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0]?.payload as StateSpendingHistoryPoint | undefined;
                  return point ? <TooltipCard point={point} mode="monthly" /> : null;
                }}
                cursor={{ fill: "rgba(255,255,255,0.025)" }}
                animationDuration={120}
              />
              <Bar
                dataKey="monthlyPaid"
                fill="var(--chart-secondary)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <figcaption>
          Gennaio coincide con il primo snapshot; da febbraio il valore è calcolato come differenza tra due cumulati consecutivi.
        </figcaption>
      </figure>
    </div>
  );
}
