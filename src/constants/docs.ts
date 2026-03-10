import { URS_STRUCTURE, DocSection } from './urs_structure';
import { BRS_STRUCTURE } from './brs_structure';
import { SRS_STRUCTURE } from './srs_structure';
import { SDS_STRUCTURE } from './sds_structure';

export type { DocSection };

export const DOC_STRUCTURES: Record<string, DocSection[]> = {
    BRS: BRS_STRUCTURE,
    URS: URS_STRUCTURE,
    SRS: SRS_STRUCTURE,
    SDS: SDS_STRUCTURE,
};
