import React, { useState, useEffect } from 'react';
import { MapContainer, Marker, Popup, GeoJSON } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db } from '../../../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
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

  const caviteCenter: LatLngExpression = [14.2814, 120.8640];

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const [citiesSnapshot, mayorsSnapshot] = await Promise.all([
          getDocs(collection(db, 'cities')),
          getDocs(collection(db, 'mayors'))
        ]);

        const citiesData: Record<string, CityData> = {};
        
        // Process cities
        citiesSnapshot.forEach((doc) => {
          const cityData = doc.data() as CityData;
          citiesData[doc.id] = {
            ...cityData,
            name: doc.id // Preserve the original city name from document ID
          };
        });

        // Process mayors and merge with cities
        mayorsSnapshot.forEach((doc) => {
          const cityName = doc.id;
          const normalizedName = normalizeCityName(cityName);
          if (citiesData[normalizedName]) {
            citiesData[normalizedName].mayor = doc.data() as MayorData;
          }
        });

        setCities(citiesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCities();
  }, []);

  useEffect(() => {
    import('../../../data/maps/cavite.json').then((data) => {
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

  const handleMouseOver = (cityName: string) => {
    const normalizedName = normalizeCityName(cityName);
    const city = cities[normalizedName];
    if (city) {
      setHoveredCity(city);
    }
  };

  const handleMouseOut = () => {
    setHoveredCity(null);
  };

  const handleClick = async (cityName: string) => {
    const normalizedName = normalizeCityName(cityName);
    const city = cities[normalizedName];

    if (!city) return;

    // Fetch mayor data if not already present
    if (!city.mayor) {
      try {
        const mayorDoc = await getDoc(doc(db, 'mayors', cityName));
        if (mayorDoc.exists()) {
          const updatedCities = {
            ...cities,
            [normalizedName]: {
              ...city,
              mayor: mayorDoc.data() as MayorData
            }
          };
          setCities(updatedCities);
          setActiveCity(updatedCities[normalizedName]);
        }
      } catch (error) {
        console.error('Error fetching mayor:', error);
      }
    } else {
      setActiveCity(city);
    }

    if (onCityClick) {
      onCityClick(city);
    }
  };

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
                fillOpacity: hoveredCity?.name === name ? 0.9 : 0.7,
              };
            }}
            onEachFeature={(feature: any, layer: any) => {
              const name = feature.properties?.adm3_en || 'Unknown';
              layer.on({
                mouseover: () => handleMouseOver(name),
                mouseout: handleMouseOut,
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

      {/* Hover Card */}
      {hoveredCity && (
        <div className="absolute right-4 top-4 w-72 bg-white rounded-lg shadow-xl overflow-hidden z-50 transition-all duration-200 transform hover:scale-105">
          {hoveredCity.image && (
            <img 
              src={hoveredCity.image} 
              alt={hoveredCity.name} 
              className="w-full h-48 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/cities/default.jpg';
              }}
            />
          )}  
          <div className="p-4">
            <h3 className="font-bold text-lg mb-1 text-gray-800">{hoveredCity.name}</h3>
            <p className="text-gray-600 text-sm">
              {hoveredCity.description?.substring(0, 100) || 'No description available'}...
            </p>
            {hoveredCity.mayor && (
              <div className="mt-2 pt-2 border-t">
                <p className="text-sm font-medium">Mayor: {hoveredCity.mayor.name}</p>
                <p className="text-xs text-gray-500">{hoveredCity.mayor.politicalParty}</p>
                <p className="text-xs text-gray-500">
                  Term: {hoveredCity.mayor.termStart} to {hoveredCity.mayor.termEnd}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed City Card */}
      {activeCity && (
        <div className="absolute left-4 bottom-4 w-80 bg-white rounded-lg shadow-xl overflow-hidden z-50">
          <div className="relative">
            {activeCity.image && (
              <img 
                src={activeCity.image} 
                alt={activeCity.name} 
                className="w-full h-56 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/cities/default.jpg';
                }}
              />
            )}
            <button 
              onClick={() => setActiveCity(null)}
              className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
          <div className="p-4">
            <h3 className="font-bold text-xl mb-2 text-gray-800">{activeCity.name}</h3>
            <p className="text-gray-600 mb-3">
              {activeCity.description || 'No description available'}
            </p>
            
            {activeCity.mayor ? (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-semibold mb-2">Current Mayor</h4>
                <div className="flex items-center space-x-3">
                  {activeCity.mayor.image && (
                    <img 
                      src={activeCity.mayor.image} 
                      alt={activeCity.mayor.name} 
                      className="w-12 h-12 rounded-full object-cover border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/default-mayor.png';
                      }}
                    />
                  )}
                  <div>
                    <p className="font-medium">{activeCity.mayor.name}</p>
                    <p className="text-sm text-gray-600">{activeCity.mayor.politicalParty}</p>
                    <p className="text-xs text-gray-500">
                      Term: {activeCity.mayor.termStart} to {activeCity.mayor.termEnd}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-sm">{activeCity.mayor.bio}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-4 pt-4 border-t">
                No mayor information available
              </p>
            )}
            
            <div className="flex justify-between text-sm text-gray-500 mt-4 pt-4 border-t">
              <span>Lat: {(activeCity.coordinates as [number, number])[0].toFixed(4)}</span>
              <span>Lng: {(activeCity.coordinates as [number, number])[1].toFixed(4)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaviteMap;