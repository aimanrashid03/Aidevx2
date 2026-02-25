const fs = require('fs');
const path = require('path');

const markdownPath = path.join(process.cwd(), 'Template/URS/URS markdown.md');
const outputPath = path.join(process.cwd(), 'src/constants/urs_structure.ts');

const parseMarkdownTree = (markdownContent) => {
    const lines = markdownContent.split('\n');
    const sections = [];

    let currentSection = null;
    let contentBuffer = [];

    const flushContent = () => {
        if (currentSection) {
            const rawContentLines = contentBuffer;
            const instructions = [];
            const contentBlocks = [];

            let currentTextBuffer = [];

            const flushText = () => {
                if (currentTextBuffer.length > 0) {
                    let htmlContent = currentTextBuffer.join('\n').trim();
                    if (htmlContent) {
                        htmlContent = htmlContent
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\*(.*?)\*/g, '<em>$1</em>')
                            .replace(/\n\n/g, '<br><br>')
                            // Parse native tags out
                            .replace(/<(br|p|div|ul|li)[^>]*>/gi, '')
                            .replace(/<\/(p|div|ul|li)>/gi, '')
                            // Restore the newlines as <br> for Tiptap
                            .replace(/\n/g, '<br>');

                        contentBlocks.push({ type: 'text', data: htmlContent });
                    }
                    currentTextBuffer = [];
                }
            };

            let i = 0;
            while (i < rawContentLines.length) {
                const line = rawContentLines[i];

                // 1. Check for Tables
                if (line.trim().startsWith('<table')) {
                    flushText();

                    let tableLines = [];
                    while (i < rawContentLines.length && !rawContentLines[i].trim().includes('</table')) {
                        tableLines.push(rawContentLines[i]);
                        i++;
                    }
                    tableLines.push(rawContentLines[i] || '</table>'); // add the closing </table> line

                    const tableHtml = tableLines.join('\n');

                    const columns = [];
                    const data = [];

                    // Simple regexes for th and td, handle multi-line content inside td/th
                    const theadMatch = tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
                    let headerRowStr = theadMatch ? theadMatch[1] : '';
                    if (!headerRowStr) {
                        // Fallback: use first tr
                        const firstTrMatch = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/i);
                        if (firstTrMatch) headerRowStr = firstTrMatch[1];
                    }
                    if (headerRowStr) {
                        const thMatches = headerRowStr.match(/<th[^>]*>([\s\S]*?)<\/th>/gi);
                        if (thMatches) {
                            thMatches.forEach(th => {
                                columns.push(th.replace(/<th[^>]*>/i, '').replace(/<\/th>/i, '').replace(/<[^>]*>/g, '').trim());
                            });
                        }
                    }

                    const tbodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
                    let bodyStr = tbodyMatch ? tbodyMatch[1] : tableHtml; // if no tbody, scan whole table (minus headers if possible, but keep simple)

                    const trMatches = bodyStr.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
                    if (trMatches) {
                        trMatches.forEach((tr, index) => {
                            // If there's no tbody and this is the first row, it might be the header row we already parsed. Skip it if columns parsed.
                            if (!tbodyMatch && index === 0 && columns.length > 0) return;

                            const rowCells = [];
                            const tdMatches = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
                            if (tdMatches) {
                                tdMatches.forEach(td => {
                                    rowCells.push(td.replace(/<td[^>]*>/i, '').replace(/<\/td>/i, '').replace(/<[^>]*>/g, '').trim());
                                });
                            }
                            if (rowCells.length > 0) {
                                data.push(rowCells);
                            }
                        });
                    }

                    contentBlocks.push({ type: 'table', columns, data });
                }
                // 2. Check for Instructions: < ... > but not an HTML tag like <br>
                else if (line.trim().startsWith('<') && !line.trim().startsWith('</') && !line.trim().match(/^<(br|span|b|i|strong|em|center|table|thead|tbody|tfoot|tr|th|td|p|div|ul|ol|li|img|a\b)/i)) {
                    // This is likely an instruction block.
                    let instrText = line;
                    while (i < rawContentLines.length && !instrText.trim().endsWith('>')) {
                        i++;
                        if (i < rawContentLines.length) {
                            instrText += '\n' + rawContentLines[i];
                        }
                    }

                    let cleanInstr = instrText.trim();
                    if (cleanInstr.startsWith('<')) cleanInstr = cleanInstr.substring(1);
                    if (cleanInstr.endsWith('>')) cleanInstr = cleanInstr.substring(0, cleanInstr.length - 1);
                    if (cleanInstr) {
                        instructions.push(cleanInstr.trim());
                    }
                }
                // 3. Check for specific instruction format [*Note: ... *]
                else if (line.trim() === '[*Note:*') {
                    flushText();
                    let noteText = '';
                    i++;
                    while (i < rawContentLines.length && rawContentLines[i].trim() !== '*]*') {
                        noteText += rawContentLines[i] + '\n';
                        i++;
                    }
                    if (noteText.trim()) {
                        instructions.push('Note:\n' + noteText.replace(/\*/g, '').trim());
                    }
                }
                // 4. Normal Text (Excluding table captions/legends that were just tables)
                else {
                    if (line.trim() !== '' && !line.trim().startsWith('**Table')) {
                        currentTextBuffer.push(line);
                    }
                }

                i++;
            }

            flushText();

            currentSection.instructions = instructions;
            currentSection.content = contentBlocks;

            sections.push({ ...currentSection });
            contentBuffer = [];
            currentSection = null;
        }
    };

    const headerRegex = /^(#{1,6})\s+(.*)$/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(headerRegex);

        if (match) {
            flushContent();
            const level = match[1].length;
            let title = match[2].trim();

            // Remove markdown formatting like ** from title
            title = title.replace(/\*\*/g, '');

            currentSection = {
                title,
                level,
                instructions: [],
                content: []
            };
        } else {
            if (currentSection) {
                contentBuffer.push(line);
            }
        }
    }

    flushContent();
    return sections;
};

try {
    const rawContent = fs.readFileSync(markdownPath, 'utf8');

    const parsedSections = parseMarkdownTree(rawContent).filter(s => {
        const titleLower = s.title.toLowerCase();
        return !titleLower.includes('table of contents') &&
            !titleLower.includes('list of figures') &&
            !titleLower.includes('list of tables') &&
            !titleLower.includes('acronyms') &&
            !titleLower.includes('glossary');
    });

    const fileContent = `// Auto-generated from URS markdown.md
export interface DocSection {
    title: string;
    level: number;
    instructions: string[];
    content: any[];
}

export const URS_STRUCTURE: DocSection[] = ${JSON.stringify(parsedSections, null, 4)};
`;

    fs.writeFileSync(outputPath, fileContent);
    console.log('Successfully generated src/constants/urs_structure.ts');
} catch (error) {
    console.error('Error generating URS structure:', error);
}
