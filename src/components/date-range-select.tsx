"use client";
import { Input } from "@/components/ui/input";
import { FilterSelect } from "@/components/filter-select";
import { DateRange, PRESET_LABELS, Preset } from "@/lib/time";

const OPTIONS = (Object.keys(PRESET_LABELS) as Preset[]).map((p) => ({ value: p, label: PRESET_LABELS[p] }));

export function DateRangeSelect({
  value,
  onChange,
  presets,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
  presets?: Preset[];
}) {
  const options = presets ? OPTIONS.filter((o) => presets.includes(o.value as Preset)) : OPTIONS;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        aria-label="Date range"
        className="min-w-36"
        value={value.preset}
        allLabel=""
        onChange={(v) => onChange({ preset: (v || "14d") as Preset, from: value.from, to: value.to })}
        options={options}
      />
      {value.preset === "custom" && (
        <>
          <Input
            type="date"
            aria-label="From date"
            className="h-8 w-36"
            value={value.from ?? ""}
            onChange={(e) => onChange({ ...value, from: e.target.value || undefined })}
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            aria-label="To date"
            className="h-8 w-36"
            value={value.to ?? ""}
            onChange={(e) => onChange({ ...value, to: e.target.value || undefined })}
          />
        </>
      )}
    </div>
  );
}
