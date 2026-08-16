"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AnatomyMode,
  BodyMapBlock,
  DermatomeRegion,
  LayerState,
  MapSelection,
  MapView,
  MuscleMapItem,
  MyotomeGroup,
  TriggerPoint
} from "@/lib/types";

type BodyMapProps = {
  mode: AnatomyMode;
  selection: MapSelection;
  layers: LayerState;
  zoom: number;
  muscles: MuscleMapItem[];
  dermatomeRegions: DermatomeRegion[];
  myotomeGroups: MyotomeGroup[];
  blocks: BodyMapBlock[];
  onSelect: (selection: MapSelection) => void;
};

type PainRegion = {
  id: string;
  label: string;
  path: string;
};

type TriggerPointEntry = {
  muscle: MuscleMapItem;
  point: TriggerPoint;
  mapView: MapView;
};

type PositionedTriggerPointEntry = TriggerPointEntry & {
  renderedPoint: { x: number; y: number };
  labelX: number;
  labelY: number;
  labelAnchor: "start" | "end";
};

const frontPainRegions: PainRegion[] = [
  { id: "temple", label: "Schlaefe", path: "M182 78 C196 58 222 58 236 78 C236 104 220 120 198 114 C184 106 176 94 182 78" },
  { id: "neck", label: "Nacken", path: "M176 130 C190 120 214 120 228 130 L222 178 C206 188 190 188 178 178 Z" },
  { id: "shoulder", label: "Schulter", path: "M118 206 C150 176 250 176 282 206 C258 236 142 236 118 206" },
  { id: "upper-arm", label: "Oberarm", path: "M270 240 C302 276 320 334 318 394 C294 380 274 340 254 286 C248 268 252 250 270 240" },
  { id: "forearm", label: "Unterarm", path: "M312 390 C334 426 342 472 330 512 C304 492 294 440 296 398 Z" },
  { id: "low-back", label: "LWS", path: "M152 332 C184 316 218 316 250 332 L244 428 C214 446 184 446 154 428 Z" },
  { id: "hip", label: "Huefte", path: "M134 430 C172 406 230 406 268 430 C258 470 234 496 202 502 C168 496 144 470 134 430" },
  { id: "buttock", label: "Gesaess", path: "M142 454 C168 438 198 438 202 488 C176 510 144 500 134 474 Z" },
  { id: "groin", label: "Leiste", path: "M178 480 C194 470 210 470 226 480 C218 502 186 502 178 480" }
];

const backPainRegions: PainRegion[] = [
  { id: "neck", label: "Nacken", path: "M174 126 C190 116 210 116 226 126 L234 178 C214 190 186 190 166 178 Z" },
  { id: "shoulder", label: "Schulter", path: "M112 202 C148 176 252 176 288 202 C258 238 142 238 112 202" },
  { id: "upper-back", label: "Oberer Ruecken", path: "M130 228 C170 208 230 208 270 228 L254 332 C220 350 180 350 146 332 Z" },
  { id: "scapula", label: "Schulterblatt", path: "M124 236 C156 238 176 272 174 322 C140 330 116 300 112 260 Z M226 322 C224 272 244 238 276 236 L288 260 C284 300 260 330 226 322 Z" },
  { id: "low-back", label: "LWS", path: "M146 330 C180 314 220 314 254 330 L246 430 C216 448 184 448 154 430 Z" },
  { id: "hip", label: "Huefte", path: "M132 426 C170 408 230 408 268 426 C260 468 236 496 202 504 C168 496 140 468 132 426" },
  { id: "buttock", label: "Gesaess", path: "M134 454 C164 434 196 440 202 494 C174 516 140 504 130 474 Z M198 494 C204 440 236 434 266 454 L270 474 C260 504 226 516 198 494 Z" },
  { id: "posterior-thigh", label: "Hinterer Oberschenkel", path: "M136 520 C162 540 188 540 196 526 L188 672 C170 684 148 678 140 658 Z M204 526 C212 540 238 540 264 520 L260 658 C252 678 230 684 212 672 Z" },
  { id: "calf", label: "Wade", path: "M142 664 C166 684 186 684 196 666 L190 766 C176 780 154 776 148 756 Z M204 666 C214 684 234 684 258 664 L252 756 C246 776 224 780 210 766 Z" }
];

const facePainRegions: PainRegion[] = [
  { id: "head", label: "Kopf", path: "M118 72 C142 36 258 36 282 72 C274 118 250 136 200 136 C150 136 126 118 118 72" },
  { id: "forehead", label: "Stirn", path: "M128 112 C160 88 240 88 272 112 L260 168 C224 152 176 152 140 168 Z" },
  { id: "temple", label: "Schlaefe", path: "M94 132 C122 116 144 130 146 170 C132 198 104 198 92 170 Z M254 170 C256 130 278 116 306 132 L308 170 C296 198 268 198 254 170 Z" },
  { id: "eye", label: "Auge", path: "M130 186 C154 170 180 170 204 186 C180 206 154 206 130 186 Z M196 186 C220 170 246 170 270 186 C246 206 220 206 196 186 Z" },
  { id: "orbit", label: "Augenhoehlung", path: "M116 176 C146 148 182 150 208 178 C184 226 144 228 116 198 Z M192 178 C218 150 254 148 284 176 L284 198 C256 228 216 226 192 178 Z" },
  { id: "face", label: "Gesicht", path: "M118 204 C148 182 178 202 184 254 C164 288 128 282 112 244 Z M216 254 C222 202 252 182 282 204 L288 244 C272 282 236 288 216 254 Z" },
  { id: "ear", label: "Ohr", path: "M78 182 C54 182 48 224 62 260 C72 286 92 278 96 246 Z M304 246 C308 278 328 286 338 260 C352 224 346 182 322 182 Z" },
  { id: "jaw", label: "Kiefer", path: "M104 268 C128 346 162 388 200 388 C238 388 272 346 296 268 C268 310 232 326 200 326 C168 326 132 310 104 268" },
  { id: "teeth", label: "Zaehne", path: "M152 286 C182 272 218 272 248 286 C236 316 164 316 152 286" },
  { id: "throat", label: "Hals", path: "M150 390 C172 414 228 414 250 390 L270 488 C230 512 170 512 130 488 Z" },
  { id: "neck", label: "Nacken", path: "M128 402 C158 432 242 432 272 402 L286 492 C238 520 162 520 114 492 Z" }
];

const mapTabs: Array<{ id: MapView; label: string }> = [
  { id: "front", label: "Vorderseite" },
  { id: "back", label: "Rueckseite" },
  { id: "face", label: "Gesicht" }
];

const faceKeywords = [
  "kopf",
  "gesicht",
  "schlaefe",
  "stirn",
  "auge",
  "orbita",
  "ohr",
  "kiefer",
  "zaehn",
  "mund",
  "wange",
  "kinn",
  "temple",
  "jaw",
  "face",
  "ear",
  "eye",
  "teeth",
  "forehead",
  "throat"
];

export function BodyMap({
  mode,
  selection,
  layers,
  zoom,
  muscles,
  dermatomeRegions,
  myotomeGroups,
  blocks,
  onSelect
}: BodyMapProps) {
  const [mapView, setMapView] = useState<MapView>("front");
  const [hoveredPoint, setHoveredPoint] = useState<PositionedTriggerPointEntry | null>(null);
  const [selectedPointKey, setSelectedPointKey] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "triggerpoints" && mapView !== "front") setMapView("front");
  }, [mapView, mode]);

  useEffect(() => {
    setHoveredPoint(null);
  }, [mapView, mode, selection]);

  const selectedMuscle =
    selection.type === "muscle"
      ? muscles.find((item) => item.id === selection.id) ?? muscles[0]
      : selection.type === "triggerpoint"
        ? muscles.find((item) => item.id === selection.muscleId) ?? muscles[0]
        : null;
  const visibleTriggerpointMuscles = useMemo(() => {
    if (selection.type === "painRegion") {
      return muscles.filter((item) => (item.painRegions ?? []).includes(selection.id));
    }

    if (selection.type === "block") {
      const block = blocks.find((item) => item.id === selection.id);
      const regions = new Set(block?.painRegions ?? []);
      return muscles.filter((item) => (item.painRegions ?? []).some((region) => regions.has(region)));
    }

    return selectedMuscle ? [selectedMuscle] : [];
  }, [blocks, muscles, selectedMuscle, selection]);

  const triggerPointEntries = useMemo<TriggerPointEntry[]>(
    () =>
      visibleTriggerpointMuscles.flatMap((muscle) =>
        (muscle.triggerpoints ?? []).flatMap((point) =>
          inferMapViews(point, muscle).map((mapView) => ({
            muscle,
            point,
            mapView
          }))
        )
      ),
    [visibleTriggerpointMuscles]
  );

  useEffect(() => {
    if (mode !== "triggerpoints" || triggerPointEntries.length === 0) return;
    if (triggerPointEntries.some((entry) => entry.mapView === mapView)) return;

    setMapView(triggerPointEntries.some((entry) => entry.mapView === "face") ? "face" : triggerPointEntries.some((entry) => entry.mapView === "back") ? "back" : "front");
  }, [mapView, mode, triggerPointEntries]);

  const activePainRegions = mapView === "face" ? facePainRegions : mapView === "back" ? backPainRegions : frontPainRegions;
  const activeViewBox = mapView === "face" ? "0 0 400 520" : "0 0 400 820";
  const title = mapView === "face" ? "Kopf- und Gesichtskarte" : mapView === "back" ? "Dorsale Koerperansicht" : "Ventrale Koerperansicht";
  const visibleEntries = useMemo(
    () => layoutTriggerPoints(triggerPointEntries.filter((entry) => entry.mapView === mapView), mapView),
    [mapView, triggerPointEntries]
  );
  const selectedPoint = visibleEntries.find((entry) => triggerPointKey(entry) === selectedPointKey) ?? null;
  const activePoint = hoveredPoint ?? selectedPoint;
  const showAllLabels = visibleEntries.length <= 8;

  useEffect(() => {
    if (selection.type !== "triggerpoint") return;

    const key = triggerPointKeyFromParts(selection.mapView, selection.muscleId, selection.pointId);
    if (mapView !== selection.mapView) setMapView(selection.mapView);
    if (selectedPointKey !== key) setSelectedPointKey(key);
  }, [mapView, selectedPointKey, selection]);

  useEffect(() => {
    if (visibleEntries.length === 0) {
      setSelectedPointKey(null);
      return;
    }

    if (!selectedPointKey || !visibleEntries.some((entry) => triggerPointKey(entry) === selectedPointKey)) {
      setSelectedPointKey(triggerPointKey(visibleEntries[0]));
    }
  }, [selectedPointKey, visibleEntries]);

  function selectEntry(entry: TriggerPointEntry) {
    const key = triggerPointKey(entry);
    setMapView(entry.mapView);
    setSelectedPointKey(key);
    setHoveredPoint(null);
    onSelect({ type: "triggerpoint", muscleId: entry.muscle.id, pointId: entry.point.id, mapView: entry.mapView });
  }

  function selectPoint(entry: PositionedTriggerPointEntry) {
    setHoveredPoint(entry);
    selectEntry(entry);
  }


  return (
    <section className="glass order-1 overflow-hidden rounded-lg p-3 sm:p-4 lg:order-2 lg:min-h-[720px]">
      <div className="mb-3 flex flex-col gap-2 sm:mb-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">Interaktive Karte</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950 sm:text-xl">{title}</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between xl:justify-end">
          {mode === "triggerpoints" && (
            <div className="inline-flex w-fit rounded-lg border border-slate-200 bg-white p-1">
              {mapTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMapView(tab.id)}
                  className={`focus-ring rounded-md px-3 py-2 text-sm font-semibold transition ${
                    mapView === tab.id ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
          <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">
            {interactionHint(mode)}
          </div>
        </div>
      </div>

      {mode === "triggerpoints" && visibleEntries.length > 0 && (
        <div className="mb-3 rounded-lg border border-slate-200 bg-white p-2">
          <select
            value={selectedPointKey ?? ""}
            onChange={(event) => {
              const entry = triggerPointEntries.find((item) => triggerPointKey(item) === event.target.value);
              if (entry) selectEntry(entry);
            }}
            className="focus-ring w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
          >
            {triggerPointEntries.map((entry) => (
              <option key={triggerPointKey(entry)} value={triggerPointKey(entry)}>
                {entry.muscle.name} - {entry.point.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="relative flex min-h-[58vh] items-center justify-center overflow-hidden rounded-lg bg-white p-3 sm:min-h-[620px]">
          <svg
          viewBox={activeViewBox}
          role="img"
          aria-label={title}
          className={`order-2 w-full min-w-0 flex-1 touch-manipulation transition-transform duration-500 ease-out ${
            mapView === "face"
              ? "h-[58vh] min-h-[430px] max-w-[560px] sm:h-[620px] sm:max-h-[70vh]"
              : "h-[58vh] min-h-[440px] max-w-[520px] sm:h-[640px] sm:max-h-[72vh]"
          }`}
          style={{ transform: `scale(${zoom})` }}
        >
          <defs>
            <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="14" stdDeviation="18" floodColor="#0f172a" floodOpacity="0.12" />
            </filter>
          </defs>

          {layers.anatomy && (mapView === "face" ? <FaceSilhouette /> : mapView === "back" ? <BackBodySilhouette /> : <BodySilhouette />)}

          {mode === "triggerpoints" && layers.referral &&
            visibleTriggerpointMuscles
              .filter((muscle) => muscle.referralPath && inferMuscleMapViews(muscle).includes(mapView))
              .map((muscle) => (
                <path
                  key={`referral-${muscle.id}`}
                  d={mapView === "face" ? projectReferralPath(muscle.referralPath) : muscle.referralPath}
                  fill="#0a84ff"
                  opacity="0.16"
                  stroke="#0a84ff"
                  strokeWidth="2"
                  className="transition-opacity duration-300"
                />
              ))}

          {mode === "triggerpoints" &&
            activePainRegions.map((region) => (
              <path
                key={region.id}
                d={region.path}
                fill={selection.type === "painRegion" && selection.id === region.id ? "#ff9f0a" : "#ff9f0a"}
                opacity={selection.type === "painRegion" && selection.id === region.id ? "0.32" : "0.09"}
                stroke={selection.type === "painRegion" && selection.id === region.id ? "#ff9f0a" : "transparent"}
                strokeWidth="10"
                strokeLinejoin="round"
                strokeOpacity={selection.type === "painRegion" && selection.id === region.id ? "0.55" : "0"}
                className="cursor-pointer transition-opacity duration-200 hover:opacity-30"
                onClick={() => onSelect({ type: "painRegion", id: region.id })}
              >
                <title>{region.label}</title>
              </path>
            ))}

          {mode === "triggerpoints" && layers.triggerpoints && visibleEntries.length > 0 && (
            <g>
              {visibleEntries.map((entry) => {
                const { muscle, point, renderedPoint, labelX, labelY, labelAnchor } = entry;
                const key = triggerPointKey(entry);
                const active = activePoint ? triggerPointKey(activePoint) === key : false;
                const labelVisible = showAllLabels || active;

                return (
                  <g
                    key={`${muscle.id}-${point.id}`}
                    tabIndex={0}
                    role="button"
                    aria-label={`${muscle.name}, Triggerpunkt ${point.label}`}
                    className="cursor-pointer outline-none"
                    onClick={() => selectPoint(entry)}
                    onFocus={() => selectPoint(entry)}
                    onBlur={() => setHoveredPoint(null)}
                    onMouseEnter={() => setHoveredPoint(entry)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <title>{`${muscle.name}: ${point.label}`}</title>
                    <circle cx={renderedPoint.x} cy={renderedPoint.y} r={active ? "30" : "18"} fill="#ff3b30" opacity={active ? "0.2" : "0.07"} />
                    <circle cx={renderedPoint.x} cy={renderedPoint.y} r={active ? "18" : "11"} fill="#ff3b30" opacity={active ? "0.28" : "0.14"} />
                    <circle cx={renderedPoint.x} cy={renderedPoint.y} r={active ? "9" : "5"} fill={active ? "#d70015" : "#ff3b30"} />
                    {labelVisible && (
                      <>
                        <line
                          x1={renderedPoint.x}
                          y1={renderedPoint.y}
                          x2={labelX + (labelAnchor === "start" ? -5 : 5)}
                          y2={labelY - 4}
                          stroke={active ? "#ff3b30" : "#cbd5e1"}
                          strokeWidth={active ? "2" : "1.5"}
                        />
                        <text
                          x={labelX}
                          y={labelY}
                          textAnchor={labelAnchor}
                          className={active ? "fill-red-600 text-[13px] font-bold" : "fill-slate-700 text-[13px] font-semibold"}
                        >
                          {point.label}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {mode === "dermatomes" &&
            layers.segments &&
            dermatomeRegions.map((region) => {
              const active = selection.type === "dermatome" && selection.id === region.id;
              return (
                <path
                  key={region.id}
                  d={region.mapPath}
                  fill={active ? "#0a84ff" : "#0a84ff"}
                  opacity={active ? "0.36" : "0.14"}
                  stroke={active ? "#006fe6" : "#8ec5ff"}
                  strokeWidth="2"
                  className="cursor-pointer transition-opacity duration-200 hover:opacity-30"
                  onClick={() => onSelect({ type: "dermatome", id: region.id })}
                >
                  <title>
                    {region.name}: {region.segments.join(", ")}
                  </title>
                </path>
              );
            })}

          {mode === "myotomes" &&
            layers.segments &&
            myotomeGroups.map((group) => {
              const active = selection.type === "myotome" && selection.id === group.id;
              return (
                <path
                  key={group.id}
                  d={group.mapPath}
                  fill={active ? "#34c759" : "#34c759"}
                  opacity={active ? "0.38" : "0.15"}
                  stroke={active ? "#1f9d47" : "#9be7b0"}
                  strokeWidth="2"
                  className="cursor-pointer transition-opacity duration-200 hover:opacity-30"
                  onClick={() => onSelect({ type: "myotome", id: group.id })}
                >
                  <title>
                    {group.name}: {group.segments.join(", ")}
                  </title>
                </path>
              );
            })}
        </svg>
      </div>
    </section>
  );
}

function triggerPointKey(entry: TriggerPointEntry) {
  return triggerPointKeyFromParts(entry.mapView, entry.muscle.id, entry.point.id);
}

function triggerPointKeyFromParts(mapView: MapView, muscleId: string, pointId: string) {
  return `${mapView}:${muscleId}:${pointId}`;
}

function layoutTriggerPoints(entries: TriggerPointEntry[], mapView: MapView): PositionedTriggerPointEntry[] {
  const projected = entries.map((entry) => ({
    ...entry,
    renderedPoint: mapView === "face" ? projectFacePoint(entry.point) : { x: entry.point.x, y: entry.point.y }
  }));

  const buckets = new Map<string, typeof projected>();
  for (const entry of projected) {
    const bucketSize = mapView === "face" ? 34 : 20;
    const key = `${Math.round(entry.renderedPoint.x / bucketSize)}:${Math.round(entry.renderedPoint.y / bucketSize)}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(entry);
    buckets.set(key, bucket);
  }

  const result: PositionedTriggerPointEntry[] = [];
  for (const bucket of buckets.values()) {
    bucket.forEach((entry, index) => {
      const total = bucket.length;
      const radius = total > 1 ? (mapView === "face" ? 18 : 12) + Math.min(total, 5) * 3 : 0;
      const angle = total > 1 ? (Math.PI * 2 * index) / total - Math.PI / 2 : 0;
      const x = clamp(entry.renderedPoint.x + Math.cos(angle) * radius, mapView === "face" ? 66 : 36, mapView === "face" ? 334 : 364);
      const y = clamp(entry.renderedPoint.y + Math.sin(angle) * radius, mapView === "face" ? 66 : 36, mapView === "face" ? 472 : 784);
      const labelRight = x < 210 || index % 2 === 0;

      result.push({
        ...entry,
        renderedPoint: { x, y },
        labelX: clamp(x + (labelRight ? 14 : -14), mapView === "face" ? 74 : 42, mapView === "face" ? 326 : 358),
        labelY: clamp(y + 5 + (index % 3) * 4, mapView === "face" ? 74 : 42, mapView === "face" ? 482 : 794),
        labelAnchor: labelRight ? "start" : "end"
      });
    });
  }

  return result;
}
function BodySilhouette() {
  return (
    <g filter="url(#softShadow)">
      <path
        d="M200 42 C236 42 258 70 256 104 C254 136 232 158 200 158 C168 158 146 136 144 104 C142 70 164 42 200 42 Z"
        fill="#f8fafc"
        stroke="#d9dee7"
        strokeWidth="2"
      />
      <path
        d="M174 148 C182 166 218 166 226 148 L230 184 C266 190 304 210 326 246 C342 272 348 314 348 384 C348 408 326 414 318 390 C306 330 286 276 260 248 L250 430 C276 458 282 508 264 548 C252 602 252 682 270 762 C258 778 230 778 220 760 C202 690 198 614 200 556 C202 614 198 690 180 760 C170 778 142 778 130 762 C148 682 148 602 136 548 C118 508 124 458 150 430 L140 248 C114 276 94 330 82 390 C74 414 52 408 52 384 C52 314 58 272 74 246 C96 210 134 190 170 184 Z"
        fill="#f8fafc"
        stroke="#d9dee7"
        strokeWidth="2"
      />
      <path d="M150 430 C182 448 218 448 250 430" fill="none" stroke="#d9dee7" strokeWidth="2" />
      <path d="M140 248 C174 272 226 272 260 248" fill="none" stroke="#e6e8ec" strokeWidth="2" />
      <path d="M200 168 L200 760" fill="none" stroke="#e6e8ec" strokeWidth="1.5" strokeDasharray="6 8" />
    </g>
  );
}

function BackBodySilhouette() {
  return (
    <g filter="url(#softShadow)">
      <path
        d="M200 42 C236 42 258 70 256 104 C254 136 232 158 200 158 C168 158 146 136 144 104 C142 70 164 42 200 42 Z"
        fill="#f8fafc"
        stroke="#d9dee7"
        strokeWidth="2"
      />
      <path
        d="M174 148 C182 166 218 166 226 148 L230 184 C266 190 304 210 326 246 C342 272 348 314 348 384 C348 408 326 414 318 390 C306 330 286 276 260 248 L250 430 C276 458 282 508 264 548 C252 602 252 682 270 762 C258 778 230 778 220 760 C202 690 198 614 200 556 C202 614 198 690 180 760 C170 778 142 778 130 762 C148 682 148 602 136 548 C118 508 124 458 150 430 L140 248 C114 276 94 330 82 390 C74 414 52 408 52 384 C52 314 58 272 74 246 C96 210 134 190 170 184 Z"
        fill="#f8fafc"
        stroke="#d9dee7"
        strokeWidth="2"
      />
      <path d="M200 158 L200 760" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="5 7" />
      <path d="M140 236 C164 220 186 230 192 284 C168 322 136 320 118 278 Z" fill="none" stroke="#d9dee7" strokeWidth="2" />
      <path d="M260 236 C236 220 214 230 208 284 C232 322 264 320 282 278 Z" fill="none" stroke="#d9dee7" strokeWidth="2" />
      <path d="M150 430 C182 450 218 450 250 430" fill="none" stroke="#d9dee7" strokeWidth="2" />
      <path d="M130 500 C164 526 190 520 200 492 C210 520 236 526 270 500" fill="none" stroke="#e2e8f0" strokeWidth="2" />
    </g>
  );
}

function FaceSilhouette() {
  return (
    <g filter="url(#softShadow)">
      <path
        d="M200 44 C274 44 318 104 318 194 C318 298 268 382 200 382 C132 382 82 298 82 194 C82 104 126 44 200 44 Z"
        fill="#f8fafc"
        stroke="#d9dee7"
        strokeWidth="2"
      />
      <path
        d="M83 184 C58 182 50 218 62 252 C72 282 94 286 102 254"
        fill="#f8fafc"
        stroke="#d9dee7"
        strokeWidth="2"
      />
      <path
        d="M317 184 C342 182 350 218 338 252 C328 282 306 286 298 254"
        fill="#f8fafc"
        stroke="#d9dee7"
        strokeWidth="2"
      />
      <path
        d="M156 378 C168 406 232 406 244 378 L260 468 C226 494 174 494 140 468 Z"
        fill="#f8fafc"
        stroke="#d9dee7"
        strokeWidth="2"
      />
      <path d="M124 146 C152 126 178 128 198 148" fill="none" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
      <path d="M202 148 C222 128 248 126 276 146" fill="none" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
      <path d="M134 188 C156 174 178 174 200 188 C178 204 156 204 134 188 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
      <path d="M200 188 C222 174 244 174 266 188 C244 204 222 204 200 188 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
      <circle cx="166" cy="189" r="5" fill="#64748b" />
      <circle cx="234" cy="189" r="5" fill="#64748b" />
      <path d="M200 204 C190 236 184 260 200 270 C214 264 208 236 200 204" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
      <path d="M168 298 C190 312 210 312 232 298" fill="none" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
      <path d="M116 242 C130 322 162 362 200 374 C238 362 270 322 284 242" fill="none" stroke="#e2e8f0" strokeWidth="2" />
      <path d="M200 62 L200 374" fill="none" stroke="#e6e8ec" strokeWidth="1.5" strokeDasharray="6 8" />
    </g>
  );
}

function inferMapViews(point: TriggerPoint, muscle: MuscleMapItem): MapView[] {
  if (point.mapType === "face" || point.mapType === "head-side") return ["face"];
  if (point.mapType === "back" || point.mapType === "neck-back") return ["back"];
  if (point.mapType === "front" || point.mapType === "body") return ["front"];

  return inferMuscleMapViews(muscle);
}

function inferMuscleMapViews(muscle: MuscleMapItem): MapView[] {
  const searchable = muscleSearchText(muscle);
  const faceKeywords = ["kopf / gesicht", "gesicht", "masseter", "temporalis", "pterygoid", "digastric", "occipitofrontalis"];
  const neckShoulderKeywords = ["nacken", "schulter", "neck", "shoulder", "trapezius", "levator", "scalene", "sternocleidomastoid"];
  const backKeywords = [
    "ruecken",
    "rucken",
    "dorsal",
    "posterior",
    "hws",
    "bws",
    "lws",
    "wirbelsaeule",
    "schulterblatt",
    "scapula",
    "infraspinatus",
    "supraspinatus",
    "multifidus",
    "rotatores",
    "longissimus",
    "iliocostalis",
    "quadratus",
    "glute",
    "piriformis",
    "gesaess",
    "wade",
    "hamstring"
  ];

  if (faceKeywords.some((keyword) => searchable.includes(keyword))) return ["face"];
  if (neckShoulderKeywords.some((keyword) => searchable.includes(keyword))) return ["front", "back"];
  if (backKeywords.some((keyword) => searchable.includes(keyword))) return ["back"];

  return ["front"];
}

function muscleSearchText(muscle: MuscleMapItem) {
  return [
    muscle.id,
    muscle.name,
    muscle.bodyArea,
    muscle.referralArea,
    ...(muscle.painRegions ?? [])
  ]
    .join(" ")
    .toLowerCase();
}

function projectFacePoint(point: TriggerPoint) {
  return {
    x: clamp(point.x, 56, 344),
    y: clamp((point.y - 62) * 2.08 + 66, 56, 488)
  };
}

function projectReferralPath(path: string) {
  return path.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_match, xValue: string, yValue: string) => {
    const point = projectFacePoint({ id: "path", label: "", x: Number(xValue), y: Number(yValue) });
    return `${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function interactionHint(mode: AnatomyMode) {
  if (mode === "triggerpoints") return "Muskel waehlen oder Schmerzregion tippen";
  if (mode === "dermatomes") return "Region tippen";
  if (mode === "myotomes") return "Muskelgruppe tippen";
  return "Modul in Vorbereitung";
}

function regionLabel(region: string) {
  return region
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}







