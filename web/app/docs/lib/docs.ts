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

export async function getDocumentSlugs(): Promise<string[]> {
  try {
    const docsDir = await findActiveDocsDirectory();
    const files = await fs.readdir(docsDir);
    return files
      .filter((file) => file.endsWith('.md') && !file.startsWith('.'))
      .map((file) => file.replace(/\.md$/, ''));
  } catch (error) {
    console.error('Error reading documents directory:', error);
    return [];
  }
}

export async function getDocumentBySlug(slug: string): Promise<DocumentItem | null> {
  try {
    const docsDir = await findActiveDocsDirectory();
    const realSlug = slug.replace(/\.md$/, '');
    const fullPath = path.join(docsDir, `${realSlug}.md`);
    
    let fileContents: string;
    let stat: any;
    try {
      fileContents = await fs.readFile(fullPath, 'utf8');
      stat = await fs.stat(fullPath);
    } catch (_) {
      // Try lowercase or uppercase variant if case-mismatched
      const files = await fs.readdir(docsDir);
      const match = files.find((f) => f.replace(/\.md$/, '').toLowerCase() === realSlug.toLowerCase());
      if (match) {
        const matchedPath = path.join(docsDir, match);
        fileContents = await fs.readFile(matchedPath, 'utf8');
        stat = await fs.stat(matchedPath);
      } else {
        return null;
      }
    }

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
