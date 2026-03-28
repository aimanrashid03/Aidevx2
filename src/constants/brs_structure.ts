import type { DocSection } from './urs_structure'

export const BRS_STRUCTURE: DocSection[] = [
    // ── Structural / Administrative sections (not auto-generated) ─────────
    {
        title: "SEJARAH DOKUMEN",
        level: 1,
        instructions: [
            "Senarai jadual sejarah dokumen yang merangkumi versi, tarikh kemas kini, perincian perubahan, dan penulis dokumen. Sertakan perubahan berdasarkan bengkel, sesi perbincangan, maklum balas pengguna, dan versi baseline."
        ],
        content: [
            {
                type: "table",
                columns: ["Versi", "Tarikh Dikemas kini", "Perubahan", "Penulis Dokumen"],
                data: []
            }
        ],
        autoGenerate: false,
    },
    {
        title: "SEMAKAN DAN PENGESAHAN",
        level: 1,
        instructions: [
            "Jadual semakan dan pengesahan dokumen oleh syarikat dan pihak pelanggan. Termasuk nama, jawatan, tarikh, dan tandatangan bagi pihak yang menyedia, menyemak, mengesah, dan meluluskan dokumen."
        ],
        content: [],
        autoGenerate: false,
    },
    {
        title: "ISI KANDUNGAN",
        level: 1,
        instructions: [],
        content: [],
        autoGenerate: false,
    },
    {
        title: "SENARAI RAJAH",
        level: 1,
        instructions: [],
        content: [],
        autoGenerate: false,
    },
    {
        title: "SENARAI JADUAL",
        level: 1,
        instructions: [],
        content: [],
        autoGenerate: false,
    },
    {
        title: "AKRONIM DAN KATA SINGKATAN",
        level: 1,
        instructions: [
            "Kenal pasti semua akronim dan kata singkatan dalam dokumen dan sediakan jadual yang mengandungi singkatan dan definisinya."
        ],
        content: [
            {
                type: "table",
                columns: ["Akronim / Kata Singkatan", "Definisi"],
                data: []
            }
        ],
        autoGenerate: true,
    },

    // ── 1.0 PENGENALAN ───────────────────────────────────────────────────
    {
        title: "1.0 PENGENALAN",
        level: 1,
        instructions: [
            "Dokumen Spesifikasi Keperluan Bisnes (BRS) ini disediakan bagi menerangkan keperluan sistem.",
            "Merupakan pengenalan formal bagi dokumen BRS yang menerangkan tujuan dokumen, sistem yang dibangunkan, dan peranannya sebagai rujukan kepada pasukan projek.",
            "Dokumen ini akan digunakan sebagai rujukan oleh pasukan projek, terutamanya penganalisa dan juga pembangun sistem, dalam menjelaskan Spesifikasi Keperluan Bisnes yang akan digunakan dalam mereka bentuk aplikasi."
        ],
        content: [],
        autoGenerate: true,
    },
    {
        title: "1.1 TUJUAN BISNES",
        level: 2,
        instructions: [
            "Huraian tujuan bisnes bagi sistem yang dibangunkan, termasuk objektif utama, masalah yang ingin diselesaikan, dan hasil yang diharapkan.",
            "Nyatakan dalam bentuk poin. Sistem baharu ini perlu memenuhi keperluan yang dikenal pasti."
        ],
        content: [],
        autoGenerate: true,
    },
    {
        title: "1.2 SKOP BISNES",
        level: 2,
        instructions: [
            "Penerangan skop bisnes projek termasuk proses yang terlibat, pengguna, integrasi sistem, dan data yang berkaitan.",
            "Nyatakan juga skop yang tidak termasuk jika perlu. Senaraikan skop bisnes dalam bentuk poin bernombor."
        ],
        content: [],
        autoGenerate: true,
    },
    {
        title: "1.3 GAMBARAN KESELURUHAN BISNES",
        level: 2,
        instructions: [
            "Gambaran keseluruhan bisnes termasuk proses semasa (AS-IS) dan bagaimana sistem baharu (TO-BE) akan menyokong atau menambah baik operasi tersebut.",
            "Sertakan penerangan rajah jika berkaitan."
        ],
        content: [],
        autoGenerate: true,
    },
    {
        title: "1.4 SENARAI PEMEGANG TARUH",
        level: 2,
        instructions: [
            "Senarai semua pemegang taruh yang terlibat dalam sistem dan nyatakan peranan serta tanggungjawab mereka dalam bentuk jadual."
        ],
        content: [
            {
                type: "table",
                columns: ["Pemegang Taruh", "Keterangan"],
                data: []
            }
        ],
        autoGenerate: true,
    },

    // ── 2.0 KEPERLUAN PENGURUSAN BISNES ──────────────────────────────────
    {
        title: "2.0 KEPERLUAN PENGURUSAN BISNES",
        level: 1,
        instructions: [
            "Bahagian ini menerangkan matlamat, objektif, arkitektur bisnes, dan arkitektur maklumat bagi sistem yang dibangunkan."
        ],
        content: [],
        autoGenerate: true,
    },
    {
        title: "2.1 MATLAMAT DAN OBJEKTIF",
        level: 2,
        instructions: [
            "Huraian matlamat dan objektif sistem dari sudut peningkatan kecekapan, pengurusan data, sokongan keputusan, dan penambahbaikan proses operasi.",
            "Nyatakan objektif utama dalam bentuk poin bernombor."
        ],
        content: [],
        autoGenerate: true,
    },
    {
        title: "2.2 ARKITEKTUR BISNES",
        level: 2,
        instructions: [
            "Penerangan arkitektur bisnes termasuk hubungan antara perkhidmatan organisasi, proses bisnes, sistem aplikasi, dan teknologi.",
            "Jelaskan bagaimana ia menyokong objektif strategik."
        ],
        content: [],
        autoGenerate: true,
    },
    {
        title: "2.3 ARKITEKTUR MAKLUMAT",
        level: 2,
        instructions: [
            "Rajah arkitektur maklumat termasuk entiti data utama, hubungan antara data, dan aliran maklumat antara pengguna dan sistem."
        ],
        content: [],
        autoGenerate: true,
    },

    // ── 3.0 KEPERLUAN PENGOPERASIAN BISNES ───────────────────────────────
    {
        title: "3.0 KEPERLUAN PENGOPERASIAN BISNES",
        level: 1,
        instructions: [
            "Bahagian ini memperincikan keperluan fungsi bisnes dan keperluan proses bisnes bagi sistem yang dibangunkan."
        ],
        content: [],
        autoGenerate: true,
    },

    // ── 3.1 Keperluan Fungsi Bisnes ──────────────────────────────────────
    {
        title: "3.1 KEPERLUAN FUNGSI BISNES",
        level: 2,
        instructions: [
            "Bahagian ini menerangkan fungsi-fungsi bisnes yang telah dikenal pasti melalui sesi bengkel bersama pemilik proses dan SME."
        ],
        content: [],
        autoGenerate: true,
    },
    {
        title: "3.1.1 PENGGUNAAN NOTASI",
        level: 3,
        instructions: [
            "Penerangan notasi yang digunakan dalam pemodelan fungsi bisnes termasuk konvensyen penamaan, struktur fungsi, dan penggunaan ID fungsi.",
            "Notasi yang digunakan dalam melakarkan hierarki fungsi bisnes hendaklah diterangkan dalam bentuk jadual."
        ],
        content: [
            {
                type: "table",
                columns: ["Elemen", "Keterangan"],
                data: [
                    ["Fungsi Bisnes", "Kotak yang mewakili fungsi bisnes"],
                    ["Sintaks Nama Fungsi <kata kerja><kata nama>", "Nama: Definisi aktiviti hendaklah dimulakan dengan kata kerja dan diikuti kata nama."],
                    ["Penghubung antara fungsi", "Penghubung antara fungsi dan sub fungsi menggunakan garis lurus mendatar atau menegak"],
                    ["Keterangan Fungsian Bisnes", "Pernyataan yang akan menerangkan suatu fungsian bisnes."]
                ]
            }
        ],
        autoGenerate: true,
    },
    {
        title: "3.1.2 MODEL FUNGSI BISNES",
        level: 3,
        instructions: [
            "Pemodelan fungsi bisnes telah dilakukan ke atas maklumat yang diperolehi melalui sesi bengkel yang telah diadakan bersama pemilik proses dan SME yang dilantik.",
            "Fungsi utama dan sub fungsi bisnes telah dikenal pasti selaras dengan mencapai misi organisasi dan tujuan utama sistem yang akan dibangunkan."
        ],
        content: [],
        autoGenerate: true,
    },
    {
        title: "3.1.2.1 STRUKTUR HIERARKI FUNGSI BISNES",
        level: 4,
        instructions: [
            "Struktur hierarki fungsi bisnes yang menunjukkan fungsi utama, sub fungsi, dan fungsi terperinci.",
            "Sertakan rajah hierarki dan penerangan ringkas."
        ],
        content: [],
        autoGenerate: true,
    },
    {
        title: "3.1.2.2 KETERANGAN DEFINISI FUNGSI BISNES",
        level: 4,
        instructions: [
            "Sediakan keterangan bagi setiap fungsi bisnes termasuk tujuan, skop, dan peranannya dalam sistem.",
            "Keterangan hendaklah disediakan dalam bentuk jadual."
        ],
        content: [
            {
                type: "table",
                columns: ["ID Nama & Fungsi Bisnes", "Keterangan Fungsi Bisnes"],
                data: []
            }
        ],
        autoGenerate: true,
    },
    {
        title: "3.1.2.3 SENARAI PENGGUNA",
        level: 4,
        instructions: [
            "Senarai pengguna yang terlibat serta keterangan ringkas mengenai peranannya di dalam sistem secara keseluruhan."
        ],
        content: [
            {
                type: "table",
                columns: ["Pengguna", "Keterangan"],
                data: []
            }
        ],
        autoGenerate: true,
    },

    // ── 3.2 Keperluan Proses Bisnes ──────────────────────────────────────
    {
        title: "3.2 KEPERLUAN PROSES BISNES",
        level: 2,
        instructions: [
            "Bahagian ini menerangkan aliran proses bisnes secara terperinci termasuk urutan aktiviti, keputusan, dan interaksi antara peranan."
        ],
        content: [],
        autoGenerate: true,
    },
    {
        title: "3.2.1 PENGGUNAAN NOTASI",
        level: 3,
        instructions: [
            "Notasi yang digunakan dalam aliran proses bisnes termasuk aktiviti, decision, swimlane, dan aliran proses.",
            "Sediakan jadual notasi yang digunakan dalam melakarkan Aliran Proses Bisnes."
        ],
        content: [
            {
                type: "table",
                columns: ["Elemen", "Keterangan"],
                data: [
                    ["Activity", "Digunakan bagi mewakili setiap aktiviti. Labelkan ID Aktiviti Bisnes dan Nama Aktiviti Bisnes."],
                    ["Connector", "Digunakan untuk menghubungkan satu elemen notasi kepada notasi-notasi berikutnya."],
                    ["Swimlane", "Digunakan untuk mengumpulkan aktiviti-aktiviti yang di bawah satu-satu peranan."],
                    ["Initial Code", "Digunakan untuk menggambarkan permulaan bagi proses."],
                    ["Activity Final Code", "Digunakan untuk menamatkan keseluruhan aliran aktiviti."]
                ]
            }
        ],
        autoGenerate: true,
    },
    {
        title: "3.2.2 MODEL DAN DEFINISI PROSES BISNES",
        level: 3,
        instructions: [
            "Huraian aliran proses bisnes secara terperinci termasuk urutan aktiviti, keputusan, dan interaksi antara peranan.",
            "Sertakan rajah aliran proses dan jadual definisi aktiviti fungsi bisnes bagi setiap proses."
        ],
        content: [
            {
                type: "table",
                columns: ["Rujukan Fungsi", "Nama Fungsi", "Rujukan Aktiviti", "Nama Aktiviti", "Keterangan Aktiviti", "Aktor", "Tanggungjawab", "Kekerapan", "Aktiviti Sebelum", "Aktiviti Selepas"],
                data: []
            }
        ],
        autoGenerate: true,
    },

    // ── LAMPIRAN ─────────────────────────────────────────────────────────
    {
        title: "LAMPIRAN",
        level: 1,
        instructions: [
            "Senaraikan semua lampiran termasuk borang, dokumen sokongan, dan bahan rujukan yang berkaitan dengan sistem. Sertakan penerangan ringkas bagi setiap lampiran."
        ],
        content: [
            {
                type: "table",
                columns: ["BIL", "Modul Utama", "Sub Modul", "Borang", "Nama dokumen"],
                data: []
            }
        ],
        autoGenerate: false,
    },
]
