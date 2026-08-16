"use client";

import { useEffect, useMemo, useState } from "react";
import { BodyInfoPanel, BodyMap, type BodyMapInfo } from "@/components/BodyMap";
import { ModuleGrid } from "@/components/ModuleGrid";
import { DetailPanel } from "@/components/DetailPanel";
import { LayerToggles } from "@/components/LayerToggles";
import { loadAnatomyData, type AnatomyData } from "@/lib/anatomyRepository";
import type { AnatomyMode, DataSourceState, LayerState, MapSelection } from "@/lib/types";

export default function Home() {
  const [anatomyData, setAnatomyData] = useState<AnatomyData | null>(null);
  const [dataSource, setDataSource] = useState<DataSourceState>("loading");
  const [mode, setMode] = useState<AnatomyMode>("triggerpoints");
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [bodyInfo, setBodyInfo] = useState<BodyMapInfo | null>(null);
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
  const visibleMuscles = useMemo(() => {
    const query = muscleFilter.trim().toLowerCase();
    if (!query) return sortedMuscles;
    return sortedMuscles.filter((muscle) =>
      [muscle.name, muscle.id, muscle.bodyArea, muscle.referralArea].some((value) => String(value ?? "").toLowerCase().includes(query))
    );
  }, [muscleFilter, sortedMuscles]);
  const dermatomeRegions = anatomyData?.dermatomeRegions ?? [];
  const myotomeGroups = anatomyData?.myotomeGroups ?? [];
  const peripheralNerves = anatomyData?.peripheralNerves ?? [];
  const fasciaLines = anatomyData?.fasciaLines ?? [];
  const blocks = anatomyData?.blocks ?? [];

  const selectedData = useMemo(() => {
    if (!selection || !anatomyData) return null;

    if (selection.type === "muscle") {
      return muscles.find((item) => item.id === selection.id) ?? muscles[0];
    }

    if (selection.type === "triggerpoint") {
      return muscles.find((item) => item.id === selection.muscleId) ?? muscles[0];
    }

    if (selection.type === "block") {
      return blocks.find((item) => item.id === selection.id) ?? blocks[0];
    }

    if (selection.type === "painRegion") {
      return muscles.filter((item) => (item.painRegions ?? []).includes(selection.id));
    }

    if (selection.type === "dermatome") {
      return dermatomeRegions.find((item) => item.id === selection.id) ?? dermatomeRegions[0];
    }

    if (selection.type === "myotome") {
      return myotomeGroups.find((item) => item.id === selection.id) ?? myotomeGroups[0];
    }

    if (selection.type === "nerve") {
      return peripheralNerves.find((item) => item.id === selection.id) ?? peripheralNerves[0];
    }

    return null;
  }, [anatomyData, blocks, dermatomeRegions, muscles, myotomeGroups, peripheralNerves, fasciaLines, selection]);

  function resetBodyView() {
    setZoom(1);
    setBodyResetKey((key) => key + 1);
  }

  function handleModeChange(nextMode: AnatomyMode) {
    if (!anatomyData) return;

    setMode(nextMode);
    if (nextMode === "triggerpoints" && sortedMuscles[0]) setSelection({ type: "muscle", id: sortedMuscles[0].id });
    if (nextMode === "dermatomes" && dermatomeRegions[0]) setSelection({ type: "dermatome", id: dermatomeRegions[0].id });
    if (nextMode === "myotomes" && myotomeGroups[0]) setSelection({ type: "myotome", id: myotomeGroups[0].id });
    if (nextMode === "nerves" && peripheralNerves[0]) setSelection({ type: "nerve", id: peripheralNerves[0].id });
    if (nextMode === "fascia" && fasciaLines[0]) setSelection({ type: "fascia", id: fasciaLines[0].id });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-3 py-3 sm:gap-6 sm:px-6 sm:py-5 lg:px-8">
      <header className="flex flex-col gap-3 rounded-lg px-1 py-2 sm:gap-4 sm:py-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">Koerperkarte</p>
          <h1 className="mt-1 max-w-3xl text-2xl font-semibold leading-tight text-slate-950 sm:mt-2 sm:text-4xl lg:text-5xl">
            Anatomische Karten fuer Therapie, Unterricht und Praxis.
          </h1>
        </div>
        <div className="flex max-w-md flex-col gap-3 text-sm leading-6 text-slate-600 sm:text-base lg:text-sm">
          <p>
            Lern- und Praxisunterstuetzung. Keine Diagnose, keine Therapieentscheidung,
              sondern strukturierte Orientierung am Koerpermodell.
          </p>
          <div className="flex flex-wrap gap-2">
            <a className="focus-ring w-fit rounded-lg border border-blue-200 bg-blue-600 px-4 py-2 text-sm font-semibold leading-none text-white transition hover:bg-blue-700" href="/webapp">
              Webapp
            </a>
            <a className="focus-ring w-fit rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold leading-none text-slate-700 transition hover:bg-slate-50" href="/admin">
              Verwaltung
            </a>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-600">
        <span>Datenquelle</span>
        <span className="font-semibold text-slate-950">{sourceLabel(dataSource)}</span>
      </div>

      <ModuleGrid activeMode={mode} onModeChange={handleModeChange} />

      {!anatomyData || !selection ? (
        <section className="glass rounded-lg p-6 text-sm leading-6 text-slate-600">
          Anatomische Daten werden geladen...
        </section>
      ) : (
      <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)_360px] lg:gap-5">
        <aside className="glass order-2 rounded-lg p-4 lg:order-1">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Auswahl</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">{modeLabel(mode)}</h2>
            </div>
          </div>

          {mode === "triggerpoints" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="muscle-search">
                  Muskel suchen
                </label>
                <input
                  id="muscle-search"
                  value={muscleFilter}
                  onChange={(event) => setMuscleFilter(event.target.value)}
                  placeholder="z. B. infra, piriformis, trapezius"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-400"
                />
                <label className="mt-3 block text-sm font-medium text-slate-700" htmlFor="muscle">
                  Muskel direkt auswaehlen
                </label>
                <select
                  id="muscle"
                  value={selection.type === "muscle" ? selection.id : selection.type === "triggerpoint" ? selection.muscleId : ""}
                  onChange={(event) => setSelection({ type: "muscle", id: event.target.value })}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-400"
                >
                  {visibleMuscles.map((muscle) => (
                    <option key={muscle.id} value={muscle.id}>
                      {muscle.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  {visibleMuscles.length} von {muscles.length} Muskeln
                </p>
              </div>
              {blocks.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="block">
                    Block auswaehlen
                  </label>
                  <select
                    id="block"
                    value={selection.type === "block" ? selection.id : ""}
                    onChange={(event) => setSelection({ type: "block", id: event.target.value })}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-400"
                  >
                    <option value="" disabled>Block waehlen</option>
                    {blocks.map((block) => (
                      <option key={block.id} value={block.id}>
                        {block.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">{blocks.length} Bloecke</p>
                </div>
              )}
              <div className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600 sm:block">
                Oder Schmerzregion in der Koerperkarte anklicken. Die App zeigt passende
                Triggerpunkte und typische Ausstrahlungsareale.
              </div>
            </div>
          )}

          {mode === "dermatomes" && (
            <div className="grid gap-2">
              {dermatomeRegions.map((region) => (
                <button
                  key={region.id}
                  onClick={() => setSelection({ type: "dermatome", id: region.id })}
                  className={`focus-ring rounded-lg px-3 py-3 text-left text-sm transition ${
                    selection.type === "dermatome" && selection.id === region.id ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="block font-semibold">{region.name}</span>
                  <span className={selection.type === "dermatome" && selection.id === region.id ? "text-blue-100" : "text-slate-500"}>
                    {region.segments.join(", ")}
                  </span>
                </button>
              ))}
            </div>
          )}


          {mode === "nerves" && (
            <div className="grid gap-2">
              {peripheralNerves.map((nerve) => (
                <button
                  key={nerve.id}
                  onClick={() => setSelection({ type: "nerve", id: nerve.id })}
                  className={`focus-ring rounded-lg px-3 py-3 text-left text-sm transition ${selection.type === "nerve" && selection.id === nerve.id ? "bg-violet-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
                >
                  <span className="block font-semibold">{nerve.name}</span>
                  <span className={selection.type === "nerve" && selection.id === nerve.id ? "text-violet-100" : "text-slate-500"}>{nerve.segments.join(", ")}</span>
                </button>
              ))}
            </div>
          )}

          {mode === "fascia" && (
            <div className="grid gap-2">
              {fasciaLines.map((line) => (
                <button
                  key={line.id}
                  onClick={() => setSelection({ type: "fascia", id: line.id })}
                  className={`focus-ring rounded-lg px-3 py-3 text-left text-sm transition ${selection.type === "fascia" && selection.id === line.id ? "bg-teal-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
                >
                  <span className="block font-semibold">{line.name}</span>
                  <span className={selection.type === "fascia" && selection.id === line.id ? "text-teal-100" : "text-slate-500"}>{line.regions.join(", ")}</span>
                </button>
              ))}
            </div>
          )}
          {mode === "myotomes" && (
            <div className="grid gap-2">
              {myotomeGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelection({ type: "myotome", id: group.id })}
                  className={`focus-ring rounded-lg px-3 py-3 text-left text-sm transition ${
                    selection.type === "myotome" && selection.id === group.id ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="block font-semibold">{group.name}</span>
                  <span className={selection.type === "myotome" && selection.id === group.id ? "text-blue-100" : "text-slate-500"}>
                    {group.segments.join(", ")}
                  </span>
                </button>
              ))}
            </div>
          )}

          <LayerToggles layers={layers} onChange={setLayers} zoom={zoom} onZoomChange={setZoom} onResetView={resetBodyView} />
        </aside>

        <BodyMap
          mode={mode}
          selection={selection}
          layers={layers}
          zoom={zoom}
          resetViewKey={bodyResetKey}
          muscles={muscles}
          dermatomeRegions={dermatomeRegions}
          myotomeGroups={myotomeGroups}
          blocks={blocks}
          peripheralNerves={peripheralNerves}
          fasciaLines={fasciaLines}
          infoPlacement="external"
          onInfoChange={setBodyInfo}
          onSelect={setSelection}
        />

        <div className="order-3 space-y-4 lg:order-3">
          {mode === "triggerpoints" && <BodyInfoPanel info={bodyInfo} />}
          <DetailPanel mode={mode} selection={selection} data={selectedData} onSelect={setSelection} />
        </div>
      </section>
      )}
    </main>
  );
}

function modeLabel(mode: AnatomyMode) {
  const labels: Record<AnatomyMode, string> = {
    triggerpoints: "Triggerpunkte",
    dermatomes: "Dermatome",
    myotomes: "Myotome",
    nerves: "Periphere Nerven",
    fascia: "Faszien",
    future: "Weitere Karten"
  };

  return labels[mode];
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
  if (source === "loading") return "Realtime Database wird geprueft";
  if (source === "realtime") return "Realtime Database";
  return "Lokale Demo-Daten";
}

