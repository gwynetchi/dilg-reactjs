// ZoomControls.tsx
import React from "react";

interface ZoomControlsProps {
  zoomIn: () => void;
  zoomOut: () => void;
  resetTransform: () => void;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({ zoomIn, zoomOut, resetTransform }) => {
  return (
    <div className="position-absolute top-0 start-0 m-4 d-flex gap-2 z-3">
      <button
        onClick={(event) => {
          zoomIn();
          event.preventDefault(); // Prevent default action if needed
        }}
        className="btn btn-light shadow-sm"
      >
        ➕ Zoom In
      </button>

      <button
        onClick={(event) => {
          zoomOut();
          event.preventDefault();
        }}
        className="btn btn-light shadow-sm"
      >
        ➖ Zoom Out
      </button>

      <button
        onClick={(event) => {
          resetTransform();
          event.preventDefault();
        }}
        className="btn btn-light shadow-sm"
      >
        🔄 Reset
      </button>
      
    </div>
  );
};

export default ZoomControls;
