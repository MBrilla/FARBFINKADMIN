import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useDropzone } from 'react-dropzone';
import { XMarkIcon, ArrowUpTrayIcon, PhotoIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';

// Project data type
interface ProjectData {
  id?: string;
  title: string;
  description: string;
  kunde: string;
  datum: string;
  standort: string;
  flache: string;
  categories: string[];
  image: string | null;
  images: string[] | null;
}

const ProjectForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  
  // Form state
  const [formData, setFormData] = useState<ProjectData>({
    title: '',
    description: '',
    kunde: '',
    datum: '',
    standort: '',
    flache: '',
    categories: [],
    image: null,
    images: []
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [fetchingProject, setFetchingProject] = useState(isEditing);
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [galleryImageFiles, setGalleryImageFiles] = useState<File[]>([]);
  const [galleryImagePreviews, setGalleryImagePreviews] = useState<string[]>([]);
  
  // Available categories
  const availableCategories = [
    { id: 'energiestationen', label: 'ENERGIESTATIONEN' },
    { id: 'fassaden', label: 'FASSADEN' },
    { id: 'innenraume', label: 'INNENRÄUME' },
    { id: 'objekte', label: 'OBJEKTE' },
    { id: 'leinwande', label: 'LEINWÄNDE' }
  ];
  
  // Fetch project data if editing
  useEffect(() => {
    const fetchProject = async () => {
      if (!id) return;
      
      try {
        setFetchingProject(true);
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        if (!data) throw new Error('Project not found');
        
        setFormData({
          id: data.id,
          title: data.title || '',
          description: data.description || '',
          kunde: data.kunde || '',
          datum: data.datum || '',
          standort: data.standort || '',
          flache: data.flache || '',
          categories: data.categories || [],
          image: data.image,
          images: data.images || []
        });
        
      } catch (err) {
        console.error('Error fetching project:', err);
        toast.error('Fehler beim Laden des Projekts');
        navigate('/', { replace: true });
      } finally {
        setFetchingProject(false);
      }
    };
    
    if (isEditing) {
      fetchProject();
    }
  }, [id, isEditing, navigate]);
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target as HTMLInputElement | HTMLTextAreaElement;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle category checkbox changes
  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      categories: checked
        ? [...prev.categories, value]
        : prev.categories.filter(cat => cat !== value)
    }));
  };
  
  // Main image dropzone
  const onMainImageDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setMainImageFile(file);
      
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setMainImagePreview(previewUrl);
    }
  }, []);
  
  const { getRootProps: getMainImageRootProps, getInputProps: getMainImageInputProps } = useDropzone({
    onDrop: onMainImageDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: 1
  });
  
  // Gallery images dropzone
  const onGalleryImagesDrop = useCallback((acceptedFiles: File[]) => {
    setGalleryImageFiles(prev => [...prev, ...acceptedFiles]);
    
    // Create previews
    const newPreviews = acceptedFiles.map(file => URL.createObjectURL(file));
    setGalleryImagePreviews(prev => [...prev, ...newPreviews]);
  }, []);
  
  const { getRootProps: getGalleryImagesRootProps, getInputProps: getGalleryImagesInputProps } = useDropzone({
    onDrop: onGalleryImagesDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    }
  });
  
  // Remove main image preview
  const removeMainImagePreview = () => {
    if (mainImagePreview) {
      URL.revokeObjectURL(mainImagePreview);
      setMainImagePreview(null);
      setMainImageFile(null);
    }
  };
  
  // Remove gallery image preview
  const removeGalleryPreview = (index: number) => {
    const newPreviews = [...galleryImagePreviews];
    const newFiles = [...galleryImageFiles];
    
    // Revoke object URL to avoid memory leaks
    URL.revokeObjectURL(newPreviews[index]);
    
    // Remove from arrays
    newPreviews.splice(index, 1);
    newFiles.splice(index, 1);
    
    setGalleryImagePreviews(newPreviews);
    setGalleryImageFiles(newFiles);
  };
  
  // Upload image to storage
  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = fileName;
    
    // Upload file
    const { error: uploadError } = await supabase.storage
      .from('project-images')
      .upload(filePath, file);
      
    if (uploadError) {
      throw new Error(`Error uploading file: ${uploadError.message}`);
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('project-images')
      .getPublicUrl(filePath);
      
    if (!urlData || !urlData.publicUrl) {
      throw new Error('Failed to get image URL');
    }
    
    return urlData.publicUrl;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      toast.error('Titel ist erforderlich');
      return;
    }
    
    if (!formData.image && !mainImageFile) {
      toast.error('Hauptbild ist erforderlich');
      return;
    }
    
    setLoading(true);
    
    try {
      // Handle image uploads
      let finalImageUrl = formData.image;
      const finalGalleryUrls = [...(formData.images || [])];
      
      // Upload main image if provided
      if (mainImageFile) {
        finalImageUrl = await uploadImage(mainImageFile);
      }
      
      // Upload gallery images if provided
      if (galleryImageFiles.length > 0) {
        const newGalleryUrls = await Promise.all(
          galleryImageFiles.map(file => uploadImage(file))
        );
        finalGalleryUrls.push(...newGalleryUrls);
      }
      
      // Prepare data for save
      const dataToSave = {
        ...formData,
        image: finalImageUrl,
        images: finalGalleryUrls
      };
      
      // Delete ID if present (will be added by Supabase on insert)
      if (!isEditing) {
        delete dataToSave.id;
      }
      
      // Insert or update using admin client
      let error;
      
      if (isEditing && formData.id) {
        const { error: updateError } = await supabaseAdmin
          .from('projects')
          .update(dataToSave)
          .eq('id', formData.id);
          
        error = updateError;
      } else {
        const { error: insertError } = await supabaseAdmin
          .from('projects')
          .insert([dataToSave]);
          
        error = insertError;
      }
      
      if (error) throw error;
      
      // Success
      toast.success(isEditing ? 'Projekt aktualisiert' : 'Projekt erstellt');
      navigate('/');
      
    } catch (err) {
      console.error('Error saving project:', err);
      toast.error(`Fehler: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (mainImagePreview) {
        URL.revokeObjectURL(mainImagePreview);
      }
      galleryImagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [mainImagePreview, galleryImagePreviews]);
  
  if (fetchingProject) {
    return (
      <div className="flex justify-center items-center py-12">
        <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="ml-2">Lade Projekt...</span>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-6">
        <Link 
          to="/"
          className="flex items-center text-primary-600 hover:text-primary-800 font-medium"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Zurück zum Dashboard
        </Link>
        <h1 className="text-2xl font-bold mt-4">
          {isEditing ? 'Projekt bearbeiten' : 'Neues Projekt erstellen'}
        </h1>
      </div>
      
      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-medium text-gray-900 mb-4">Grundinformationen</h2>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="title" className="form-label">Titel</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="form-label">Beschreibung</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="form-input"
                />
              </div>
              
              <div>
                <label className="form-label">Kategorien</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                  {availableCategories.map(cat => (
                    <div key={cat.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`cat-${cat.id}`}
                        value={cat.id}
                        checked={formData.categories.includes(cat.id)}
                        onChange={handleCategoryChange}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`cat-${cat.id}`} className="ml-2 text-sm text-gray-700">
                        {cat.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Project Details */}
          <div>
            <h2 className="text-xl font-medium text-gray-900 mb-4">Projektdetails</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="kunde" className="form-label">Kunde</label>
                <input
                  type="text"
                  id="kunde"
                  name="kunde"
                  value={formData.kunde}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
              
              <div>
                <label htmlFor="datum" className="form-label">Datum</label>
                <input
                  type="text"
                  id="datum"
                  name="datum"
                  value={formData.datum}
                  onChange={handleInputChange}
                  placeholder="z.B. 2024"
                  className="form-input"
                />
              </div>
              
              <div>
                <label htmlFor="standort" className="form-label">Standort</label>
                <input
                  type="text"
                  id="standort"
                  name="standort"
                  value={formData.standort}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
              
              <div>
                <label htmlFor="flache" className="form-label">Fläche</label>
                <input
                  type="text"
                  id="flache"
                  name="flache"
                  value={formData.flache}
                  onChange={handleInputChange}
                  placeholder="z.B. 100qm"
                  className="form-input"
                />
              </div>
            </div>
          </div>
          
          {/* Images */}
          <div>
            <h2 className="text-xl font-medium text-gray-900 mb-4">Bilder</h2>
            
            {/* Main Image */}
            <div className="mb-6">
              <label className="form-label">
                Hauptbild {isEditing ? '(Neues auswählen zum Ersetzen)' : ''}
              </label>
              
              {/* Show existing main image if editing */}
              {formData.image && !mainImagePreview && (
                <div className="mt-2 mb-4">
                  <div className="relative inline-block">
                    <img 
                      src={formData.image} 
                      alt="Current main" 
                      className="h-40 w-auto object-cover rounded-md border border-gray-300" 
                    />
                    <span className="mt-2 text-sm text-gray-500 block">Aktuelles Hauptbild</span>
                  </div>
                </div>
              )}
              
              {/* Show main image preview */}
              {mainImagePreview && (
                <div className="mt-2 mb-4">
                  <div className="relative inline-block">
                    <img 
                      src={mainImagePreview} 
                      alt="Main preview" 
                      className="h-40 w-auto object-cover rounded-md border border-gray-300" 
                    />
                    <button
                      type="button"
                      onClick={removeMainImagePreview}
                      className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Main image dropzone */}
              <div
                {...getMainImageRootProps() as React.HTMLAttributes<HTMLDivElement>}
                className={classNames(
                  "mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md cursor-pointer",
                  {
                    "border-gray-300 hover:border-primary-500": true,
                    "border-primary-500 bg-primary-50": mainImagePreview
                  }
                )}
              >
                <div className="space-y-1 text-center">
                  <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <input 
                      {...getMainImageInputProps()}
                      required={!formData.image && !mainImagePreview} 
                    />
                    <p>Bild hierher ziehen oder <span className="text-primary-600 font-medium">durchsuchen</span></p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF bis zu 10MB</p>
                </div>
              </div>
            </div>
            
            {/* Gallery Images */}
            <div>
              <label className="form-label">
                Galeriebilder {isEditing ? '(Neue auswählen zum Hinzufügen)' : ''}
              </label>
              
              {/* Show existing gallery images */}
              {formData.images && formData.images.length > 0 && (
                <div className="mt-2 mb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {formData.images.map((url, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={url} 
                        alt={`Gallery ${index + 1}`} 
                        className="h-24 w-full object-cover rounded-md border border-gray-300" 
                      />
                    </div>
                  ))}
                  <div className="col-span-full mt-2 text-sm text-gray-500">
                    Bestehende Galerie ({formData.images.length} Bilder)
                  </div>
                </div>
              )}
              
              {/* New gallery images preview */}
              {galleryImagePreviews.length > 0 && (
                <div className="mt-2 mb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {galleryImagePreviews.map((url, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={url} 
                        alt={`Preview ${index + 1}`} 
                        className="h-24 w-full object-cover rounded-md border border-gray-300" 
                      />
                      <button
                        type="button"
                        onClick={() => removeGalleryPreview(index)}
                        className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                  <div className="col-span-full mt-2 text-sm text-gray-500">
                    {galleryImageFiles.length} neue Bilder ausgewählt
                  </div>
                </div>
              )}
              
              {/* Gallery images dropzone */}
              <div
                {...getGalleryImagesRootProps() as React.HTMLAttributes<HTMLDivElement>}
                className={classNames(
                  "mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md cursor-pointer",
                  {
                    "border-gray-300 hover:border-primary-500": true,
                    "border-primary-500 bg-primary-50": galleryImagePreviews.length > 0
                  }
                )}
              >
                <div className="space-y-1 text-center">
                  <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <input {...getGalleryImagesInputProps()} />
                    <p>Bilder hierher ziehen oder <span className="text-primary-600 font-medium">durchsuchen</span></p>
                  </div>
                  <p className="text-xs text-gray-500">Mehrere Bilder auswählen möglich</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Form actions */}
          <div className="pt-5">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn btn-secondary mr-3"
                disabled={loading}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? 'Wird gespeichert...' : (isEditing ? 'Änderungen speichern' : 'Projekt hinzufügen')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectForm; 