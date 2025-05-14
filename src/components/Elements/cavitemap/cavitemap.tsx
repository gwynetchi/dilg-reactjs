import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, Marker, Popup, GeoJSON } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db } from '../../../firebase';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { normalizeCityName } from '../../Elements/cavitemap/types';

interface MayorData {
  name: string;
  bio: string;
  image: string;
  termStart: string;
  termEnd: string;
  politicalParty: string;
}

interface CityData {
  name: string;
  image: string;
  description: string;
  coordinates: LatLngExpression;
  mayor?: MayorData;
}

interface CaviteMapProps {
  onCityClick?: (city: CityData) => void;
}

const CaviteMap: React.FC<CaviteMapProps> = ({ onCityClick }) => {
  const [geoData, setGeoData] = useState<any>(null);
  const [hoveredCity, setHoveredCity] = useState<CityData | null>(null);
  const [activeCity, setActiveCity] = useState<CityData | null>(null);
  const [cities, setCities] = useState<Record<string, CityData>>({});
  const [loading, setLoading] = useState(true);
  const [hoveredCityName, setHoveredCityName] = useState<string | null>(null);
  const mapRef = useRef<any>(null);
  const unsubscribeRef = useRef<(() => void)[]>([]);
  const displayedCity = activeCity || hoveredCity;
  const caviteCenter: LatLngExpression = [14.2814, 120.8640];

  useEffect(() => {
    setLoading(true);
    
    const unsubscribeCities = onSnapshot(collection(db, 'cities'), (snapshot) => {
      const updatedCities: Record<string, CityData> = {};
      
      snapshot.forEach((doc) => {
        updatedCities[doc.id] = {
          ...doc.data() as CityData,
          name: doc.id
        };
      });

      setCities(prev => ({ ...prev, ...updatedCities }));
      setLoading(false);
    });

    const unsubscribeMayors = onSnapshot(collection(db, 'mayors'), (snapshot) => {
      setCities(prev => {
        const newCities = { ...prev };
        snapshot.forEach((doc) => {
          const normalizedName = normalizeCityName(doc.id);
          if (newCities[normalizedName]) {
            newCities[normalizedName] = {
              ...newCities[normalizedName],
              mayor: doc.data() as MayorData
            };
          }
        });
        return newCities;
      });
    });

    unsubscribeRef.current = [unsubscribeCities, unsubscribeMayors];

    return () => {
      unsubscribeRef.current.forEach(unsub => unsub());
    };
  }, []);


  useEffect(() => {
  import('../../../data/maps/cavite.json').then((data) => {
    setGeoData(data);
  });
}, []);

  useEffect(() => {
    if (!mapRef.current) return;
    
    const mapContainer = mapRef.current.getContainer();
    mapContainer.addEventListener('mouseleave', handleMapMouseOut);
    
    return () => {
      mapContainer.removeEventListener('mouseleave', handleMapMouseOut);
    };
  }, [mapRef.current]);

  const getCityColor = (name: string) => {
    const colors: { [key: string]: string } = {
      "City of Trece Martires": "#e6194b",
      "City of Dasmariñas": "#3cb44b",
      "City of Imus": "#ffe119",
      "City of Bacoor": "#4363d8",
      "City of Cavite": "#f58231",
      "City of General Trias": "#911eb4",
      "City of Tagaytay": "#46f0f0",
      "City of Carmona": "#000075",
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
      "Rosario": "#808080",
      "Noveleta": "#a9a9a9",
      "Kawit": "#ff69b4"
    };
    return colors[name] || '#cccccc';
  };

  const handleMouseOver = useCallback((cityName: string) => {
    if (activeCity) return;
    
    const normalizedName = normalizeCityName(cityName);
    const city = cities[normalizedName];
    if (city) {
      setHoveredCityName(cityName);
      setHoveredCity(city);
    }
  }, [activeCity, cities]);

  const handleMouseOut = useCallback(() => {
    setHoveredCityName(null);
    setHoveredCity(null);
  }, []);

  const handleClick = useCallback(async (cityName: string) => {
    setHoveredCityName(null);
    setHoveredCity(null);
    const normalizedName = normalizeCityName(cityName);
    const city = cities[normalizedName];

    if (!city) {
      const emptyCity: CityData = {
        name: cityName,
        image: '',
        description: 'No information available',
        coordinates: [0, 0]
      };
      setActiveCity(emptyCity);
      onCityClick?.(emptyCity);
      return;
    }

    if (!city.mayor) {
      const unsub = onSnapshot(doc(db, 'mayors', cityName), (mayorDoc) => {
        const updatedCity = {
          ...city,
          mayor: mayorDoc.exists() ? mayorDoc.data() as MayorData : undefined
        };
        setActiveCity(updatedCity);
        setCities(prev => ({ ...prev, [normalizedName]: updatedCity }));
        onCityClick?.(updatedCity);
      });
      
      unsubscribeRef.current.push(unsub);
    } else {
      setActiveCity(city);
      onCityClick?.(city);
    }
  }, [cities, onCityClick]);

  const handleMapMouseOut = useCallback(() => {
    setHoveredCityName(null);
    setHoveredCity(null);
  }, []);

  if (loading) {
    return <div className="w-full h-full flex items-center justify-center">Loading map...</div>;
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={caviteCenter}
        zoom={10.4}
        zoomControl={false}
        style={{ height: '600px', width: '100%' }}
        className="rounded-lg shadow-md"
        ref={mapRef}
      >
        {geoData && (
          <GeoJSON
            data={geoData}
            style={(feature: any) => {
              const name = feature.properties?.adm3_en;
              const color = getCityColor(name);
              return {
                color: '#000',
                weight: 1,
                fillColor: color,
                fillOpacity: hoveredCityName === name ? 0.9 : 0.7,
              };
            }}
            onEachFeature={(feature: any, layer: any) => {
              const name = feature.properties?.adm3_en || 'Unknown';
              layer.on({
                mouseover: () => {
                  handleMouseOver(name);
                  layer.bindTooltip(name, {
                    permanent: false,
                    direction: 'top',
                    className: 'city-tooltip'
                  }).openTooltip();
                },
                mouseout: () => {
                  handleMouseOut();
                  layer.closeTooltip();
                },
                click: () => handleClick(name)
              });
              layer.bindPopup(`<b>${name}</b><br>Click for more details`);
            }}
          />
        )}

        {Object.values(cities).map((city) => (
          <Marker 
            key={city.name} 
            position={city.coordinates}
            eventHandlers={{
              mouseover: () => handleMouseOver(city.name),
              mouseout: handleMouseOut,
              click: () => handleClick(city.name)
            }}
          >
            <Popup>
              <div className="w-40">
                <h3 className="font-bold">{city.name}</h3>
                <p className="text-sm">{city.description?.substring(0, 60) || 'No description available'}...</p>
                {city.mayor && (
                  <p className="text-xs mt-1 text-blue-600">Mayor: {city.mayor.name}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Unified Side Panel */}
      {displayedCity && (
        <div className={`absolute right-4 top-4 w-80 bg-white rounded-lg shadow-xl overflow-hidden z-50 ${
          activeCity ? 'border-2 border-blue-400' : 'border border-gray-200'
        }`}>
          {displayedCity.image && displayedCity.image !== '' ? (
            <img 
              src={displayedCity.image} 
              alt={displayedCity.name} 
              className="w-full h-48 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/cities/default.jpg';
              }}
            />
          ) : (
            <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
              <span className="text-gray-400">No image available</span>
            </div>
          )}
          <div className="p-4">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-lg mb-1 text-gray-800">
                {displayedCity.name}
              </h3>
              {activeCity && (
                <button 
                  onClick={() => setActiveCity(null)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Close city details"
                >
                  ✕
                </button>
              )}
            </div>
            
            <p className="text-gray-600 text-sm mb-3">
              {displayedCity.description || 'No information available'}
            </p>

            {displayedCity.mayor ? (
              <div className="mt-3 pt-3 border-t">
                <h4 className="font-semibold mb-2">Mayor's Information</h4>
                <div className="flex items-center space-x-3">
                  {displayedCity.mayor.image && (
                    <img 
                      src={displayedCity.mayor.image} 
                      alt={displayedCity.mayor.name} 
                      className="w-12 h-12 rounded-full object-cover border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/default-mayor.png';
                      }}
                    />
                  )}
                  <div>
                    <p className="font-medium">{displayedCity.mayor.name}</p>
                    <p className="text-sm text-gray-600">
                      {displayedCity.mayor.politicalParty}
                    </p>
                    <p className="text-xs text-gray-500">
                      Term: {displayedCity.mayor.termStart} to {displayedCity.mayor.termEnd}
                    </p>
                  </div>
                </div>
                {displayedCity.mayor.bio && (
                  <p className="mt-2 text-sm text-gray-600">
                    {displayedCity.mayor.bio.substring(0, 100)}...
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-3 pt-3 border-t">
                No mayor information available
              </p>
            )}

            <div className="flex justify-between text-xs text-gray-500 mt-3 pt-3 border-t">
              <span>Lat: {(displayedCity.coordinates as [number, number])[0].toFixed(4)}</span>
              <span>Lng: {(displayedCity.coordinates as [number, number])[1].toFixed(4)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaviteMap;