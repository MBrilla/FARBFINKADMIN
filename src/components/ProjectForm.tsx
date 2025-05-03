import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Import Supabase client
import { useNavigate } from 'react-router-dom';

// Define and export the form data type
export type ProjectFormData = {
  id?: string; // Optional: only present when editing
  title: string;
  description: string;
  kunde: string;
  datum: string;
  standort: string;
  flache: string;
  categories: string[];
  image: string | null; // URL of the main image
  images: string[] | null; // URLs of gallery images
  created_at?: string; // Supabase adds this automatically
  // Add any other fields fetched from the database if needed
};

// Define props for the component
interface ProjectFormProps {
  projectToEdit?: ProjectFormData | null;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ projectToEdit }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    description: '',
    kunde: '',
    datum: '',
    standort: '',
    flache: '',
    categories: [],
    image: null,
    images: [],
  });
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [galleryImageFiles, setGalleryImageFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [existingImageUrls, setExistingImageUrls] = useState<{ main: string | null; gallery: string[] }>({ main: null, gallery: [] });

  const isEditing = !!projectToEdit;

  // Populate form if editing
  useEffect(() => {
    if (isEditing && projectToEdit) {
      setFormData({
        ...projectToEdit, // Spread existing data
        categories: projectToEdit.categories || [], // Ensure categories is an array
        images: projectToEdit.images || [],       // Ensure images is an array
      });
      // Keep track of existing image URLs for potential deletion later
      setExistingImageUrls({
          main: projectToEdit.image || null,
          gallery: projectToEdit.images || []
      });
      // Note: File inputs cannot be programmatically set for security reasons.
      // User must re-select files if they want to change them.
      // We can display current images though.
    }
  }, [isEditing, projectToEdit]);


  // Define available categories (should match frontend)
  const availableCategories = [
    { id: 'energiestationen', label: 'ENERGIESTATIONEN' },
    { id: 'fassaden', label: 'FASSADEN' },
    { id: 'innenraume', label: 'INNENRÄUME' },
    { id: 'objekte', label: 'OBJEKTE' },
    { id: 'leinwande', label: 'LEINWÄNDE' }
  ];

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.currentTarget;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.currentTarget;
    setFormData(prev => ({
        ...prev,
        categories: checked
            ? [...prev.categories, value]
            : prev.categories.filter(cat => cat !== value)
    }));
  };

  const handleMainImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;
    if (files && files.length > 0) {
      setMainImageFile(files[0]);
    } else {
      setMainImageFile(null);
    }
  };

  const handleGalleryImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;
    setGalleryImageFiles(files); // Can be null if user clears selection
  };

  // --- File Upload and Deletion Logic ---
  const BUCKET_NAME = 'project-images';

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    console.log(`Uploading ${filePath} to ${BUCKET_NAME}...`);
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading file:', filePath, uploadError);
      throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
        console.error('Failed to get public URL for:', filePath);
        // Attempt to delete the orphaned file if URL generation fails
         await deleteFileByPath(filePath); // Use path for deletion
        throw new Error(`Failed to get public URL for ${file.name}`);
    }

    console.log(`Upload successful: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  };

  // Function to delete file by its storage path (filename)
  const deleteFileByPath = async (filePath: string): Promise<void> => {
      if (!filePath) return;
      console.log(`Attempting to delete ${filePath} from ${BUCKET_NAME}...`);
      try {
           const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);
           if (error) {
               console.error(`Error deleting file ${filePath}:`, error);
               // Don't throw, maybe log or notify, deletion failure shouldn't block update usually
           } else {
               console.log(`Successfully deleted file ${filePath}`);
           }
      } catch (err) {
           console.error(`Exception during file deletion ${filePath}:`, err);
      }
  };

  // Function to extract file path (name) from public URL
  const getPathFromUrl = (url: string | null): string | null => {
      if (!url) return null;
      try {
          const urlParts = new URL(url);
          // Assumes path is like /object/public/bucket-name/file-name.ext
          const pathSegments = urlParts.pathname.split('/');
          return pathSegments[pathSegments.length - 1] || null;
      } catch (e) {
          console.error("Error parsing URL for path:", url, e);
          return null; // Invalid URL?
      }
  };


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    // Validation: Check if main image exists OR a new one is provided when adding
    if (!isEditing && !mainImageFile) {
        setMessage('Hauptbild ist erforderlich.');
        return;
    }
    // If editing, main image is required only if there wasn't one before *and* no new one is selected
    if (isEditing && !existingImageUrls.main && !mainImageFile) {
        setMessage('Hauptbild ist erforderlich, da keins vorhanden war.');
        return;
    }


    setLoading(true);
    setMessage('');

    let finalMainImageUrl = formData.image; // Start with existing URL if editing
    const finalGalleryImageUrls = formData.images ? [...formData.images] : []; // Start with existing URLs

    try {
      // --- Handle Main Image ---
      if (mainImageFile) {
        console.log('New main image provided. Uploading...');
        // If editing and there was an old image, delete it first
        if (isEditing && existingImageUrls.main) {
            const oldPath = getPathFromUrl(existingImageUrls.main);
            if (oldPath) await deleteFileByPath(oldPath);
        }
        finalMainImageUrl = await uploadFile(mainImageFile);
      }

      // --- Handle Gallery Images ---
      if (galleryImageFiles && galleryImageFiles.length > 0) {
        console.log(`New gallery images provided (${galleryImageFiles.length}). Uploading...`);
        // If editing, decide whether to ADD to or REPLACE gallery.
        // Simple approach: Replace entire gallery if new files are added. Delete all old ones.
        // More complex: Allow adding/removing specific images (requires more UI).
        // Current implementation: REPLACES the gallery.
        if (isEditing && existingImageUrls.gallery.length > 0) {
             console.log('Replacing existing gallery. Deleting old images...');
             const oldPaths = existingImageUrls.gallery.map(getPathFromUrl).filter(p => p !== null) as string[];
             if (oldPaths.length > 0) {
                 await supabase.storage.from(BUCKET_NAME).remove(oldPaths);
                 console.log('Old gallery images deletion attempted.');
             }
             finalGalleryImageUrls.length = 0; // Clear the array for new URLs
        }

        for (let i = 0; i < galleryImageFiles.length; i++) {
          const file = galleryImageFiles[i];
          try {
              const url = await uploadFile(file);
              finalGalleryImageUrls.push(url);
          } catch (uploadError) {
              console.warn(`Skipping gallery image ${file.name} due to upload error:`, uploadError);
              setMessage(`Warnung: Fehler beim Hochladen von ${file.name}.`);
              // Decide whether to stop or continue
          }
        }
        console.log('New gallery uploads finished.');
      }

      // --- Prepare Data for DB ---
      const projectDataForDb = {
        ...formData, // Includes title, desc, etc.
        image: finalMainImageUrl, // Updated main image URL
        images: finalGalleryImageUrls // Updated gallery image URLs
      };

      // Remove id and created_at before insert/update if they exist in formData
      // (though state initialization prevents this, good practice)
      delete projectDataForDb.id;
      delete projectDataForDb.created_at;


      // --- Perform DB Operation ---
      if (isEditing && projectToEdit?.id) {
        console.log('Updating project in DB:', projectToEdit.id, projectDataForDb);
        const { error: updateError } = await supabase
          .from('projects')
          .update(projectDataForDb)
          .eq('id', projectToEdit.id);

        if (updateError) throw updateError;
        setMessage('Projekt erfolgreich aktualisiert!');

      } else {
        console.log('Inserting new project into DB:', projectDataForDb);
        const { error: insertError } = await supabase
          .from('projects')
          .insert([projectDataForDb]); // insert expects an array

        if (insertError) throw insertError;
        setMessage('Projekt erfolgreich hinzugefügt!');
        // Optionally reset form after adding
        setFormData({ title: '', description: '', kunde: '', datum: '', standort: '', flache: '', categories: [], image: null, images: [] });
        setMainImageFile(null);
        setGalleryImageFiles(null);
        setExistingImageUrls({ main: null, gallery: [] });
        // Consider resetting file input visually (requires ref or form.reset())
      }

      // Redirect after success
       setTimeout(() => navigate('/'), 1500); // Redirect back to dashboard after delay

    } catch (error) {
      console.error('Error submitting project:', error);
      setMessage(`Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      // TODO: More robust error handling, maybe attempt to clean up newly uploaded files on DB failure
    } finally {
      setLoading(false);
    }
  };

  return (
    // Use CSS classes for styling
    <form onSubmit={handleSubmit} className="project-form card-style">
      <h2>{isEditing ? 'Projekt bearbeiten' : 'Neues Projekt hinzufügen'}</h2>

      <div className="form-group">
        <label htmlFor="title">Titel:</label>
        <input type="text" id="title" name="title" value={formData.title} onChange={handleInputChange} required />
      </div>

      <div className="form-group">
        <label htmlFor="description">Beschreibung:</label>
        <textarea id="description" name="description" value={formData.description} onChange={handleInputChange} required />
      </div>

       <div className="form-group">
        <label>Kategorien:</label>
        <div className="checkbox-group">
            {availableCategories.map(cat => (
              <div key={cat.id} className="checkbox-item">
                <input
                  type="checkbox"
                  id={`cat-${cat.id}`}
                  value={cat.id}
                  checked={formData.categories.includes(cat.id)}
                  onChange={handleCategoryChange}
                />
                <label htmlFor={`cat-${cat.id}`}>{cat.label}</label>
              </div>
            ))}
        </div>
      </div>

       <div className="form-row">
           <div className="form-group">
             <label htmlFor="kunde">Kunde:</label>
             <input type="text" id="kunde" name="kunde" value={formData.kunde} onChange={handleInputChange} required />
           </div>
           <div className="form-group">
             <label htmlFor="datum">Datum:</label>
             <input type="text" id="datum" name="datum" value={formData.datum} onChange={handleInputChange} placeholder="z.B. 2024" required />
           </div>
       </div>

       <div className="form-row">
           <div className="form-group">
             <label htmlFor="standort">Standort:</label>
             <input type="text" id="standort" name="standort" value={formData.standort} onChange={handleInputChange} required />
           </div>
           <div className="form-group">
             <label htmlFor="flache">Fläche:</label>
             <input type="text" id="flache" name="flache" value={formData.flache} onChange={handleInputChange} placeholder="z.B. 100qm" required />
           </div>
       </div>

      <div className="form-group">
        <label htmlFor="mainImage">Hauptbild:</label>
        {isEditing && existingImageUrls.main && (
            <div className="image-preview">
                <img src={existingImageUrls.main} alt="Current main image" />
                <span>Aktuelles Bild. Neues auswählen zum Ersetzen.</span>
            </div>
        )}
        <input type="file" id="mainImage" onChange={handleMainImageChange} accept="image/*" required={!isEditing || !existingImageUrls.main} />
      </div>

       <div className="form-group">
        <label htmlFor="galleryImages">Galeriebilder:</label>
        {isEditing && existingImageUrls.gallery.length > 0 && (
            <div className="image-preview gallery-preview">
                {existingImageUrls.gallery.map((url, index) => (
                   <img key={index} src={url} alt={`Gallery image ${index + 1}`} />
                ))}
                <br/><span>Aktuelle Galerie. Neue auswählen zum Ersetzen der gesamten Galerie.</span>
            </div>
        )}
        <input type="file" id="galleryImages" onChange={handleGalleryImagesChange} accept="image/*" multiple />
        {isEditing && <small>Das Auswählen neuer Galeriebilder ersetzt die gesamte bestehende Galerie.</small>}
      </div>

      <button type="submit" disabled={loading} className="button submit-button">
        {loading ? 'Speichern...' : (isEditing ? 'Änderungen speichern' : 'Projekt hinzufügen')}
      </button>

      {message && <p className={`message ${message.startsWith('Fehler') || message.startsWith('Warnung') ? 'error' : 'success'}`}>{message}</p>}
    </form>
  );
};

export default ProjectForm; 