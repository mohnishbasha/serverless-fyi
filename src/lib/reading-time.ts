const WPM = 230;

/** Count prose words in Markdown/MDX, ignoring code fences, tags and link targets. */
export function wordCount(md: string): number {
  const text = md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, ' ')
    .replace(/[`*_>|#~-]/g, ' ');
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export function readingTime(md: string): number {
  return Math.max(1, Math.ceil(wordCount(md) / WPM));
}
