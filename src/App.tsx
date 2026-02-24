import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddProject from './pages/AddProject';
import ProjectDetails from './pages/ProjectDetails';

import DocumentRepository from './pages/DocumentRepository';
import Editor from './pages/Editor';
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
              <Route path="/editor/:projectId/:templateId" element={<Editor />} />
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
