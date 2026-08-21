export const ORGANIZATION_TYPES = {
  azienda: "Azienda",
  pa: "Ente pubblico o PA",
  altro: "Altro",
} as const;

export const CONSULTING_TOPICS = {
  lettura: "Lettura con AI di un problema, un dataset o un progetto",
  dashboard: "Report o cruscotto interno con AI",
  formazione: "Formazione all'uso dell'AI",
  applicazione: "Strumento AI per l'impresa o per la PA",
  altro: "Altro",
} as const;

export const PROJECT_BUDGETS = {
  fino_5k: "Fino a 5.000 euro",
  da_5k_a_15k: "Da 5.000 a 15.000 euro",
  da_15k_a_30k: "Da 15.000 a 30.000 euro",
  oltre_30k: "Oltre 30.000 euro",
  non_so: "Non so ancora",
} as const;

export type OrganizationType = keyof typeof ORGANIZATION_TYPES;
export type ConsultingTopic = keyof typeof CONSULTING_TOPICS;
export type ProjectBudget = keyof typeof PROJECT_BUDGETS;
