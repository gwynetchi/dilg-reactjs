import React from 'react';

interface LoadingOverlayProps {
  show: boolean;
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  show, 
  message = 'Loading...' 
}) => {
  if (!show) return null;

  return (
    <div 
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        zIndex: 9999 
      }}
    >
      <div className="card border-0 shadow-lg">
        <div className="card-body text-center p-4">
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="card-title mb-0">{message}</h5>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;