import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Calendar, FileText, Layers, Lock } from 'lucide-react';
import { getDocumentBySlug, getDocumentSlugs } from '@/app/docs/lib/docs';
import { slugifyHeading } from '@/app/docs/lib/slugify';
import MarkdownRenderer from '@/app/docs/[slug]/MarkdownRenderer';
import TableOfContents from '@/app/docs/[slug]/TableOfContents';

export async function generateStaticParams() {
  const slugs = await getDocumentSlugs();
  return slugs.map((slug) => ({ slug }));
}

interface DevDocPageProps {
  params: { slug: string };
}

// Extract in-page heading anchors for quick navigation
function extractHeadings(markdown: string) {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const headings: { level: number; text: string; id: string }[] = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const rawText = match[2].trim();
    const linkCleaned = rawText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    const cleanText = linkCleaned.replace(/[*_`#]/g, '').trim();
    const id = slugifyHeading(cleanText);

    // Skip redundant "Table of Contents" entry in the sticky TOC sidebar
    if (cleanText.toLowerCase().includes('table of contents')) {
      continue;
    }

    if (cleanText && id) {
      headings.push({ level, text: cleanText, id });
    }
  }

  return headings;
}

export default async function DevDocPage({ params }: DevDocPageProps) {
  const { slug } = params;
  const doc = await getDocumentBySlug(slug);

  if (!doc) {
    notFound();
  }

  const headings = extractHeadings(doc.content);

  return (
    <div className="w-full">
      {/* Top Bar Navigation */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <Link 
          href="/devs/docs" 
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Developer Portal Hub</span>
        </Link>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 border border-slate-800 px-2.5 py-1 text-cyan-400 font-semibold">
            <Lock className="h-3 w-3" />
            Confidential Spec
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 border border-slate-800 px-2.5 py-1">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            {doc.meta.readingTimeMinutes} min read
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 border border-slate-800 px-2.5 py-1">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            {doc.meta.wordCount.toLocaleString()} words
          </span>
          {doc.meta.lastModified && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-slate-900 border border-slate-800 px-2.5 py-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Updated {doc.meta.lastModified}
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Content + In-Page Table of Contents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Document Article Body */}
        <article className="lg:col-span-9 rounded-3xl border border-slate-800/80 bg-slate-900/40 p-6 sm:p-10 shadow-2xl backdrop-blur-sm">
          {/* Header Metadata */}
          <div className="mb-8 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-0.5 text-xs font-semibold text-cyan-400">
                <Layers className="h-3 w-3" />
                {doc.meta.category}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white mb-4">
              {doc.meta.title}
            </h1>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              {doc.meta.description}
            </p>
          </div>

          {/* Render Markdown Content */}
          <MarkdownRenderer content={doc.content} />
        </article>

        {/* Sticky Desktop Table of Contents Sidebar */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-24">
          <TableOfContents headings={headings} />
        </aside>
      </div>
    </div>
  );
}
