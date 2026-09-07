'use client';

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  Copy, 
  Check, 
  FileCode,
  Layers,
  Code2
} from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { slugifyHeading } from '../lib/slugify';

interface MarkdownRendererProps {
  content: string;
}

if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    suppressErrorRendering: true,
    theme: 'dark',
    logLevel: 'fatal',
    securityLevel: 'loose',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: 13,
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      padding: 24,
      nodeSpacing: 45,
      rankSpacing: 45,
      curve: 'basis',
    },
    themeVariables: {
      darkMode: true,
      background: '#090d16',
      primaryColor: '#1e293b',
      primaryTextColor: '#f8fafc',
      primaryBorderColor: '#334155',
      lineColor: '#38bdf8',
      secondaryColor: '#0f172a',
      tertiaryColor: '#090d16',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '13px',
    },
  });

  try {
    // Override Mermaid's internal parseError to prevent DOM error element injection
    (mermaid as any).parseError = function () {
      removeMermaidErrorDOM();
    };
  } catch (_) {}
}

// Clean up any stray error elements Mermaid might append to document body
function removeMermaidErrorDOM() {
  if (typeof document === 'undefined') return;
  try {
    document.querySelectorAll('svg[id^="dmermaid"], div[id^="dmermaid"], [id*="mermaid-error"]').forEach((el) => {
      el.remove();
    });
    document.querySelectorAll('body > div, body > svg').forEach((el) => {
      if (el.textContent?.includes('Syntax error in text') || el.id?.startsWith('dmermaid') || el.querySelector?.('[class*="error-icon"]')) {
        el.remove();
      }
    });
  } catch (_) {}
}

