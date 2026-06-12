import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

interface FileDropZoneProps {
  getRootProps: any;
  getInputProps: any;
  isDragActive: boolean;
  setIsTypingManually: (val: boolean) => void;
  setInput: (val: string) => void;
  setSourceLanguage: (val: string) => void;
}

export function FileDropZone({
  getRootProps,
  getInputProps,
  isDragActive,
  setIsTypingManually,
  setInput,
  setSourceLanguage
}: FileDropZoneProps) {
  return (
    <div
      {...getRootProps({
        onClick: (e: any) => {
          if (e.target.closest("button")) {
            e.stopPropagation();
            return;
          }
        }
      })}
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 z-10",
        "bg-white/95 dark:bg-surface-charcoal/95 backdrop-blur-sm",
        isDragActive && "bg-amber-500/5 ring-2 ring-inset ring-amber-500/40"
      )}
    >
      <input {...getInputProps()} />
      <div className={cn(
        "flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed transition-colors",
        isDragActive ? "border-amber-500 bg-amber-500/10" : "border-slate-200 dark:border-amber-500/10 bg-slate-50 dark:bg-white/5"
      )}>
        <Upload className={cn("h-6 w-6", isDragActive ? "text-amber-500" : "text-slate-400 dark:text-slate-600")} />
      </div>
      <div className="text-center px-4">
        <p className="text-sm font-bold">{isDragActive ? "Drop your file here" : "Drag & drop a code file"}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">or click to browse · .py .js .ts .java .cpp .go .rs .c .cs</p>
      </div>
      <div className="mt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsTypingManually(true);
          }}
          className="text-xs bg-background border-slate-200 dark:border-amber-500/20 hover:bg-slate-50 dark:hover:bg-amber-900/10 shadow-sm"
        >
          Type Code Manually
        </Button>
      </div>
      
      <div className="mt-4 flex flex-col items-center gap-2 max-w-sm px-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Or load a sample snippet</p>
        <div className="flex flex-wrap gap-1.5 justify-center">
          <Button
            type="button"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              setInput(`def fibonacci(n):\n    if n <= 0:\n        return []\n    elif n == 1:\n        return [0]\n    \n    fib = [0, 1]\n    while len(fib) < n:\n        fib.append(fib[-1] + fib[-2])\n    return fib\n\n# Example usage:\nprint(fibonacci(10))`);
              setSourceLanguage("python");
              setIsTypingManually(true);
              toast.success("Loaded Python Fibonacci example!");
              track("sample_loaded", { sample: "python_fibonacci" });
            }}
            className="h-7 text-[10px] px-2.5 rounded-md font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10"
          >
            Python Fibonacci
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              setInput(`// JS Promise retry helper\nfunction retryWithDelay(fn, retries = 3, delay = 1000) {\n  return new Promise((resolve, reject) => {\n    fn()\n      .then(resolve)\n      .catch((error) => {\n        if (retries === 0) {\n          return reject(error);\n        }\n        setTimeout(() => {\n          retryWithDelay(fn, retries - 1, delay).then(resolve, reject);\n        }, delay);\n      });\n  });\n}`);
              setSourceLanguage("javascript");
              setIsTypingManually(true);
              toast.success("Loaded JS Retry Promise example!");
              track("sample_loaded", { sample: "js_retry" });
            }}
            className="h-7 text-[10px] px-2.5 rounded-md font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10"
          >
            JS Retry Promise
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              setInput(`-- SQL: Calculate active user monthly retention\nWITH UserMonths AS (\n  SELECT DISTINCT user_id, DATE_TRUNC('month', created_at) AS active_month\n  FROM translation_history\n)\nSELECT \n  m1.active_month AS month,\n  COUNT(DISTINCT m1.user_id) AS active_users,\n  COUNT(DISTINCT m2.user_id) AS retained_users,\n  ROUND(COUNT(DISTINCT m2.user_id)::DECIMAL / COUNT(DISTINCT m1.user_id) * 100, 2) AS retention_rate\nFROM UserMonths m1\nLEFT JOIN UserMonths m2 \n  ON m1.user_id = m2.user_id \n  AND m2.active_month = m1.active_month + INTERVAL '1' month\nGROUP BY 1\nORDER BY 1 DESC;`);
              setSourceLanguage("sql");
              setIsTypingManually(true);
              toast.success("Loaded SQL Retention example!");
              track("sample_loaded", { sample: "sql_retention" });
            }}
            className="h-7 text-[10px] px-2.5 rounded-md font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10"
          >
            SQL Retention
          </Button>
        </div>
      </div>
    </div>
  );
}
