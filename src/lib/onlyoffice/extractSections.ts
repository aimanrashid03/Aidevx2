/**
 * Fetches a DOCX from a public URL, converts it to HTML via mammoth,
 * and extracts the heading structure for the Section TOC sidebar.
 */
export interface DocHeading {
    /** Slug derived from heading text, used as comment anchor and status key */
    sectionId: string;
    title: string;
    level: 1 | 2 | 3;
}

/**
 * Converts a heading title to a stable slug used as sectionId.
 * E.g. "1.0 Introduction" → "1-0-introduction"
 */
function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Fetches the DOCX at `publicUrl`, parses h1–h3 headings via mammoth,
 * and returns a flat list of DocHeading objects for the TOC.
 */
export async function extractSectionsFromDocx(publicUrl: string): Promise<DocHeading[]> {
    const response = await fetch(publicUrl);
    if (!response.ok) throw new Error(`Could not fetch DOCX: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();

    // mammoth is a static import in ProjectDetails.tsx so it's already in the bundle
    const mammoth = (await import('mammoth')).default;
    const result = await mammoth.convertToHtml({ arrayBuffer });

    const parser = new DOMParser();
    const doc = parser.parseFromString(result.value, 'text/html');
    const headingEls = Array.from(doc.querySelectorAll('h1, h2, h3'));

    const headings: DocHeading[] = [];
    const seenSlugs = new Map<string, number>();

    headingEls.forEach(el => {
        const tag = el.tagName.toLowerCase();
        const rawLevel = parseInt(tag.slice(1), 10);
        const level = (Math.min(Math.max(rawLevel, 1), 3)) as 1 | 2 | 3;
        const title = el.textContent?.trim() ?? '';
        if (!title) return;

        // Deduplicate slugs with a counter suffix
        const baseSlug = slugify(title) || `section-${headings.length}`;
        const count = seenSlugs.get(baseSlug) ?? 0;
        seenSlugs.set(baseSlug, count + 1);
        const sectionId = count === 0 ? baseSlug : `${baseSlug}-${count}`;

        headings.push({ sectionId, title, level });
    });

    return headings;
}
