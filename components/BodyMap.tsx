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

type FocusZone = "head" | "neck" | "shoulder" | "torso" | "pelvis" | "upperLeg" | "lowerLeg" | "foot";

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
  { id: "groin", label: "Leiste", path: "M178 480 C194 470 210 470 226 480 C218 502 186 502 178 480" },
  { id: "anterior-thigh", label: "Vorderer Oberschenkel", path: "M144 520 C174 540 192 538 198 520 L190 660 C168 676 148 668 140 646 Z M202 520 C208 538 226 540 256 520 L260 646 C252 668 232 676 210 660 Z" },
  { id: "medial-knee", label: "Mediales Knie", path: "M174 646 C192 638 202 646 202 666 C190 678 174 672 166 660 Z" },
  { id: "lateral-knee", label: "Laterales Knie", path: "M224 646 C242 638 256 646 264 660 C256 674 236 678 224 666 Z" },
  { id: "shin", label: "Schienbein", path: "M142 660 C166 678 188 678 196 660 L190 756 C176 772 154 768 148 748 Z M204 660 C212 678 234 678 258 660 L252 748 C246 768 224 772 210 756 Z" },
  { id: "anterior-ankle", label: "Vorderes Sprunggelenk", path: "M146 744 C166 758 184 758 194 744 L194 780 C174 788 154 784 144 768 Z M206 744 C216 758 234 758 254 744 L256 768 C246 784 226 788 206 780 Z" },
  { id: "dorsum-foot", label: "Fussruecken", path: "M126 774 C154 762 186 768 198 790 C180 806 142 806 118 792 Z M202 790 C214 768 246 762 274 774 L282 792 C258 806 220 806 202 790 Z" },
  { id: "lateral-foot", label: "Lateraler Fuss", path: "M120 786 C144 778 162 786 170 800 C146 810 126 804 114 794 Z M230 800 C238 786 256 778 280 786 L286 794 C274 804 254 810 230 800 Z" },
  { id: "great-toe", label: "Grosszehe", path: "M174 788 C190 786 202 794 200 806 C184 812 174 806 170 796 Z M200 806 C198 794 210 786 226 788 L230 796 C226 806 216 812 200 806 Z" },
  { id: "toes", label: "Zehen", path: "M118 790 C146 804 176 804 198 792 C196 810 144 816 112 800 Z M202 792 C224 804 254 804 282 790 L288 800 C256 816 204 810 202 792 Z" }
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
  { id: "posterior-knee", label: "Kniekehle", path: "M142 628 C166 640 188 640 198 626 L198 664 C174 678 148 672 136 652 Z M202 626 C212 640 234 640 258 628 L264 652 C252 672 226 678 202 664 Z" },
  { id: "calf", label: "Wade", path: "M142 664 C166 684 186 684 196 666 L190 766 C176 780 154 776 148 756 Z M204 666 C214 684 234 684 258 664 L252 756 C246 776 224 780 210 766 Z" },
  { id: "medial-ankle", label: "Mediales Sprunggelenk", path: "M158 744 C178 754 192 754 202 744 L198 778 C178 786 160 780 150 764 Z" },
  { id: "lateral-ankle", label: "Laterales Sprunggelenk", path: "M198 744 C208 754 222 754 242 744 L250 764 C240 780 222 786 202 778 Z" },
  { id: "heel", label: "Ferse", path: "M130 764 C158 754 188 760 198 784 C178 804 142 804 122 788 Z M202 784 C212 760 242 754 270 764 L278 788 C258 804 222 804 202 784 Z" },
  { id: "plantar-foot", label: "Fusssohle", path: "M120 784 C150 768 184 776 198 800 C172 814 138 812 112 798 Z M202 800 C216 776 250 768 280 784 L288 798 C262 812 228 814 202 800 Z" },
  { id: "medial-arch", label: "Laengsgewoelbe", path: "M146 780 C166 772 188 780 198 800 C176 802 154 798 138 790 Z M202 800 C212 780 234 772 254 780 L262 790 C246 798 224 802 202 800 Z" },
  { id: "ball-of-foot", label: "Vorfußballen", path: "M116 792 C148 804 174 804 198 792 C194 810 144 816 112 802 Z M202 792 C226 804 252 804 284 792 L288 802 C256 816 206 810 202 792 Z" },
  { id: "forefoot", label: "Vorfuß", path: "M112 788 C146 802 174 804 200 794 L198 810 C164 820 132 814 108 800 Z M200 794 C226 804 254 802 288 788 L292 800 C268 814 236 820 202 810 Z" },
  { id: "toes", label: "Zehen", path: "M112 796 C144 812 176 812 198 802 C194 820 140 824 106 806 Z M202 802 C224 812 256 812 288 796 L294 806 C260 824 206 820 202 802 Z" }
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
  const [hoveredPainRegionId, setHoveredPainRegionId] = useState<string | null>(null);
  const [selectedPointKey, setSelectedPointKey] = useState<string | null>(null);
  const [showFullBody, setShowFullBody] = useState(false);

  useEffect(() => {
    if (mode !== "triggerpoints" && mapView !== "front") setMapView("front");
  }, [mapView, mode]);

  const selectionKey = selectionFocusKey(selection);

  useEffect(() => {
    setHoveredPoint(null);
    setHoveredPainRegionId(null);
    setShowFullBody(false);
  }, [mapView, mode, selectionKey]);

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
  const activePainRegionId = hoveredPainRegionId ?? (selection.type === "painRegion" ? selection.id : null);
  const activePainRegion = activePainRegionId ? activePainRegions.find((region) => region.id === activePainRegionId) ?? null : null;
  const activePainRegionMuscles = activePainRegionId ? muscles.filter((item) => (item.painRegions ?? []).includes(activePainRegionId)) : [];
  const baseViewBox = mapView === "face" ? "0 0 400 520" : "0 0 400 820";
  const title = mapView === "face" ? "Kopf- und Gesichtskarte" : mapView === "back" ? "Dorsale Koerperansicht" : "Ventrale Koerperansicht";
  const visibleEntries = useMemo(
    () => layoutTriggerPoints(triggerPointEntries.filter((entry) => entry.mapView === mapView), mapView),
    [mapView, triggerPointEntries]
  );
  const selectedPoint = visibleEntries.find((entry) => triggerPointKey(entry) === selectedPointKey) ?? null;
  const activePoint = hoveredPoint ?? selectedPoint;
  const activeViewBox = showFullBody ? baseViewBox : focusViewBox(mapView, selection, activePoint, dermatomeRegions, myotomeGroups) ?? baseViewBox;
  const focused = activeViewBox !== baseViewBox;
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

  function selectPainRegion(regionId: string) {
    const preferredView = viewForPainRegion(regionId, mapView);
    if (preferredView !== mapView) setMapView(preferredView);
    setHoveredPainRegionId(null);
    setShowFullBody(false);
    onSelect({ type: "painRegion", id: regionId });
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
                  onClick={() => {
                    setMapView(tab.id);
                    setShowFullBody(true);
                  }}
                  className={`focus-ring rounded-md px-3 py-2 text-sm font-semibold transition ${
                    mapView === tab.id ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {focused && (
              <button
                type="button"
                onClick={() => setShowFullBody(true)}
                className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Ganzkoerper
              </button>
            )}
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">
              {focused ? "Fokusansicht aktiv" : interactionHint(mode)}
            </div>
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
        {mode === "triggerpoints" && (
          <BodyInfoOverlay
            point={activePoint}
            painRegion={activePainRegion}
            painRegionMuscleCount={activePainRegionMuscles.length}
            selection={selection}
            title={title}
          />
        )}
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
            activePainRegions.map((region) => {
              const active = activePainRegionId === region.id;
              const fixed = selection.type === "painRegion" && selection.id === region.id;

              return (
                <path
                  key={region.id}
                  d={region.path}
                  tabIndex={0}
                  role="button"
                  aria-label={`Schmerzregion ${region.label}`}
                  fill="#ff9f0a"
                  opacity={active ? "0.36" : "0.09"}
                  stroke={active ? (fixed ? "#d97706" : "#ff9f0a") : "transparent"}
                  strokeWidth={active ? "12" : "10"}
                  strokeLinejoin="round"
                  strokeOpacity={active ? "0.72" : "0"}
                  className="cursor-pointer outline-none transition-opacity duration-200 hover:opacity-40 focus:opacity-40"
                  onClick={() => selectPainRegion(region.id)}
                  onFocus={() => setHoveredPainRegionId(region.id)}
                  onBlur={() => setHoveredPainRegionId(null)}
                  onMouseEnter={() => setHoveredPainRegionId(region.id)}
                  onMouseLeave={() => setHoveredPainRegionId(null)}
                >
                </path>
              );
            })}


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
                </path>
              );
            })}
        </svg>
      </div>
    </section>
  );
}

function BodyInfoOverlay({
  point,
  painRegion,
  painRegionMuscleCount,
  selection,
  title
}: {
  point: PositionedTriggerPointEntry | null;
  painRegion: PainRegion | null;
  painRegionMuscleCount: number;
  selection: MapSelection;
  title: string;
}) {
  if (point) {
    const fixed = selection.type === "triggerpoint" && selection.muscleId === point.muscle.id && selection.pointId === point.point.id;
    const regions = (point.point.painRegions?.length ? point.point.painRegions : point.muscle.painRegions) ?? [];

    return (
      <div className="pointer-events-none absolute right-3 top-3 z-30 w-[min(320px,calc(100%-1.5rem))] rounded-lg border border-red-100 bg-white/95 p-3 text-left shadow-2xl shadow-slate-950/15 ring-1 ring-slate-950/5 backdrop-blur">
        <p className="text-xs font-semibold uppercase text-red-600">{fixed ? "Fixierter Triggerpunkt" : "Triggerpunkt"}</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-950">{point.muscle.name}</h3>
        <p className="mt-1 text-sm font-semibold text-red-700">{point.point.label}</p>
        <dl className="mt-2 space-y-2 text-sm leading-5 text-slate-600">
          <div>
            <dt className="font-semibold text-slate-900">Lage</dt>
            <dd>{point.point.anatomicalLocation || point.muscle.bodyArea || "Lage noch nicht beschrieben"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-900">Ausstrahlung</dt>
            <dd>{point.point.referralArea || point.muscle.referralArea || "Ausstrahlungsgebiet noch nicht beschrieben"}</dd>
          </div>
        </dl>
        {regions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {regions.slice(0, 5).map((region) => (
              <span key={region} className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                {regionLabel(region)}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!painRegion) return null;

  const fixed = selection.type === "painRegion" && selection.id === painRegion.id;

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-20 w-[min(280px,calc(100%-1.5rem))] rounded-lg border border-orange-200 bg-white/95 p-3 text-left shadow-2xl shadow-slate-950/15 ring-1 ring-slate-950/5 backdrop-blur">
      <p className="text-xs font-semibold uppercase text-orange-600">{fixed ? "Fixierte Schmerzregion" : "Schmerzregion"}</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-950">{painRegion.label}</h3>
      <p className="mt-2 text-sm leading-5 text-slate-600">
        {fixed ? "Auswahl ist fixiert. Klick auf eine andere Region wechselt die Auswahl." : "Mouseover zeigt die Region. Klick fixiert die Auswahl."}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-700">{painRegionMuscleCount} passende Muskeln</span>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{title}</span>
      </div>
    </div>
  );
}

function selectionFocusKey(selection: MapSelection) {
  if (selection.type === "muscle") return `muscle:${selection.id}`;
  if (selection.type === "triggerpoint") return `triggerpoint:${selection.mapView}:${selection.muscleId}:${selection.pointId}`;
  return `${selection.type}:${selection.id}`;
}

function focusViewBox(
  mapView: MapView,
  selection: MapSelection,
  activePoint: PositionedTriggerPointEntry | null,
  dermatomeRegions: DermatomeRegion[],
  myotomeGroups: MyotomeGroup[]
) {
  if (mapView === "face") return viewBoxForZone("head", mapView);

  if (selection.type === "triggerpoint" && activePoint) {
    return viewBoxForPoint(activePoint.renderedPoint.x, activePoint.renderedPoint.y, mapView);
  }

  if (selection.type === "painRegion") {
    return viewBoxForZone(zoneForRegion(selection.id), mapView);
  }

  if (selection.type === "dermatome") {
    const region = dermatomeRegions.find((item) => item.id === selection.id);
    return viewBoxForZone(zoneForSegments(region?.segments ?? [selection.id]), mapView);
  }

  if (selection.type === "myotome") {
    const group = myotomeGroups.find((item) => item.id === selection.id);
    return viewBoxForZone(zoneForSegments(group?.segments ?? [selection.id]), mapView);
  }

  return null;
}

function viewForPainRegion(regionId: string, current: MapView): MapView {
  const faceRegions = new Set(["head", "forehead", "temple", "eye", "orbit", "face", "ear", "jaw", "teeth", "throat"]);
  const backRegions = new Set(["upper-back", "scapula", "posterior-thigh", "posterior-knee", "calf", "heel", "plantar-foot", "medial-arch", "ball-of-foot", "forefoot"]);
  const frontRegions = new Set(["shin", "anterior-ankle", "dorsum-foot", "great-toe", "anterior-thigh", "groin"]);
  if (faceRegions.has(regionId)) return "face";
  if (backRegions.has(regionId)) return "back";
  if (frontRegions.has(regionId)) return "front";
  return current;
}

function zoneForRegion(regionId: string): FocusZone {
  const head = new Set(["head", "forehead", "temple", "eye", "orbit", "face", "ear", "jaw", "teeth", "throat"]);
  const neck = new Set(["neck"]);
  const shoulder = new Set(["shoulder", "upper-arm", "forearm", "scapula", "upper-back"]);
  const torso = new Set(["low-back"]);
  const pelvis = new Set(["hip", "buttock", "groin"]);
  const upperLeg = new Set(["anterior-thigh", "posterior-thigh", "medial-knee", "lateral-knee", "posterior-knee"]);
  const foot = new Set(["heel", "plantar-foot", "dorsum-foot", "medial-arch", "ball-of-foot", "forefoot", "lateral-foot", "great-toe", "toes", "anterior-ankle", "medial-ankle", "lateral-ankle"]);
  if (head.has(regionId)) return "head";
  if (neck.has(regionId)) return "neck";
  if (shoulder.has(regionId)) return "shoulder";
  if (torso.has(regionId)) return "torso";
  if (pelvis.has(regionId)) return "pelvis";
  if (upperLeg.has(regionId)) return "upperLeg";
  if (foot.has(regionId)) return "foot";
  if (regionId === "shin" || regionId === "calf") return "lowerLeg";
  return "torso";
}

function zoneForSegments(segments: string[]): FocusZone {
  const joined = segments.join(" ").toUpperCase();
  if (/C[2-4]/.test(joined)) return "neck";
  if (/C[5-8]|T1/.test(joined)) return "shoulder";
  if (/T[2-9]|T10|T11|T12/.test(joined)) return "torso";
  if (/L1|L2/.test(joined)) return "pelvis";
  if (/L3/.test(joined)) return "upperLeg";
  if (/L4|L5/.test(joined)) return "lowerLeg";
  if (/S1|S2/.test(joined)) return "foot";
  return "torso";
}

function viewBoxForPoint(x: number, y: number, mapView: MapView) {
  if (mapView === "face") return "56 40 288 440";
  if (y < 210) return viewBoxForZone("neck", mapView);
  if (y < 330) return viewBoxForZone("shoulder", mapView);
  if (y < 470) return viewBoxForZone("torso", mapView);
  if (y < 570) return viewBoxForZone("pelvis", mapView);
  if (y < 670) return viewBoxForZone("upperLeg", mapView);
  if (y < 745) return viewBoxForZone("lowerLeg", mapView);
  return viewBoxForZone("foot", mapView);
}

function viewBoxForZone(zone: FocusZone, mapView: MapView) {
  if (mapView === "face" || zone === "head") return "54 34 292 462";

  const boxes: Record<Exclude<FocusZone, "head">, string> = {
    neck: "80 44 240 190",
    shoulder: "44 156 312 238",
    torso: "88 232 224 250",
    pelvis: "96 404 208 160",
    upperLeg: "96 492 208 210",
    lowerLeg: "96 620 208 170",
    foot: "82 724 236 96"
  };

  return boxes[zone];
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
      <path d="M132 762 C156 748 188 758 200 786 C176 806 136 806 110 790 C112 778 120 768 132 762 Z" fill="#f8fafc" stroke="#d9dee7" strokeWidth="2" />
      <path d="M200 786 C212 758 244 748 268 762 C280 768 288 778 290 790 C264 806 224 806 200 786 Z" fill="#f8fafc" stroke="#d9dee7" strokeWidth="2" />
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
      <path d="M132 762 C156 748 188 758 200 786 C176 806 136 806 110 790 C112 778 120 768 132 762 Z" fill="#f8fafc" stroke="#d9dee7" strokeWidth="2" />
      <path d="M200 786 C212 758 244 748 268 762 C280 768 288 778 290 790 C264 806 224 806 200 786 Z" fill="#f8fafc" stroke="#d9dee7" strokeWidth="2" />
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
  const lowerLegKeywords = [
    "wade",
    "calf",
    "heel",
    "foot",
    "fuss",
    "ankle",
    "toes",
    "toe",
    "shin",
    "plantar",
    "dorsum-foot",
    "forefoot",
    "medial-arch",
    "ball-of-foot",
    "great-toe",
    "lateral-foot",
    "unterschenkel"
  ];

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
  if (lowerLegKeywords.some((keyword) => searchable.includes(keyword))) return ["front", "back"];
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













