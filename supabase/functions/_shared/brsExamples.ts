/**
 * Few-shot examples for BRS document generation.
 * These are injected into system prompts when docType === 'BRS'
 * to guide the LLM toward the correct style, tone, and format.
 */

/** Example of a well-written BRS text section (Executive Summary style) */
export const BRS_TEXT_EXAMPLE = `<p>This <strong>Business Requirements Specification (BRS)</strong> outlines the business needs, objectives, and high-level requirements for the [Project Name] initiative. The document establishes the business case for the proposed solution and defines measurable success criteria aligned with organizational strategy.</p>
<p>The initiative addresses the following business problem: [Organization Name] currently relies on manual, paper-based processes for [process area], resulting in an estimated [X]% operational inefficiency, [Y] hours of rework per month, and compliance risks under [Regulation/Standard].</p>
<p>This document is intended for review and sign-off by the Project Sponsor and key business stakeholders prior to the commencement of solution design activities.</p>`

/** Example of a well-written BRS requirements table */
export const BRS_TABLE_EXAMPLE = `<p><strong>Table: Business Requirements</strong></p>
<table>
<thead><tr><th>BR ID</th><th>Requirement</th><th>Business Justification</th><th>Priority</th></tr></thead>
<tbody>
<tr><td>BR-1.1</td><td>The solution shall reduce average order processing time from 48 hours to under 4 hours.</td><td>Current processing delays cause SLA breaches affecting 23% of enterprise clients.</td><td>M</td></tr>
<tr><td>BR-1.2</td><td>The solution shall provide real-time visibility into inventory levels across all warehouses.</td><td>Stockout incidents have increased 15% YoY due to lack of cross-warehouse visibility.</td><td>M</td></tr>
<tr><td>BR-2.1</td><td>The solution should integrate with the existing ERP system (SAP S/4HANA) without requiring ERP customization.</td><td>ERP customizations have historically added 6+ months to project timelines.</td><td>S</td></tr>
</tbody>
</table>`

/** Example of a BRS business process Mermaid diagram */
export const BRS_DIAGRAM_EXAMPLE = `<pre class="mermaid">flowchart LR
    A[Customer Order] --> B{Inventory Check}
    B -->|In Stock| C[Reserve Inventory]
    B -->|Out of Stock| D[Backorder Queue]
    C --> E[Generate Pick List]
    D --> F[Notify Procurement]
    E --> G[Warehouse Fulfillment]
    F --> H[Supplier PO Created]
    G --> I[Ship & Track]
    H --> D
    I --> J[Customer Notification]
</pre>
<p><strong>Figure: Order Fulfillment Business Process</strong></p>`
