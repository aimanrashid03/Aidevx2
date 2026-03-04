/**
 * URS DOCX export template — cover page, approval tables, running
 * headers/footers, and typography matching the official URS v2 format.
 *
 * Called by docxBuilder.ts when docType === 'URS'.
 */
import {
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    Header,
    Footer,
    PageNumber,
    PageBreak,
    ImageRun,
    WidthType,
    AlignmentType,
    ShadingType,
    BorderStyle,
    type ISectionOptions,
} from 'docx'
// PageNumber is an enum in docx v9 — values are used as TextRun children, not constructed
import type { Paragraph as DocxParagraph, Table as DocxTable } from 'docx'

const FONT = 'Arial'

// Half-point sizes matching the official URS v2 typography
const H1_SIZE = 28   // 14pt
const H2_SIZE = 24   // 12pt
const H3_SIZE = 22   // 11pt
const BODY_SIZE = 20 // 10pt

// ─── Approval table helpers ───────────────────────────────────────────────────

function approvalTableRow(label: string): TableRow {
    return new TableRow({
        children: [
            new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({ text: label, bold: true, font: FONT, size: BODY_SIZE })],
                    spacing: { before: 60, after: 60 },
                })],
                width: { size: 20, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.SOLID, color: 'e8e8e8', fill: 'e8e8e8' },
            }),
            ...['Name', 'Title', 'Department', 'Signatory', 'Date'].map(col =>
                new TableCell({
                    children: [new Paragraph({
                        children: [new TextRun({ text: col, bold: true, font: FONT, size: BODY_SIZE })],
                        spacing: { before: 60, after: 60 },
                    })],
                    width: { size: 16, type: WidthType.PERCENTAGE },
                })
            ),
        ],
    })
}

function emptyApprovalDataRow(): TableRow {
    return new TableRow({
        height: { value: 600, rule: 'atLeast' },
        children: Array(6).fill(null).map(() =>
            new TableCell({
                children: [new Paragraph({ children: [] })],
            })
        ),
    })
}

function buildApprovalTable(groups: string[]): Table {
    const rows: TableRow[] = []
    for (const group of groups) {
        rows.push(approvalTableRow(group))
        rows.push(emptyApprovalDataRow())
    }
    return new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'cccccc' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'cccccc' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'cccccc' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'cccccc' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'cccccc' },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'cccccc' },
        },
    })
}

// ─── Cover page ───────────────────────────────────────────────────────────────

async function buildCoverPage(
    projectName: string,
    docTitle: string,
): Promise<(DocxParagraph | DocxTable)[]> {
    const elements: (DocxParagraph | DocxTable)[] = []

    // MIMOS logo
    try {
        const logoRes = await fetch('/logo.png')
        if (logoRes.ok) {
            const logoData = await logoRes.arrayBuffer()
            elements.push(new Paragraph({
                children: [new ImageRun({
                    data: logoData,
                    transformation: { width: 180, height: 60 },
                    type: 'png',
                })],
                alignment: AlignmentType.LEFT,
                spacing: { before: 200, after: 400 },
            }))
        }
    } catch {
        // Logo not critical — skip silently
    }

    // Company name
    elements.push(new Paragraph({
        children: [new TextRun({ text: 'MIMOS SOLUTIONS SDN. BHD.', bold: true, font: FONT, size: 24 })],
        spacing: { after: 80 },
    }))

    // Vertical space
    elements.push(new Paragraph({ spacing: { before: 1200 } }))

    // Project name
    elements.push(new Paragraph({
        children: [new TextRun({ text: projectName, bold: true, font: FONT, size: 40 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
    }))

    // Document title
    elements.push(new Paragraph({
        children: [new TextRun({ text: docTitle || 'User Requirement Specification', bold: true, font: FONT, size: 32 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
    }))

    // Date
    elements.push(new Paragraph({
        children: [new TextRun({
            text: new Date().toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' }),
            font: FONT,
            size: BODY_SIZE,
            color: '555555',
        })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
    }))

    // Metadata table (File Name / Issuance Department)
    elements.push(new Table({
        rows: [
            new TableRow({ children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'File Name', bold: true, font: FONT, size: BODY_SIZE })] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '', font: FONT, size: BODY_SIZE })] })], width: { size: 70, type: WidthType.PERCENTAGE } }),
            ]}),
            new TableRow({ children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Issuance Department', bold: true, font: FONT, size: BODY_SIZE })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Software Quality Assurance (SQA)', font: FONT, size: BODY_SIZE })] })] }),
            ]}),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
    }))

    elements.push(new Paragraph({ spacing: { after: 400 } }))

    // Confidentiality notice
    elements.push(new Paragraph({
        children: [new TextRun({
            text: 'This document contains confidential and sensitive information. The information contained within should not be reproduced or redistributed without prior written consent from MIMOS Solutions Sdn. Bhd.',
            font: FONT,
            size: 18, // 9pt
            italics: true,
            color: '555555',
        })],
        spacing: { after: 800 },
    }))

    // Review and Approval tables
    elements.push(new Paragraph({
        children: [new TextRun({ text: 'Review and Approval Record', bold: true, font: FONT, size: H2_SIZE })],
        spacing: { before: 400, after: 200 },
    }))

    elements.push(buildApprovalTable(['Document Originator / Author', 'Document Reviewer', 'Document Approver']))
    elements.push(new Paragraph({ spacing: { after: 200 } }))

    // Page break — body starts on next page
    elements.push(new Paragraph({ children: [new PageBreak()] }))

    return elements
}

