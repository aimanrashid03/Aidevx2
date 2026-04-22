/**
 * Few-shot examples for BRS document generation.
 * These are injected into system prompts when docType === 'BRS'
 * to guide the LLM toward the correct style, tone, and format.
 *
 * HTML variants are used by `generate_section` (OnlyOffice plugin flow).
 * Markdown variants are used by `auto_generate_document` (server-side DOCX flow).
 */

// ── HTML examples (used by generate_section → OO plugin) ────────────────────

/** Example of a well-written BRS text section (HTML format for OO plugin) */
export const BRS_TEXT_EXAMPLE = `<p><strong>Spesifikasi Keperluan Bisnes (BRS)</strong> ini menggariskan keperluan bisnes, objektif, dan keperluan tahap tinggi bagi inisiatif [Nama Projek]. Dokumen ini menetapkan kes bisnes bagi penyelesaian yang dicadangkan dan mentakrifkan kriteria kejayaan yang boleh diukur selaras dengan strategi organisasi.</p>
<p>Inisiatif ini menangani masalah bisnes berikut: [Nama Organisasi] pada masa ini bergantung kepada proses manual berasaskan kertas untuk [kawasan proses], menyebabkan anggaran [X]% ketidakcekapan operasi, [Y] jam kerja semula setiap bulan, dan risiko pematuhan di bawah [Peraturan/Piawaian].</p>
<p>Dokumen ini bertujuan untuk semakan dan pengesahan oleh Penaja Projek dan pihak berkepentingan bisnes utama sebelum aktiviti reka bentuk penyelesaian dimulakan.</p>`

/** Example of a well-written BRS requirements table (HTML format for OO plugin) */
export const BRS_TABLE_EXAMPLE = `<p><strong>Jadual: Keperluan Bisnes</strong></p>
<table>
<thead><tr><th>ID Keperluan</th><th>Keperluan</th><th>Justifikasi Bisnes</th><th>Keutamaan</th></tr></thead>
<tbody>
<tr><td>BR-1.1</td><td>Penyelesaian hendaklah mengurangkan masa pemprosesan pesanan purata daripada 48 jam kepada kurang 4 jam.</td><td>Kelewatan pemprosesan semasa menyebabkan pelanggaran SLA yang menjejaskan 23% pelanggan enterprise.</td><td>M</td></tr>
<tr><td>BR-1.2</td><td>Penyelesaian hendaklah menyediakan keterlihatan masa nyata ke atas tahap inventori di semua gudang.</td><td>Insiden kehabisan stok telah meningkat 15% YoY disebabkan kekurangan keterlihatan merentas gudang.</td><td>M</td></tr>
<tr><td>BR-2.1</td><td>Penyelesaian perlu berintegrasi dengan sistem ERP sedia ada tanpa memerlukan pengubahsuaian ERP.</td><td>Pengubahsuaian ERP secara sejarah menambah 6+ bulan kepada garis masa projek.</td><td>S</td></tr>
</tbody>
</table>`

/** Example of a BRS business process Mermaid diagram (HTML format for OO plugin) */
export const BRS_DIAGRAM_EXAMPLE = `<pre class="mermaid">flowchart LR
    A[Pesanan Pelanggan] --> B{Semakan Inventori}
    B -->|Ada Stok| C[Rizab Inventori]
    B -->|Tiada Stok| D[Giliran Pesanan Belakang]
    C --> E[Jana Senarai Kutip]
    D --> F[Maklumkan Perolehan]
    E --> G[Pemenuhan Gudang]
    F --> H[PO Pembekal Dicipta]
    G --> I[Hantar & Jejak]
    H --> D
    I --> J[Pemberitahuan Pelanggan]
</pre>
<p><strong>Rajah: Proses Bisnes Pemenuhan Pesanan</strong></p>`

// ── Markdown diagram example (used by auto_generate_document diagram calls) ─

/** Example of a BRS business process Mermaid diagram (raw Mermaid for auto-generate) */
export const BRS_MD_DIAGRAM_EXAMPLE = `flowchart LR
    A[Pesanan Pelanggan] --> B{Semakan Inventori}
    B -->|Ada Stok| C[Rizab Inventori]
    B -->|Tiada Stok| D[Giliran Pesanan Belakang]
    C --> E[Jana Senarai Kutip]
    D --> F[Maklumkan Perolehan]
    E --> G[Pemenuhan Gudang]
    F --> H[PO Pembekal Dicipta]
    G --> I[Hantar & Jejak]
    H --> D
    I --> J[Pemberitahuan Pelanggan]`

/** Example of a BRS entity-relationship Mermaid diagram (raw Mermaid for auto-generate) */
export const BRS_MD_ER_EXAMPLE = `erDiagram
    PENGGUNA {
        string id_pengguna
        string nama
        string emel
        string peranan
    }
    PROJEK {
        string id_projek
        string nama_projek
        string status
        date tarikh_mula
    }
    DOKUMEN {
        string id_dokumen
        string jenis
        string versi
        date tarikh_kemaskini
    }
    PENGGUNA ||--o{ PROJEK : "mengurus"
    PROJEK ||--|{ DOKUMEN : "mengandungi"
    PENGGUNA ||--o{ DOKUMEN : "mengubah"`

// ── Markdown examples (used by auto_generate_document → DOCX builder) ───────

/** Example of a well-written BRS text section (markdown format for auto-generate) */
export const BRS_MD_TEXT_EXAMPLE = `**Spesifikasi Keperluan Bisnes (BRS)** ini menggariskan keperluan bisnes, objektif, dan keperluan tahap tinggi bagi inisiatif [Nama Projek]. Dokumen ini menetapkan kes bisnes bagi penyelesaian yang dicadangkan dan mentakrifkan kriteria kejayaan yang boleh diukur selaras dengan strategi organisasi.

Inisiatif ini menangani masalah bisnes berikut: [Nama Organisasi] pada masa ini bergantung kepada proses manual berasaskan kertas untuk [kawasan proses], menyebabkan anggaran [X]% ketidakcekapan operasi, [Y] jam kerja semula setiap bulan, dan risiko pematuhan di bawah [Peraturan/Piawaian].

Dokumen ini bertujuan untuk semakan dan pengesahan oleh Penaja Projek dan pihak berkepentingan bisnes utama sebelum aktiviti reka bentuk penyelesaian dimulakan.`

/** Example of a well-written BRS requirements table (markdown format for auto-generate) */
export const BRS_MD_TABLE_EXAMPLE = `| ID Keperluan | Keperluan | Justifikasi Bisnes | Keutamaan |
|---|---|---|---|
| BR-1.1 | Penyelesaian hendaklah mengurangkan masa pemprosesan pesanan purata daripada 48 jam kepada kurang 4 jam. | Kelewatan pemprosesan semasa menyebabkan pelanggaran SLA yang menjejaskan 23% pelanggan enterprise. | M |
| BR-1.2 | Penyelesaian hendaklah menyediakan keterlihatan masa nyata ke atas tahap inventori di semua gudang. | Insiden kehabisan stok telah meningkat 15% YoY disebabkan kekurangan keterlihatan merentas gudang. | M |
| BR-2.1 | Penyelesaian perlu berintegrasi dengan sistem ERP sedia ada tanpa memerlukan pengubahsuaian ERP. | Pengubahsuaian ERP secara sejarah menambah 6+ bulan kepada garis masa projek. | S |`
