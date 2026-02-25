import { URS_STRUCTURE, DocSection } from './urs_structure';

export const DOC_STRUCTURES: Record<string, string[] | DocSection[]> = {
    BRS: ['1. Executive Summary', '2. Project Scope', '3. Business Requirements', '4. Stakeholders', '5. Cost Benefit Analysis'],
    URS: URS_STRUCTURE,
    SRS: ['1. Introduction', '2. System Overview', '3. Functional Requirements', '4. Non-functional Requirements', '5. Interfaces'],
    SDS: ['1. Architecture', '2. Database Design', '3. API Design', '4. Security Components', '5. Deployment View'],
};