// ─── Running header and footer ────────────────────────────────────────────────

function buildHeader(docTitle: string): Header {
    return new Header({
        children: [
            new Paragraph({
                children: [
                    new TextRun({ text: 'MIMOS SOLUTIONS SDN. BHD.', bold: true, font: FONT, size: 16 }),
                    new TextRun({ text: '\t', font: FONT, size: 16 }),
                    new TextRun({ text: docTitle, font: FONT, size: 16 }),
                    new TextRun({ text: '\t', font: FONT, size: 16 }),
                    new TextRun({ text: 'CONFIDENTIAL', bold: true, font: FONT, size: 16, color: '990000' }),
                ],
                tabStops: [
                    { type: 'center', position: 4500 },
                    { type: 'right', position: 9000 },
                ],
                border: {
                    bottom: { style: BorderStyle.SINGLE, size: 6, color: 'cccccc' },
                },
            }),
        ],
    })
}

function buildFooter(): Footer {
    return new Footer({
        children: [
            new Paragraph({
                children: [
                    new TextRun({ text: 'User Requirement Specification\t', font: FONT, size: 16, color: '777777' }),
                    new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16 }),
                ],
                tabStops: [{ type: 'right', position: 9000 }],
                border: {
                    top: { style: BorderStyle.SINGLE, size: 6, color: 'cccccc' },
                },
            }),
        ],
    })
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface UrsSectionOptions {
    coverChildren: (DocxParagraph | DocxTable)[]
    header: Header
    footer: Footer
    headingSizes: { h1: number; h2: number; h3: number; body: number }
}

export async function buildUrsDocxTemplate(
    projectName: string,
    docTitle: string,
): Promise<UrsSectionOptions> {
    const coverChildren = await buildCoverPage(projectName, docTitle)
    return {
        coverChildren,
        header: buildHeader(docTitle),
        footer: buildFooter(),
        headingSizes: { h1: H1_SIZE, h2: H2_SIZE, h3: H3_SIZE, body: BODY_SIZE },
    }
}

export function buildUrsSectionConfig(
    opts: UrsSectionOptions,
    bodyChildren: (DocxParagraph | DocxTable)[],
): ISectionOptions {
    return {
        properties: {
            titlePage: true, // enables a different (empty) first-page header/footer
            page: { margin: { top: 1440, right: 1134, bottom: 1440, left: 1134 } }, // ~2.5cm margins
        },
        headers: {
            first: new Header({ children: [] }), // cover page: no header
            default: opts.header,
        },
        footers: {
            first: new Footer({ children: [] }), // cover page: no footer
            default: opts.footer,
        },
        children: [...opts.coverChildren, ...bodyChildren],
    }
}
