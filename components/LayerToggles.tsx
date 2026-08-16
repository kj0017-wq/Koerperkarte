import type { LayerState } from "@/lib/types";

type LayerTogglesProps = {
  layers: LayerState;
  onChange: (layers: LayerState) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
};

const layerLabels: Array<{ id: keyof LayerState; label: string }> = [
  { id: "anatomy", label: "Koerper" },
  { id: "triggerpoints", label: "Triggerpunkte" },
  { id: "referral", label: "Ausstrahlung" },
  { id: "segments", label: "Segmente" },
  { id: "skeleton", label: "Skelett" },
  { id: "organs", label: "Organe" }
];

export function LayerToggles({ layers, onChange, zoom, onZoomChange }: LayerTogglesProps) {
  return (
    <div className="mt-4 border-t border-slate-100 pt-4 sm:mt-5 sm:pt-5">
      <p className="text-xs font-semibold uppercase text-slate-400">Layer</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {layerLabels.map((layer) => (
          <button
            key={layer.id}
            type="button"
            onClick={() => onChange({ ...layers, [layer.id]: !layers[layer.id] })}
            className={`focus-ring min-h-11 rounded-lg px-3 py-2 text-sm font-medium transition ${
              layers[layer.id] ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
            }`}
          >
            {layer.label}
          </button>
        ))}
      </div>
      <label className="mt-4 block text-sm font-medium text-slate-700 sm:mt-5" htmlFor="zoom">
        Zoom {zoom.toFixed(1)}x
      </label>
      <input
        id="zoom"
        type="range"
        min="0.8"
        max="1.6"
        step="0.1"
        value={zoom}
        onChange={(event) => onZoomChange(Number(event.target.value))}
        className="mt-3 h-8 w-full accent-blue-600"
      />
    </div>
  );
}
