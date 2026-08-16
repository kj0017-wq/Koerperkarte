"use client";

import { useMemo, useState } from "react";
import { deleteAnatomyItem, saveAnatomyItem, type AnatomyData } from "@/lib/anatomyRepository";
import type { DermatomeRegion, MuscleMapItem, MyotomeGroup, TriggerPoint } from "@/lib/types";

type AdminCollection = "muscles" | "dermatomes" | "myotomes";
type SaveState = "idle" | "saving" | "saved" | "error";

type AdminPanelProps = {
  data: AnatomyData;
  onDataChanged: () => Promise<void>;
};

const emptyMuscle: MuscleMapItem = {
  id: "",
  name: "",
  bodyArea: "",
  course: "",
  explanation: "",
  painRegions: [],
  triggerpoints: [],
  referralArea: "",
  referralPath: ""
};

const emptyDermatome: DermatomeRegion = {
  id: "",
  name: "",
  segments: [],
  description: "",
  mapPath: ""
};

const emptyMyotome: MyotomeGroup = {
  id: "",
  name: "",
  movement: "",
  segments: [],
  description: "",
  mapPath: ""
};

export function AdminPanel({ data, onDataChanged }: AdminPanelProps) {
  const [collection, setCollection] = useState<AdminCollection>("muscles");
  const [selectedId, setSelectedId] = useState<string>("new");
  const [draft, setDraft] = useState<MuscleMapItem | DermatomeRegion | MyotomeGroup>(emptyMuscle);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  const items = useMemo(() => getItems(data, collection), [collection, data]);

  function switchCollection(nextCollection: AdminCollection) {
    setCollection(nextCollection);
    setSelectedId("new");
    setDraft(createEmptyItem(nextCollection));
    setSaveState("idle");
    setMessage("");
  }

  function selectItem(id: string) {
    setSelectedId(id);
    setSaveState("idle");
    setMessage("");

    if (id === "new") {
      setDraft(createEmptyItem(collection));
      return;
    }

    const item = items.find((entry) => entry.id === id);
    if (item) setDraft(cloneItem(item));
  }

  async function handleSave() {
    const normalized = normalizeDraft(collection, draft);

    if (!normalized.id || !normalized.name) {
      setSaveState("error");
      setMessage("ID und Name sind Pflichtfelder.");
      return;
    }

    setSaveState("saving");
    setMessage("");

    try {
      await saveAnatomyItem(collection, normalized);
      await onDataChanged();
      setSelectedId(normalized.id);
      setDraft(normalized);
      setSaveState("saved");
      setMessage("Datensatz gespeichert.");
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
    }
  }

  async function handleDelete() {
    if (selectedId === "new" || !draft.id) return;
    const confirmed = window.confirm(`Datensatz "${draft.name}" wirklich loeschen?`);
    if (!confirmed) return;

    setSaveState("saving");
    setMessage("");

    try {
      await deleteAnatomyItem(collection, draft.id);
      await onDataChanged();
      setSelectedId("new");
      setDraft(createEmptyItem(collection));
      setSaveState("saved");
      setMessage("Datensatz geloescht.");
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "Loeschen fehlgeschlagen.");
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-5">
      <aside className="glass rounded-lg p-4">
        <div className="flex rounded-lg border border-slate-200 bg-white p-1">
          {(["muscles", "dermatomes", "myotomes"] as AdminCollection[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => switchCollection(key)}
              className={`focus-ring flex-1 rounded-md px-2 py-2 text-sm font-semibold transition ${
                collection === key ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {collectionLabel(key)}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={() => selectItem("new")}
            className={`focus-ring rounded-lg px-3 py-3 text-left text-sm transition ${
              selectedId === "new" ? "bg-blue-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span className="block font-semibold">Neuer Datensatz</span>
            <span className={selectedId === "new" ? "text-blue-100" : "text-slate-500"}>Eintrag anlegen</span>
          </button>

          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectItem(item.id)}
              className={`focus-ring rounded-lg px-3 py-3 text-left text-sm transition ${
                selectedId === item.id ? "bg-blue-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="block font-semibold">{item.name}</span>
              <span className={selectedId === item.id ? "text-blue-100" : "text-slate-500"}>{item.id}</span>
            </button>
          ))}
        </div>
      </aside>

      <form className="glass rounded-lg p-4 sm:p-5" onSubmit={(event) => event.preventDefault()}>
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Datenbank Verwaltung</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">{collectionLabel(collection)}</h2>
          </div>
          <div className="flex gap-2">
            {selectedId !== "new" && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saveState === "saving"}
                className="focus-ring rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
              >
                Loeschen
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saveState === "saving"}
              className="focus-ring rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {saveState === "saving" ? "Speichert..." : "Speichern"}
            </button>
          </div>
        </div>

        {message && (
          <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${saveState === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {message}
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <TextField label="ID" value={draft.id} onChange={(value) => setDraft({ ...draft, id: slugify(value) })} />
          <TextField label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />

          {collection === "muscles" && "bodyArea" in draft && (
            <MuscleFields item={draft} onChange={setDraft} />
          )}

          {collection === "dermatomes" && "mapPath" in draft && !("movement" in draft) && (
            <DermatomeFields item={draft} onChange={setDraft} />
          )}

          {collection === "myotomes" && "movement" in draft && (
            <MyotomeFields item={draft} onChange={setDraft} />
          )}
        </div>
      </form>
    </section>
  );
}

function MuscleFields({ item, onChange }: { item: MuscleMapItem; onChange: (item: MuscleMapItem) => void }) {
  return (
    <>
      <TextField label="Koerperbereich" value={item.bodyArea} onChange={(bodyArea) => onChange({ ...item, bodyArea })} />
      <TextField label="Schmerzregionen" value={item.painRegions.join(", ")} onChange={(value) => onChange({ ...item, painRegions: splitList(value) })} />
      <TextArea label="Verlauf" value={item.course} onChange={(course) => onChange({ ...item, course })} />
      <TextArea label="Kurz erklaert" value={item.explanation} onChange={(explanation) => onChange({ ...item, explanation })} />
      <TextArea label="Ausstrahlungsgebiet" value={item.referralArea} onChange={(referralArea) => onChange({ ...item, referralArea })} />
      <TextArea label="SVG Pfad Ausstrahlung" value={item.referralPath} onChange={(referralPath) => onChange({ ...item, referralPath })} />
      <TextArea
        label="Triggerpunkte"
        helper="Eine Zeile pro Punkt: Label, x, y"
        value={formatTriggerpoints(item.triggerpoints)}
        onChange={(value) => onChange({ ...item, triggerpoints: parseTriggerpoints(value, item.id) })}
      />
    </>
  );
}

function DermatomeFields({ item, onChange }: { item: DermatomeRegion; onChange: (item: DermatomeRegion) => void }) {
  return (
    <>
      <TextField label="Segmente" value={item.segments.join(", ")} onChange={(value) => onChange({ ...item, segments: splitList(value) })} />
      <TextArea label="Beschreibung" value={item.description} onChange={(description) => onChange({ ...item, description })} />
      <TextArea label="SVG Pfad Karte" value={item.mapPath} onChange={(mapPath) => onChange({ ...item, mapPath })} />
    </>
  );
}

function MyotomeFields({ item, onChange }: { item: MyotomeGroup; onChange: (item: MyotomeGroup) => void }) {
  return (
    <>
      <TextField label="Bewegung" value={item.movement} onChange={(movement) => onChange({ ...item, movement })} />
      <TextField label="Segmente" value={item.segments.join(", ")} onChange={(value) => onChange({ ...item, segments: splitList(value) })} />
      <TextArea label="Beschreibung" value={item.description} onChange={(description) => onChange({ ...item, description })} />
      <TextArea label="SVG Pfad Karte" value={item.mapPath} onChange={(mapPath) => onChange({ ...item, mapPath })} />
    </>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-400"
      />
    </label>
  );
}

function TextArea({ label, helper, value, onChange }: { label: string; helper?: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm font-medium text-slate-700 sm:col-span-2">
      {label}
      {helper && <span className="ml-2 text-xs font-normal text-slate-400">{helper}</span>}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm leading-6 outline-none transition focus:border-blue-400"
      />
    </label>
  );
}

function getItems(data: AnatomyData, collection: AdminCollection) {
  if (collection === "muscles") return data.muscles;
  if (collection === "dermatomes") return data.dermatomeRegions;
  return data.myotomeGroups;
}

function createEmptyItem(collection: AdminCollection) {
  if (collection === "muscles") return cloneItem(emptyMuscle);
  if (collection === "dermatomes") return cloneItem(emptyDermatome);
  return cloneItem(emptyMyotome);
}

function normalizeDraft(collection: AdminCollection, item: MuscleMapItem | DermatomeRegion | MyotomeGroup) {
  if (collection === "muscles" && "bodyArea" in item) {
    return { ...item, id: slugify(item.id), painRegions: item.painRegions.filter(Boolean), triggerpoints: item.triggerpoints.filter((point) => point.label) };
  }

  if (collection === "dermatomes" && "mapPath" in item && !("movement" in item)) {
    return { ...item, id: slugify(item.id), segments: item.segments.filter(Boolean) };
  }

  if (collection === "myotomes" && "movement" in item) {
    return { ...item, id: slugify(item.id), segments: item.segments.filter(Boolean) };
  }

  return item;
}

function cloneItem<T>(item: T): T {
  return JSON.parse(JSON.stringify(item)) as T;
}

function splitList(value: string) {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatTriggerpoints(points: TriggerPoint[]) {
  return points.map((point) => `${point.label}, ${point.x}, ${point.y}`).join("\n");
}

function parseTriggerpoints(value: string, ownerId: string) {
  return value
    .split("\n")
    .map((line, index) => {
      const [label = "", x = "0", y = "0"] = line.split(",").map((part) => part.trim());
      return {
        id: `tp-${ownerId || "item"}-${index + 1}`,
        label,
        x: Number(x) || 0,
        y: Number(y) || 0
      };
    })
    .filter((point) => point.label);
}

function collectionLabel(collection: AdminCollection) {
  if (collection === "muscles") return "Triggerpunkte";
  if (collection === "dermatomes") return "Dermatome";
  return "Myotome";
}