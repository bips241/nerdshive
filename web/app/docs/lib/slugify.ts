// Robust client & server safe heading slugifier

export function extractRawText(node: any): string {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractRawText).join('');
  if (typeof node === 'object') {
    if (node.props && node.props.children) {
      return extractRawText(node.props.children);
    }
    if (node.value) return String(node.value);
  }
  return '';
}

export function slugifyHeading(input: any): string {
  const raw = typeof input === 'string' ? input : extractRawText(input);
  return raw
    .toLowerCase()
    // Strip markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Strip HTML tags
    .replace(/<[^>]+>/g, '')
    // Strip markdown formatting symbols
    .replace(/[*_`#]/g, '')
    // Replace non-word/hyphen chars (except spaces)
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
