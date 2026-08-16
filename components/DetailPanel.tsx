import type { AnatomyMode, BodyMapBlock, DermatomeRegion, FasciaLine, MapSelection, MuscleMapItem, MyotomeGroup, PeripheralNerve } from "@/lib/types";

type DetailPanelProps = {
  mode: AnatomyMode;
  selection: MapSelection;
  data: MuscleMapItem | MuscleMapItem[] | BodyMapBlock | DermatomeRegion | MyotomeGroup | PeripheralNerve | FasciaLine | null;
  onSelect: (selection: MapSelection) => void;
  activePainRegionId?: string | null;
  onPainRegionHover?: (regionId: string | null) => void;
};

export function DetailPanel({ mode, selection, data, onSelect, activePainRegionId, onPainRegionHover }: DetailPanelProps) {
  return (
    <aside className="glass rounded-lg p-5">
      <p className="text-xs font-semibold uppercase text-slate-400">Befundhilfe</p>
      <h2 className="mt-2 text-2xl font-semibold  text-slate-950">
        {panelTitle(mode, selection, data)}
      </h2>

      <div className="mt-5">
        {Array.isArray(data) && (
          <PainRegionResults
            items={data}
            selection={selection}
            activePainRegionId={activePainRegionId}
            onPainRegionHover={onPainRegionHover}
            onSelect={onSelect}
          />
        )}
        {!Array.isArray(data) && mode === "triggerpoints" && data && "triggerpoints" in data && (
          <MuscleDetail item={data} selection={selection} onSelect={onSelect} />
        )}
        {!Array.isArray(data) && selection.type === "block" && data && "painRegions" in data && !("triggerpoints" in data) && (
          <BlockDetail item={data as BodyMapBlock} />
        )}
        {!Array.isArray(data) && mode === "dermatomes" && data && "segments" in data && "name" in data && (
          <SegmentDetail item={data as DermatomeRegion} />
        )}
        {!Array.isArray(data) && mode === "myotomes" && data && "movement" in data && (
          <MyotomeDetail item={data as MyotomeGroup} />
        )}
        {!Array.isArray(data) && mode === "nerves" && data && "plexus" in data && (
          <NerveDetail item={data as PeripheralNerve} />
        )}
        {!Array.isArray(data) && mode === "fascia" && data && "system" in data && (
          <FasciaDetail item={data as FasciaLine} />
        )}
      </div>

      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Dieses Tool dient als Lern- und Praxisunterstuetzung. Es ersetzt keine aerztliche
        Diagnostik und keine individuelle therapeutische Entscheidung.
      </div>
    </aside>
  );
}

