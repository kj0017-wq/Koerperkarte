import * as database from "firebase/database";
import fallbackDermatomes from "@/data/dermatomes.json";
import fallbackMyotomes from "@/data/myotomes.json";
import fallbackTriggerpoints from "@/data/triggerpoints.json";
import { firebaseDatabaseUrl, realtimeDb } from "@/lib/firebase";
import type { BodyMapBlock, DermatomeRegion, MuscleMapItem, MyotomeGroup } from "@/lib/types";

const { get, ref, remove, set } = database as any;


export type AnatomyData = {
  muscles: MuscleMapItem[];
  dermatomeRegions: DermatomeRegion[];
  myotomeGroups: MyotomeGroup[];
  blocks: BodyMapBlock[];
  source: "realtime" | "local";
};


export async function isAdminUser(uid: string): Promise<boolean> {
  try {
    const snapshot = await get(ref(realtimeDb, `admins/${uid}`));
    return snapshot.exists() && snapshot.val() === true;
  } catch {
    return false;
  }
}
export async function saveAnatomyItem<T extends { id: string }>(collection: "muscles" | "dermatomes" | "myotomes", item: T): Promise<void> {
  await set(ref(realtimeDb, `${collection}/${item.id}`), item);
}

export async function deleteAnatomyItem(collection: "muscles" | "dermatomes" | "myotomes", id: string): Promise<void> {
  await remove(ref(realtimeDb, `${collection}/${id}`));
}
const localData: AnatomyData = {
  muscles: normalizeMuscles(fallbackTriggerpoints.muscles),
  dermatomeRegions: normalizeDermatomes(fallbackDermatomes.regions),
  myotomeGroups: normalizeMyotomes(fallbackMyotomes.groups),
  blocks: [],
  source: "local"
};

export async function loadAnatomyData(): Promise<AnatomyData> {
  try {
    const [muscles, dermatomeRegions, myotomeGroups, blocks] = await Promise.all([
      readRealtimeList<MuscleMapItem>("muscles"),
      readRealtimeList<DermatomeRegion>("dermatomes"),
      readRealtimeList<MyotomeGroup>("myotomes"),
      readRealtimeList<BodyMapBlock>("blocks")
    ]);

    const hasRealtimeData = muscles.length > 0 || dermatomeRegions.length > 0 || myotomeGroups.length > 0 || blocks.length > 0;

    if (!hasRealtimeData) {
      return localData;
    }

    return {
      muscles: normalizeMuscles(muscles.length ? muscles : localData.muscles),
      dermatomeRegions: normalizeDermatomes(dermatomeRegions.length ? dermatomeRegions : localData.dermatomeRegions),
      myotomeGroups: normalizeMyotomes(myotomeGroups.length ? myotomeGroups : localData.myotomeGroups),
      blocks: normalizeBlocks(blocks),
      source: "realtime"
    };
  } catch (error) {
    console.warn("Realtime Database konnte nicht geladen werden. Lokale Demo-Daten werden verwendet.", error);
    return localData;
  }
}


function normalizeMuscles(items: MuscleMapItem[]): MuscleMapItem[] {
  return items
    .filter((item) => item && item.id)
    .map((item) => ({
      ...item,
      id: String(item.id),
      name: asString(item.name, item.id),
      bodyArea: asString(item.bodyArea, "Koerper"),
      course: asString(item.course, "Noch zu ergaenzen."),
      explanation: asString(item.explanation, "Noch zu ergaenzen."),
      painRegions: asStringArray(item.painRegions),
      triggerpoints: asArray<Record<string, unknown>>(item.triggerpoints).map((point, index) => ({
        ...point,
        id: asString(point.id, `${item.id}-tp-${index + 1}`),
        label: asString(point.label, `TP ${index + 1}`),
        x: asNumber(point.x, 200),
        y: asNumber(point.y, 200),
        painRegions: point.painRegions ? asStringArray(point.painRegions) : undefined
      })),
      referralArea: asString(item.referralArea, "Noch zu ergaenzen."),
      referralPath: asString(item.referralPath, "")
    }));
}

function normalizeBlocks(items: BodyMapBlock[]): BodyMapBlock[] {
  return items
    .filter((item) => item && item.id)
    .map((item) => ({
      ...item,
      id: String(item.id),
      name: asString(item.name, item.id),
      bodyArea: asString(item.bodyArea, "Koerper"),
      course: asString(item.course, "Noch zu ergaenzen."),
      explanation: asString(item.explanation, "Noch zu ergaenzen."),
      painRegions: asStringArray(item.painRegions),
      referralArea: asString(item.referralArea, "Noch zu ergaenzen."),
      referralPath: asString(item.referralPath, "")
    }));
}
function normalizeDermatomes(items: DermatomeRegion[]): DermatomeRegion[] {
  return items
    .filter((item) => item && item.id)
    .map((item) => ({
      ...item,
      id: String(item.id),
      name: asString(item.name, item.id),
      segments: asStringArray(item.segments),
      description: asString(item.description, "Noch zu ergaenzen."),
      mapPath: asString(item.mapPath, "")
    }));
}

function normalizeMyotomes(items: MyotomeGroup[]): MyotomeGroup[] {
  return items
    .filter((item) => item && item.id)
    .map((item) => ({
      ...item,
      id: String(item.id),
      name: asString(item.name, item.id),
      movement: asString(item.movement, "Noch zu ergaenzen."),
      segments: asStringArray(item.segments),
      description: asString(item.description, "Noch zu ergaenzen."),
      mapPath: asString(item.mapPath, "")
    }));
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function asStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === "string") return value.split(/[|,;]/).map((item) => item.trim()).filter(Boolean);
  return [];
}

async function readRealtimeList<T extends { id: string }>(path: string): Promise<T[]> {
  try {
    const response = await fetch(`${firebaseDatabaseUrl}/${path}.json`, { cache: "no-store" });
    if (!response.ok) throw new Error(`REST ${path} failed with ${response.status}`);
    const value = (await response.json()) as Record<string, Omit<T, "id"> & { id?: string }> | Array<Omit<T, "id"> & { id?: string }> | null;
    return valueToList<T>(value);
  } catch (restError) {
    console.warn(`REST-Laden fuer ${path} fehlgeschlagen. Firebase SDK wird versucht.`, restError);
  }

  const snapshot = await get(ref(realtimeDb, path));

  if (!snapshot.exists()) {
    return [];
  }

  return valueToList<T>(snapshot.val());
}

function valueToList<T extends { id: string }>(
  value: Record<string, Omit<T, "id"> & { id?: string }> | Array<Omit<T, "id"> & { id?: string }> | null
): T[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item, index) => ({
      ...item,
      id: item.id ?? String(index)
    })) as T[];
  }

  return Object.entries(value).map(([id, data]) => ({
    ...data,
    id: data.id ?? id
  })) as T[];
}




