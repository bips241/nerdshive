'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Hash, Compass } from 'lucide-react';

interface HeadingItem {
  level: number;
  text: string;
  id: string;
}

interface TableOfContentsProps {
  headings: HeadingItem[];
}

export default function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');

  // Find DOM element by ID or closest matching heading
  const findTargetElement = useCallback((id: string): HTMLElement | null => {
    if (!id) return null;
    // 1. Direct ID match
    const direct = document.getElementById(id);
    if (direct) return direct;

    // 2. Case-insensitive or slugified match
    const lower = id.toLowerCase();
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (const h of headings) {
      if (h.id && h.id.toLowerCase() === lower) {
        return h as HTMLElement;
      }
    }
    return null;
  }, []);

  // Smooth scroll with sticky navbar offset
  const scrollToHeading = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const target = findTargetElement(id);

    if (target) {
      const headerOffset = 84; // Offset for sticky navbar + padding
      const elementPosition = target.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth',
      });

      window.history.pushState(null, '', `#${id}`);
      setActiveId(id);
    }
  }, [findTargetElement]);

  // Deep-link scroll when navigating with #hash in URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;

    const timer = setTimeout(() => {
      const target = findTargetElement(hash);
      if (target) {
        const headerOffset = 84;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: 'smooth',
        });
        setActiveId(hash);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [findTargetElement]);

  // Real-time active heading detection on scroll
  useEffect(() => {
    if (headings.length === 0 || typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-84px 0% -65% 0%',
        threshold: 0.1,
      }
    );

    headings.forEach((h) => {
      const el = findTargetElement(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings, findTargetElement]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl backdrop-blur-md">
      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
        <Hash className="h-3.5 w-3.5 text-cyan-400" />
        On This Page
      </h4>

      {headings.length > 0 ? (
        <nav className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto pr-2 text-xs leading-normal scrollbar-thin scrollbar-thumb-slate-800">
          {headings.slice(0, 40).map((h, i) => {
            const isActive = activeId === h.id;

            return (
              <a
                key={`${h.id}-${i}`}
                href={`#${h.id}`}
                onClick={(e) => scrollToHeading(e, h.id)}
                className={`block py-1.5 transition-all duration-200 line-clamp-1 cursor-pointer rounded-lg px-2.5 ${
                  h.level === 3 ? 'pl-5 text-[11px]' : 'font-medium text-xs'
                } ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 font-semibold border-l-2 border-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
                title={h.text}
              >
                {h.text}
              </a>
            );
          })}
        </nav>
      ) : (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
          <Compass className="h-3.5 w-3.5 text-slate-600" />
          <span>Overview navigation active</span>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-slate-800/80">
        <Link
          href="/docs"
          className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1.5"
        >
          ← All Architecture Specs
        </Link>
      </div>
    </div>
  );
}
