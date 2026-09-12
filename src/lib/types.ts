export const PROJECT_TYPES = [
  "high-rise",
  "infrastructure",
  "excavation",
  "road-works",
  "mep",
  "demolition",
  "other",
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const ACTIVITIES_BY_PROJECT_TYPE: Record<ProjectType, string[]> = {
  "high-rise": [
    "scaffolding erection",
    "working at heights",
    "crane lifting",
    "concrete pouring",
    "formwork installation",
  ],
  infrastructure: [
    "welding / hot work",
    "crane lifting",
    "pipe laying",
    "road works",
  ],
  excavation: [
    "excavation / trenching",
    "confined space entry",
    "shoring installation",
  ],
  "road-works": ["asphalt paving", "traffic management", "road works"],
  mep: ["welding / hot work", "confined space entry", "electrical works"],
  demolition: ["demolition", "working at heights", "dust control"],
  other: [],
};

export const LOCATION_CONTEXTS = ["urban", "coastal", "desert-open"] as const;
export type LocationContext = (typeof LOCATION_CONTEXTS)[number];

export const CLIMATE_CONDITIONS = [
  "extreme_heat",
  "high_humidity",
  "dust_storm",
  "high_wind",
  "normal",
] as const;
export type ClimateCondition = (typeof CLIMATE_CONDITIONS)[number];

export interface ClimateFlag {
  ruleKey: string;
  message: string;
  legalReference: string;
}

export interface HazardLibraryEntry {
  id: string;
  project_type: string;
  activity: string;
  hazard_description: string;
  default_likelihood: number;
  default_severity: number;
  standard_control_measures: string;
  regulatory_reference: string | null;
  climate_trigger: string | null;
}

export interface RiskMatrixRow {
  hazard: string;
  likelihood_before: number;
  severity_before: number;
  control_measures: string;
  likelihood_after: number;
  severity_after: number;
  regulatory_reference: string | null;
}

export type AssessmentStatus = "draft" | "reviewed";

export interface AssessmentInput {
  projectType: ProjectType;
  activity: string;
  locationContext: LocationContext;
  assessmentDate: string; // ISO date
  expectedConditions: ClimateCondition[];
  crewSize?: number;
  workDuration?: string;
  existingControls?: string;
}