function MuscleDetail({
  item,
  selection,
  onSelect
}: {
  item: MuscleMapItem;
  selection: MapSelection;
  onSelect: (selection: MapSelection) => void;
}) {
  const selectedPoint =
    selection.type === "triggerpoint" && selection.muscleId === item.id
      ? item.triggerpoints.find((point) => point.id === selection.pointId) ?? null
      : null;

  return (
    <div className="space-y-4">
      {selectedPoint && <TriggerPointDetail muscle={item} point={selectedPoint} />}
      <InfoBlock label="Verlauf" value={item.course} />
      <InfoBlock label="Ausstrahlung" value={item.referralArea} />
      {isDisplayableInfo(item.explanation) && <InfoBlock label="Kurz erklaert" value={item.explanation} />}
      <div>
        <p className="text-sm font-semibold text-slate-800">Triggerpunkte</p>
        <div className="mt-2 grid gap-2">
          {(item.triggerpoints ?? []).map((point) => {
            const active = selectedPoint?.id === point.id;

            return (
              <div key={point.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onSelect({ type: "triggerpoint", muscleId: item.id, pointId: point.id, mapView: "front" })}
                  aria-describedby={`triggerpoint-preview-${point.id}`}
                  className={`focus-ring w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    active ? "bg-red-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-slate-950"
                  }`}
                >
                  <span className="block font-semibold">{point.label}</span>
                  <span className={active ? "text-red-50" : "text-slate-500"}>Koordinate {point.x}/{point.y}</span>
                </button>
                <TriggerPointHoverOverlay muscle={item} point={point} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


function TriggerPointHoverOverlay({ muscle, point }: { muscle: MuscleMapItem; point: MuscleMapItem["triggerpoints"][number] }) {
  const regions = point.painRegions?.length ? point.painRegions : muscle.painRegions;
  const location = point.anatomicalLocation || muscle.bodyArea || "Lage noch nicht beschrieben";
  const referral = point.referralArea || muscle.referralArea || "Ausstrahlungsgebiet noch nicht beschrieben";
  const source = point.sourcePage ? `Quelle S. ${point.sourcePage}` : isDisplayableInfo(point.reviewStatus) ? point.reviewStatus : "";

  return (
    <div
      id={`triggerpoint-preview-${point.id}`}
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-full min-w-[260px] rounded-lg border border-red-100 bg-white p-3 text-left text-sm text-slate-700 shadow-2xl shadow-slate-950/15 ring-1 ring-slate-950/5 group-hover:block group-focus-within:block lg:left-auto lg:right-0 lg:w-[320px]"
    >
      <p className="text-xs font-semibold uppercase text-red-600">Triggerpunkt-Info</p>
      <h3 className="mt-1 text-base font-semibold text-slate-950">{point.label}</h3>
      <dl className="mt-2 space-y-2 leading-5">
        <div>
          <dt className="font-semibold text-slate-900">Lage</dt>
          <dd>{location}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Ausstrahlung</dt>
          <dd>{referral}</dd>
        </div>
      </dl>
      {regions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {regions.slice(0, 8).map((region) => (
            <span key={region} className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
              {region}
            </span>
          ))}
        </div>
      )}
      {source && <p className="mt-2 text-xs font-medium text-slate-400">{source}</p>}
    </div>
  );
}
function TriggerPointDetail({ muscle, point }: { muscle: MuscleMapItem; point: MuscleMapItem["triggerpoints"][number] }) {
  const regions = point.painRegions?.length ? point.painRegions : muscle.painRegions;
  const location = point.anatomicalLocation || muscle.bodyArea || "Lage noch nicht beschrieben";
  const referral = point.referralArea || muscle.referralArea || "Ausstrahlungsgebiet noch nicht beschrieben";
  const note = isDisplayableInfo(point.notes) ? point.notes : isDisplayableInfo(muscle.explanation) ? muscle.explanation : "";

  return (
    <section className="rounded-lg border border-red-100 bg-red-50 p-4">
      <p className="text-xs font-semibold uppercase text-red-600">Ausgewaehlter Triggerpunkt</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-950">{point.label}</h3>
      <dl className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
        <div>
          <dt className="font-semibold text-slate-900">Lage</dt>
          <dd>{location}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Ausstrahlung</dt>
          <dd>{referral}</dd>
        </div>
        {note && (
          <div>
            <dt className="font-semibold text-slate-900">Hinweis</dt>
            <dd>{note}</dd>
          </div>
        )}
      </dl>
      {regions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {regions.slice(0, 6).map((region) => (
            <span key={region} className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-red-700">
              {region}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function BlockDetail({ item }: { item: BodyMapBlock }) {
  return (
    <div className="space-y-4">
      <InfoBlock label="Block" value={item.explanation} />
      <InfoBlock label="Ausstrahlung" value={item.referralArea} />
      <InfoBlock label="Zusammenfassung" value={item.notes ?? item.course} />
      <div className="flex flex-wrap gap-2">
        {(item.painRegions ?? []).map((region) => (
          <span key={region} className="rounded-lg bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">
            {region}
          </span>
        ))}
      </div>
    </div>
  );
}

function PainRegionResults({
  items,
  selection,
  activePainRegionId,
  onPainRegionHover,
  onSelect
}: {
  items: MuscleMapItem[];
  selection: MapSelection;
  activePainRegionId?: string | null;
  onPainRegionHover?: (regionId: string | null) => void;
  onSelect: (selection: MapSelection) => void;
}) {
  if (items.length === 0) {
    return <p className="text-sm leading-6 text-slate-600">Keine Demo-Treffer fuer diese Region hinterlegt.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm leading-6 text-slate-600">
        Passende Triggerpunkte aus dem Demo-Datensatz:
      </p>
      {items.map((item) => {
        const active = (selection.type === "muscle" && selection.id === item.id) || (selection.type === "triggerpoint" && selection.muscleId === item.id);

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect({ type: "muscle", id: item.id })}
            className={`focus-ring w-full rounded-lg p-4 text-left transition ${
              active ? "bg-blue-600 text-white shadow-md" : "bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-slate-950"
            }`}
          >
            <span className={active ? "block font-semibold text-white" : "block font-semibold text-slate-950"}>
              {item.name}
            </span>
            {isDisplayableInfo(item.explanation) && (
              <span className={active ? "mt-1 block text-sm leading-6 text-blue-50" : "mt-1 block text-sm leading-6 text-slate-600"}>
                {item.explanation}
              </span>
            )}
            <span className={active ? "mt-2 block text-xs font-semibold uppercase text-blue-100" : "mt-2 block text-xs font-semibold uppercase text-blue-600"}>
              {item.bodyArea}
            </span>
            {(item.painRegions ?? []).length > 0 && (
              <span className="mt-3 flex flex-wrap gap-1.5">
                {(item.painRegions ?? []).slice(0, 7).map((region) => {
                  const regionActive = activePainRegionId === region;

                  return (
                    <span
                      key={region}
                      onMouseEnter={() => onPainRegionHover?.(region)}
                      onMouseLeave={() => onPainRegionHover?.(null)}
                      onFocus={() => onPainRegionHover?.(region)}
                      onBlur={() => onPainRegionHover?.(null)}
                      className={`rounded-full px-2 py-1 text-xs font-semibold transition ${
                        regionActive
                          ? "bg-orange-500 text-white ring-2 ring-orange-200"
                          : active
                            ? "bg-white/20 text-white"
                            : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                      }`}
                    >
                      {painRegionLabel(region)}
                    </span>
                  );
                })}
              </span>
            )}
            <span className={active ? "mt-3 block text-xs font-semibold text-white" : "mt-3 block text-xs font-semibold text-blue-700"}>
              Auf Karte anzeigen
            </span>
          </button>
        );
      })}
    </div>
  );
}

function painRegionLabel(region: string) {
  return region
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
function SegmentDetail({ item }: { item: DermatomeRegion }) {
  return (
    <div className="space-y-4">
      <InfoBlock label="Region" value={item.description} />
      <div className="flex flex-wrap gap-2">
        {(item.segments ?? []).map((segment) => (
          <span key={segment} className="rounded-lg bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
            {segment}
          </span>
        ))}
      </div>
    </div>
  );
}

function MyotomeDetail({ item }: { item: MyotomeGroup }) {
  return (
    <div className="space-y-4">
      <InfoBlock label="Bewegung" value={item.movement} />
      <InfoBlock label="Einordnung" value={item.description} />
      <div className="flex flex-wrap gap-2">
        {(item.segments ?? []).map((segment) => (
          <span key={segment} className="rounded-lg bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
            {segment}
          </span>
        ))}
      </div>
    </div>
  );
}

function NerveDetail({ item }: { item: PeripheralNerve }) {
  return (
    <div className="space-y-4">
      <InfoBlock label="Plexus" value={item.plexus} />
      <InfoBlock label="Verlauf" value={item.course} />
      <InfoBlock label="Versorgung" value={item.distribution} />
      <div className="flex flex-wrap gap-2">
        {(item.segments ?? []).map((segment) => (
          <span key={segment} className="rounded-lg bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-700">
            {segment}
          </span>
        ))}
      </div>
    </div>
  );
}

function FasciaDetail({ item }: { item: FasciaLine }) {
  return (
    <div className="space-y-4">
      <InfoBlock label="System" value={item.system} />
      <InfoBlock label="Verlauf" value={item.course} />
      <InfoBlock label="Funktion" value={item.function} />
      <div className="flex flex-wrap gap-2">
        {(item.regions ?? []).map((region) => (
          <span key={region} className="rounded-lg bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-700">
            {region}
          </span>
        ))}
      </div>
    </div>
  );
}
function InfoBlock({ label, value }: { label: string; value: string }) {
  if (!isDisplayableInfo(value)) return null;

  return (
    <div>
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{value}</p>
    </div>
  );
}

function isDisplayableInfo(value: unknown) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;

  return ![
    "draft",
    "entwurf",
    "demo-datensatz",
    "draft-datensatz",
    "draft-datensatz aus triggerpunkt-import",
    "noch zu ergaenzen",
    "noch zu erg?nzen",
    "noch nicht beschrieben",
    "noch pruefen",
    "noch pr?fen"
  ].some((marker) => normalized.includes(marker));
}

function panelTitle(
  mode: AnatomyMode,
  selection: MapSelection,
  data: MuscleMapItem | MuscleMapItem[] | BodyMapBlock | DermatomeRegion | MyotomeGroup | PeripheralNerve | FasciaLine | null
) {
  if (selection.type === "triggerpoint") return data && "name" in data ? data.name : "Triggerpunkt";
  if (selection.type === "painRegion") return "Schmerzregion ausgewaehlt";
  if (selection.type === "block") return data && "name" in data ? data.name : "Block";
  if (Array.isArray(data)) return "Treffer";
  if (data && "name" in data) return data.name;
  if (mode === "dermatomes") return "Dermatom";
  if (mode === "myotomes") return "Myotom";
  if (mode === "nerves") return "Peripherer Nerv";
  if (mode === "fascia") return "Faszie";
  return "Detail";
}


