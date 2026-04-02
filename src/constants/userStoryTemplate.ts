export const USER_STORY_TEMPLATE = [
    {
        id: 'q1',
        title: 'System Overview',
        prompts: [
            'What is the system name and purpose?',
            'What are the expected outcomes after implementing this system?',
        ],
    },
    {
        id: 'q2',
        title: 'Users & Roles',
        prompts: [
            'Who will be using this system? (List all user types: Admin, Staff, Manager, etc.)',
            'What is the role/responsibility of each user type?',
            'What are the current issues or challenges faced without this system?',
            'How do these problems impact productivity, accuracy, or cost?',
        ],
    },
    {
        id: 'q3',
        title: 'Modules & Features',
        prompts: [
            'What are the main modules or features of the system?',
            'What is the purpose of each module?',
            'Which users will use each module?',
        ],
    },
    {
        id: 'q4',
        title: 'Current Workflow (AS-IS)',
        prompts: [
            'What is the current workflow or process?',
            'Where do delays, errors, or inefficiencies usually occur?',
        ],
    },
    {
        id: 'q5',
        title: 'Proposed Workflow (TO-BE)',
        prompts: [
            'How should the process work after the system is implemented?',
            'What steps will be automated or improved?',
        ],
    },
    {
        id: 'q6',
        title: 'User Actions & Permissions',
        prompts: [
            'What actions can each user perform in the system?',
            'Are there any actions that require approval or verification?',
        ],
    },
    {
        id: 'q7',
        title: 'Validations',
        prompts: [
            'What validations are required in the system?',
            'What input fields are mandatory?',
        ],
    },
];
