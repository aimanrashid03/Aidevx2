import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute() {
    const { profile, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-50">
                <div className="text-slate-500 font-medium">Verifying access...</div>
            </div>
        );
    }

    if (!profile || profile.role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}
