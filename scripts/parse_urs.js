import fs from 'fs';
import path from 'path';

// Define the structure for a section
interface DocSection {
    title: string;
    level: number;
    defaultContent: string;
}

const markdownPath = path.join(__dirname, '../Template/URS/URS markdown.md');
const outputPath = path.join(__dirname, '../src/constants/urs_structure.ts');

const parseMarkdownTree = (markdownContent: string): DocSection[] => {
    const lines = markdownContent.split('\n');
    const sections: DocSection[] = [];

    let currentSection: DocSection | null = null;
    let contentBuffer: string[] = [];

    const flushContent = () => {
        if (currentSection) {
            // Convert markdown basic formatting to basic HTML for RichTextEditor
            let htmlContent = contentBuffer.join('\n').trim();
            if (htmlContent) {
                // Very basic markdown to HTML for tables and bold text
                htmlContent = htmlContent
                    // Bold
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    // Italic
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    // Line breaks
                    .replace(/\n\n/g, '<br><br>')
                    // Instructions
                    .replace(/&lt;(.*?)&gt;/g, '<span style="color: #64748b;">&lt;$1&gt;</span>');

                currentSection.defaultContent = htmlContent;
            }
            sections.push(currentSection);
            contentBuffer = [];
        }
    };

    // Regex for matching markdown headers (# through ###)
    const headerRegex = /^(#{1,3})\s+(.*)$/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(headerRegex);

        // Treat Table of Contents, Lists, and Appendices loosely for now, we want the core sections
        if (match) {
            const level = match[1].length;
            const title = match[2].trim();

            // Skip some purely structural headers that we don't want as editable sections
            if (title.toLowerCase().includes('table of contents') ||
                title.toLowerCase().includes('list of figures') ||
                title.toLowerCase().includes('list of tables') ||
                title.toLowerCase().includes('acronyms') ||
                title.toLowerCase().includes('glossary')) {
                // If it's one of these, we still probably want to capture the content in case we need it later,
                // but for now, let's include them.
            }

            // Flush the previous section
            flushContent();

            currentSection = {
                title,
                level,
                defaultContent: ''
            };
        } else {
            // Add line to buffer if we are currently inside a section
            if (currentSection) {
                contentBuffer.push(line);
            }
        }
    }

    // Flush the last section
    flushContent();

    return sections;
};

try {
    const rawContent = fs.readFileSync(markdownPath, 'utf8');
    const parsedSections = parseMarkdownTree(rawContent);

    // Generate the TypeScript file
    const fileContent = `// Auto-generated from URS markdown.md
export interface DocSection {
    title: string;
    level: number;
    defaultContent: string;
}

export const URS_STRUCTURE: DocSection[] = ${JSON.stringify(parsedSections, null, 4)};
`;

    fs.writeFileSync(outputPath, fileContent);
    console.log('Successfully generated src/constants/urs_structure.ts');
} catch (error) {
    console.error('Error generating URS structure:', error);
}
