import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddProject from './pages/AddProject';
import ProjectDetails from './pages/ProjectDetails';
import AdminRoute from './components/AdminRoute';
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminUsers from './pages/admin/AdminUsers';
import AdminProjects from './pages/admin/AdminProjects';
import AdminTechStack from './pages/admin/AdminTechStack';
import AdminApi from './pages/admin/AdminApi';
import AdminLlmUsage from './pages/admin/AdminLlmUsage';
import AdminRagHealth from './pages/admin/AdminRagHealth';
import AdminStorage from './pages/admin/AdminStorage';
import AdminAudit from './pages/admin/AdminAudit';
import AdminSettings from './pages/admin/AdminSettings';
import AdminOnlyOffice from './pages/admin/AdminOnlyOffice';

import DocumentRepository from './pages/DocumentRepository';
import DocumentEditor from './pages/DocumentEditor';
import Layout from './components/Layout';
import { ProjectProvider } from './context/ProjectContext';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects/new" element={<AddProject />} />
              <Route path="/projects/:projectId" element={<ProjectDetails />} />

              <Route path="/documents" element={<DocumentRepository />} />
              <Route path="/editor/:projectId/:templateId" element={<DocumentEditor />} />

              {/* Admin Routes */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="overview" replace />} />
                  <Route path="overview" element={<AdminOverview />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="projects" element={<AdminProjects />} />
                  <Route path="tech-stack" element={<AdminTechStack />} />
                  <Route path="api" element={<AdminApi />} />
                  <Route path="llm-usage" element={<AdminLlmUsage />} />
                  <Route path="rag-health" element={<AdminRagHealth />} />
                  <Route path="storage" element={<AdminStorage />} />
                  <Route path="audit" element={<AdminAudit />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="onlyoffice" element={<AdminOnlyOffice />} />
                </Route>
              </Route>
            </Route>
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ProjectProvider>
    </AuthProvider>
  )
}

export default App;
