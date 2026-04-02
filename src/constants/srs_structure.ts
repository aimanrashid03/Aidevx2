import type { DocSection } from './urs_structure'

export const SRS_STRUCTURE: DocSection[] = [
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
            "State the purpose of this System Requirements Specification. Describe what system is being specified, who the intended readers are (developers, testers, project managers), and what the document will be used for."
        ],
        content: []
    },
    {
        title: "1.2 Scope",
        level: 2,
        instructions: [
            "Identify the software product(s) to be produced by name. Explain what the software will and will not do. Describe the application of the software being specified, including relevant benefits, objectives, and goals."
        ],
        content: []
    },
    {
        title: "1.3 Definitions, Acronyms and Abbreviations",
        level: 2,
        instructions: [
            "Provide definitions of all terms, acronyms, and abbreviations required to properly interpret this document."
        ],
        content: [
            {
                type: "table",
                columns: ["Term / Acronym", "Definition"],
                data: [
                    ["SRS", "System Requirements Specification"],
                    ["API", "Application Programming Interface"],
                    ["FR", "Functional Requirement"],
                    ["NFR", "Non-Functional Requirement"],
                ]
            }
        ]
    },
    {
        title: "1.4 References",
        level: 2,
        instructions: [],
        content: [
            {
                type: "table",
                columns: ["No.", "Document Title", "Version", "Date"],
                data: [
                    ["1.", "Business Requirements Specification", "1.0", "<Date>"],
                    ["2.", "User Requirements Specification", "1.0", "<Date>"],
                ]
            }
        ]
    },
    {
        title: "2.0 System Overview",
        level: 1,
        instructions: [
            "Provide a high-level description of the system being built. Include the system context, major components, and how they interact."
        ],
        content: [
            {
                type: "text",
                data: "Describe the system architecture at a high level. Include a context diagram showing how the system interacts with external actors and systems.\n\n```mermaid\ngraph TD\n    User[Users] --> System[<System Name>]\n    System --> DB[(Database)]\n    System --> ExtAPI[External APIs]\n    Admin[Administrator] --> System\n```\n**Figure 1: System Context Diagram**"
            }
        ]
    },
    {
        title: "2.1 System Architecture",
        level: 2,
        instructions: [
            "Describe the system architecture including major components, layers (frontend, backend, database), and how they communicate. Include an architecture diagram if possible."
        ],
        content: [
            {
                type: "text",
                data: "Draw a system architecture diagram showing the major components and their relationships. For architecture diagrams, consider using a layered or component-based representation."
            }
        ]
    },
    {
        title: "2.2 Technology Stack",
        level: 2,
        instructions: [
            "List the technologies, frameworks, and tools that will be used to build the system."
        ],
        content: [
            {
                type: "table",
                columns: ["Layer", "Technology", "Version", "Purpose"],
                data: [
                    ["Frontend", "<e.g. React>", "<version>", "User interface"],
                    ["Backend", "<e.g. Node.js>", "<version>", "Business logic and API"],
                    ["Database", "<e.g. PostgreSQL>", "<version>", "Data persistence"],
                    ["Hosting", "<e.g. AWS>", "N/A", "Cloud infrastructure"],
                ]
            }
        ]
    },
    {
        title: "2.3 System Interfaces",
        level: 2,
        instructions: [
            "Describe all external systems and APIs that this system will integrate with."
        ],
        content: [
            {
                type: "table",
                columns: ["Interface Name", "Type", "Direction", "Protocol", "Description"],
                data: [
                    ["Authentication Service", "External API", "Inbound", "OAuth 2.0", "SSO login via corporate identity provider"],
                    ["Payment Gateway", "External API", "Outbound", "HTTPS/REST", "Process payment transactions"],
                ]
            }
        ]
    },
    {
        title: "3.0 Functional Requirements",
        level: 1,
        instructions: [
            "List all functional requirements of the system. Each requirement should be uniquely identified, testable, and traceable to a business requirement.",
            "Use MoSCoW prioritisation: M=Must Have, S=Should Have, C=Could Have, W=Won't Have."
        ],
        content: [
            {
                type: "table",
                columns: ["FR ID", "Feature / Requirement", "Description", "Priority", "Source (BR ID)"],
                data: [
                    ["FR-001", "User Authentication", "The system shall authenticate users via SSO using corporate credentials.", "M", "BR-001"],
                    ["FR-002", "Role-Based Access Control", "The system shall restrict access to features based on user roles.", "M", "BR-001"],
                ]
            }
        ]
    },
    {
        title: "3.1 User Management",
        level: 2,
        instructions: [
            "Specify all requirements related to user account management including registration, authentication, authorisation, and profile management."
        ],
        content: [
            {
                type: "table",
                columns: ["FR ID", "Requirement", "Priority"],
                data: [
                    ["FR-UM-001", "The system shall allow administrators to create, modify, and deactivate user accounts.", "M"],
                    ["FR-UM-002", "The system shall support role assignment per user.", "M"],
                    ["FR-UM-003", "The system shall enforce password complexity rules.", "S"],
                ]
            }
        ]
    },
    {
        title: "3.2 Core Business Functions",
        level: 2,
        instructions: [
            "Specify the primary functional requirements for the core business processes this system supports. Align with the business requirements from the BRS."
        ],
        content: [
            {
                type: "table",
                columns: ["FR ID", "Requirement", "Priority", "Acceptance Criteria"],
                data: [
                    ["FR-CORE-001", "<Core function requirement>", "M", "<How to verify>"],
                ]
            }
        ]
    },
    {
        title: "3.3 Reporting and Analytics",
        level: 2,
        instructions: [
            "Specify requirements for reports, dashboards, and data exports."
        ],
        content: [
            {
                type: "table",
                columns: ["FR ID", "Report / Feature", "Description", "Format", "Frequency"],
                data: [
                    ["FR-RPT-001", "Monthly Summary Report", "Summarises all transactions for the month", "PDF / Excel", "Monthly"],
                ]
            }
        ]
    },
    {
        title: "4.0 Non-Functional Requirements",
        level: 1,
        instructions: [
            "Define quality attributes and constraints that the system must satisfy. These are not features but properties of how the system performs."
        ],
        content: [
            {
                type: "table",
                columns: ["NFR ID", "Category", "Requirement", "Target Metric / Acceptance Criteria"],
                data: [
                    ["NFR-001", "Performance", "System shall respond to user requests within acceptable time.", "Page load < 2 seconds for 95% of requests under normal load"],
                    ["NFR-002", "Availability", "System shall be available during business hours.", "99.5% uptime during 8am-6pm business hours"],
                    ["NFR-003", "Security", "All data in transit shall be encrypted.", "TLS 1.2 or higher for all API communications"],
                    ["NFR-004", "Scalability", "System shall handle concurrent users.", "Support 500 concurrent users without degradation"],
                    ["NFR-005", "Usability", "System shall be accessible.", "WCAG 2.1 Level AA compliance"],
                ]
            }
        ]
    },
    {
        title: "5.0 Data Requirements",
        level: 1,
        instructions: [
            "Describe the data that the system will manage, store, and process. Include data entities, their attributes, relationships, and any data retention policies."
        ],
        content: [
            {
                type: "text",
                data: "Describe the key data entities and their relationships. Include an ER diagram to show the data model.\n\n```mermaid\nerDiagram\n    USER ||--o{ SESSION : has\n    USER ||--o{ DOCUMENT : creates\n    PROJECT ||--o{ DOCUMENT : contains\n```\n**Figure 2: Entity Relationship Diagram**"
            }
        ]
    },
    {
        title: "5.1 Data Entities",
        level: 2,
        instructions: [
            "List the key data entities the system will manage with their key attributes."
        ],
        content: [
            {
                type: "table",
                columns: ["Entity", "Key Attributes", "Description", "Retention Policy"],
                data: [
                    ["User", "id, name, email, role, created_at", "System users", "Retain for 7 years after account closure"],
                    ["Transaction", "id, amount, status, created_at, user_id", "Financial transactions", "Retain for 10 years"],
                ]
            }
        ]
    },
    {
        title: "5.2 Data Migration",
        level: 2,
        instructions: [
            "Describe any data migration requirements if existing data needs to be moved from legacy systems."
        ],
        content: []
    },
    {
        title: "6.0 API Requirements",
        level: 1,
        instructions: [
            "Define the API endpoints that the system will expose. Include request/response formats, authentication requirements, and rate limits."
        ],
        content: [
            {
                type: "table",
                columns: ["Endpoint", "Method", "Description", "Auth Required", "Request Body", "Response"],
                data: [
                    ["/api/auth/login", "POST", "Authenticate user and return token", "No", "{ email, password }", "{ token, user }"],
                    ["/api/users", "GET", "List all users (admin only)", "Yes (Admin)", "N/A", "{ users: [...] }"],
                    ["/api/users/:id", "PUT", "Update user profile", "Yes", "{ name, role }", "{ user }"],
                ]
            }
        ]
    },
    {
        title: "7.0 Security Requirements",
        level: 1,
        instructions: [
            "Specify all security requirements including authentication, authorisation, data protection, audit logging, and compliance requirements."
        ],
        content: [
            {
                type: "table",
                columns: ["Security Area", "Requirement", "Standard / Reference"],
                data: [
                    ["Authentication", "Multi-factor authentication for admin accounts", "NIST SP 800-63"],
                    ["Data Encryption", "Encrypt all PII data at rest using AES-256", "PDPA / GDPR"],
                    ["Audit Logging", "Log all user actions with timestamp and user ID", "ISO 27001"],
                    ["Session Management", "Session timeout after 30 minutes of inactivity", "OWASP"],
                ]
            }
        ]
    },
    {
        title: "8.0 Assumptions and Dependencies",
        level: 1,
        instructions: [
            "List assumptions made during requirements gathering, and dependencies on external systems, teams, or deliverables."
        ],
        content: [
            {
                type: "table",
                columns: ["No.", "Type", "Description", "Impact if Not Met"],
                data: [
                    ["1.", "Assumption", "Corporate SSO service will be available and accessible.", "Authentication module cannot be implemented."],
                    ["2.", "Dependency", "Payment gateway API documentation will be provided by <Date>.", "Payment integration delayed."],
                ]
            }
        ]
    },
]
