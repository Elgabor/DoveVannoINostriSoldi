"use client";

import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import type { TreemapNode } from "recharts";
import type { PcmFinancialMission } from "@/lib/data/pcm-financial-contract";
import { treemapTile } from "@/lib/treemap-palette";
import styles from "./pcm-mission-treemap.module.css";

const compactEuro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const exactEuro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentage = new Intl.NumberFormat("it-IT", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type MissionNode = TreemapNode & {
  shortLabel?: string;
  fullLabel?: string;
  paymentsCents?: number;
  share?: number;
};

function tile(props: TreemapNode) {
  const node = props as MissionNode;
  const showLabel = node.width >= 128 && node.height >= 62;
  const showAmount = node.width >= 150 && node.height >= 92;
  const { fill, ink } = treemapTile(node.index);
  const inkClass = ink === "light" ? styles.tileInkLight : styles.tileInkDark;

  return (
    <g>
      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        fill={fill}
        stroke="var(--color-raised)"
        strokeWidth={2}
      />
      {showLabel ? (
        <>
          <text x={node.x + 12} y={node.y + 25} className={`${styles.tileLabel} ${inkClass}`}>
            {node.shortLabel}
          </text>
          <text x={node.x + 12} y={node.y + 45} className={`${styles.tileShare} ${inkClass}`}>
            {percentage.format(node.share ?? 0)}
          </text>
          {showAmount ? (
            <text x={node.x + 12} y={node.y + 66} className={`${styles.tileAmount} ${inkClass}`}>
              {compactEuro.format((node.paymentsCents ?? 0) / 100)}
            </text>
          ) : null}
        </>
      ) : null}
    </g>
  );
}

function shortLabel(label: string): string {
  const replacements: Array<[RegExp, string]> = [
    [/^Organi costituzionali.+$/i, "Presidenza e organi"],
    [/^Diritti sociali.+$/i, "Diritti sociali e famiglia"],
    [/^Servizi istituzionali.+$/i, "Servizi istituzionali"],
    [/^Competitività.+$/i, "Sviluppo delle imprese"],
    [/^Sviluppo sostenibile.+$/i, "Ambiente e territorio"],
  ];
  return replacements.find(([pattern]) => pattern.test(label))?.[1] ?? label;
}

export function PcmMissionTreemap({
  missions,
  totalCents,
}: {
  missions: PcmFinancialMission[];
  totalCents: number;
}) {
  const data = missions
    .filter((mission) => mission.paymentsCents > 0)
    .map((mission) => ({
      name: mission.code,
      shortLabel: shortLabel(mission.label === "0" ? "Voce senza descrizione" : mission.label),
      fullLabel: mission.label === "0" ? "Voce senza descrizione nella fonte" : mission.label,
      paymentsCents: mission.paymentsCents,
      share: mission.paymentsCents / totalCents,
    }));

  return (
    <figure className={styles.figure}>
      <div
        className={styles.chart}
        role="img"
        aria-label="Come si spezzano i pagamenti 2024 della Presidenza del Consiglio per area di lavoro"
      >
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="paymentsCents"
            nameKey="fullLabel"
            nodeGap={1}
            content={tile}
            isAnimationActive={false}
          >
            <Tooltip
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as MissionNode | undefined;
                if (!active || !point) return null;
                return (
                  <div className={styles.tooltip}>
                    <span>{point.fullLabel}</span>
                    <strong>{exactEuro.format((point.paymentsCents ?? 0) / 100)}</strong>
                    <small>{percentage.format(point.share ?? 0)} del pagato di Palazzo Chigi</small>
                  </div>
                );
              }}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>
      <figcaption>
        Ogni riquadro è un&apos;area di lavoro: più è grande, più pesa sul totale pagato nel 2024.
        Le due aree a zero restano nella tabella e non occupano spazio. I valori esatti sono sotto.
      </figcaption>
    </figure>
  );
}
