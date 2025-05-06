import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, Tooltip } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

const CaviteMap: React.FC = () => {
  const [geoData, setGeoData] = useState<any>(null);
  const [tooltipContent, setTooltipContent] = useState<string>('');

  const caviteCenter: LatLngExpression = [14.2814, 120.8640]; // Cavite Coordinates

  useEffect(() => {
    import('../../data/maps/cavite.json').then((data) => {
      setGeoData(data);
    });
  }, []);

  const getCityColor = (name: string) => {
    const colors: { [key: string]: string } = {
      "City of Trece Martires": "#e6194b",
      "City of Dasmariñas": "#3cb44b",
      "City of Imus": "#ffe119",
      "City of Bacoor": "#4363d8",
      "City of Cavite": "#f58231",
      "City of General Trias": "#911eb4",
      "City of Tagaytay": "#46f0f0",
      "Tanza": "#f032e6",
      "Silang": "#bcf60c",
      "Naic": "#fabebe",
      "Indang": "#008080",
      "Ternate": "#e6beff",
      "Alfonso": "#9a6324",
      "Maragondon": "#fffac8",
      "Magallanes": "#800000",
      "Amadeo": "#aaffc3",
      "General Emilio Aguinaldo": "#808000",
      "Mendez": "#ffd8b1",
      "Carmona": "#000075",
      "Rosario": "#808080",
      "Noveleta": "#a9a9a9",
      "Kawit": "#ff69b4"
    };
    return colors[name] || '#cccccc'; // Default if not matched
  };

  return (
    <div className="relative">
      <MapContainer
        center={caviteCenter}
        zoom={10.4}
        zoomControl={false} // 👈 this disables the zoom in/out buttons
        style={{ height: '500px', width: '800px' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

<Marker position={[14.2814, 120.8640]}>
  <Popup>City of Trece Martires</Popup>
</Marker>


        {geoData && (
          <GeoJSON
            data={geoData}
            style={(feature: any) => {
              const name = feature.properties?.adm3_en; // Using 'adm3_en' for city name
              const color = getCityColor(name);
              return {
                color: '#000',
                weight: 1,
                fillColor: color,
                fillOpacity: 0.7
              };
            }}
            onEachFeature={(feature: any, layer: any) => {
              const name = feature.properties?.adm3_en || 'Unknown';
              layer.on('mouseover', () => setTooltipContent(name));
              layer.on('mouseout', () => setTooltipContent(''));
              layer.bindPopup(name);
              layer.bindTooltip(feature.properties?.adm3_en, { permanent: false, direction: 'center' });
            }}
          />
        )}
      </MapContainer>

      {tooltipContent && (
        <div className="absolute left-0 top-0 mt-2 p-2 bg-white border rounded shadow text-sm z-50">
          {tooltipContent}
        </div>
      )}
    </div>
  );
};

export default CaviteMap;
