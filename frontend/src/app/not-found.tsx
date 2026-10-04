import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — Page Not Found | Anuvaad",
  description: "This page got lost in translation.",
};

const CODE_SNIPPETS = [
  {
    lang: "TypeScript",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    code: `function findPage(path: string): Page {\n  throw new NotFoundError(\`'\${path}' doesn't exist\`);\n}`,
  },
  {
    lang: "Python",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    code: `def find_page(path: str) -> Page:\n    raise PageNotFoundError(f"'{path}' vanished")  # 404`,
  },
  {
    lang: "Go",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    code: `func FindPage(path string) (*Page, error) {\n    return nil, fmt.Errorf("%q: not found", path)\n}`,
  },
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center px-4 py-24">
      <div className="max-w-2xl w-full">
        {/* Breadcrumb path */}
        <div className="font-mono text-xs text-slate-500 mb-6 tracking-widest uppercase">
          anuvaad / error / 404
        </div>

        {/* Heading */}
        <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight text-white mb-4 [text-wrap:balance]">
          This page got lost{" "}
          <span className="text-amber-500">in translation.</span>
        </h1>

        <p className="text-slate-400 text-base mb-10 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist. But your code
          translation probably will.
        </p>

        {/* Code blocks — same error, three languages */}
        <div className="space-y-3 mb-10">
          {CODE_SNIPPETS.map((s) => (
            <div
              key={s.lang}
              className="rounded-xl bg-slate-900 border border-slate-800 p-4 font-mono text-sm"
            >
              <div className={`inline-flex items-center text-[10px] font-bold uppercase tracking-widest mb-3 px-2 py-0.5 rounded border ${s.color} ${s.bg} ${s.border}`}>
                {s.lang}
              </div>
              <pre className="text-slate-300 text-xs leading-relaxed whitespace-pre overflow-x-auto">
                {s.code}
              </pre>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            ← Take me home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-semibold border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            Go to Workbench →
          </Link>
        </div>
      </div>
    </div>
  );
}
