import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { languages } from "../../_constants/languages";

export function SearchableLanguageSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = languages.find((l) => l.value === value);
  const filtered = languages.filter((l) =>
    l.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        onClick={() => { setOpen(!open); setSearch(""); }}
        className="flex items-center gap-2 glass-pill rounded-lg px-3 py-1.5 shadow-sm cursor-pointer select-none transition-colors hover:bg-white/20 dark:hover:bg-white/10"
      >
        <span className="text-xs font-medium text-muted-foreground">{label}:</span>
        <span className="text-sm font-medium text-foreground">{selected?.label || value}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </div>

      {open && (
        <Card className="absolute right-0 top-full mt-1.5 z-45 w-56 p-1.5 shadow-xl border border-border/80 bg-popover text-popover-foreground animate-in fade-in slide-in-from-top-1 duration-150">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search language..."
            className="h-8 text-xs mb-1.5 bg-muted/40 border-none focus-visible:ring-1 focus-visible:ring-amber-500"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filtered.length > 0 ? (
              filtered.map((l) => (
                <div
                  key={l.value}
                  onClick={() => {
                    onChange(l.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer select-none transition-all",
                    l.value === value 
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-500 font-medium" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{l.label}</span>
                  {l.value === value && <Check className="h-3 w-3 text-amber-500 shrink-0" />}
                </div>
              ))
            ) : (
              <p className="p-2 text-center text-[10px] text-muted-foreground">No matches found</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
