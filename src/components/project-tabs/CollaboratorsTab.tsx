import ProjectMembers from '../ProjectMembers';

interface Props {
    projectId: string;
}

export default function CollaboratorsTab({ projectId }: Props) {
    return (
        <div className="max-w-2xl">
            <ProjectMembers projectId={projectId} />
        </div>
    );
}
