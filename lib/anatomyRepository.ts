import * as database from "firebase/database";
import fallbackDermatomes from "@/data/dermatomes.json";
import fallbackMyotomes from "@/data/myotomes.json";
import fallbackPeripheralNerves from "@/data/peripheralNerves.json";
import fallbackTriggerpoints from "@/data/triggerpoints.json";
import { firebaseDatabaseUrl, realtimeDb } from "@/lib/firebase";
import type { BodyMapBlock, DermatomeRegion, MuscleMapItem, MyotomeGroup, PeripheralNerve } from "@/lib/types";

const { get, ref, remove, set } = database as any;

const REALTIME_LOAD_TIMEOUT_MS = 4500;


export type AnatomyData = {
  muscles: MuscleMapItem[];
  dermatomeRegions: DermatomeRegion[];
  myotomeGroups: MyotomeGroup[];
  peripheralNerves: PeripheralNerve[];
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
  peripheralNerves: normalizePeripheralNerves(fallbackPeripheralNerves.nerves),
  blocks: [],
  source: "local"
};

export async function loadAnatomyData(): Promise<AnatomyData> {
  try {
    const [muscles, dermatomeRegions, myotomeGroups, peripheralNerves, blocks] = await Promise.all([
      readRealtimeList<MuscleMapItem>("muscles"),
      readRealtimeList<DermatomeRegion>("dermatomes"),
      readRealtimeList<MyotomeGroup>("myotomes"),
      readRealtimeList<PeripheralNerve>("nerves"),
      readRealtimeList<BodyMapBlock>("blocks")
    ]);

    const hasRealtimeData = muscles.length > 0 || dermatomeRegions.length > 0 || myotomeGroups.length > 0 || peripheralNerves.length > 0 || blocks.length > 0;

    if (!hasRealtimeData) {
      return localData;
    }

    return {
      muscles: normalizeMuscles(muscles.length ? muscles : localData.muscles),
      dermatomeRegions: normalizeDermatomes(dermatomeRegions.length ? dermatomeRegions : localData.dermatomeRegions),
      myotomeGroups: normalizeMyotomes(myotomeGroups.length ? myotomeGroups : localData.myotomeGroups),
      peripheralNerves: normalizePeripheralNerves(peripheralNerves.length ? peripheralNerves : localData.peripheralNerves),
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
      mapPath: asString(item.mapPath, fallbackDermatomeMapPath(item))
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
      mapPath: asString(item.mapPath, fallbackMyotomeMapPath(item))
    }));
}

