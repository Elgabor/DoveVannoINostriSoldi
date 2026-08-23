import "server-only";

import type { IpaEntity } from "@/lib/ipa";
import type { OpenCivitasMunicipality, OpenCivitasSnapshot } from "@/lib/data/opencivitas-contract";
import type { PnrrChildcareMeta } from "@/lib/data/pnrr-childcare-contract";
import type { MefIrpefQueryResult, MefIrpefTerritoryRecord } from "@/lib/mef-irpef-snapshot";
import {
  getSiopeMunicipalityDetail,
  type SiopeMunicipalityDetail,
} from "@/lib/siope-municipality-detail";
import { getSiopeMunicipalSnapshot } from "@/lib/siope-snapshot";

export type ProfileUnavailableReason = "outside_source_scope" | "no_matching_record";

export type ProfileSection<T> =
  | Readonly<{ status: "available"; data: T }>
  | Readonly<{ status: "out_of_scope" | "not_found"; reason: ProfileUnavailableReason; message: string }>;

export type MunicipalityProfile = Readonly<{
  identifiers: Readonly<{
    codiceIpa: string;
    taxCode: string;
    istatCode: string | null;
    joinMethod: "exact_official_identifiers";
  }>;
  siope: Readonly<{
    status: "available";
    data: SiopeMunicipalityDetail;
    methodology: ReturnType<typeof getSiopeMunicipalSnapshot>["methodology"];
    sources: readonly Readonly<{ year: number; url: string; observedAt: string }>[];
  }>;
  irpef: ProfileSection<Readonly<{
    period: MefIrpefQueryResult["period"];
    record: MefIrpefTerritoryRecord;
    methodology: MefIrpefQueryResult["methodology"];
    source: MefIrpefQueryResult["provenance"]["source"];
  }>>;
  openCivitas: ProfileSection<Readonly<{
    referenceYear: number;
    publishedAt: string;
    record: OpenCivitasMunicipality;
    methodology: OpenCivitasSnapshot["methodology"];
    source: OpenCivitasSnapshot["source"];
  }>>;
  pnrrChildcare: Readonly<{
    status: "available";
    data: Readonly<{
      referenceDate: string;
      submeasure: Readonly<{ code: string; label: string }>;
      totalProjects: number;
      knownTotalFundingCents: number;
      projectsWithKnownFunding: number;
      projects: readonly Readonly<{
        cup: string;
        title: string;
        progress: string | null;
        phase: string | null;
        totalFundingCents: number | null;
      }>[];
      methodology: PnrrChildcareMeta["methodology"];
      source: PnrrChildcareMeta["source"];
    }>;
  }>;
}>;

function unavailable(
  status: "out_of_scope" | "not_found",
  reason: ProfileUnavailableReason,
  message: string,
): ProfileSection<never> {
  return { status, reason, message };
}

function normalizedIstatCode(value: string | null): string | null {
  const code = value?.trim() ?? "";
  return /^\d{6}$/.test(code) ? code : null;
}

function normalizedCadastralCode(value: string | null): string | null {
  const code = value?.trim().toLocaleUpperCase("it-IT") ?? "";
  return /^[A-Z][0-9]{3}$/.test(code) ? code : null;
}

