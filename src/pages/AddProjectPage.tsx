import React from 'react';
import ProjectForm from '../components/ProjectForm'; // Updated import
import '../app.css';

const AddProjectPage: React.FC = () => {
  return (
    <div>
      {/* Optionally add a header or back button */}
       <h1 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Neues Projekt hinzufügen</h1>
      <ProjectForm />
    </div>
  );
};

export default AddProjectPage; 