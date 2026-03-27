/**
 * Few-shot examples for SRS document generation.
 * These are injected into system prompts when docType === 'SRS'
 * to guide the LLM toward the correct style, tone, and format.
 */

/** Example of a well-written SRS text section (System Overview style) */
export const SRS_TEXT_EXAMPLE = `<p>The <strong>[System Name]</strong> is a web-based application designed to automate [business process] for [Organization Name]. The system operates within a three-tier architecture comprising a React-based frontend, a RESTful API layer, and a PostgreSQL database backend.</p>
<p>The system interfaces with the following external systems:</p>
<ul>
<li><strong>Identity Provider (IdP)</strong> — SAML 2.0-based SSO for user authentication and session management</li>
<li><strong>ERP System</strong> — Bidirectional data synchronization via scheduled ETL jobs and real-time webhooks</li>
<li><strong>Email Service</strong> — SMTP relay for transactional notifications and approval workflows</li>
</ul>
<p>All inter-system communication shall use TLS 1.2+ encryption. API authentication shall be implemented via OAuth 2.0 bearer tokens with a maximum token lifetime of 3600 seconds.</p>`

/** Example of a well-written SRS functional requirements table */
export const SRS_TABLE_EXAMPLE = `<p><strong>Table: Functional Requirements — User Management Module</strong></p>
<table>
<thead><tr><th>FR ID</th><th>Requirement</th><th>Input</th><th>Expected Output</th><th>Priority</th></tr></thead>
<tbody>
<tr><td>FR-UM-01</td><td>The system shall authenticate users via SAML 2.0 SSO with the corporate Identity Provider.</td><td>SAML assertion from IdP</td><td>Authenticated session with role-based permissions</td><td>M</td></tr>
<tr><td>FR-UM-02</td><td>The system shall enforce role-based access control (RBAC) with at minimum: Admin, Manager, User, and Read-Only roles.</td><td>User role assignment</td><td>Menu items, actions, and data visibility filtered by role</td><td>M</td></tr>
<tr><td>FR-UM-03</td><td>The system should log all authentication events (login, logout, failed attempts) with timestamp, IP address, and user agent.</td><td>Authentication event</td><td>Audit log entry with metadata</td><td>S</td></tr>
</tbody>
</table>`

/** Example of an SRS system architecture Mermaid diagram */
export const SRS_DIAGRAM_EXAMPLE = `<pre class="mermaid">flowchart TD
    subgraph Client
        A[React SPA]
    end
    subgraph API Layer
        B[API Gateway]
        C[Auth Service]
        D[Business Logic Service]
    end
    subgraph Data Layer
        E[(PostgreSQL)]
        F[(Redis Cache)]
    end
    subgraph External
        G[Identity Provider]
        H[ERP System]
    end
    A -->|HTTPS| B
    B --> C
    B --> D
    C -->|SAML 2.0| G
    D --> E
    D --> F
    D -->|REST API| H
</pre>
<p><strong>Figure: System Architecture Overview</strong></p>`