function normalizePeripheralNerves(items: PeripheralNerve[]): PeripheralNerve[] {
  return items
    .filter((item) => item && item.id)
    .map((item) => ({
      ...item,
      id: String(item.id),
      name: asString(item.name, item.id),
      plexus: asString(item.plexus, "Peripherer Nerv"),
      segments: asStringArray(item.segments),
      course: asString(item.course, "Noch zu ergaenzen."),
      distribution: asString(item.distribution, "Noch zu ergaenzen."),
      mapPath: asString(item.mapPath, ""),
      territoryPath: asString(item.territoryPath, "")
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
    const response = await fetchWithTimeout(`${firebaseDatabaseUrl}/${path}.json`, REALTIME_LOAD_TIMEOUT_MS);
    if (!response.ok) throw new Error(`REST ${path} failed with ${response.status}`);
    const value = (await response.json()) as Record<string, Omit<T, "id"> & { id?: string }> | Array<Omit<T, "id"> & { id?: string }> | null;
    return valueToList<T>(value);
  } catch (restError) {
    console.warn(`REST-Laden fuer ${path} fehlgeschlagen. Lokale Daten werden verwendet, falls vorhanden.`, restError);
    return [];
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { cache: "no-store", signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
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
function fallbackDermatomeMapPath(item: Pick<DermatomeRegion, "id" | "segments">): string {
  const key = String(item.id || "").toLowerCase();
  const segment = firstSegment(item.segments).toLowerCase();
  const paths: Record<string, string> = {
    c2: "M168 54 C188 36 212 36 232 54 L238 96 C224 116 176 116 162 96 Z",
    c3: "M162 118 C184 104 216 104 238 118 L228 168 C210 178 190 178 172 168 Z",
    c4: "M116 198 C154 174 246 174 284 198 C258 226 142 226 116 198",
    c5: "M250 220 C286 242 314 300 318 360 C294 350 272 314 252 266 C244 246 242 230 250 220",
    c6: "M286 342 C318 378 336 436 328 500 C300 482 284 420 276 364 Z",
    c7: "M266 296 C296 332 316 390 318 452 C292 436 270 372 254 316 Z",
    c8: "M80 330 C108 356 126 416 124 492 C98 474 82 416 72 354 Z",
    t1: "M92 238 C124 252 144 296 150 350 C122 340 98 300 86 252 Z",
    t4: "M146 226 C180 212 220 212 254 226 L250 284 C218 296 182 296 150 284 Z",
    t6: "M148 284 C182 272 218 272 252 284 L248 344 C216 356 184 356 152 344 Z",
    t10: "M154 354 C184 344 216 344 246 354 L242 426 C216 444 184 444 158 426 Z",
    l1: "M150 430 C184 414 216 414 250 430 C238 462 162 462 150 430",
    l2: "M158 492 C184 510 196 566 190 632 C166 616 150 550 146 502 Z M210 632 C204 566 216 510 242 492 L254 502 C250 550 234 616 210 632 Z",
    l3: "M152 556 C178 578 192 632 188 690 C164 674 148 614 144 568 Z M212 690 C208 632 222 578 248 556 L256 568 C252 614 236 674 212 690 Z",
    l4: "M146 642 C170 662 188 716 188 768 C164 756 148 706 140 656 Z M212 768 C212 716 230 662 254 642 L260 656 C252 706 236 756 212 768 Z",
    l5: "M220 514 C250 560 266 642 262 752 C238 734 220 650 210 570 Z",
    s1: "M138 518 C160 564 174 642 170 746 C146 724 132 650 130 574 Z M230 746 C226 642 240 564 262 518 L270 574 C268 650 254 724 230 746 Z",
    s2: "M154 470 C182 452 218 452 246 470 C238 514 218 540 200 548 C182 540 162 514 154 470"
  };
  return paths[key] || paths[segment] || "";
}

function fallbackMyotomeMapPath(item: Pick<MyotomeGroup, "id" | "segments">): string {
  const key = String(item.id || "").toLowerCase();
  const segment = firstSegment(item.segments).toLowerCase();
  const paths: Record<string, string> = {
    c4: "M118 196 C154 176 246 176 282 196 C254 224 146 224 118 196",
    c5: "M122 218 C98 242 78 288 68 340 C92 342 122 304 144 246 Z M256 246 C278 304 308 342 332 340 C322 288 302 242 278 218 Z",
    c6: "M274 316 C308 350 330 416 328 492 C300 474 280 410 264 340 Z",
    c7: "M252 292 C284 324 310 386 318 452 C292 438 266 374 244 318 Z",
    c8: "M78 350 C110 374 130 438 128 504 C100 492 80 426 68 366 Z",
    l2: "M150 476 C180 492 196 548 192 604 C166 596 148 532 142 494 Z M208 604 C204 548 220 492 250 476 L258 494 C252 532 234 596 208 604 Z",
    l3: "M152 530 C180 552 194 610 190 666 C166 654 148 596 144 548 Z M210 666 C206 610 220 552 248 530 L256 548 C252 596 234 654 210 666 Z",
    l4: "M218 548 C246 588 260 654 256 724 C232 706 216 636 208 572 Z",
    l5: "M226 542 C254 590 268 670 262 760 C238 742 222 664 212 582 Z",
    s1: "M140 628 C164 654 176 704 172 760 C146 746 132 700 132 646 Z M228 760 C224 704 236 654 260 628 L268 646 C268 700 254 746 228 760 Z"
  };
  return paths[key] || paths[segment] || "";
}

function firstSegment(segments: unknown): string {
  const values = asStringArray(segments);
  return values[0] || "";
}
