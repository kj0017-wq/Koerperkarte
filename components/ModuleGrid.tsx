import type { AnatomyMode } from "@/lib/types";

type ModuleCard = {
  id: AnatomyMode;
  title: string;
  description: string;
  status: "ready" | "soon";
};

const modules: ModuleCard[] = [
  {
    id: "triggerpoints",
    title: "Triggerpunkte",
    description: "Muskeln, Punkte und typische Ausstrahlungsareale.",
    status: "ready"
  },
  {
    id: "dermatomes",
    title: "Dermatome",
    description: "Regionen anklicken und segmentale Zuordnung sehen.",
    status: "ready"
  },
  {
    id: "myotomes",
    title: "Myotome",
    description: "Muskelgruppen, Bewegung und Segmente vergleichen.",
    status: "ready"
  },
  {
    id: "nerves",
    title: "Periphere Nerven",
    description: "Nervenverlaeufe und Versorgungsgebiete anzeigen.",
    status: "ready"
  },
  {
    id: "future",
    title: "Weitere Karten",
    description: "Faszien, Gefaesse oder Spezialkarten modular ergaenzen.",
    status: "soon"
  }
];

type ModuleGridProps = {
  activeMode: AnatomyMode;
  onModeChange: (mode: AnatomyMode) => void;
};

export function ModuleGrid({ activeMode, onModeChange }: ModuleGridProps) {
  return (
    <nav
      className="-mx-3 flex snap-x gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-5"
      aria-label="Anatomische Module"
    >
      {modules.map((item) => {
        const active = activeMode === item.id;
        const disabled = item.status === "soon";

        return (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => onModeChange(item.id)}
            className={`focus-ring min-w-[168px] snap-start rounded-lg border p-3 text-left transition duration-300 sm:min-w-0 sm:p-4 ${
              active
                ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "border-slate-200 bg-white/80 text-slate-900 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
            } ${disabled ? "cursor-not-allowed opacity-55 hover:translate-y-0" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold">{item.title}</h2>
              <span
                className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
                  active ? "bg-white/18 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {item.status === "ready" ? "Aktiv" : "Bald"}
              </span>
            </div>
            <p className={`mt-2 line-clamp-2 text-sm leading-5 sm:mt-3 ${active ? "text-blue-50" : "text-slate-500"}`}>
              {item.description}
            </p>
          </button>
        );
      })}
    </nav>
  );
}
