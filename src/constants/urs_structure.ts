// Auto-generated from URS markdown.md
export interface DocSection {
    title: string;
    level: number;
    instructions: string[];
    content: Record<string, unknown>[];
}

export const URS_STRUCTURE: DocSection[] = [
    {
        "title": "Project Name",
        "level": 1,
        "instructions": [],
        "content": []
    },

    {
        "title": "File Name",
        "level": 1,
        "instructions": [],
        "content": []
    },

    {
        "title": "Issuance Department",
        "level": 1,
        "instructions": [],
        "content": []
    },

    {
        "title": "Review and Approval Record",
        "level": 1,
        "instructions": [],
        "content": [
            {
                "type": "table",
                "columns": [
                    "Document Originator / Author",
                    "Name",
                    "Title",
                    "Department",
                    "Signatory",
                    "Date"
                ],
                "data": []
            },
            {
                "type": "table",
                "columns": [
                    "Document Reviewer",
                    "Name",
                    "Title",
                    "Department",
                    "Signatory",
                    "Date"
                ],
                "data": []
            },
            {
                "type": "table",
                "columns": [
                    "Document Approver",
                    "Name",
                    "Title",
                    "Department",
                    "Signatory",
                    "Date"
                ],
                "data": []
            }
        ]
    },
    {
        "title": "1.0 Introduction",
        "level": 1,
        "instructions": [],
        "content": []
    },
    {
        "title": "1.1 Purpose",
        "level": 2,
        "instructions": [
            "This document details the business requirements for the <Project Name>. The objective of this document is for MIMOS Solutions’ project team members to work with <Customer> to analyse the business requirements for the development of the <Project Name> System."
        ],
        "content": []
    },
    {
        "title": "1.2 Scope",
        "level": 2,
        "instructions": [
            "This section shall describe the scope of this document. Include supporting documents referred and need to be used to supplement the information in this section. Example: The scope of this document is to state the high-level business requirement for the <Project Name> which covers modules listed in section 2.3. This document shall also refer to <Document Name> for common features."
        ],
        "content": []
    },
    {
        "title": "1.3 Intended Audience",
        "level": 2,
        "instructions": [
            "This section shall describe the intended or target audience of this document. Example: This document is intended to be used as reference by the project team in preparing SRS document, system design, and implementation of the system development and testing."
        ],
        "content": []
    },
    {
        "title": "1.4 References",
        "level": 3,
        "instructions": [],
        "content": [
            {
                "type": "table",
                "columns": [
                    "No.",
                    "References",
                    "Provided by"
                ],
                "data": [
                    [
                        "1.",
                        "",
                        ""
                    ]
                ]
            }
        ]
    },
    {
        "title": "1.5 Standards",
        "level": 3,
        "instructions": [
            "This section shall identify all internal and external standards that will be adhered to in the development of the system. This will also identify those external standards that have been specified by the customer (this can be extracted from contract or tender spec). In case there are corresponding internal standards, this section shall outline the reasons for not using the internal standards."
        ],
        "content": [
            {
                "type": "table",
                "columns": [
                    "No.",
                    "Standards",
                    "Purpose",
                    "Reference"
                ],
                "data": [
                    [
                        "1.",
                        "",
                        "",
                        ""
                    ],
                    [
                        "2.",
                        "",
                        ""
                    ]
                ]
            }
        ]
    },
    {
        "title": "2.0 Overview",
        "level": 2,
        "instructions": [],
        "content": []
    },
    {
        "title": "2.1 Background",
        "level": 3,
        "instructions": [
            "Describe at the organization level the reason and **background** for which the organization is pursuing new business or changing the current business in order to fit a new management environment.\n\nIn this context it should describe:\n\n[ ] How the proposed system will contribute to meeting business model, goal and objectives.\n\n[ ] Scope of the work to be done and scope of the system being developed or changed. The boundary of the work shall be clearly set, by specifying what will be done and more importantly what will not be done."
        ],
        "content": []
    },
    {
        "title": "2.2 Scope of Work",
        "level": 3,
        "instructions": [
            "Describe the scope of work."
        ],
        "content": []
    },
    {
        "title": "2.3 Current Business Process and Operational Constraints",
        "level": 3,
        "instructions": [],
        "content": [
            {
                "type": "text",
                "data": "<This section is to document the gap analysis, where an understanding of the current business process is useful in establishing the basis for a new improved process.<br>Describe current business process and business structure (e.g. system activities and process flow).<br>Identify current business operation constraints and problems (gap analysis). When doing this it is useful to consider opportunities for improvement for all problems identified. Also, clearly document any legislative changes required (including business operational policies and rules)<br>[ ] If there is an existing document describing current process, please make reference to here.<br>[ ] If the current process does not exist then omit this sub-section.<br>A diagrammatic description can be used to describe an impacted, removed or new process. Sample as Figure 1, show impacted changes on the current system and scope of the system being developed or changed.><br>[The image shows a large rectangular placeholder box containing a smaller yellow square at the top center and a small white square at the bottom left, representing a sample diagram area.]<br><strong>Figure 1: Sample Diagram</strong>"
            }
        ]
    },
    {
        "title": "2.3.1 Challenges and Areas for Improvement",
        "level": 3,
        "instructions": [
            "Describe the current challenges and areas for improvement in current system based on the analysis gathered during the requirement workshop."
        ],
        "content": [
            {
                "type": "table",
                "columns": [
                    "Current Challenges and Areas for Improvement",
                    "Suggestion for Improvement"
                ],
                "data": [
                    [
                        "• E.g. Email missing vital information about the library resources thus Responder had to search again for library resources information.",
                        "• E.g. Custom email template for notification and reminder."
                    ]
                ]
            }
        ]
    },
    {
        "title": "2.4 Proposed Solution",
        "level": 2,
        "instructions": [
            "Describe the proposed solution to address the challenges and areas for improvements. Include To-Be System Scope and Contex Diagram if necessary including information on the Business Functional Hierarchy Diagram which includes components such as systems, subsystems, functions, modules, submodules and transactions.",
            "Example:"
        ],
        "content": [
            {
                "type": "text",
                "data": "[The image shows a large empty rectangular box with a smaller pink rectangular box centered at the top, intended as a placeholder for a diagram.]<br><strong>Figure 2: Sample Business Functional Hierarchy Diagram</strong>"
            }
        ]
    },
    {
        "title": "2.4.1 Proposed Functional Modules",
        "level": 3,
        "instructions": [
            "Modules can represent business model, business unit or business structure. Please change the title accordingly."
        ],
        "content": [
            {
                "type": "text",
                "data": "This section specifies the modules covered and its business purpose."
            },
            {
                "type": "table",
                "columns": [
                    "No.",
                    "Modules",
                    "Sub-Modules",
                    "Purpose"
                ],
                "data": [
                    [
                        "1.",
                        "Admin (ADM)",
                        "User Management (UM)",
                        "In this module, user can manage user information."
                    ]
                ]
            }
        ]
    },
    {
        "title": "2.5 System Users",
        "level": 3,
        "instructions": [
            "Define all system user class/roles and their characteristics/responsibilities."
        ],
        "content": [
            {
                "type": "table",
                "columns": [
                    "No.",
                    "User Class/Roles",
                    "Characteristics/Responsibilities"
                ],
                "data": [
                    [
                        "1.",
                        "Chemists",
                        "Chemists will use the system to request chemicals from vendors and from the chemical stockroom. Each chemist will use the system several times per day, mainly for tracking chemical containers in and out of the laboratory. The chemists need to search vendor catalogs for specific chemical structures imported from their current structure drawing tools."
                    ]
                ]
            }
        ]
    },
    {
        "title": "3.0 Functional Requirements",
        "level": 2,
        "instructions": [],
        "content": [
            {
                "type": "text",
                "data": "Functional requirements of the system or system element functions or tasks to be performed can be prioritized using MoSCoW rules as per below.<br><strong>Must Have (M):</strong> The requirement is essential, key stakeholder needs will not be satisfied if this requirement is not delivered and the time box will be considered to have failed.<br><strong>Should Have (S):</strong> This is an important requirement but if it is not delivered within the current time box, there is an acceptable workaround until it is delivered during a subsequent time box.<br><strong>Could Have (C):</strong> This is a ‘nice to have’ requirement; we have estimated that it is possible to deliver this in the given time but will be one of the requirements de-scoped if we have underestimated.<br><strong>Won't Have (W):</strong> The full name of this category is ‘Would like to have but Won’t Have during this time box; requirements in this category will not be delivered within the time box that the prioritisation applies to."
            }
        ]
    },
    {
        "title": "3.1 \\<Module #1>",
        "level": 2,
        "instructions": [],
        "content": [
            {
                "type": "text",
                "data": "\\<Modules can represent business model, business unit or business structure. The title shall align with section 2.3>"
            }
        ]
    },
    {
        "title": "3.1.1 Business Process Diagram",
        "level": 3,
        "instructions": [],
        "content": [
            {
                "type": "text",
                "data": "\\<Insert and describe the business process diagram in a high-level manner.<br>In this context operational scenario should be included, which describe examples of how users/operators/maintainers will interact with the system (context of use). The scenarios are described for an activity or a series of activities of business processes supported by the system.><br>\\<Example:><br>```mermaid<br>graph TD<br>    subgraph Pengguna<br>        Start(( )) --> P11[P-1.1.1&lt;Action&gt;]<br>        P11 --> CP112[CP-1.1.2&lt;Action&gt;]<br>        CP112 --> Decision1{Select?}<br>        Decision1 -- [Ya] --> Process1([ ])<br>        Decision1 -- [Tidak] --> Process2([ ])<br>        Process1 --> Decision2{ }<br>        Decision2 -- [Ya] --> Process3([ ])<br>        Decision2 -- [Tidak] --> Process2<br>        Process3 --> Process4{{ }}<br>        Process4 --> End(( ))<br>    end<br>    subgraph System 1<br>        Process5([ ]) --> Process6{{ }}<br>        Process7([ ])<br>    end<br>    subgraph System 2<br>        Process8{{ }} --> Process9{{ }}<br>        SystemBox[<System>]<br>    end<br>    %% Connections between swimlanes<br>    Process1 -.-> Process5<br>    Process2 -.-> Process7<br>    Process9 -.-> Process7<br>    SystemBox -.-> Process9<br>    Process6 -.-> Process3<br>```<br><strong>Figure 3: Sample Process Diagram</strong>"
            }
        ]
    },
    {
        "title": "3.1.2 Feature List",
        "level": 3,
        "instructions": [],
        "content": [
            {
                "type": "text",
                "data": "&lt;Column Source indicates source of requirements, example: SOW, contract, requirement workshop and policies. If not use, please remove the column.<br>Column Features indicating the operational features that are to be provided without specifying design details (including modes of system and support environment).&gt;<br>&lt;Example: &gt;"
            },
            {
                "type": "table",
                "columns": [
                    "FR ID",
                    "Features",
                    "Source",
                    "Priority"
                ],
                "data": [
                    [
                        "PM-1.1",
                        "The system shall have the ability to register a new user.",
                        "COMMONSoW 3.1, 15.3LITESoW 1.1, 1.12",
                        "M"
                    ],
                    [
                        "PM-1.2",
                        "The system shall allow the user to set which is the primary reference ID.",
                        "Workshop 2",
                        "M"
                    ]
                ]
            }
        ]
    },
    {
        "title": "3.2 <Modules #2>",
        "level": 2,
        "instructions": [
            "Modules can represent business model, business unit or business structure. The title shall align with section 2.3"
        ],
        "content": []
    },
    {
        "title": "3.2.1 Business Process Diagram",
        "level": 3,
        "instructions": [],
        "content": [
            {
                "type": "text",
                "data": "<Insert and describe the business process diagram in a high-level manner.<br>In this context operational scenario should be included, which describe examples of how users/operators/maintainers will interact with the system (context of use). The scenarios are described for an activity or a series of activities of business processes supported by the system.>"
            }
        ]
    },
    {
        "title": "3.2.2 Feature List",
        "level": 3,
        "instructions": [
            "Column Source indicates source of requirements, example: SOW, contract, requirement workshop and policies. If not use, please remove the column.\n\nColumn Features indicating the operational features that are to be provided without specifying design details (including modes of system and support environment)."
        ],
        "content": [
            {
                "type": "table",
                "columns": [
                    "FR ID",
                    "Features",
                    "Source",
                    "Priority"
                ],
                "data": [
                    [
                        "PM-1.1",
                        "The system shall have the ability to register a new user.",
                        "COMMONSoW 3.1, 15.3LITESoW 1.1, 1.12",
                        "M"
                    ],
                    [
                        "PM-1.2",
                        "The system shall allow the user to set which is the primary reference ID.",
                        "Workshop 2",
                        "M"
                    ]
                ]
            }
        ]
    },
    {
        "title": "4.0 Non-Functional Requirements (NFR)",
        "level": 2,
        "instructions": [],
        "content": [
            {
                "type": "text",
                "data": "&lt;List each of the non-functional requirements, e.g on Usability, Security, Performance etc.&gt;"
            },
            {
                "type": "table",
                "columns": [
                    "NFR ID",
                    "Features",
                    "Source",
                    "Priority"
                ],
                "data": [
                    [
                        "e.g. DM-TIS-NFR-URS-1",
                        ""
                    ]
                ]
            }
        ]
    },
    {
        "title": "5.0 Assumptions and Dependencies",
        "level": 2,
        "instructions": [],
        "content": [
            {
                "type": "text",
                "data": "&lt;List each of the factors that affect the requirements stated in the BRS. These factors are not design constraints on the software but any changes to these factors can affect the requirements in the BRS.<br>Please re-arrange this section if the assumptions and dependencies are specific to each module.<br>Otherwise this section describes generic assumptions and dependencies of the system being developed or changed.&gt;"
            },
            {
                "type": "table",
                "columns": [
                    "No.",
                    "Assumptions",
                    "Module"
                ],
                "data": [
                    [
                        "1.",
                        "&amp;lt;Example: Data source is accurate&amp;gt;",
                        "All"
                    ],
                    [
                        "2.",
                        ""
                    ]
                ]
            },
            {
                "type": "text",
                "data": "."
            }
        ]
    },
    {
        "title": "6.0 Open Issues",
        "level": 2,
        "instructions": [],
        "content": [
            {
                "type": "text",
                "data": "The following are the open issues when preparing this document."
            },
            {
                "type": "table",
                "columns": [
                    "No. [thead]\tIssues [thead]\tModule [thead]\tPlanned Action",
                    ""
                ],
                "data": [
                    [
                        "1.\t&lt;Example: Third party API is not ready.&gt;\tAll\tTo follow up closely before System Requirement Specification (SRS) sign-off",
                        ""
                    ],
                    [
                        "2.",
                        "",
                        ""
                    ],
                    [
                        "3.",
                        "",
                        ""
                    ]
                ]
            }
        ]
    },
    {
        "title": "Appendices",
        "level": 1,
        "instructions": [],
        "content": []
    },
    {
        "title": "Appendix A: <Title>",
        "level": 2,
        "instructions": [],
        "content": []
    },
    {
        "title": "Appendix B: <Title>",
        "level": 2,
        "instructions": [
            "Note:\nFigure Caption\n\n<center>\n<Diagram>\nFigure 4: <Figure Name>\n</center>\n\nTable Format\n\n<table>\n  <thead>\n    <tr>\n        <th>No.</th>\n        <th>Table Header</th>\n        <th>Table Header</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n        <td>1.</td>\n        <td>Content (Arial, 10pt)</td>\n        <td>Content (Arial, 10pt)</td>\n    </tr>\n    <tr>\n        <td>2.</td>\n        <td></td>\n        <td></td>\n    </tr>\n    <tr>\n        <td>3.</td>\n        <td colspan=\"2\"></td>\n    </tr>\n  </tbody>\n</table>\n<center>\nTable 11: <Table Name>\n</center>"
        ],
        "content": []
    }
];