export async function getMunicipalityProfile(entity: IpaEntity): Promise<MunicipalityProfile | null> {
  const taxCode = entity.codiceFiscale?.trim() ?? "";
  if (!/^\d{11}$/.test(taxCode)) return null;
  const siope = getSiopeMunicipalityDetail(taxCode);
  if (!siope || siope.codiceIpa !== entity.codiceIpa) return null;
  const candidateIstatCode = normalizedIstatCode(entity.sede.codiceComuneIstat);
  const cadastralCode = normalizedCadastralCode(entity.sede.codiceCatastaleComune);

  const [irpefModule, openCivitasModule, pnrrModule] = await Promise.all([
    import("@/lib/mef-irpef-snapshot"),
    import("@/lib/opencivitas-snapshot"),
    import("@/lib/pnrr-childcare-snapshot"),
  ]);

  let irpef: MunicipalityProfile["irpef"];
  let istatCode: string | null = null;
  if (!candidateIstatCode || !cadastralCode) {
    irpef = unavailable(
      "not_found",
      "no_matching_record",
      "IPA non pubblica codici ISTAT e catastale comunali validi per verificare il collegamento MEF.",
    );
  } else {
    try {
      const result = irpefModule.queryMefMunicipalIrpef({
        year: 2024,
        level: "municipality",
        code: candidateIstatCode,
        limit: 1,
      });
      const record = result.data[0];
      if (
        record?.territory.level !== "municipality" ||
        record.territory.cadastralCode !== cadastralCode
      ) {
        irpef = unavailable(
          "not_found",
          "no_matching_record",
          "I codici ISTAT e catastale IPA non riconciliano con lo stesso record MEF.",
        );
      } else {
        istatCode = candidateIstatCode;
        irpef = {
          status: "available",
          data: {
            period: result.period,
            record,
            methodology: result.methodology,
            source: result.provenance.source,
          },
        };
      }
    } catch (error) {
      if (!(error instanceof irpefModule.MefIrpefQueryError) || error.code !== "not_found") throw error;
      irpef = unavailable(
        "not_found",
        "no_matching_record",
        `Il rilascio MEF 2024 non contiene un Comune con codice ISTAT ${candidateIstatCode}.`,
      );
    }
  }

  const openCivitasSnapshot = openCivitasModule.openCivitasSnapshot;
  const openCivitasRecord = istatCode
    ? openCivitasSnapshot.municipalities.find((item) => item.istatCode === istatCode)
    : undefined;
  let openCivitas: MunicipalityProfile["openCivitas"];
  if (openCivitasRecord) {
    openCivitas = {
      status: "available",
      data: {
        referenceYear: openCivitasSnapshot.referenceYear,
        publishedAt: openCivitasSnapshot.publishedAt,
        record: openCivitasRecord,
        methodology: openCivitasSnapshot.methodology,
        source: openCivitasSnapshot.source,
      },
    };
  } else if (
    siope.region &&
    !openCivitasSnapshot.coverage.regionNames.includes(siope.region.toLocaleUpperCase("it-IT"))
  ) {
    openCivitas = unavailable(
      "out_of_scope",
      "outside_source_scope",
      "OpenCivitas 2022 copre soltanto i Comuni delle Regioni a statuto ordinario.",
    );
  } else {
    openCivitas = unavailable(
      "not_found",
      "no_matching_record",
      istatCode
        ? `OpenCivitas 2022 non contiene un record collegabile al codice ISTAT ${istatCode}.`
        : "IPA non pubblica un codice ISTAT comunale valido per collegare OpenCivitas.",
    );
  }

  const pnrrProjects = [...pnrrModule.getPnrrChildcareProjectsByImplementerTaxCode(taxCode)]
    .sort((left, right) => left.cup.localeCompare(right.cup, "en"));
  const projectsWithKnownFunding = pnrrProjects.filter((project) => project.funding.totalCents !== null);

  return {
    identifiers: {
      codiceIpa: entity.codiceIpa,
      taxCode,
      istatCode,
      joinMethod: "exact_official_identifiers",
    },
    siope: {
      status: "available",
      data: siope,
      methodology: getSiopeMunicipalSnapshot().methodology,
      sources: siope.years.map((year) => {
        const snapshot = getSiopeMunicipalSnapshot(year.year);
        return { year: year.year, url: snapshot.source.siopeMovementsUrl, observedAt: year.observedAt };
      }),
    },
    irpef,
    openCivitas,
    pnrrChildcare: {
      status: "available",
      data: {
        referenceDate: pnrrModule.pnrrChildcareData.referenceDate,
        submeasure: pnrrModule.pnrrChildcareData.submeasure,
        totalProjects: pnrrProjects.length,
        knownTotalFundingCents: projectsWithKnownFunding.reduce(
          (total, project) => total + (project.funding.totalCents ?? 0),
          0,
        ),
        projectsWithKnownFunding: projectsWithKnownFunding.length,
        projects: pnrrProjects.slice(0, 6).map((project) => ({
          cup: project.cup,
          title: project.title,
          progress: project.status.progress,
          phase: project.status.phase,
          totalFundingCents: project.funding.totalCents,
        })),
        methodology: pnrrModule.pnrrChildcareMeta.methodology,
        source: pnrrModule.pnrrChildcareMeta.source,
      },
    },
  };
}
