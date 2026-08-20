import type { DatasetQuery } from "@/lib/mcp/catalog";

function boundedInteger(value: number | undefined, fallback: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.trunc(value as number)));
}

function requireText(value: string | undefined, label: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`Il filtro ${label} è obbligatorio per questo dataset.`);
  return normalized;
}

function referencePeriod(query: DatasetQuery) {
  if (query.month !== undefined && query.year === undefined) {
    throw new Error("Per scegliere il mese devi indicare anche l’anno.");
  }
  return {
    year: query.year,
    month: query.month,
  };
}

function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function queryPublicDataset(query: DatasetQuery): Promise<unknown> {
  const limit = boundedInteger(query.limit, 50, 1, 100);
  const offset = boundedInteger(query.offset, 0, 0, 100_000);

  switch (query.dataset) {
    case "siope_comuni": {
      const { availableSiopeYears, getSiopeMunicipalSnapshot } = await import("@/lib/siope-snapshot");
      const year = query.year ?? availableSiopeYears[0];
      if (!availableSiopeYears.includes(year)) {
        throw new Error(`Anno SIOPE non disponibile. Anni validi: ${availableSiopeYears.join(", ")}.`);
      }
      const snapshot = getSiopeMunicipalSnapshot(year);
      const region = query.region?.trim().toLocaleLowerCase("it-IT");
      if (!region) return jsonSafe(snapshot);
      return jsonSafe({
        ...snapshot,
        regions: snapshot.regions.filter((item) => item.region.toLocaleLowerCase("it-IT") === region),
        topMunicipalities: snapshot.topMunicipalities.filter((item) => item.region.toLocaleLowerCase("it-IT") === region),
      });
    }
    case "openbdap_spesa_stato": {
      const period = referencePeriod(query);
      const { getStateSpendingSnapshot } = await import("@/lib/bdap-payments");
      return jsonSafe(await getStateSpendingSnapshot(period));
    }
    case "openbdap_amministrazione": {
      const code = requireText(query.code, "code");
      const period = referencePeriod(query);
      const { getStateAdministrationSpending } = await import("@/lib/bdap-payments");
      return jsonSafe(await getStateAdministrationSpending(code, period));
    }
    case "openbdap_opere_pubbliche": {
      const cup = requireText(query.cup, "cup");
      const { getPublicWorksByCup } = await import("@/lib/bdap-public-works");
      return jsonSafe(await getPublicWorksByCup(cup));
    }
    case "opencivitas_fabbisogni": {
      const { openCivitasSnapshot } = await import("@/lib/opencivitas-snapshot");
      if (query.year && query.year !== openCivitasSnapshot.referenceYear) {
        throw new Error(`OpenCivitas è disponibile per il ${openCivitasSnapshot.referenceYear}.`);
      }
      const region = query.region?.trim().toLocaleUpperCase("it-IT");
      const code = query.code?.trim();
      const matches = openCivitasSnapshot.municipalities.filter((item) =>
        (!region || item.region === region) && (!code || item.istatCode === code));
      return jsonSafe({
        referenceYear: openCivitasSnapshot.referenceYear,
        publishedAt: openCivitasSnapshot.publishedAt,
        pagination: { total: matches.length, offset, limit, returned: matches.slice(offset, offset + limit).length },
        data: matches.slice(offset, offset + limit),
        coverage: openCivitasSnapshot.coverage,
        methodology: openCivitasSnapshot.methodology,
        provenance: openCivitasSnapshot.source,
      });
    }
    case "opencoesione_progetti": {
      const { openCoesionePaymentCostRatio, openCoesioneSnapshot } = await import("@/lib/opencoesione-snapshot");
      return jsonSafe({ ...openCoesioneSnapshot, derived: { paymentCostRatio: openCoesionePaymentCostRatio } });
    }
    case "ipa_enti": {
      const { getIpaEntityByCode, searchIpaEntities } = await import("@/lib/ipa");
      if (query.code?.trim()) {
        const record = await getIpaEntityByCode(query.code.trim());
        return jsonSafe({ record, found: record !== null });
      }
      return jsonSafe(await searchIpaEntities({ query: query.query, limit, offset }));
    }
    case "ipa_struttura": {
      const code = requireText(query.code, "code");
      const { getIpaOrganizationStructure } = await import("@/lib/ipa-structure");
      return jsonSafe(await getIpaOrganizationStructure(code, limit, offset));
    }
    case "mef_partecipazioni": {
      const { mefParticipationsSnapshot } = await import("@/lib/mef-participations-snapshot");
      return jsonSafe(mefParticipationsSnapshot);
    }
    case "consulenti_incarichi": {
      const { consulentiSnapshot } = await import("@/lib/consulenti-snapshot");
      const year = query.year;
      const filterYear = <T extends { year: number }>(items: T[]) => year ? items.filter((item) => item.year === year) : items;
      return jsonSafe({
        ...consulentiSnapshot,
        externalAppointments: filterYear(consulentiSnapshot.externalAppointments),
        employeeAppointments: filterYear(consulentiSnapshot.employeeAppointments),
      });
    }
    case "parlamento_bilanci": {
      const { parliamentSnapshot } = await import("@/lib/parliament-snapshot");
      return jsonSafe({
        ...parliamentSnapshot,
        chambers: parliamentSnapshot.chambers
          .filter((item) => !query.chamber || item.id === query.chamber)
          .map((item) => ({ ...item, statements: item.statements.filter((statement) => !query.year || statement.year === query.year) }))
          .filter((item) => item.statements.length > 0),
      });
    }
    case "controlli_segnali": {
      const {
        auditClassifications,
        auditMethodology,
        auditReviewedAt,
        auditSignals,
        procurementComparisons,
      } = await import("@/lib/audit-data");
      const area = query.area?.trim().toLocaleLowerCase("it-IT");
      return jsonSafe({
        reviewedAt: auditReviewedAt,
        signals: auditSignals.filter((signal) =>
          (!area || signal.area.toLocaleLowerCase("it-IT") === area) &&
          (!query.year || signal.referenceDate.startsWith(String(query.year)))),
        classifications: auditClassifications,
        procurementComparisons,
        methodology: auditMethodology,
      });
    }
    case "registro_fonti": {
      const { publicSources } = await import("@/lib/sources");
      const term = query.query?.trim().toLocaleLowerCase("it-IT");
      return jsonSafe(publicSources.filter((source) => !term || [source.name, source.owner, source.area, source.note]
        .some((value) => value.toLocaleLowerCase("it-IT").includes(term))));
    }
  }
}
