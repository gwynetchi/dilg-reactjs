import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, LayersControl, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'bootstrap/dist/css/bootstrap.min.css';
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
      "City of Trece Martires": "#bcf60c",
      "City of Dasmariñas": "#fabebe",
      "City of Imus": "#fabebe",
      "City of Bacoor": "#ffe119",
      "City of Cavite": "#ffe119",
      "City of General Trias": "#fabebe",
      "City of Tagaytay": "#008080",
      "City of Carmona": "#bcf60c",
      "Tanza": "#bcf60c",
      "Silang": "#bcf60c",
      "Naic": "#008080",
      "Indang": "#bcf60c",
      "Ternate": "#008080",
      "Alfonso": "#008080",
      "Maragondon": "#008080",
      "Magallanes": "#008080",
      "Amadeo": "#bcf60c",
      "General Emilio Aguinaldo": "#008080",
      "Gen. Mariano Alvarez": "#bcf60c",
      "Mendez": "#008080",
      "Rosario": "#ffe119",
      "Noveleta": "#ffe119",
      "Kawit": "#ffe119"
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
    return (
      <div className="d-flex justify-content-center align-items-center w-100 h-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading map...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="position-relative w-100 h-100">
      <MapContainer
        center={caviteCenter}
        zoom={10.4}
        minZoom={9}
        maxZoom={18}
        style={{ height: '600px', width: '100%' }}
        className="rounded shadow"
        ref={mapRef}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='Tiles &copy; Esri'
            />
          </LayersControl.BaseLayer>
        </LayersControl>

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
              <div style={{ width: '200px' }}>
                <h6 className="fw-bold mb-2">{city.name}</h6>
                <p className="small mb-2">
                  {city.description?.substring(0, 60) || 'No description available'}...
                </p>
                {city.mayor && (
                  <p className="small text-primary mb-0">
                    <strong>Mayor:</strong> {city.mayor.name}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Enhanced Bootstrap City Information Panel */}
      {displayedCity && (
        <div 
          className={`position-absolute top-0 end-0 m-3`}
          style={{ 
            width: '400px', 
            zIndex: 1000,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
        >
          <div className={`card shadow-lg ${activeCity ? 'border-primary border-2' : ''}`}>
            {/* City Image Header */}
            <div className="position-relative">
              {displayedCity.image && displayedCity.image !== '' ? (
                <img 
                  src={displayedCity.image} 
                  alt={displayedCity.name} 
                  className="card-img-top"
                  style={{ height: '200px', objectFit: 'cover' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/cities/default.jpg';
                  }}
                />
              ) : (
                <div 
                  className="card-img-top bg-light d-flex align-items-center justify-content-center text-muted"
                  style={{ height: '200px' }}
                >
                  <div className="text-center">
                    <i className="bi bi-image fs-1 mb-2"></i>
                    <p className="mb-0">No image available</p>
                  </div>
                </div>
              )}
              
              {/* Close Button for Active City */}
              {activeCity && (
                <button 
                  type="button"
                  className="btn-close position-absolute top-0 end-0 m-2 bg-white rounded-circle p-2"
                  onClick={() => setActiveCity(null)}
                  aria-label="Close city details"
                  style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                ></button>
              )}
              
              {/* City Status Badge */}
              <div className="position-absolute bottom-0 start-0 m-2">
                <span className={`badge ${activeCity ? 'bg-primary' : 'bg-secondary'}`}>
                  {activeCity ? 'Selected' : 'Preview'}
                </span>
              </div>
            </div>

            {/* Card Body */}
            <div className="card-body">
              {/* City Name and Title */}
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h4 className="card-title mb-1 text-dark fw-bold">
                    {displayedCity.name}
                  </h4>
                  <small className="text-muted">
                    <i className="bi bi-geo-alt-fill me-1"></i>
                    Cavite Province
                  </small>
                </div>
              </div>
              
              {/* City Description */}
              <div className="mb-3">
                <h6 className="text-secondary mb-2">
                  <i className="bi bi-info-circle-fill me-2"></i>
                  About
                </h6>
                <p className="card-text text-muted">
                  {displayedCity.description || 'No information available for this city.'}
                </p>
              </div>

              {/* Mayor Information Section */}
              {displayedCity.mayor ? (
                <div className="mb-3">
                  <h6 className="text-secondary mb-3">
                    <i className="bi bi-person-badge-fill me-2"></i>
                    Mayor's Office
                  </h6>
                  
                  <div className="card bg-light">
                    <div className="card-body p-3">
                      <div className="d-flex align-items-center mb-3">
                        {displayedCity.mayor.image ? (
                          <img 
                            src={displayedCity.mayor.image} 
                            alt={displayedCity.mayor.name} 
                            className="rounded-circle me-3 border border-2 border-white shadow-sm"
                            style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/default-mayor.png';
                            }}
                          />
                        ) : (
                          <div 
                            className="rounded-circle me-3 bg-secondary d-flex align-items-center justify-content-center text-white"
                            style={{ width: '60px', height: '60px' }}
                          >
                            <i className="bi bi-person-fill fs-4"></i>
                          </div>
                        )}
                        <div className="flex-grow-1">
                          <h6 className="mb-1 fw-bold">{displayedCity.mayor.name}</h6>
                          <p className="mb-1 small text-primary fw-semibold">
                            {displayedCity.mayor.politicalParty}
                          </p>
                          <p className="mb-0 small text-muted">
                            <i className="bi bi-calendar-range me-1"></i>
                            {displayedCity.mayor.termStart} - {displayedCity.mayor.termEnd}
                          </p>
                        </div>
                      </div>
                      
                      {displayedCity.mayor.bio && (
                        <div className="border-top pt-2">
                          <p className="small text-muted mb-0">
                            {displayedCity.mayor.bio.length > 120 
                              ? `${displayedCity.mayor.bio.substring(0, 120)}...`
                              : displayedCity.mayor.bio
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-3">
                  <h6 className="text-secondary mb-2">
                    <i className="bi bi-person-badge me-2"></i>
                    Mayor's Office
                  </h6>
                  <div className="alert alert-light mb-0" role="alert">
                    <i className="bi bi-info-circle me-2"></i>
                    No mayor information available
                  </div>
                </div>
              )}


            </div>

            {/* Action Footer */}
            {!activeCity && hoveredCity && (
              <div className="card-footer bg-light">
                <button 
                  className="btn btn-primary btn-sm w-100"
                  onClick={() => handleClick(hoveredCity.name)}
                >
                  <i className="bi bi-cursor-fill me-2"></i>
                  Click to Pin Details
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CaviteMap;