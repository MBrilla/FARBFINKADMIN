import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ProjectForm from '../components/ProjectForm'; // Corrected import
import { ProjectFormData } from '../components/ProjectForm'; // Corrected import
import '../app.css'; // Use main app CSS

const EditProjectPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [projectData, setProjectData] = useState<ProjectFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) {
        setError('Project ID not found.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*') // Select all fields for editing
          .eq('id', projectId)
          .single(); // Expect only one project

        if (error) throw error;
        if (!data) throw new Error('Project not found.');

        // Transform data slightly if needed to match ProjectFormData structure
        // Assuming the structure mostly matches, adjust as necessary
        setProjectData(data as ProjectFormData);

      } catch (err) {
        console.error('Error fetching project:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch project data');
        // Optionally redirect if project not found after error
        // navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId, navigate]);

  return (
    <div>
      <Link to="/">&larr; Zurück zum Dashboard</Link>
      <h1 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Projekt bearbeiten</h1>

      {loading && <p>Lade Projektdaten...</p>}
      {error && <p style={{ color: 'red' }}>Fehler: {error}</p>}
      {!loading && !error && projectData && (
         // Pass fetched data and indicate it's an edit operation
        <ProjectForm projectToEdit={projectData} />
      )}
       {!loading && !error && !projectData && (
        <p>Projekt konnte nicht geladen werden.</p>
      )}
    </div>
  );
};

export default EditProjectPage; 