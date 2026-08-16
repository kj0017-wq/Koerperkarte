"use client";

import { useEffect, useMemo, useState } from "react";
import { BodyMap } from "@/components/BodyMap";
import { DetailPanel } from "@/components/DetailPanel";
import { LayerToggles } from "@/components/LayerToggles";
import { loadAnatomyData, type AnatomyData } from "@/lib/anatomyRepository";
import type { AnatomyMode, DataSourceState, LayerState, MapSelection } from "@/lib/types";

type AppPane = "map" | "search" | "detail";

const modes: Array<{ id: AnatomyMode; label: string; enabled: boolean }> = [
  { id: "triggerpoints", label: "Trigger", enabled: true },
  { id: "dermatomes", label: "Dermatome", enabled: true },
  { id: "myotomes", label: "Myotome", enabled: true },
  { id: "nerves", label: "Nerven", enabled: true },
  { id: "fascia", label: "Faszien", enabled: true },
  { id: "future", label: "Mehr", enabled: false }
];

const panes: Array<{ id: AppPane; label: string }> = [
  { id: "map", label: "Karte" },
  { id: "search", label: "Suche" },
  { id: "detail", label: "Info" }
];

export default function WebApp() {
  const [anatomyData, setAnatomyData] = useState<AnatomyData | null>(null);
  const [dataSource, setDataSource] = useState<DataSourceState>("loading");
  const [mode, setMode] = useState<AnatomyMode>("triggerpoints");
  const [pane, setPane] = useState<AppPane>("map");
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [layers, setLayers] = useState<LayerState>({
    anatomy: true,
    triggerpoints: true,
    referral: true,
    segments: true,
    skeleton: false,
    organs: false
  });
  const [zoom, setZoom] = useState(1);
  const [bodyResetKey, setBodyResetKey] = useState(0);
  const [hoveredPainRegionId, setHoveredPainRegionId] = useState<string | null>(null);
  const [hoveredDermatomeId, setHoveredDermatomeId] = useState<string | null>(null);
  const [hoveredMyotomeId, setHoveredMyotomeId] = useState<string | null>(null);
  const [muscleFilter, setMuscleFilter] = useState("");

  useEffect(() => {
    let mounted = true;

    loadAnatomyData()
      .then((data) => {
        if (!mounted) return;

        setAnatomyData(data);
        setDataSource(data.source);
        const firstSelection = getInitialSelection(data);
        if (firstSelection) setSelection(firstSelection);
      })
      .catch((error) => {
        console.error("Anatomische Daten konnten nicht initialisiert werden.", error);
        if (mounted) setDataSource("local");
      });

    return () => {
      mounted = false;
    };
  }, []);

  const muscles = anatomyData?.muscles ?? [];
  const sortedMuscles = useMemo(() => [...muscles].sort((a, b) => a.name.localeCompare(b.name, "de")), [muscles]);
  const dermatomeRegions = anatomyData?.dermatomeRegions ?? [];
  const myotomeGroups = anatomyData?.myotomeGroups ?? [];
  const peripheralNerves = anatomyData?.peripheralNerves ?? [];
  const fasciaLines = anatomyData?.fasciaLines ?? [];
  const blocks = anatomyData?.blocks ?? [];
  const visibleMuscles = useMemo(() => {
    const query = muscleFilter.trim().toLowerCase();
    if (!query) return sortedMuscles;
    return sortedMuscles.filter((muscle) =>
      [muscle.name, muscle.id, muscle.bodyArea, muscle.referralArea].some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      )
    );
  }, [muscleFilter, sortedMuscles]);

  const selectedData = useMemo(() => {
    if (!selection || !anatomyData) return null;

    if (selection.type === "muscle") return muscles.find((item) => item.id === selection.id) ?? muscles[0];
    if (selection.type === "triggerpoint") return muscles.find((item) => item.id === selection.muscleId) ?? muscles[0];
    if (selection.type === "block") return blocks.find((item) => item.id === selection.id) ?? blocks[0];
    if (selection.type === "painRegion") return muscles.filter((item) => (item.painRegions ?? []).includes(selection.id));
    if (selection.type === "dermatome") return dermatomeRegions.find((item) => item.id === selection.id) ?? dermatomeRegions[0];
    if (selection.type === "myotome") return myotomeGroups.find((item) => item.id === selection.id) ?? myotomeGroups[0];
    if (selection.type === "nerve") return peripheralNerves.find((item) => item.id === selection.id) ?? peripheralNerves[0];
    if (selection.type === "fascia") return fasciaLines.find((item) => item.id === selection.id) ?? fasciaLines[0];

    return null;
  }, [anatomyData, blocks, dermatomeRegions, muscles, myotomeGroups, peripheralNerves, fasciaLines, selection]);

  function selectAndShow(nextSelection: MapSelection) {
    setSelection(nextSelection);
    setPane("map");
  }

  function resetBodyView() {
    setZoom(1);
    setBodyResetKey((key) => key + 1);
  }

  function handleModeChange(nextMode: AnatomyMode) {
    if (!anatomyData) return;
    setMode(nextMode);
    setPane("map");

    if (nextMode === "triggerpoints" && sortedMuscles[0]) setSelection({ type: "muscle", id: sortedMuscles[0].id });
    if (nextMode === "dermatomes" && dermatomeRegions[0]) setSelection({ type: "dermatome", id: dermatomeRegions[0].id });
    if (nextMode === "myotomes" && myotomeGroups[0]) setSelection({ type: "myotome", id: myotomeGroups[0].id });
    if (nextMode === "nerves" && peripheralNerves[0]) setSelection({ type: "nerve", id: peripheralNerves[0].id });
    if (nextMode === "fascia" && fasciaLines[0]) setSelection({ type: "fascia", id: fasciaLines[0].id });
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-600">Koerperkarte Webapp</p>
            <h1 className="text-xl font-semibold leading-tight">Anatomische Karte</h1>
          </div>
          <a
            href="/"
            className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Desktop
          </a>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {modes.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={!item.enabled}
              onClick={() => handleModeChange(item.id)}
              className={`focus-ring min-h-10 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition ${
                mode === item.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
              } ${!item.enabled ? "opacity-45" : ""}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-3 py-3">
        <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
          <span>Datenquelle</span>
          <span className="font-semibold text-slate-900">{sourceLabel(dataSource)}</span>
        </div>

        {!anatomyData || !selection ? (
          <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
            Anatomische Daten werden geladen...
          </section>
        ) : (
          <>
            {pane === "map" && (
              <BodyMap
                mode={mode}
                selection={selection}
                layers={layers}
                zoom={zoom}
                resetViewKey={bodyResetKey}
                hoveredPainRegionId={hoveredPainRegionId}
                hoveredDermatomeId={hoveredDermatomeId}
                hoveredMyotomeId={hoveredMyotomeId}
                onPainRegionHover={setHoveredPainRegionId}
                muscles={muscles}
                dermatomeRegions={dermatomeRegions}
                myotomeGroups={myotomeGroups}
                blocks={blocks}
                peripheralNerves={peripheralNerves}
          fasciaLines={fasciaLines}
                onSelect={setSelection}
              />
            )}

            {pane === "search" && (
              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-lg font-semibold">Auswahl</h2>
                <div className="mt-4 space-y-4">
                  {mode === "triggerpoints" && (
                    <>
                      <label className="block text-sm font-medium text-slate-700" htmlFor="webapp-muscle-search">
                        Muskel suchen
                      </label>
                      <input
                        id="webapp-muscle-search"
                        value={muscleFilter}
                        onChange={(event) => setMuscleFilter(event.target.value)}
                        placeholder="z. B. trapezius, SCM, piriformis"
                        className="focus-ring w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base outline-none"
                      />
                      <select
                        value={selection.type === "muscle" ? selection.id : selection.type === "triggerpoint" ? selection.muscleId : ""}
                        onChange={(event) => selectAndShow({ type: "muscle", id: event.target.value })}
                        className="focus-ring w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base outline-none"
                      >
                        {visibleMuscles.map((muscle) => (
                          <option key={muscle.id} value={muscle.id}>
                            {muscle.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500">
                        {visibleMuscles.length} von {muscles.length} Muskeln
                      </p>
                    </>
                  )}

                  {mode === "dermatomes" && (
                    <div className="grid gap-2">
                      {dermatomeRegions.map((region) => {
                        const active = (selection.type === "dermatome" && selection.id === region.id) || hoveredDermatomeId === region.id;

                        return (
                          <button
                            key={region.id}
                            type="button"
                            onMouseEnter={() => setHoveredDermatomeId(region.id)}
                            onMouseLeave={() => setHoveredDermatomeId(null)}
                            onFocus={() => setHoveredDermatomeId(region.id)}
                            onBlur={() => setHoveredDermatomeId(null)}
                            onClick={() => selectAndShow({ type: "dermatome", id: region.id })}
                            className={`focus-ring rounded-lg px-3 py-3 text-left transition ${active ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700"}`}
                          >
                            <span className="block font-semibold">{region.name}</span>
                            <span className={active ? "text-sm text-blue-100" : "text-sm text-slate-500"}>{region.segments.join(", ")}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {mode === "nerves" && (
                    <div className="grid gap-2">
                      {peripheralNerves.map((nerve) => (
                        <button
                          key={nerve.id}
                          type="button"
                          onClick={() => selectAndShow({ type: "nerve", id: nerve.id })}
                          className="focus-ring rounded-lg bg-slate-50 px-3 py-3 text-left"
                        >
                          <span className="block font-semibold">{nerve.name}</span>
                          <span className="text-sm text-slate-500">{nerve.segments.join(", ")}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {mode === "fascia" && (
                    <div className="grid gap-2">
                      {fasciaLines.map((line) => (
                        <button
                          key={line.id}
                          type="button"
                          onClick={() => selectAndShow({ type: "fascia", id: line.id })}
                          className="focus-ring rounded-lg bg-slate-50 px-3 py-3 text-left"
                        >
                          <span className="block font-semibold">{line.name}</span>
                          <span className="text-sm text-slate-500">{line.regions.join(", ")}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {mode === "myotomes" && (
                    <div className="grid gap-2">
                      {myotomeGroups.map((group) => {
                        const active = (selection.type === "myotome" && selection.id === group.id) || hoveredMyotomeId === group.id;

                        return (
                          <button
                            key={group.id}
                            type="button"
                            onMouseEnter={() => setHoveredMyotomeId(group.id)}
                            onMouseLeave={() => setHoveredMyotomeId(null)}
                            onFocus={() => setHoveredMyotomeId(group.id)}
                            onBlur={() => setHoveredMyotomeId(null)}
                            onClick={() => selectAndShow({ type: "myotome", id: group.id })}
                            className={`focus-ring rounded-lg px-3 py-3 text-left transition ${active ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700"}`}
                          >
                            <span className="block font-semibold">{group.name}</span>
                            <span className={active ? "text-sm text-blue-100" : "text-sm text-slate-500"}>{group.segments.join(", ")}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <LayerToggles layers={layers} onChange={setLayers} zoom={zoom} onZoomChange={setZoom} onResetView={resetBodyView} />
                </div>
              </section>
            )}

            {pane === "detail" && <DetailPanel mode={mode} selection={selection} data={selectedData} activePainRegionId={hoveredPainRegionId} onPainRegionHover={setHoveredPainRegionId} onSelect={setSelection} />}
          </>
        )}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)]">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          {panes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPane(item.id)}
              className={`focus-ring min-h-12 rounded-lg text-sm font-semibold ${
                pane === item.id ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}

function getInitialSelection(data: AnatomyData): MapSelection | null {
  if (data.muscles[0]) return { type: "muscle", id: data.muscles[0].id };
  if (data.dermatomeRegions[0]) return { type: "dermatome", id: data.dermatomeRegions[0].id };
  if (data.myotomeGroups[0]) return { type: "myotome", id: data.myotomeGroups[0].id };
  if (data.peripheralNerves[0]) return { type: "nerve", id: data.peripheralNerves[0].id };
  if (data.fasciaLines[0]) return { type: "fascia", id: data.fasciaLines[0].id };
  if (data.blocks[0]) return { type: "block", id: data.blocks[0].id };
  return null;
}
function sourceLabel(source: DataSourceState) {
  if (source === "loading") return "Firebase wird geprueft";
  if (source === "realtime") return "Firebase";
  return "Demo-Daten";
}

