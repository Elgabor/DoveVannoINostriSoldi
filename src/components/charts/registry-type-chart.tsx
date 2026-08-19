"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { IpaTypeStat } from "@/lib/ipa-stats";
import styles from "./registry-type-chart.module.css";

const integerFormatter = new Intl.NumberFormat("it-IT");

function compact(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function shortLabel(label: string): string {
  const replacements: Array<[RegExp, string]> = [
    [/^Pubbliche Amministrazioni$/i, "Pubbliche amministrazioni"],
    [/^Gestori di Pubblici Servizi$/i, "Gestori servizi pubblici"],
    [/^Stazioni Appaltanti$/i, "Stazioni appaltanti"],
    [/^Societa/i, "Società"],
  ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(label)) return replacement;
  }

  return label.length > 30 ? `${label.slice(0, 28)}…` : label;
}

export function RegistryTypeChart({ data }: { data: IpaTypeStat[] }) {
  if (data.length === 0) {
    return (
      <div className={styles.empty}>
        Distribuzione non disponibile dalla fonte IPA in questo momento.
      </div>
    );
  }

  const chartData = data.map((record) => ({
    ...record,
    shortLabel: shortLabel(record.label),
  }));

  return (
    <figure className={styles.figure}>
      <div className={styles.chart} role="img" aria-label="Distribuzione dei record IPA per tipologia di ente">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 18, bottom: 2, left: 4 }}
          >
            <CartesianGrid horizontal={false} stroke="rgba(145, 174, 192, 0.12)" />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#8098a7", fontSize: 11 }}
              tickFormatter={compact}
            />
            <YAxis
              dataKey="shortLabel"
              type="category"
              axisLine={false}
              tickLine={false}
              width={176}
              tick={{ fill: "#b6c8d2", fontSize: 11 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;

                const point = payload[0]?.payload as IpaTypeStat | undefined;
                if (!point) return null;

                return (
                  <div className={styles.tooltip}>
                    <span>{point.label}</span>
                    <strong>{integerFormatter.format(point.value)} record</strong>
                  </div>
                );
              }}
              cursor={{ fill: "rgba(255,255,255,0.025)" }}
              animationDuration={140}
            />
            <Bar
              dataKey="value"
              fill="var(--chart-primary)"
              radius={[0, 3, 3, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className={styles.caption}>
        Conteggio dei record per le tipologie più presenti nel datastore IPA. Il grafico viene calcolato
        tramite query SQL sull&apos;API ufficiale, non da un campione locale.
      </figcaption>
    </figure>
  );
}
