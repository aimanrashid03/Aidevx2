import type { DocSection } from './urs_structure'

export const SDS_STRUCTURE: DocSection[] = [
    {
        title: "1.0 Introduction",
        level: 1,
        instructions: [],
        content: []
    },
    {
        title: "1.1 Purpose",
        level: 2,
        instructions: [
            "State the purpose of this System Design Specification. This document translates the system requirements into a detailed technical design that developers will use to implement the system."
        ],
        content: []
    },
    {
        title: "1.2 Scope",
        level: 2,
        instructions: [
            "Define the scope of this design specification. Which system components and subsystems does this document cover?"
        ],
        content: []
    },
    {
        title: "1.3 References",
        level: 2,
        instructions: [],
        content: [
            {
                type: "table",
                columns: ["No.", "Document Title", "Version", "Date"],
                data: [
                    ["1.", "System Requirements Specification", "1.0", "<Date>"],
                    ["2.", "User Requirements Specification", "1.0", "<Date>"],
                ]
            }
        ]
    },
    {
        title: "2.0 Architecture",
        level: 1,
        instructions: [
            "Describe the overall system architecture. Include the architectural pattern used (e.g. MVC, microservices, layered), major components, and how they interact. Include architecture diagrams."
        ],
        content: [
            {
                type: "text",
                data: "Describe the system architecture. For complex architectures, consider using a draw.io architecture diagram showing components, services, and infrastructure layers."
            }
        ]
    },
    {
        title: "2.1 Architectural Pattern",
        level: 2,
        instructions: [
            "Describe the architectural pattern(s) applied (e.g. Microservices, Monolithic, Event-Driven, Layered/N-Tier). Explain why this pattern was chosen and any trade-offs considered."
        ],
        content: []
    },
    {
        title: "2.2 Component Architecture",
        level: 2,
        instructions: [
            "Describe the major components of the system and their responsibilities. Include a component diagram."
        ],
        content: [
            {
                type: "table",
                columns: ["Component", "Responsibility", "Technology", "Dependencies"],
                data: [
                    ["API Gateway", "Route and authenticate incoming requests", "<Tech>", "Auth Service"],
                    ["Auth Service", "Handle user authentication and token issuance", "<Tech>", "User DB"],
                    ["Business Logic Service", "Implement core business rules", "<Tech>", "Database, Cache"],
                    ["Frontend SPA", "User interface", "<Tech>", "API Gateway"],
                ]
            }
        ]
    },
    {
        title: "2.3 Deployment Architecture",
        level: 2,
        instructions: [
            "Describe how the system will be deployed. Include infrastructure components (servers, containers, cloud services), networking, and environment topology (dev/staging/prod).",
            "Recommended: Use a draw.io deployment diagram showing servers, containers, load balancers, and CDN."
        ],
        content: [
            {
                type: "table",
                columns: ["Environment", "Purpose", "Infrastructure", "URL / Endpoint"],
                data: [
                    ["Development", "Developer testing", "Local Docker", "localhost"],
                    ["Staging", "UAT and integration testing", "<Cloud Provider> — <Region>", "<staging.example.com>"],
                    ["Production", "Live system", "<Cloud Provider> — <Region>", "<example.com>"],
                ]
            }
        ]
    },
    {
        title: "3.0 Database Design",
        level: 1,
        instructions: [
            "Provide the detailed database design including entity-relationship diagrams, table schemas, indexes, and data retention policies."
        ],
        content: [
            {
                type: "text",
                data: "Include an ER diagram of the database schema.\n\n```mermaid\nerDiagram\n    USERS ||--o{ SESSIONS : has\n    USERS ||--o{ PROJECTS : owns\n    PROJECTS ||--o{ DOCUMENTS : contains\n    DOCUMENTS ||--o{ VERSIONS : has\n```\n**Figure 1: Database Entity Relationship Diagram**"
            }
        ]
    },
    {
        title: "3.1 Database Schema",
        level: 2,
        instructions: [
            "Define each database table with its columns, data types, constraints, and indexes."
        ],
        content: [
            {
                type: "table",
                columns: ["Table Name", "Column", "Data Type", "Constraints", "Description"],
                data: [
                    ["users", "id", "UUID", "PK, NOT NULL", "Primary identifier"],
                    ["users", "email", "VARCHAR(255)", "UNIQUE, NOT NULL", "User email address"],
                    ["users", "role", "VARCHAR(50)", "NOT NULL, DEFAULT 'user'", "User role"],
                    ["users", "created_at", "TIMESTAMP", "NOT NULL, DEFAULT NOW()", "Record creation time"],
                ]
            }
        ]
    },
    {
        title: "3.2 Database Indexes",
        level: 2,
        instructions: [
            "List all database indexes and explain why each is needed for performance."
        ],
        content: [
            {
                type: "table",
                columns: ["Table", "Index Name", "Columns", "Type", "Purpose"],
                data: [
                    ["users", "idx_users_email", "email", "UNIQUE B-tree", "Fast user lookup by email"],
                    ["documents", "idx_documents_project_id", "project_id", "B-tree", "Fast document listing by project"],
                ]
            }
        ]
    },
    {
        title: "4.0 API Design",
        level: 1,
        instructions: [
            "Provide detailed API specifications for all endpoints. Include request/response schemas, status codes, error formats, and authentication requirements."
        ],
        content: [
            {
                type: "table",
                columns: ["Endpoint", "Method", "Auth", "Request Body", "Response (200)", "Error Responses"],
                data: [
                    ["/api/v1/auth/login", "POST", "None", "{ email: string, password: string }", "{ token: string, user: User }", "401 Invalid credentials, 429 Rate limited"],
                    ["/api/v1/users", "GET", "Bearer Token (Admin)", "N/A", "{ users: User[], total: number }", "401 Unauthorized, 403 Forbidden"],
                    ["/api/v1/projects", "POST", "Bearer Token", "{ name: string, description: string }", "{ project: Project }", "400 Validation error, 401 Unauthorized"],
                ]
            }
        ]
    },
    {
        title: "4.1 API Authentication",
        level: 2,
        instructions: [
            "Describe the authentication mechanism for API access. Include token format, expiry, refresh strategy, and how tokens are validated."
        ],
        content: [
            {
                type: "text",
                data: "Describe the authentication flow.\n\n```mermaid\nsequenceDiagram\n    participant Client\n    participant API Gateway\n    participant Auth Service\n    participant DB\n    Client->>API Gateway: POST /auth/login {email, password}\n    API Gateway->>Auth Service: Validate credentials\n    Auth Service->>DB: Lookup user\n    DB-->>Auth Service: User record\n    Auth Service-->>API Gateway: JWT token\n    API Gateway-->>Client: { token, expires_at }\n```\n**Figure 2: Authentication Sequence Diagram**"
            }
        ]
    },
    {
        title: "4.2 Error Handling",
        level: 2,
        instructions: [
            "Define the standard error response format and list of error codes used across all APIs."
        ],
        content: [
            {
                type: "table",
                columns: ["HTTP Status", "Error Code", "Description", "Example Response"],
                data: [
                    ["400", "VALIDATION_ERROR", "Request body failed validation", "{ error: 'VALIDATION_ERROR', message: 'email is required' }"],
                    ["401", "UNAUTHORIZED", "Missing or invalid authentication token", "{ error: 'UNAUTHORIZED', message: 'Invalid token' }"],
                    ["403", "FORBIDDEN", "Authenticated but insufficient permissions", "{ error: 'FORBIDDEN', message: 'Admin role required' }"],
                    ["404", "NOT_FOUND", "Requested resource does not exist", "{ error: 'NOT_FOUND', message: 'User not found' }"],
                    ["500", "INTERNAL_ERROR", "Unexpected server error", "{ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }"],
                ]
            }
        ]
    },
    {
        title: "5.0 Security Components",
        level: 1,
        instructions: [
            "Describe the security mechanisms implemented in the system. Include authentication, authorisation, data protection, and audit logging designs."
        ],
        content: [
            {
                type: "text",
                data: "Describe the security architecture. Include authorisation flow diagram.\n\n```mermaid\nsequenceDiagram\n    participant User\n    participant Frontend\n    participant APIGateway\n    participant AuthService\n    User->>Frontend: Request protected resource\n    Frontend->>APIGateway: HTTP request + Bearer token\n    APIGateway->>AuthService: Validate token\n    AuthService-->>APIGateway: Token valid + user roles\n    APIGateway->>APIGateway: Check role permissions\n    APIGateway-->>Frontend: Response or 403 Forbidden\n```\n**Figure 3: Authorisation Flow**"
            }
        ]
    },
    {
        title: "5.1 Role-Based Access Control",
        level: 2,
        instructions: [
            "Define the roles in the system and the permissions each role has. Create an authorisation matrix."
        ],
        content: [
            {
                type: "table",
                columns: ["Feature / Resource", "Admin", "Manager", "User", "Guest"],
                data: [
                    ["User Management", "Full CRUD", "Read", "Self only", "None"],
                    ["Project Management", "Full CRUD", "Full CRUD", "Read + Update own", "None"],
                    ["Reports", "All reports", "Team reports", "Own reports", "None"],
                    ["System Settings", "Full access", "None", "None", "None"],
                ]
            }
        ]
    },
    {
        title: "5.2 Data Protection",
        level: 2,
        instructions: [
            "Describe how sensitive data is protected at rest and in transit. Include encryption standards, PII handling, and data masking approaches."
        ],
        content: [
            {
                type: "table",
                columns: ["Data Type", "Classification", "Encryption at Rest", "Encryption in Transit", "Masking / Tokenisation"],
                data: [
                    ["User passwords", "Confidential", "bcrypt hash (cost 12)", "TLS 1.3", "N/A — never stored plain"],
                    ["PII (name, email)", "Confidential", "AES-256 (field-level)", "TLS 1.3", "Masked in logs"],
                    ["Financial data", "Restricted", "AES-256", "TLS 1.3", "Tokenised for display"],
                ]
            }
        ]
    },
    {
        title: "6.0 Deployment View",
        level: 1,
        instructions: [
            "Describe the deployment infrastructure in detail. Include server specifications, containerisation strategy, CI/CD pipeline, and monitoring setup.",
            "Recommended: Use a draw.io deployment diagram for complex infrastructure."
        ],
        content: [
            {
                type: "table",
                columns: ["Component", "Type", "Specifications", "Count", "Notes"],
                data: [
                    ["Web Server", "Container (Docker)", "2 vCPU, 4GB RAM", "2 (load balanced)", "Nginx reverse proxy"],
                    ["Application Server", "Container (Docker)", "4 vCPU, 8GB RAM", "3 (auto-scaling)", "Node.js / Python"],
                    ["Database", "Managed Service", "8 vCPU, 32GB RAM, 500GB SSD", "1 primary + 1 replica", "PostgreSQL"],
                    ["Cache", "Managed Service", "2 vCPU, 8GB RAM", "1", "Redis"],
                ]
            }
        ]
    },
    {
        title: "6.1 CI/CD Pipeline",
        level: 2,
        instructions: [
            "Describe the continuous integration and continuous deployment pipeline. Include stages, tools, and quality gates."
        ],
        content: [
            {
                type: "text",
                data: "Describe the CI/CD pipeline flow.\n\n```mermaid\ngraph LR\n    Dev[Developer Push] --> CI[CI: Build + Test]\n    CI --> CodeQuality[Code Quality Gate]\n    CodeQuality --> StagingDeploy[Deploy to Staging]\n    StagingDeploy --> UAT[UAT / Integration Tests]\n    UAT --> ProdApproval[Manual Approval]\n    ProdApproval --> ProdDeploy[Deploy to Production]\n    ProdDeploy --> Monitor[Monitoring + Alerts]\n```\n**Figure 4: CI/CD Pipeline**"
            }
        ]
    },
    {
        title: "6.2 Monitoring and Logging",
        level: 2,
        instructions: [
            "Describe the monitoring, logging, and alerting strategy. Include what is monitored, log levels, retention policies, and alert thresholds."
        ],
        content: [
            {
                type: "table",
                columns: ["Monitoring Type", "Tool / Service", "What is Monitored", "Alert Threshold"],
                data: [
                    ["Application Performance", "<e.g. Datadog>", "Response time, error rate, throughput", "P95 response > 2s OR error rate > 1%"],
                    ["Infrastructure", "<e.g. CloudWatch>", "CPU, memory, disk, network", "CPU > 80% for 5 min"],
                    ["Log Management", "<e.g. ELK Stack>", "Application logs, audit logs", "Error log spike > 50/min"],
                    ["Uptime", "<e.g. PagerDuty>", "HTTP health checks", "3 consecutive failures"],
                ]
            }
        ]
    },
    {
        title: "7.0 Integration Points",
        level: 1,
        instructions: [
            "Document all external system integrations in detail. Include integration patterns, data formats, error handling, and fallback strategies."
        ],
        content: [
            {
                type: "table",
                columns: ["Integration", "System", "Pattern", "Data Format", "Frequency", "Error Handling"],
                data: [
                    ["Authentication", "Corporate IdP (SSO)", "OAuth 2.0 / OIDC", "JWT", "Per user session", "Fall back to local auth"],
                    ["Email Notifications", "SMTP / SendGrid", "REST API", "JSON", "Event-driven", "Queue + retry 3x"],
                ]
            }
        ]
    },
    {
        title: "8.0 Assumptions and Constraints",
        level: 1,
        instructions: [
            "List technical assumptions made during design and any constraints that influenced the design decisions."
        ],
        content: [
            {
                type: "table",
                columns: ["No.", "Type", "Description", "Impact on Design"],
                data: [
                    ["1.", "Assumption", "Cloud provider supports managed PostgreSQL", "Database design uses PostgreSQL-specific features"],
                    ["2.", "Constraint", "Must use existing corporate SSO provider", "OAuth 2.0 OIDC integration required"],
                ]
            }
        ]
    },
]
