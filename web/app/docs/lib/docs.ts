import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

// Resolve docs directory across multiple execution environments (Next.js local, Docker, Monorepo root)
function getDocsDirectories(): string[] {
  const possiblePaths = [
    path.resolve(process.cwd(), 'docs'),
    path.resolve(process.cwd(), '../docs'),
    path.resolve(process.cwd(), '../../docs'),
    path.resolve(process.cwd(), 'documents'),
    path.resolve(process.cwd(), '../documents'),
  ];
  return possiblePaths;
}

async function findActiveDocsDirectory(): Promise<string> {
  const dirs = getDocsDirectories();
  for (const dir of dirs) {
    try {
      const stat = await fs.stat(dir);
      if (stat.isDirectory()) {
        const files = await fs.readdir(dir);
        if (files.some((f) => f.endsWith('.md'))) {
          return dir;
        }
      }
    } catch (_) {}
  }
  return path.resolve(process.cwd(), 'docs');
}

export function slugifyHeading(text: any): string {
  const raw = typeof text === 'string' 
    ? text 
    : (Array.isArray(text) ? text.map((t) => (typeof t === 'string' ? t : '')).join('') : String(text || ''));
  return raw
    .toLowerCase()
    .replace(/[*_`#]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export interface DocumentMeta {
  slug: string;
  title: string;
  description: string;
  category: string;
  readingTimeMinutes: number;
  wordCount: number;
  lastModified?: string;
  tags?: string[];
  [key: string]: any;
}

export interface DocumentItem {
  slug: string;
  meta: DocumentMeta;
  content: string;
}

function deriveCategory(slug: string, title: string): string {
  const lower = (slug + ' ' + title).toLowerCase();
  if (lower.includes('bible') || lower.includes('rollout') || lower.includes('infrastructure') || lower.includes('hosting')) {
    return 'DevOps & Infrastructure';
  }
  if (lower.includes('rbac') || lower.includes('security') || lower.includes('ssot') || lower.includes('logic')) {
    return 'Core Business Logic & RBAC';
  }
  if (lower.includes('backup') || lower.includes('retention') || lower.includes('storage') || lower.includes('s3')) {
    return 'Data Storage & Compliance';
  }
  if (lower.includes('schema') || lower.includes('compatibility') || lower.includes('model')) {
    return 'Database & Schema Evolution';
  }
  if (lower.includes('architecture') || lower.includes('scaling') || lower.includes('scalability')) {
    return 'System Architecture';
  }
  if (lower.includes('feature') || lower.includes('tracker') || lower.includes('plan')) {
    return 'Product & Features';
  }
  return 'Specifications & Guides';
}

function formatTitleFromSlug(slug: string): string {
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bSso\b/g, 'SSOT')
    .replace(/\bCi Cd\b/g, 'CI/CD')
    .replace(/\bRbac\b/g, 'RBAC');
}

async function getDocsFilesMap(docsDir: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  async function scan(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'agent-log') {
          continue;
        }
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scan(full);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const base = entry.name.replace(/\.md$/, '');
          map.set(base.toLowerCase(), full);
          // Also set the exact-cased slug
          map.set(base, full);
        }
      }
    } catch (_) {}
  }

  await scan(docsDir);
  return map;
}

export async function getDocumentSlugs(): Promise<string[]> {
  try {
    const docsDir = await findActiveDocsDirectory();
    const map = await getDocsFilesMap(docsDir);
    // Unique list of real slugs
    const slugs: string[] = [];
    const seen = new Set<string>();
    for (const [key, fullPath] of map.entries()) {
      const baseName = path.basename(fullPath, '.md');
      if (!seen.has(baseName)) {
        seen.add(baseName);
        slugs.push(baseName);
      }
    }
    return slugs;
  } catch (error) {
    console.error('Error reading documents directory:', error);
    return [];
  }
}

export async function getDocumentBySlug(slug: string): Promise<DocumentItem | null> {
  try {
    const docsDir = await findActiveDocsDirectory();
    const map = await getDocsFilesMap(docsDir);
    const realSlug = slug.replace(/\.md$/, '');
    
    // Find path by direct key or lowercase key
    const fullPath = map.get(realSlug) || map.get(realSlug.toLowerCase());
    if (!fullPath) {
      return null;
    }

    const fileContents = await fs.readFile(fullPath, 'utf8');
    const stat = await fs.stat(fullPath);

    const { data, content } = matter(fileContents);

    // Extract title from frontmatter or first heading
    let title = data.title;
    if (!title) {
      const headingMatch = content.match(/^#\s+(.+)$/m);
      title = headingMatch ? headingMatch[1].trim() : formatTitleFromSlug(realSlug);
    }

    // Extract description from frontmatter or first paragraph / blockquote
    let description = data.description;
    if (!description) {
      const descMatch = content.match(/^>\s*\*\*Document Status\*\*:\s*([^\n]+)/m) 
        || content.match(/^>\s*([^\n]+)/m) 
        || content.match(/^(?:##[^\n]+\n+)?([A-Z][^\n]{30,200}\.)/m);
      description = descMatch ? descMatch[1].replace(/[*_#`]/g, '').trim() : 'System specification and live operational documentation.';
    }

    const words = content.trim().split(/\s+/).length;
    const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));
    const category = data.category || deriveCategory(realSlug, title);

    return {
      slug: realSlug,
      meta: {
        slug: realSlug,
        title,
        description,
        category,
        readingTimeMinutes,
        wordCount: words,
        lastModified: stat?.mtime ? stat.mtime.toISOString().split('T')[0] : undefined,
        ...data,
      },
      content,
    };
  } catch (error) {
    console.error(`Error reading document ${slug}:`, error);
    return null;
  }
}

export async function getAllDocuments(): Promise<DocumentItem[]> {
  const slugs = await getDocumentSlugs();
  const docs = await Promise.all(slugs.map((slug) => getDocumentBySlug(slug)));
  const validDocs = docs.filter((d): d is DocumentItem => d !== null);

  // Priority sort: Rollout Bible, SSOT, Storage Policy, Schema Rules first
  const prioritySlugs = [
    'INFRASTRUCTURE_ROLLOUT_AND_SCALING_BIBLE',
    'CORE_BUSINESS_LOGIC_SSOT',
    'DATA_STORAGE_AND_BACKUP_POLICY',
    'SCHEMA_EVOLUTION_AND_COMPATIBILITY_RULES',
    'SYSTEM_ARCHITECTURE',
    'FEATURES',
    'SCALABILITY_TARGETS',
  ];

  return validDocs.sort((a, b) => {
    const indexA = prioritySlugs.indexOf(a.slug);
    const indexB = prioritySlugs.indexOf(b.slug);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.meta.title.localeCompare(b.meta.title);
  });
}
