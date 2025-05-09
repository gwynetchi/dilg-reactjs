// src/components/MapSection.tsx
import React from 'react';
import CaviteMap from './cavitemap'; // Make sure the import path is correct

const MapSection: React.FC = () => {
  return (
    <section className="py-8 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Cavite Municipalities Map</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore the cities and municipalities of Cavite. Hover over areas to see information and click for details.
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg overflow-hidden p-2">
          <div className="aspect-w-16 aspect-h-9 w-full">
            <CaviteMap />
          </div>
        </div>
        
        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Click on any municipality or marker to view detailed information</p>
        </div>
      </div>
    </section>
  );
};

export default MapSection;