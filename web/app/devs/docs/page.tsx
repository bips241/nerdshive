import Link from 'next/link';
import { getAllDocuments } from '@/app/docs/lib/docs';
import { 
  FileText, 
  Clock, 
  Layers, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Cpu, 
  Rocket,
  Lock
} from 'lucide-react';

export default async function DevsDocsIndexPage() {
  const documents = await getAllDocuments();

  return (
    <div className="w-full">
      {/* Hero Header */}
      <div className="relative mb-12 rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 p-8 sm:p-12 shadow-2xl backdrop-blur-xl overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400 mb-4">
            <Lock className="h-3.5 w-3.5" />
            Restricted Developer Portal
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
            NerdShive <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">Engineering Hub</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Central immutable single source of truth (SSOT) for infrastructure rollout, zero-loss disaster recovery policies, backend-enforced RBAC, and microservices architecture.
          </p>

          <div className="mt-8 flex flex-wrap gap-4 text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5">
              <Rocket className="h-4 w-4 text-cyan-400" />
              <span>Free-Tier to Millions Scale</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>IT Act §67C & DPDP 2023 Compliant</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5">
              <Cpu className="h-4 w-4 text-purple-400" />
              <span>10 CI/CD Validation Gates</span>
            </div>
          </div>
        </div>
      </div>

      {/* Document Grid */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Layers className="h-5 w-5 text-cyan-400" />
          Active Specifications & Guides ({documents.length})
        </h2>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc) => {
          const isBible = doc.slug.includes('BIBLE');
          const isSSOT = doc.slug.includes('SSOT');
          const isStorage = doc.slug.includes('STORAGE');

          return (
            <Link
              key={doc.slug}
              href={`/devs/docs/${doc.slug}`}
              className={`group relative flex flex-col justify-between rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                isBible
                  ? 'border-cyan-500/40 bg-gradient-to-b from-cyan-950/20 via-slate-900 to-slate-950 hover:border-cyan-400/80 hover:shadow-cyan-500/10'
                  : isSSOT
                  ? 'border-purple-500/40 bg-gradient-to-b from-purple-950/20 via-slate-900 to-slate-950 hover:border-purple-400/80 hover:shadow-purple-500/10'
                  : isStorage
                  ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 via-slate-900 to-slate-950 hover:border-emerald-400/80 hover:shadow-emerald-500/10'
                  : 'border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900/90'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center rounded-full bg-slate-800/90 px-2.5 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700/60">
                    {doc.meta.category}
                  </span>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                    <Clock className="h-3 w-3 text-slate-500" />
                    <span>{doc.meta.readingTimeMinutes} min</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 mb-3">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                    <FileText className="h-4 w-4" />
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-2">
                    {doc.meta.title}
                  </h3>
                </div>

                <p className="text-sm text-slate-400 leading-relaxed line-clamp-3 mb-6">
                  {doc.meta.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>{doc.meta.wordCount.toLocaleString()} words</span>
                <span className="inline-flex items-center gap-1 text-cyan-400 group-hover:translate-x-1 transition-transform font-sans font-semibold">
                  Read Spec <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
