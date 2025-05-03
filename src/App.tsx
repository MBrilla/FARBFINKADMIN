import { FunctionalComponent } from 'preact'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard.tsx'
import ProjectForm from './pages/ProjectForm'
import './index.css'

export const App: FunctionalComponent = () => {
  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add" element={<ProjectForm />} />
          <Route path="/edit/:id" element={<ProjectForm />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  )
}
