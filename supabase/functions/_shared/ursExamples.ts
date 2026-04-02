/**
 * Few-shot examples for URS document generation.
 * These are injected into system prompts when docType === 'URS'
 * to guide the LLM toward the correct style, tone, and format.
 */

/** Example of a well-written URS text section (Purpose style) */
export const URS_TEXT_EXAMPLE = `<p>This document defines the <strong>User Requirements Specification (URS)</strong> for [System Name], developed for [Organization Name]. It captures the business and user requirements that the proposed system must satisfy to support [business objective].</p>
<p>The requirements contained herein are derived from stakeholder interviews, the Statement of Work (SoW), and existing operational processes. All requirements are prioritized using the MoSCoW method: <strong>M</strong> (Must have), <strong>S</strong> (Should have), <strong>C</strong> (Could have), <strong>W</strong> (Won't have this release).</p>
<p>This document is intended for review and approval by [Department/Authority] prior to system design and development activities.</p>`

/** Example of a well-written URS Feature List table row */
export const URS_TABLE_EXAMPLE = `<p><strong>Table: Functional Requirements</strong></p>
<table>
<thead><tr><th>FR ID</th><th>Features</th><th>Source</th><th>Priority</th></tr></thead>
<tbody>
<tr><td>ADM-1.1</td><td>The system shall allow administrators to create, modify, and deactivate user accounts with role-based access levels.</td><td>SoW 3.1 / Stakeholder Interview</td><td>M</td></tr>
<tr><td>ADM-1.2</td><td>The system shall enforce password complexity rules and support single sign-on (SSO) via SAML 2.0.</td><td>IT Security Policy v2.3</td><td>M</td></tr>
<tr><td>RPT-2.1</td><td>The system should generate exportable reports in PDF and Excel formats for all data modules.</td><td>Management Review</td><td>S</td></tr>
</tbody>
</table>`

/** Example of a URS business process Mermaid swimlane diagram */
export const URS_DIAGRAM_EXAMPLE = `<pre class="mermaid">flowchart TD
    A([Start]) --> B[User submits request]
    B --> C{Request type?}
    C -->|New account| D[Admin creates account]
    C -->|Data entry| E[User fills form]
    D --> F[System sends credentials]
    E --> G{Validation}
    G -->|Pass| H[Data saved to system]
    G -->|Fail| I[Error shown to user]
    I --> E
    F --> J([End])
    H --> J
</pre>
<p><strong>Figure: Business Process Flow</strong></p>`
