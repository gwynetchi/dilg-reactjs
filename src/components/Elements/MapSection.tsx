// src/components/MapSection.tsx
import React from 'react';
import CaviteMap from './cavitemap'; // Import your existing CaviteMap component

const MapSection: React.FC = () => {
  return (
    <section className="p-6 bg-gray-100 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-center mb-4">Cavite Municipalities Map</h2>
      <div className="flex justify-center items-center">
        <CaviteMap />
      </div>
    </section>
  );
};

export default MapSection;
