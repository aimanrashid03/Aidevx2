import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractText(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    try {
        if (file.type === 'text/plain' || fileExt === 'txt' || fileExt === 'md' || fileExt === 'csv') {
            return await file.text();
        }
        if (fileExt === 'docx') {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value;
        }
        if (fileExt === 'pdf' || file.type === 'application/pdf') {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            for (let i = 1; i <= pdfDoc.numPages; i++) {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                // @ts-expect-error - pdfjs types
                fullText += textContent.items.map(item => item.str).join(' ') + '\n\n';
            }
            return fullText;
        }
    } catch (err) {
        console.warn('Text extraction failed:', err);
    }
    return '';
}
