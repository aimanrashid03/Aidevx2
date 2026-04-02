/**
 * Few-shot examples for SDS document generation.
 * These are injected into system prompts when docType === 'SDS'
 * to guide the LLM toward the correct style, tone, and format.
 */

/** Example of a well-written SDS text section (Component Design style) */
export const SDS_TEXT_EXAMPLE = `<p>The <strong>Authentication Module</strong> implements a stateless, token-based authentication flow using OAuth 2.0 with PKCE (Proof Key for Code Exchange). The module is responsible for session lifecycle management, token issuance and validation, and integration with the corporate Identity Provider via SAML 2.0.</p>
<p><strong>Design Decisions:</strong></p>
<ul>
<li><strong>Stateless sessions</strong> — JWT access tokens are self-contained, eliminating the need for server-side session storage and enabling horizontal scaling of API instances.</li>
<li><strong>Token rotation</strong> — Refresh tokens are single-use with a 7-day sliding window. Each refresh issues a new token pair and invalidates the previous refresh token to mitigate replay attacks.</li>
<li><strong>Rate limiting</strong> — Authentication endpoints are rate-limited to 10 requests per minute per IP using a sliding window counter stored in Redis.</li>
</ul>
<p>The module exposes the following internal interfaces: <strong>AuthService.authenticate()</strong>, <strong>AuthService.refresh()</strong>, and <strong>AuthService.revoke()</strong>. All methods return standardized Result&lt;T, AuthError&gt; types.</p>`

/** Example of a well-written SDS API/data design table */
export const SDS_TABLE_EXAMPLE = `<p><strong>Table: API Endpoint Specification — Authentication</strong></p>
<table>
<thead><tr><th>Endpoint</th><th>Method</th><th>Request Body</th><th>Response</th><th>Auth Required</th></tr></thead>
<tbody>
<tr><td>/api/v1/auth/login</td><td>POST</td><td>{ email, password, mfa_code? }</td><td>{ access_token, refresh_token, expires_in }</td><td>No</td></tr>
<tr><td>/api/v1/auth/refresh</td><td>POST</td><td>{ refresh_token }</td><td>{ access_token, refresh_token, expires_in }</td><td>No</td></tr>
<tr><td>/api/v1/auth/logout</td><td>POST</td><td>—</td><td>{ success: true }</td><td>Bearer Token</td></tr>
<tr><td>/api/v1/auth/me</td><td>GET</td><td>—</td><td>{ id, email, roles[], permissions[] }</td><td>Bearer Token</td></tr>
</tbody>
</table>`

/** Example of an SDS component interaction Mermaid diagram */
export const SDS_DIAGRAM_EXAMPLE = `<pre class="mermaid">sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant Auth as Auth Service
    participant IdP as Identity Provider
    participant DB as Database
    C->>GW: POST /auth/login
    GW->>Auth: validate credentials
    Auth->>IdP: SAML AuthnRequest
    IdP-->>Auth: SAML Response (assertion)
    Auth->>DB: create session record
    Auth-->>GW: { access_token, refresh_token }
    GW-->>C: 200 OK + tokens
</pre>
<p><strong>Figure: Authentication Sequence Flow</strong></p>`