// Sanitize Mermaid chart syntax before feeding to the renderer
function sanitizeMermaidChart(chart: string): string {
  let cleaned = chart.trim();

  // 1. Quote unquoted subgraph titles with brackets:
  // subgraph EdgeTier [Edge Tier: Global Anycast CDN (Cloudflare)] -> subgraph EdgeTier ["Edge Tier: Global Anycast CDN (Cloudflare)"]
  cleaned = cleaned.replace(
    /subgraph\s+([a-zA-Z0-9_-]+)\s*\[([^"\n\]]+)\]/g,
    'subgraph $1 ["$2"]'
  );

  // 2. Quote subgraph titles without brackets:
  // subgraph Edge Layer -> subgraph EdgeLayer ["Edge Layer"]
  cleaned = cleaned.replace(
    /subgraph\s+([a-zA-Z0-9]+)\s+([a-zA-Z0-9\s&_-]+)(?!\s*\[)(?=\n|$)/g,
    (_, id, label) => `subgraph ${id} ["${label.trim()}"]`
  );

  // 3. Replace invalid <--> with standard ---
  cleaned = cleaned.replace(/<-->/g, '---');

  // 4. Remove any raw HTML tags inside node text
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');

  return cleaned;
}

// 1. Interactive Mermaid Diagram Component with Zoom/Pan & Fullscreen Modal
const Mermaid = ({ chart }: { chart: string }) => {
  const [svg, setSvg] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showRaw, setShowRaw] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}-${Date.now()}`;
    const sanitized = sanitizeMermaidChart(chart);

    // Watch for any stray elements injected by Mermaid and remove them immediately
    let observer: MutationObserver | null = null;
    if (typeof document !== 'undefined') {
      observer = new MutationObserver(() => {
        removeMermaidErrorDOM();
      });
      observer.observe(document.body, { childList: true });
    }

    mermaid
      .render(uniqueId, sanitized)
      .then((result) => {
        if (isMounted) {
          setSvg(result.svg);
          setRenderError(null);
        }
        removeMermaidErrorDOM();
      })
      .catch((e) => {
        if (!isMounted) return;
        setRenderError(e?.message || 'Diagram syntax error');
        removeMermaidErrorDOM();
      });

    return () => {
      isMounted = false;
      if (observer) observer.disconnect();
      removeMermaidErrorDOM();
    };
  }, [chart]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    if (isFullscreen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  if (renderError) {
    return (
      <div className="my-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="flex items-center gap-2 font-mono text-cyan-400 font-semibold">
            <Layers size={14} /> Architecture Diagram
          </span>
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <Code2 size={12} />
            {showRaw ? 'Hide Code' : 'View Code'}
          </button>
        </div>
        {showRaw ? (
          <pre className="mt-3 p-4 rounded-xl bg-slate-950 text-[12px] font-mono text-slate-300 overflow-x-auto border border-slate-800 leading-relaxed">
            <code>{chart}</code>
          </pre>
        ) : (
          <p className="text-xs text-slate-500 font-mono">
            Diagram representation active. Click "View Code" to inspect source flow.
          </p>
        )}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-8 bg-slate-900/60 rounded-2xl border border-slate-800 p-8 flex items-center justify-center min-h-[160px]">
        <div className="text-slate-400 text-xs animate-pulse flex items-center gap-2 font-mono">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          Rendering interactive diagram...
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Inline diagram box */}
      <div className="my-8 w-full bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative group">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            Interactive Architecture Diagram
          </span>
          <button
            onClick={() => setIsFullscreen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Open Fullscreen with Zoom & Pan"
          >
            <Maximize2 size={13} />
            <span>Fullscreen</span>
          </button>
        </div>

        <div 
          className="p-6 overflow-x-auto flex justify-center items-center [&_svg]:max-w-full [&_svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      {/* Fullscreen interactive zoom & pan modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 text-sm font-mono text-slate-300">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>Diagram Inspector (Drag to Pan, Scroll to Zoom)</span>
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Minimize2 size={14} />
              <span>Close (ESC)</span>
            </button>
          </div>

          <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
            <TransformWrapper
              initialScale={1}
              minScale={0.2}
              maxScale={4}
              limitToBounds={false}
              wheel={{ step: 0.1 }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <div className="absolute bottom-6 right-6 z-30 flex items-center gap-2 p-2 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 shadow-2xl">
                    <button
                      onClick={() => zoomIn()}
                      className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn size={18} />
                    </button>
                    <button
                      onClick={() => resetTransform()}
                      className="px-3 py-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono transition-colors"
                      title="Reset View"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => zoomOut()}
                      className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut size={18} />
                    </button>
                  </div>

                  <div className="cursor-grab active:cursor-grabbing w-full h-full flex items-center justify-center">
                    <TransformComponent
                      wrapperStyle={{ width: '100%', height: '100%' }}
                      contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <div
                        className="w-full h-full flex items-center justify-center [&_svg]:max-w-[90vw] [&_svg]:max-h-[80vh]"
                        dangerouslySetInnerHTML={{ __html: svg }}
                      />
                    </TransformComponent>
                  </div>
                </>
              )}
            </TransformWrapper>
          </div>
        </div>
      )}
    </>
  );
};

// 2. Syntax-Highlighted Code Block with 1-Click Copy
const CodeBlock = ({ className, children }: { className?: string; children: any }) => {
  const [copied, setCopied] = useState(false);
  const textContent = String(children).replace(/\n$/, '');
  const language = (className || '').replace(/language-/, '') || 'bash';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  return (
    <div className="relative my-6 rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/90 text-xs font-mono text-slate-400">
        <span className="flex items-center gap-1.5 text-cyan-400 uppercase tracking-wider">
          <FileCode size={13} />
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          title="Copy to clipboard"
        >
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono text-slate-200">
        <code>{children}</code>
      </pre>
    </div>
  );
};

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-invert max-w-none w-full tracking-tight prose-headings:font-bold prose-headings:tracking-tight prose-a:text-cyan-400 hover:prose-a:text-cyan-300 prose-img:rounded-xl">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const contentStr = String(children).replace(/\n$/, '');

            if (match && match[1] === 'mermaid') {
              return <Mermaid chart={contentStr} />;
            }

            const isBlock = match || contentStr.includes('\n');
            if (isBlock) {
              return <CodeBlock className={className}>{children}</CodeBlock>;
            }

            return (
              <code className="rounded-md bg-slate-800/90 px-1.5 py-0.5 font-mono text-[0.88em] text-cyan-300 border border-slate-700/50" {...props}>
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="mb-5 leading-relaxed text-slate-300 text-base">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc list-outside ml-6 mb-6 space-y-2 text-slate-300 marker:text-cyan-500">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-outside ml-6 mb-6 space-y-2 text-slate-300 marker:text-cyan-500">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>;
          },
          h1({ children }) {
            const id = slugifyHeading(children);
            return (
              <h1 id={id} className="scroll-mt-24 text-3xl sm:text-4xl font-extrabold tracking-tight text-white mt-12 mb-6 border-b border-slate-800 pb-3">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            const id = slugifyHeading(children);
            return (
              <h2 id={id} className="scroll-mt-24 text-2xl sm:text-3xl font-bold tracking-tight text-white mt-12 mb-6 pb-2 border-b border-slate-800/80">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            const id = slugifyHeading(children);
            return (
              <h3 id={id} className="scroll-mt-24 text-xl sm:text-2xl font-semibold tracking-tight text-cyan-300 mt-8 mb-4">
                {children}
              </h3>
            );
          },
          h4({ children }) {
            const id = slugifyHeading(children);
            return (
              <h4 id={id} className="scroll-mt-24 text-lg sm:text-xl font-semibold tracking-tight text-slate-200 mt-6 mb-3">
                {children}
              </h4>
            );
          },
          strong({ children }) {
            return <strong className="font-semibold text-white">{children}</strong>;
          },
          a({ href, children }) {
            return (
              <a 
                href={href} 
                className="text-cyan-400 hover:text-cyan-300 font-medium underline underline-offset-4 decoration-cyan-500/30 hover:decoration-cyan-400 transition-all"
              >
                {children}
              </a>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-6 rounded-2xl border-l-4 border-cyan-500 bg-cyan-950/20 px-5 py-3 text-slate-200 shadow-inner">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="my-8 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
                <table className="min-w-full divide-y divide-slate-800 text-sm">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-slate-900/90 text-slate-200">{children}</thead>;
          },
          tr({ children }) {
            return <tr className="divide-x divide-slate-800/50 hover:bg-slate-900/40 transition-colors">{children}</tr>;
          },
          th({ children }) {
            return (
              <th className="px-4 py-3.5 text-left font-semibold text-white text-xs uppercase tracking-wider">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-4 py-3.5 text-slate-300 text-xs sm:text-sm leading-relaxed align-top">
                {children}
              </td>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
