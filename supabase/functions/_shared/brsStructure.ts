/**
 * BRS template structure for server-side auto-generation.
 * Mirrors src/constants/brs_structure.ts but usable in Deno edge functions.
 */

export interface ServerDocSection {
    title: string
    level: number
    instructions: string[]
    expectedFormat: 'text' | 'table' | 'mixed'
    tableSchemas?: { columns: string[]; exampleData?: string[][] }[]
    autoGenerate: boolean
    /** Mermaid diagram type to generate alongside text content. */
    diagramType?: 'flowchart' | 'erDiagram' | 'sequenceDiagram'
    /** Hint describing what the diagram should visualize. */
    diagramHint?: string
}

export const BRS_SERVER_STRUCTURE: ServerDocSection[] = [
    // ── Structural / Administrative (skip during auto-generation) ────────
    { title: "SEJARAH DOKUMEN", level: 1, instructions: [], expectedFormat: 'table', autoGenerate: false },
    { title: "SEMAKAN DAN PENGESAHAN", level: 1, instructions: [], expectedFormat: 'table', autoGenerate: false },
    { title: "ISI KANDUNGAN", level: 1, instructions: [], expectedFormat: 'text', autoGenerate: false },
    { title: "SENARAI RAJAH", level: 1, instructions: [], expectedFormat: 'text', autoGenerate: false },
    { title: "SENARAI JADUAL", level: 1, instructions: [], expectedFormat: 'text', autoGenerate: false },

    // ── Auto-generatable sections ────────────────────────────────────────
    {
        title: "AKRONIM DAN KATA SINGKATAN",
        level: 1,
        instructions: [
            "Kenal pasti semua akronim dan kata singkatan yang berkaitan dengan projek dan sediakan jadual yang mengandungi singkatan dan definisinya.",
        ],
        expectedFormat: 'table',
        tableSchemas: [{ columns: ["Akronim / Kata Singkatan", "Definisi"] }],
        autoGenerate: true,
    },
    {
        title: "1.0 PENGENALAN",
        level: 1,
        instructions: [
            "Dokumen Spesifikasi Keperluan Bisnes (BRS) ini disediakan bagi menerangkan keperluan sistem.",
            "Merupakan pengenalan formal bagi dokumen BRS yang menerangkan tujuan dokumen, sistem yang dibangunkan, dan peranannya sebagai rujukan kepada pasukan projek.",
        ],
        expectedFormat: 'text',
        autoGenerate: true,
    },
    {
        title: "1.1 TUJUAN BISNES",
        level: 2,
        instructions: [
            "Huraian tujuan bisnes bagi sistem yang dibangunkan, termasuk objektif utama, masalah yang ingin diselesaikan, dan hasil yang diharapkan.",
            "Nyatakan dalam bentuk poin. Sistem baharu ini perlu memenuhi keperluan yang dikenal pasti.",
        ],
        expectedFormat: 'text',
        autoGenerate: true,
    },
    {
        title: "1.2 SKOP BISNES",
        level: 2,
        instructions: [
            "Penerangan skop bisnes projek termasuk proses yang terlibat, pengguna, integrasi sistem, dan data yang berkaitan.",
            "Nyatakan juga skop yang tidak termasuk jika perlu.",
        ],
        expectedFormat: 'text',
        autoGenerate: true,
    },
    {
        title: "1.3 GAMBARAN KESELURUHAN BISNES",
        level: 2,
        instructions: [
            "Gambaran keseluruhan bisnes termasuk proses semasa (AS-IS) dan bagaimana sistem baharu (TO-BE) akan menyokong atau menambah baik operasi tersebut.",
        ],
        expectedFormat: 'text',
        autoGenerate: true,
        diagramType: 'flowchart',
        diagramHint: 'Rajah perbandingan proses AS-IS dan TO-BE yang menunjukkan aliran kerja semasa dan penambahbaikan sistem baharu',
    },
    {
        title: "1.4 SENARAI PEMEGANG TARUH",
        level: 2,
        instructions: [
            "Senarai semua pemegang taruh yang terlibat dalam sistem dan nyatakan peranan serta tanggungjawab mereka dalam bentuk jadual.",
        ],
        expectedFormat: 'table',
        tableSchemas: [{ columns: ["Pemegang Taruh", "Keterangan"] }],
        autoGenerate: true,
    },
    {
        title: "2.0 KEPERLUAN PENGURUSAN BISNES",
        level: 1,
        instructions: [
            "Bahagian ini menerangkan matlamat, objektif, arkitektur bisnes, dan arkitektur maklumat bagi sistem yang dibangunkan.",
        ],
        expectedFormat: 'text',
        autoGenerate: true,
    },
    {
        title: "2.1 MATLAMAT DAN OBJEKTIF",
        level: 2,
        instructions: [
            "Huraian matlamat dan objektif sistem dari sudut peningkatan kecekapan, pengurusan data, sokongan keputusan, dan penambahbaikan proses operasi.",
            "Nyatakan objektif utama dalam bentuk poin bernombor.",
        ],
        expectedFormat: 'text',
        autoGenerate: true,
    },
    {
        title: "2.2 ARKITEKTUR BISNES",
        level: 2,
        instructions: [
            "Penerangan arkitektur bisnes termasuk hubungan antara perkhidmatan organisasi, proses bisnes, sistem aplikasi, dan teknologi.",
            "Jelaskan bagaimana ia menyokong objektif strategik.",
        ],
        expectedFormat: 'text',
        autoGenerate: true,
        diagramType: 'flowchart',
        diagramHint: 'Rajah arkitektur bisnes menunjukkan lapisan perkhidmatan organisasi, proses bisnes, sistem aplikasi, dan infrastruktur teknologi',
    },
    {
        title: "2.3 ARKITEKTUR MAKLUMAT",
        level: 2,
        instructions: [
            "Penerangan arkitektur maklumat termasuk entiti data utama, hubungan antara data, dan aliran maklumat antara pengguna dan sistem.",
        ],
        expectedFormat: 'text',
        autoGenerate: true,
        diagramType: 'erDiagram',
        diagramHint: 'Rajah hubungan entiti (ER) menunjukkan entiti data utama sistem dan hubungan antara mereka — contoh: PENGGUNA, KENDERAAN, TRANSAKSI, LAPORAN',
    },
    {
        title: "3.0 KEPERLUAN PENGOPERASIAN BISNES",
        level: 1,
        instructions: [
            "Bahagian ini memperincikan keperluan fungsi bisnes dan keperluan proses bisnes bagi sistem yang dibangunkan.",
        ],
        expectedFormat: 'text',
        autoGenerate: true,
    },
    {
        title: "3.1 KEPERLUAN FUNGSI BISNES",
        level: 2,
        instructions: [
            "Bahagian ini menerangkan fungsi-fungsi bisnes yang telah dikenal pasti melalui sesi bengkel bersama pemilik proses dan SME.",
        ],
        expectedFormat: 'text',
        autoGenerate: true,
    },
    {
        title: "3.1.1 PENGGUNAAN NOTASI",
        level: 3,
        instructions: [
            "Penerangan notasi yang digunakan dalam pemodelan fungsi bisnes termasuk konvensyen penamaan, struktur fungsi, dan penggunaan ID fungsi.",
        ],
        expectedFormat: 'table',
        tableSchemas: [{ columns: ["Elemen", "Keterangan"] }],
        autoGenerate: true,
    },
    {
        title: "3.1.2 MODEL FUNGSI BISNES",
        level: 3,
        instructions: [
            "Pemodelan fungsi bisnes yang diperolehi melalui sesi bengkel bersama pemilik proses dan SME.",
            "Fungsi utama dan sub fungsi bisnes hendaklah dikenal pasti selaras dengan misi organisasi.",
        ],
        expectedFormat: 'text',
        autoGenerate: true,
    },
    {
        title: "3.1.2.1 STRUKTUR HIERARKI FUNGSI BISNES",
        level: 4,
        instructions: [
            "Struktur hierarki fungsi bisnes yang menunjukkan fungsi utama, sub fungsi, dan fungsi terperinci.",
        ],
        expectedFormat: 'text',
        autoGenerate: true,
        diagramType: 'flowchart',
        diagramHint: 'Rajah hierarki fungsi bisnes (top-down tree) menunjukkan fungsi utama, sub fungsi, dan fungsi terperinci',
    },
    {
        title: "3.1.2.2 KETERANGAN DEFINISI FUNGSI BISNES",
        level: 4,
        instructions: [
            "Sediakan keterangan bagi setiap fungsi bisnes termasuk tujuan, skop, dan peranannya dalam sistem.",
        ],
        expectedFormat: 'table',
        tableSchemas: [{ columns: ["ID Nama & Fungsi Bisnes", "Keterangan Fungsi Bisnes"] }],
        autoGenerate: true,
    },
    {
        title: "3.1.2.3 SENARAI PENGGUNA",
        level: 4,
        instructions: [
            "Senarai pengguna yang terlibat serta keterangan ringkas mengenai peranannya di dalam sistem.",
        ],
        expectedFormat: 'table',
        tableSchemas: [{ columns: ["Pengguna", "Keterangan"] }],
        autoGenerate: true,
    },
    {
        title: "3.2 KEPERLUAN PROSES BISNES",
        level: 2,
        instructions: [
            "Bahagian ini menerangkan aliran proses bisnes secara terperinci termasuk urutan aktiviti, keputusan, dan interaksi antara peranan.",
        ],
        expectedFormat: 'text',
        autoGenerate: true,
    },
    {
        title: "3.2.1 PENGGUNAAN NOTASI",
        level: 3,
        instructions: [
            "Notasi yang digunakan dalam aliran proses bisnes termasuk aktiviti, decision, swimlane, dan aliran proses.",
        ],
        expectedFormat: 'table',
        tableSchemas: [{ columns: ["Elemen", "Keterangan"] }],
        autoGenerate: true,
    },
    {
        title: "3.2.2 MODEL DAN DEFINISI PROSES BISNES",
        level: 3,
        instructions: [
            "Huraian aliran proses bisnes secara terperinci termasuk urutan aktiviti, keputusan, dan interaksi antara peranan.",
            "Sertakan jadual definisi aktiviti fungsi bisnes bagi setiap proses.",
        ],
        expectedFormat: 'mixed',
        tableSchemas: [{
            columns: ["Rujukan Fungsi", "Nama Fungsi", "Rujukan Aktiviti", "Nama Aktiviti", "Keterangan Aktiviti", "Aktor", "Tanggungjawab", "Kekerapan", "Aktiviti Sebelum", "Aktiviti Selepas"],
        }],
        autoGenerate: true,
        diagramType: 'flowchart',
        diagramHint: 'Rajah aliran proses bisnes (flowchart) menunjukkan urutan aktiviti, keputusan (decision), dan interaksi antara peranan/aktor',
    },

    // ── Appendix (skip) ──────────────────────────────────────────────────
    { title: "LAMPIRAN", level: 1, instructions: [], expectedFormat: 'table', autoGenerate: false },
]
