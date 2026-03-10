import type { DocSection } from './urs_structure'

export const BRS_STRUCTURE: DocSection[] = [
    {
        title: "1.0 Executive Summary",
        level: 1,
        instructions: [
            "Provide a concise overview of the business case for this project. Include the problem being solved, the proposed solution at a high level, expected ROI, and key timeline milestones.",
            "This section should be understandable by non-technical stakeholders and executives. Keep it to 1-2 paragraphs followed by a summary table."
        ],
        content: [
            {
                type: "table",
                columns: ["Item", "Details"],
                data: [
                    ["Project Name", "<Project Name>"],
                    ["Sponsor", "<Business Sponsor Name>"],
                    ["Expected ROI", "<ROI estimate>"],
                    ["Timeline", "<Start Date> – <End Date>"],
                    ["Budget", "<Estimated Budget>"],
                ]
            }
        ]
    },
    {
        title: "1.1 Business Problem",
        level: 2,
        instructions: [
            "Describe the current business problem or opportunity that this project addresses. Include: what the problem is, who is affected, the impact of not solving it (cost, risk, missed opportunity), and why now is the right time to act."
        ],
        content: []
    },
    {
        title: "1.2 Proposed Solution",
        level: 2,
        instructions: [
            "Describe the proposed solution at a business level (not technical). Explain what the solution will do, how it addresses the problem, and what the expected outcome is."
        ],
        content: []
    },
    {
        title: "2.0 Project Scope",
        level: 1,
        instructions: [
            "Define what is in scope and out of scope for this project. Be explicit to avoid scope creep."
        ],
        content: [
            {
                type: "table",
                columns: ["Scope Item", "In Scope", "Out of Scope"],
                data: [
                    ["User Management", "Yes", ""],
                    ["Reporting Module", "", "Deferred to Phase 2"],
                ]
            }
        ]
    },
    {
        title: "2.1 In-Scope Items",
        level: 2,
        instructions: [
            "List all features, modules, processes, and deliverables that are included in this project."
        ],
        content: []
    },
    {
        title: "2.2 Out-of-Scope Items",
        level: 2,
        instructions: [
            "List all items explicitly excluded from this project. Include reasons where relevant to avoid future disputes."
        ],
        content: []
    },
    {
        title: "3.0 Business Requirements",
        level: 1,
        instructions: [
            "List the detailed business requirements. Each requirement should be specific, measurable, and testable. Use MoSCoW prioritisation (Must/Should/Could/Won't).",
            "Must Have (M): Essential requirements without which the project fails.",
            "Should Have (S): Important but not critical; acceptable workaround exists.",
            "Could Have (C): Nice to have; will be de-scoped if time is limited.",
            "Won't Have (W): Explicitly excluded from this phase."
        ],
        content: [
            {
                type: "table",
                columns: ["BR ID", "Business Requirement", "Priority", "Source", "Acceptance Criteria"],
                data: [
                    ["BR-001", "The system shall allow users to log in with their corporate credentials.", "M", "Stakeholder Workshop", "User can log in using SSO within 3 seconds."],
                    ["BR-002", "The system shall generate monthly performance reports.", "S", "Management Request", "Report is generated and emailed by the 1st of each month."],
                ]
            }
        ]
    },
    {
        title: "4.0 Stakeholders",
        level: 1,
        instructions: [
            "Identify all stakeholders affected by or involved in this project. Include their role, interest level, influence level, and key concerns."
        ],
        content: [
            {
                type: "table",
                columns: ["Name", "Role / Title", "Department", "Interest", "Influence", "Key Concerns"],
                data: [
                    ["<Name>", "Project Sponsor", "<Department>", "High", "High", "ROI, timeline"],
                    ["<Name>", "End User Representative", "<Department>", "High", "Medium", "Usability, training"],
                ]
            }
        ]
    },
    {
        title: "5.0 Cost Benefit Analysis",
        level: 1,
        instructions: [
            "Provide a cost-benefit analysis to justify the investment. Include one-time costs, recurring costs, and expected benefits (quantified where possible)."
        ],
        content: [
            {
                type: "table",
                columns: ["Category", "Item", "Estimated Cost / Benefit", "Timeline", "Notes"],
                data: [
                    ["Cost", "Development", "$<amount>", "One-time", ""],
                    ["Cost", "Licensing", "$<amount>/year", "Recurring", ""],
                    ["Benefit", "Reduced manual processing time", "$<amount>/year", "Ongoing", "Based on 10 FTE hours/week"],
                ]
            }
        ]
    },
    {
        title: "6.0 Business Rules",
        level: 1,
        instructions: [
            "Document the business rules that govern how the system must behave. These are policies, regulations, or constraints that the solution must comply with."
        ],
        content: [
            {
                type: "table",
                columns: ["Rule ID", "Business Rule", "Source / Authority", "Impact"],
                data: [
                    ["BR-RULE-001", "All financial transactions above $10,000 require dual approval.", "Finance Policy FP-001", "Approval workflow required"],
                ]
            }
        ]
    },
    {
        title: "7.0 Success Criteria",
        level: 1,
        instructions: [
            "Define measurable criteria that will determine whether this project has been successful. These should be agreed upon by all key stakeholders before the project begins."
        ],
        content: [
            {
                type: "table",
                columns: ["Criterion", "Target Metric", "Measurement Method", "Target Date"],
                data: [
                    ["System adoption rate", ">80% of target users active within 3 months", "System login analytics", "<Date>"],
                    ["Process efficiency gain", "50% reduction in manual processing time", "Time-motion study", "<Date>"],
                ]
            }
        ]
    },
    {
        title: "8.0 Risk Assessment",
        level: 1,
        instructions: [
            "Identify key business risks associated with this project. For each risk, assess likelihood and impact, and propose a mitigation strategy."
        ],
        content: [
            {
                type: "table",
                columns: ["Risk ID", "Risk Description", "Likelihood (H/M/L)", "Impact (H/M/L)", "Mitigation Strategy", "Owner"],
                data: [
                    ["RISK-001", "Key stakeholder unavailability delays sign-off", "M", "H", "Identify backup decision-makers upfront", "<Name>"],
                    ["RISK-002", "Scope creep extends timeline", "H", "M", "Strict change control process", "Project Manager"],
                ]
            }
        ]
    },
    {
        title: "9.0 Constraints",
        level: 1,
        instructions: [
            "List any constraints that limit the solution options. These may be budget, technology, regulatory, time, or resource constraints."
        ],
        content: [
            {
                type: "table",
                columns: ["Constraint Type", "Description", "Impact on Project"],
                data: [
                    ["Budget", "Maximum budget of $<amount>", "Limits technology options"],
                    ["Regulatory", "Must comply with PDPA data protection requirements", "Data handling and storage design constrained"],
                    ["Timeline", "Must go live before <Date>", "Limits scope of Phase 1"],
                ]
            }
        ]
    },
    {
        title: "10.0 Assumptions",
        level: 1,
        instructions: [
            "List all assumptions made in preparing this document. If any assumption proves false, the requirements or estimates may need revision."
        ],
        content: [
            {
                type: "table",
                columns: ["No.", "Assumption", "Impact if Wrong"],
                data: [
                    ["1.", "Current infrastructure can support the new system without major upgrades.", "Additional infrastructure cost required."],
                    ["2.", "Stakeholders will be available for weekly reviews.", "Timeline may slip."],
                ]
            }
        ]
    },
    {
        title: "11.0 Glossary",
        level: 1,
        instructions: [
            "Define key terms, acronyms, and abbreviations used in this document."
        ],
        content: [
            {
                type: "table",
                columns: ["Term / Acronym", "Definition"],
                data: [
                    ["BRS", "Business Requirements Specification"],
                    ["ROI", "Return on Investment"],
                    ["MoSCoW", "Must Have, Should Have, Could Have, Won't Have (prioritisation framework)"],
                ]
            }
        ]
    },
]
