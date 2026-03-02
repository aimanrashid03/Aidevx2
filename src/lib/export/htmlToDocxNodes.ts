import {
    Paragraph,
    TextRun,
    HeadingLevel,
} from 'docx';

/**
 * Converts Tiptap HTML string into an array of docx Paragraph objects
 * preserving bold, italic, underline, strikethrough, headings, lists, and blockquotes.
 */

interface TextRunOpts {
    bold?: boolean;
    italics?: boolean;
    underline?: { type: 'single' };
    strike?: boolean;
    font?: string;
    size?: number;
}

const DEFAULT_FONT = 'Arial';
const DEFAULT_SIZE = 20; // half-points, 20 = 10pt

function getHeadingLevel(tag: string): (typeof HeadingLevel)[keyof typeof HeadingLevel] | null {
    switch (tag) {
        case 'H1': return HeadingLevel.HEADING_1;
        case 'H2': return HeadingLevel.HEADING_2;
        case 'H3': return HeadingLevel.HEADING_3;
        default: return null;
    }
}

function extractTextRuns(node: Node, inherited: TextRunOpts): TextRun[] {
    const runs: TextRun[] = [];

    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (text) {
            runs.push(new TextRun({
                text,
                bold: inherited.bold,
                italics: inherited.italics,
                underline: inherited.underline,
                strike: inherited.strike,
                font: DEFAULT_FONT,
                size: inherited.size || DEFAULT_SIZE,
            }));
        }
        return runs;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return runs;

    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();

    // Build inherited styles for children
    const childOpts: TextRunOpts = { ...inherited };

    switch (tag) {
        case 'B':
        case 'STRONG':
            childOpts.bold = true;
            break;
        case 'I':
        case 'EM':
            childOpts.italics = true;
            break;
        case 'U':
            childOpts.underline = { type: 'single' };
            break;
        case 'S':
        case 'DEL':
        case 'STRIKE':
            childOpts.strike = true;
            break;
        case 'BR':
            runs.push(new TextRun({ break: 1, font: DEFAULT_FONT, size: DEFAULT_SIZE }));
            return runs;
        case 'A': {
            // Extract link text and URL
            const href = el.getAttribute('href') || '';
            const linkText = el.textContent || href;
            if (href) {
                // For now render as plain styled text since docx ExternalHyperlink
                // requires being at the paragraph level. We mark it with underline + blue.
                runs.push(new TextRun({
                    text: linkText,
                    bold: inherited.bold,
                    italics: inherited.italics,
                    underline: { type: 'single' },
                    font: DEFAULT_FONT,
                    size: inherited.size || DEFAULT_SIZE,
                    color: '0563C1',
                }));
                return runs;
            }
            break;
        }
    }

    // Recurse children
    for (const child of Array.from(el.childNodes)) {
        runs.push(...extractTextRuns(child, childOpts));
    }

    return runs;
}

function parseBlockElement(el: HTMLElement, opts: TextRunOpts): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const tag = el.tagName.toUpperCase();

    // Headings
    const headingLevel = getHeadingLevel(tag);
    if (headingLevel !== null) {
        const runs = extractTextRuns(el, { ...opts, bold: true });
        paragraphs.push(new Paragraph({
            children: runs.length > 0 ? runs : [new TextRun({ text: '', font: DEFAULT_FONT })],
            heading: headingLevel,
            spacing: { before: 240, after: 120 },
        }));
        return paragraphs;
    }

    // Paragraphs and divs
    if (tag === 'P' || tag === 'DIV') {
        const runs = extractTextRuns(el, opts);
        paragraphs.push(new Paragraph({
            children: runs.length > 0 ? runs : [new TextRun({ text: '', font: DEFAULT_FONT, size: DEFAULT_SIZE })],
            spacing: { after: 120 },
        }));
        return paragraphs;
    }

    // Unordered lists
    if (tag === 'UL') {
        const items = el.querySelectorAll(':scope > li');
        items.forEach((li) => {
            const runs = extractTextRuns(li, opts);
            paragraphs.push(new Paragraph({
                children: runs,
                bullet: { level: 0 },
                spacing: { after: 60 },
            }));
        });
        return paragraphs;
    }

    // Ordered lists
    if (tag === 'OL') {
        const items = el.querySelectorAll(':scope > li');
        let num = 1;
        items.forEach((li) => {
            const runs = extractTextRuns(li, opts);
            // Prepend the number since docx numbering requires a numbering definition
            runs.unshift(new TextRun({
                text: `${num}. `,
                font: DEFAULT_FONT,
                size: DEFAULT_SIZE,
            }));
            paragraphs.push(new Paragraph({
                children: runs,
                spacing: { after: 60 },
                indent: { left: 720 }, // 0.5 inch
            }));
            num++;
        });
        return paragraphs;
    }

    // Blockquote
    if (tag === 'BLOCKQUOTE') {
        const innerParagraphs = parseHtmlChildren(el, opts);
        // Add indentation to each paragraph
        innerParagraphs.forEach(p => {
            paragraphs.push(new Paragraph({
                ...p,
                indent: { left: 720 },
                border: {
                    left: { style: 'single' as any, size: 6, color: '999999', space: 10 },
                },
            }));
        });
        // If no inner paragraphs were extracted, add empty one
        if (innerParagraphs.length === 0) {
            const runs = extractTextRuns(el, { ...opts, italics: true });
            paragraphs.push(new Paragraph({
                children: runs,
                indent: { left: 720 },
            }));
        }
        return paragraphs;
    }

    // Fallback: treat as inline content in a paragraph
    const runs = extractTextRuns(el, opts);
    if (runs.length > 0) {
        paragraphs.push(new Paragraph({
            children: runs,
            spacing: { after: 120 },
        }));
    }

    return paragraphs;
}

function parseHtmlChildren(parent: HTMLElement, opts: TextRunOpts): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    for (const child of Array.from(parent.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
            const text = (child.textContent || '').trim();
            if (text) {
                paragraphs.push(new Paragraph({
                    children: [new TextRun({ text, font: DEFAULT_FONT, size: DEFAULT_SIZE })],
                    spacing: { after: 120 },
                }));
            }
        } else if (child.nodeType === Node.ELEMENT_NODE) {
            paragraphs.push(...parseBlockElement(child as HTMLElement, opts));
        }
    }
    return paragraphs;
}

/**
 * Main export: converts an HTML string (from Tiptap editor) into docx Paragraph objects.
 */
export function htmlToDocxParagraphs(html: string): Paragraph[] {
    if (!html || !html.trim()) {
        return [];
    }

    const container = document.createElement('div');
    container.innerHTML = html;

    return parseHtmlChildren(container, {});
}
