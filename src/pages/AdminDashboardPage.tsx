import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom'; // Add Link for navigation
import '../app.css'; // Use main app CSS for now

// Define Project type (can be moved to a shared types file)
type Project = {
  id: string;
  title: string;
  image: string | null; // Can be null
  images?: string[] | null; // Gallery images, optional and can be null
};

const AdminDashboardPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ totalProjects: 0 }); // Placeholder

  useEffect(() => {
    fetchProjectsAndMetrics();
  }, []);

  const fetchProjectsAndMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Projects (simplified view)
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, title, image') // Only fetch needed fields for list
        .order('created_at', { ascending: false });
      
      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Fetch Metrics (Example: Total Count)
      const { count, error: countError } = await supabase
        .from('projects')
        .select('*' , { count: 'exact', head: true }); // Optimized count query
        
      if (countError) throw countError; 
      setMetrics({ totalProjects: count ?? 0 });

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to extract file path (name) from public URL (similar to ProjectForm)
  const getPathFromUrl = (url: string | null): string | null => {
      if (!url) return null;
      try {
          const urlParts = new URL(url);
          const BUCKET_NAME = 'project-images'; // Ensure this matches your bucket
          // Example URL: https://<project-ref>.supabase.co/storage/v1/object/public/project-images/image.jpg
          const pathPrefix = `/storage/v1/object/public/${BUCKET_NAME}/`;
          if (urlParts.pathname.startsWith(pathPrefix)) {
            return urlParts.pathname.substring(pathPrefix.length);
          }
          // Fallback for potentially different URL structures if needed
          const pathSegments = urlParts.pathname.split('/');
          return pathSegments[pathSegments.length - 1] || null;
      } catch (e) {
          console.error("Error parsing URL for path:", url, e);
          return null; // Invalid URL?
      }
  };

  const handleDelete = async (projectId: string, projectTitle: string) => {
     if (!window.confirm(`Sicher, dass du das Projekt "${projectTitle}" löschen möchtest? Das löscht auch alle zugehörigen Bilder endgültig.`)) {
      return;
    }

    setLoading(true); // Indicate loading state during delete
    setError(null);
    const BUCKET_NAME = 'project-images';

    try {
       // 1. Fetch the project details to get image URLs
       console.log(`Fetching details for project ID: ${projectId} before deletion...`);
       const { data: projectToDelete, error: fetchError } = await supabase
         .from('projects')
         .select('image, images') // Select only image fields
         .eq('id', projectId)
         .single();

       if (fetchError) {
         // If project not found, maybe it was already deleted? Proceed to ensure cleanup.
         if (fetchError.code === 'PGRST116') { // PostgREST code for 'Not found'
             console.warn(`Project ${projectId} not found in DB. Might be already deleted.`);
         } else {
             throw new Error(`Failed to fetch project details: ${fetchError.message}`);
         }
       }

      // 2. Collect image paths to delete from Storage
      const pathsToDelete: string[] = [];
      if (projectToDelete) {
          const mainImagePath = getPathFromUrl(projectToDelete.image);
          if (mainImagePath) {
              pathsToDelete.push(mainImagePath);
          }

          if (projectToDelete.images && projectToDelete.images.length > 0) {
              projectToDelete.images.forEach((url: string) => {
                  const galleryPath = getPathFromUrl(url);
                  if (galleryPath) {
                      pathsToDelete.push(galleryPath);
                  }
              });
          }
      }

      // 3. Delete images from Supabase Storage if paths were found
      if (pathsToDelete.length > 0) {
        console.log(`Deleting ${pathsToDelete.length} images from storage:`, pathsToDelete);
        const { data: deleteData, error: storageError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove(pathsToDelete);

        if (storageError) {
          // Log the error but proceed to delete the DB record anyway
          console.error('Error deleting images from storage:', storageError);
          setError('Fehler beim Löschen einiger Bilder aus dem Storage. DB-Eintrag wird trotzdem gelöscht.');
        } else {
          console.log('Images successfully deleted from storage:', deleteData);
        }
      } else {
          console.log('No images found associated with the project in the DB or URL parsing failed.');
      }

      // 4. Delete the project record from the database
      console.log(`Deleting project record from DB: ${projectId}`);
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (deleteError) {
        // If the record was already gone, that's okay
        if (deleteError.code === 'PGRST116') {
            console.warn(`Project record ${projectId} already deleted.`);
        } else {
            throw new Error(`Failed to delete project record: ${deleteError.message}`);
        }
      }

      // 5. Refresh data after successful delete
      alert('Projekt und zugehörige Bilder gelöscht!');
      fetchProjectsAndMetrics();

    } catch (err) {
       console.error('Error during deletion process:', err);
       const errorMsg = err instanceof Error ? err.message : 'Unbekannter Fehler beim Löschen';
       setError(errorMsg);
       alert(`Fehler beim Löschen: ${errorMsg}`);
    } finally {
        setLoading(false); // Reset loading state
    }
  };

  return (
    <div className="dashboard-container">
      <h1>Admin Dashboard</h1>
      
      {/* Metrics Section */}
      <section className="metrics-section card-style">
        <h2>Übersicht</h2>
        {loading && <p>Lade Metriken...</p>}
        {!loading && error && <p style={{ color: 'red' }}>Fehler beim Laden der Metriken.</p>} 
        {!loading && !error && (
          <div className="metrics-grid">
            <div>
              <span className="metric-value">{metrics.totalProjects}</span>
              <span className="metric-label">Projekte Gesamt</span>
            </div>
            {/* Add more metrics here (e.g., by category) */}
          </div>
        )}
      </section>

      {/* Projects List Section */}
      <section className="projects-list-section card-style">
        <div className="section-header">
          <h2>Projekte verwalten</h2>
          <Link to="/add" className="button add-button">+ Neues Projekt</Link>
        </div>

        {loading && <p>Lade Projekte...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>} 
        
        {!loading && projects.length === 0 && !error && (
            <p>Noch keine Projekte vorhanden.</p>
        )}

        {!loading && projects.length > 0 && (
          <table className="projects-table">
            <thead>
              <tr>
                <th>Bild</th>
                <th>Titel</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(project => (
                <tr key={project.id}>
                  <td><img src={project.image || ''} alt={project.title} width="50" height="50" style={{ objectFit: 'cover' }}/></td>
                  <td>{project.title}</td>
                  <td className="action-buttons">
                    <Link to={`/edit/${project.id}`} className="button edit-button">Bearbeiten</Link>
                    <button onClick={() => handleDelete(project.id, project.title)} className="button delete-button">Löschen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default AdminDashboardPage; 