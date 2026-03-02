import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Captures the docx-preview rendered DOM element and converts it to a PDF blob.
 * Uses html2canvas to rasterize the preview, then jsPDF to assemble pages.
 */
export async function exportPreviewToPdf(
    previewElement: HTMLDivElement,
    filename: string
): Promise<void> {
    // Find all docx page sections rendered by docx-preview
    const pages = previewElement.querySelectorAll<HTMLElement>('section.docx');

    if (pages.length === 0) {
        // Fallback: capture the entire container as a single page
        const canvas = await html2canvas(previewElement, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
        pdf.save(filename);
        return;
    }

    // Capture each docx page section as a separate PDF page
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];

        const canvas = await html2canvas(page, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (i > 0) {
            pdf.addPage();
        }

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
    }

    pdf.save(filename);
}
