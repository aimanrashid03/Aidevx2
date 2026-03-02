import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    ShadingType,
    PageBreak,
} from 'docx';
import { htmlToDocxParagraphs } from './htmlToDocxNodes';
import { DocSection } from '../../constants/urs_structure';

interface ExportOptions {
    projectName: string;
    docTitle: string;
    docType: string;
    structure: (string | DocSection)[];
    sectionContent: Record<number, Record<string, unknown>[]>;
}

const FONT = 'Arial';
const BODY_SIZE = 20;     // 10pt
const H1_SIZE = 32;       // 16pt
const H2_SIZE = 26;       // 13pt
const H3_SIZE = 22;       // 11pt
const TABLE_HEADER_SIZE = 18; // 9pt
const TABLE_BODY_SIZE = 18;   // 9pt

function buildTitlePage(projectName: string, docTitle: string, docType: string): Paragraph[] {
    return [
        new Paragraph({ spacing: { before: 4000 } }),
        new Paragraph({
            children: [
                new TextRun({
                    text: projectName,
                    bold: true,
                    font: FONT,
                    size: 48, // 24pt
                    color: '1a1a1a',
                }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
        }),
        new Paragraph({
            children: [
                new TextRun({
                    text: docTitle,
                    bold: true,
                    font: FONT,
                    size: 36, // 18pt
                    color: '333333',
                }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        }),
        new Paragraph({
            children: [
                new TextRun({
                    text: `${docType} Document`,
                    font: FONT,
                    size: 24, // 12pt
                    color: '666666',
                }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        }),
        new Paragraph({
            children: [
                new TextRun({
                    text: new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    }),
                    font: FONT,
                    size: 20,
                    color: '999999',
                }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
        }),
        // Page break after title
        new Paragraph({
            children: [new PageBreak()],
        }),
    ];
}

function getSectionHeading(title: string, level: number): Paragraph {
    const headingMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
    };

    const sizeMap: Record<number, number> = {
        1: H1_SIZE,
        2: H2_SIZE,
        3: H3_SIZE,
    };

    return new Paragraph({
        children: [
            new TextRun({
                text: title,
                bold: true,
                font: FONT,
                size: sizeMap[level] || H2_SIZE,
            }),
        ],
        heading: headingMap[level] || HeadingLevel.HEADING_2,
        spacing: { before: 360, after: 160 },
    });
}

function buildTableFromBlock(block: Record<string, unknown>): (Paragraph | Table)[] {
    const columns = (block.columns as string[]) || [];
    const data = (block.data as string[][]) || [];

    if (columns.length === 0) return [];

    // Calculate equal column width
    const colWidth = Math.floor(9000 / columns.length);

    // Header row
    const headerRow = new TableRow({
        tableHeader: true,
        children: columns.map(col =>
            new TableCell({
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: col,
                                bold: true,
                                font: FONT,
                                size: TABLE_HEADER_SIZE,
                                color: 'FFFFFF',
                            }),
                        ],
                        spacing: { before: 40, after: 40 },
                    }),
                ],
                width: { size: colWidth, type: WidthType.DXA },
                shading: {
                    type: ShadingType.SOLID,
                    color: '2d2d2d',
                    fill: '2d2d2d',
                },
            })
        ),
    });

    // Data rows
    const dataRows = data.map((row, rowIdx) =>
        new TableRow({
            children: columns.map((_col, colIdx) =>
                new TableCell({
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: (row[colIdx] || '').toString(),
                                    font: FONT,
                                    size: TABLE_BODY_SIZE,
                                }),
                            ],
                            spacing: { before: 30, after: 30 },
                        }),
                    ],
                    width: { size: colWidth, type: WidthType.DXA },
                    shading: rowIdx % 2 === 1
                        ? { type: ShadingType.SOLID, color: 'f8f8f8', fill: 'f8f8f8' }
                        : undefined,
                })
            ),
        })
    );

    const table = new Table({
        rows: [headerRow, ...dataRows],
        width: { size: 9000, type: WidthType.DXA },
    });

    return [
        table,
        new Paragraph({ spacing: { after: 200 } }), // spacing after table
    ];
}

function buildSectionContent(
    blocks: Record<string, unknown>[],
): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [];

    for (const block of blocks) {
        if (block.type === 'text') {
            const html = (block.data as string) || '';
            if (html.trim()) {
                const paragraphs = htmlToDocxParagraphs(html);
                elements.push(...paragraphs);
            }
        } else if (block.type === 'table') {
            elements.push(...buildTableFromBlock(block));
        }
    }

    return elements;
}

/**
 * Builds and returns a DOCX Blob for any document type.
 */
export async function buildDocx(options: ExportOptions): Promise<Blob> {
    const { projectName, docTitle, docType, structure, sectionContent } = options;

    const children: (Paragraph | Table)[] = [];

    // Title page
    children.push(...buildTitlePage(projectName, docTitle, docType));

    // Iterate sections
    structure.forEach((item, idx) => {
        // Determine section title and level
        let title: string;
        let level: number;

        if (typeof item === 'string') {
            // Simple string sections (BRS, SRS, SDS)
            title = item;
            level = 1;
        } else {
            // DocSection (URS)
            title = (item as DocSection).title;
            level = (item as DocSection).level;
        }

        // Section heading
        children.push(getSectionHeading(title, level));

        // Section content blocks
        const blocks = sectionContent[idx] || [];
        if (blocks.length > 0) {
            children.push(...buildSectionContent(blocks));
        } else {
            // Empty section placeholder
            children.push(new Paragraph({
                children: [
                    new TextRun({
                        text: '',
                        font: FONT,
                        size: BODY_SIZE,
                        color: '999999',
                        italics: true,
                    }),
                ],
                spacing: { after: 120 },
            }));
        }
    });

    const doc = new Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: 1440,    // 1 inch
                            right: 1440,
                            bottom: 1440,
                            left: 1440,
                        },
                    },
                },
                children,
            },
        ],
    });

    return await Packer.toBlob(doc);
}
