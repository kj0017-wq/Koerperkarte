export type AnatomyMode = "triggerpoints" | "dermatomes" | "myotomes" | "nerves" | "future";

export type LayerState = {
  anatomy: boolean;
  triggerpoints: boolean;
  referral: boolean;
  segments: boolean;
};

export type MapSelection =
  | { type: "muscle"; id: string }
  | { type: "triggerpoint"; muscleId: string; pointId: string; mapView: MapView }
  | { type: "painRegion"; id: string }
  | { type: "block"; id: string }
  | { type: "dermatome"; id: string }
  | { type: "myotome"; id: string }
  | { type: "nerve"; id: string };

export type MapView = "front" | "back" | "face";

export type TriggerPoint = {
  id: string;
  label: string;
  x: number;
  y: number;
  mapType?: MapView | "body" | "head-side" | "neck-back";
  bodySide?: "left" | "right" | "midline" | "bilateral" | "unknown";
  anatomicalLocation?: string;
  painRegions?: string[];
  referralArea?: string;
  sourceFile?: string;
  sourcePage?: string | number;
  reviewStatus?: string;
  notes?: string;
};

export type MuscleMapItem = {
  id: string;
  name: string;
  bodyArea: string;
  course: string;
  explanation: string;
  painRegions: string[];
  triggerpoints: TriggerPoint[];
  referralArea: string;
  referralPath: string;
};

export type BodyMapBlock = {
  id: string;
  name: string;
  bodyArea: string;
  course: string;
  explanation: string;
  painRegions: string[];
  referralArea: string;
  referralPath: string;
  sourceFile?: string;
  sourcePage?: string | number;
  reviewStatus?: string;
  notes?: string;
};

export type DermatomeRegion = {
  id: string;
  name: string;
  segments: string[];
  description: string;
  mapPath: string;
};

export type MyotomeGroup = {
  id: string;
  name: string;
  movement: string;
  segments: string[];
  description: string;
  mapPath: string;
};

export type PeripheralNerve = {
  id: string;
  name: string;
  plexus: string;
  segments: string[];
  course: string;
  distribution: string;
  mapPath: string;
  territoryPath?: string;
};

export type DataSourceState = "loading" | "realtime" | "local";


