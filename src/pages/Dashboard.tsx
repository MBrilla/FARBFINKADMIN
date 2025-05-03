import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { Project, CATEGORIES } from '../lib/types';
import { 
  PencilIcon, 
  TrashIcon, 
  PlusIcon,
  ArrowPathIcon,
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [imageCount, setImageCount] = useState(0);

  // Fetch projects from Supabase
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching projects...');
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('Fetch response:', { data, error });
      
      if (error) throw error;
      
      // Format arrays just in case
      const formattedData = data?.map(project => ({
        ...project,
        categories: Array.isArray(project.categories) ? project.categories : [],
        images: Array.isArray(project.images) ? project.images : []
      })) || [];
      
      console.log('Formatted data:', formattedData);
      
      setProjects(formattedData);
      setProjectCount(formattedData.length);
      
      // Calculate total images
      let totalImages = 0;
      formattedData.forEach((project: Project) => {
        if (project.image) totalImages++;
        if (project.images) totalImages += project.images.length;
      });
      
      setImageCount(totalImages);
      
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
      toast.error('Fehler beim Laden der Projekte');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Helper to get category label
  const getCategoryLabel = (categoryId: string) => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    return category ? category.label : categoryId;
  };

  // Handle project deletion
  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Sicher, dass du das Projekt "${title}" löschen möchtest?`)) {
      return;
    }

    try {
      setLoading(true);
      
      // First, find the project to get image URLs
      const project = projects.find(p => p.id === id);
      if (!project) throw new Error('Projekt nicht gefunden');
      
      // Extract image paths from URLs for deletion
      const imagesToDelete = [];
      
      if (project.image) {
        try {
          const imageUrl = new URL(project.image);
          const imagePath = imageUrl.pathname.split('/').pop();
          if (imagePath) imagesToDelete.push(imagePath);
        } catch (e) {
          console.warn('Failed to parse main image URL:', e);
        }
      }
      
      if (project.images?.length) {
        for (const imageUrl of project.images) {
          try {
            const url = new URL(imageUrl);
            const imagePath = url.pathname.split('/').pop();
            if (imagePath) imagesToDelete.push(imagePath);
          } catch (e) {
            console.warn('Failed to parse gallery image URL:', e);
          }
        }
      }
      
      // Delete project from database using admin client
      const { error: deleteError } = await supabaseAdmin
        .from('projects')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      // Try to delete images from storage
      if (imagesToDelete.length > 0) {
        const { error: storageError } = await supabaseAdmin.storage
          .from('project-images')
          .remove(imagesToDelete);
          
        if (storageError) {
          console.warn('Failed to delete some image files:', storageError);
        }
      }
      
      // Update UI
      setProjects(projects.filter(p => p.id !== id));
      setProjectCount(prev => prev - 1);
      setImageCount(prev => prev - (1 + (project.images?.length || 0)));
      
      toast.success('Projekt erfolgreich gelöscht');
      
    } catch (err) {
      console.error('Error deleting project:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler beim Löschen';
      toast.error(`Fehler: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Dashboard header */}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="flex gap-2">
          <button 
            onClick={fetchProjects} 
            className="btn btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
          <Link to="/add" className="btn btn-primary flex items-center gap-2">
            <PlusIcon className="h-5 w-5" />
            Neues Projekt
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Projekte</div>
          <div className="mt-2 text-3xl font-bold">{projectCount}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Bilder gesamt</div>
          <div className="mt-2 text-3xl font-bold">{imageCount}</div>
        </div>
      </div>
      
      {/* Projects section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Projekte verwalten</h2>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <ArrowPathIcon className="h-8 w-8 text-blue-500 animate-spin" />
            <span className="ml-2 text-gray-600">Lade Projekte...</span>
          </div>
        )}
        
        {/* Error state */}
        {error && (
          <div className="flex items-center justify-center py-12 px-6">
            <ExclamationCircleIcon className="h-6 w-6 text-red-500 mr-2" />
            <span className="text-red-500">{error}</span>
          </div>
        )}
        
        {/* Empty state */}
        {!loading && projects.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <ExclamationCircleIcon className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 mb-6">Noch keine Projekte vorhanden.</p>
            <Link to="/add" className="btn btn-primary flex items-center gap-2">
              <PlusIcon className="h-5 w-5" />
              Neues Projekt hinzufügen
            </Link>
          </div>
        )}

        {/* Projects table */}
        {!loading && projects.length > 0 && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                    Bild
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Titel
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Kategorien
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Datum
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map(project => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {project.image ? (
                        <img 
                          src={project.image} 
                          alt={project.title} 
                          className="h-12 w-12 rounded-md object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-md bg-gray-200 flex items-center justify-center">
                          <span className="text-xs text-gray-500">Kein Bild</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{project.title}</div>
                      <div className="text-sm text-gray-500 hidden md:block">
                        {project.images?.length || 0} weitere Bilder
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {project.categories?.map(cat => (
                          <span 
                            key={cat} 
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {getCategoryLabel(cat)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                      {formatDate(project.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link 
                          to={`/edit/${project.id}`} 
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded"
                          title="Projekt bearbeiten"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(project.id, project.title)}
                          className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded"
                          title="Projekt löschen"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 