import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface CityData {
  name: string;
  image: string;
  description: string;
  coordinates: LatLngExpression;
}

const CaviteMap: React.FC = () => {
  const [geoData, setGeoData] = useState<any>(null);
  const [hoveredCity, setHoveredCity] = useState<CityData | null>(null);
  const [activeCity, setActiveCity] = useState<CityData | null>(null);

  const CLOUDINARY_CLOUD_NAME = 'dr5c99td8';
  const CLOUDINARY_BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const caviteCenter: LatLngExpression = [14.2814, 120.8640];

  const getOptimizedImageUrl = (version: string, publicId: string) => {
    return `${CLOUDINARY_BASE_URL}/f_auto,q_auto,w_600/v${version}/${publicId}`;
  };
  
  const cityData: Record<string, CityData> = {
    "City of Trece Martires": {
      name: "City of Trece Martires",
      image: getOptimizedImageUrl('1746753718', 'zvb3fo9gh4bikbwlqsfz.jpg'),
      description: "The capital city of Cavite province, named after the Thirteen Martyrs of Cavite who were executed during the Philippine Revolution.",
      coordinates: [14.2837, 120.8782]
    },
    "City of Dasmariñas": {
      name: "City of Dasmariñas",
      image: getOptimizedImageUrl('1746753718', `wkia2rvixzc5ath5a8bz.jpg`),
      description: "A highly urbanized city known for its numerous educational institutions, industrial parks, and residential communities.",
      coordinates: [14.3294, 120.9367]
    },
    "City of Imus": {
      name: "City of Imus",
      image: getOptimizedImageUrl('1746753718', `qwrgzkhpyqa3zaswib8b.jpg`),
      description: "Historical city where the Battle of Alapan took place, known as the flag capital of the Philippines.",
      coordinates: [14.4297, 120.9367]
    },
    "City of Bacoor": {
      name: "City of Bacoor",
      image: getOptimizedImageUrl('1746753718', `yuprrulayl2jagdefstk.jpg`),
      description: "Known as the 'Gateway to Metro Manila', famous for its baked goods (pandesal) and historical churches.",
      coordinates: [14.4594, 120.9269]
    },
    "City of Cavite": {
      name: "City of Cavite",
      image: getOptimizedImageUrl('1746753718', `ef6itj3hvgim1qawposy.jpg`),
      description: "A historic peninsula city surrounded by Manila Bay, home to the famous Sangley Point and several Spanish-era forts.",
      coordinates: [14.4829, 120.9011]
    },
    "City of General Trias": {
      name: "City of General Trias",
      image: getOptimizedImageUrl('1746753718', `ec06m0aqtork6hpmgmyl.jpg`),
      description: "Originally named San Francisco de Malabon, now a growing industrial and residential hub in Cavite.",
      coordinates: [14.3869, 120.8817]
    },
    "City of Tagaytay": {
      name: "City of Tagaytay",
      image: getOptimizedImageUrl('1746753718', `ienc1raknny8da37z0m4.jpg`),
      description: "Popular tourist destination known for its cool climate, scenic views of Taal Volcano, and numerous restaurants.",
      coordinates: [14.1000, 120.9333]
    },
    "Tanza": {
      name: "Tanza",
      image: getOptimizedImageUrl('1746753718', `x7cjkoy9vj9pgptj0kkh.jpg`),
      description: "Coastal municipality known for its fishing industry, salt beds, and the historic Tanza Church.",
      coordinates: [14.3944, 120.8531]
    },
    "Silang": {
      name: "Silang",
      image: getOptimizedImageUrl('1746753718', `pnsovccdz3apnw5ybidm.jpg`),
      description: "Known for its cool climate, strawberry farms, and the famous Puzzle Mansion with its Guinness-record puzzle collection.",
      coordinates: [14.2306, 120.9747]
    },
    "Naic": {
      name: "Naic",
      image: getOptimizedImageUrl('1746753718', `j2ffarbpccdhebjrogzw.jpg`),
      description: "Coastal town known for its historical significance during the Philippine Revolution and its fishing industry.",
      coordinates: [14.3181, 120.7694]
    },
    "Indang": {
      name: "Indang",
      image: getOptimizedImageUrl('1746753718', `b3ev2thtvbejw7gpqqob.jpg`),
      description: "Home to the Cavite State University main campus and known for its coffee plantations and cool climate.",
      coordinates: [14.1956, 120.8767]
    },
    "Ternate": {
      name: "Ternate",
      image: getOptimizedImageUrl('1746753718', `zofovbcrbsqshkuyuwim.jpg`),
      description: "Small coastal municipality known for its mangrove forests, Kaybiang Tunnel, and Mt. Palay-Palay National Park.",
      coordinates: [14.2897, 120.7169]
    },
    "Alfonso": {
      name: "Alfonso",
      image: getOptimizedImageUrl('1746753718', `rbmvxjlcu8fshtrn2ijj.jpg`),
      description: "Known for its cool climate, flower farms, and as the location of the famous Mushroomburger restaurant.",
      coordinates: [14.1403, 120.8539]
    },
    "Maragondon": {
      name: "Maragondon",
      image: getOptimizedImageUrl('1746753718', `disgox6wtvklo64haaqv.jpg`),
      description: "Historical town where Andres Bonifacio was tried and executed, known for its ancestral houses and Mt. Buntis.",
      coordinates: [14.2733, 120.7378]
    },
    "Magallanes": {
      name: "Magallanes",
      image: getOptimizedImageUrl('1746753718', `mdg5vkt4gtflrjyirdew.jpg`),
      description: "Southernmost municipality of Cavite, known for its agricultural lands and the Magallanes Swinging Bridge.",
      coordinates: [14.1883, 120.7578]
    },
    "Amadeo": {
      name: "Amadeo",
      image: getOptimizedImageUrl('1746753718', `iouvmpg9cdwopsaxxcox.jpg`),
      description: "Known as the 'Coffee Capital of the Philippines', hosting the annual Pahimis Coffee Festival.",
      coordinates: [14.1706, 120.9236]
    },
    "General Emilio Aguinaldo": {
      name: "General Emilio Aguinaldo",
      image: getOptimizedImageUrl('1746753718', `l4eyjf8eet5midzmffpp.jpg`),
      description: "Formerly Bailen, renamed after the first Philippine President, known for its agricultural lands.",
      coordinates: [14.1842, 120.7958]
    },
    "Mendez": {
      name: "Mendez",
      image: getOptimizedImageUrl('1746753718', `zc5kworusnjupofnlbl5.jpg`),
      description: "Small upland town known for its cool climate, Mendez Crossing, and agricultural products.",
      coordinates: [14.1286, 120.9058]
    },
    "Carmona": {
      name: "Carmona",
      image: getOptimizedImageUrl('1746753718', `qyuphm94hppeoiznwedn.jpg`),
      description: "Fast-growing municipality known for its industrial estates and the Carmona Racing Circuit.",
      coordinates: [14.3139, 121.0583]
    },
    "Rosario": {
      name: "Rosario",
      image: getOptimizedImageUrl('1746753718', `kwa4uyj7jyymbnjrzsdt.jpg`),
      description: "Known for its historical church (Nuestra Señora del Rosario) and as a center for shoe manufacturing.",
      coordinates: [14.4142, 120.8547]
    },
    "Noveleta": {
      name: "Noveleta",
      image: getOptimizedImageUrl('1746753718', `cd3ceakxln2yy8p4hq3j.jpg`),
      description: "Small municipality known for its role in the Philippine Revolution and its proximity to Cavite City.",
      coordinates: [14.4292, 120.8797]
    },
    "Kawit": {
      name: "Kawit",
      image: getOptimizedImageUrl('1746753718', `skjz3kdl8s6by3bdgix5.jpg`),
      description: "Historical town where Philippine Independence was proclaimed, home to the Aguinaldo Shrine.",
      coordinates: [14.4456, 120.9047]
    }
  };

  // [Rest of your component code remains the same...]
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
    return colors[name] || '#cccccc';
  };

  const handleMouseOver = (cityName: string) => {
    const city = cityData[cityName];
    if (city) {
      setHoveredCity(city);
    }
  };

  const handleMouseOut = () => {
    setHoveredCity(null);
  };

  const handleClick = (cityName: string) => {
    const city = cityData[cityName];
    setActiveCity(city);
  };

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={caviteCenter}
        zoom={10.4}
        zoomControl={false}
        style={{ height: '600px', width: '100%' }}
        className="rounded-lg shadow-md"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

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

        {/* Markers for major cities */}
        {Object.values(cityData).map((city) => (
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
                <p className="text-sm">{city.description.substring(0, 60)}...</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Hover Card */}
      {hoveredCity && (
        <div className="absolute right-4 top-4 w-72 bg-white rounded-lg shadow-xl overflow-hidden z-50 transition-all duration-200 transform hover:scale-105">
          <img 
            src={hoveredCity.image} 
            alt={hoveredCity.name} 
            className="w-full h-48 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/cities/default.jpg';
            }}
          />
          <div className="p-4">
            <h3 className="font-bold text-lg mb-1 text-gray-800">{hoveredCity.name}</h3>
            <p className="text-gray-600 text-sm">{hoveredCity.description.substring(0, 100)}...</p>
          </div>
        </div>
      )}

      {/* Detailed City Card (shown on click) */}
      {activeCity && (
        <div className="absolute left-4 bottom-4 w-80 bg-white rounded-lg shadow-xl overflow-hidden z-50">
          <div className="relative">
            <img 
              src={activeCity.image} 
              alt={activeCity.name} 
              className="w-full h-56 object-cover"
            />
            <button 
              onClick={() => setActiveCity(null)}
              className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
          <div className="p-4">
            <h3 className="font-bold text-xl mb-2 text-gray-800">{activeCity.name}</h3>
            <p className="text-gray-600 mb-3">{activeCity.description}</p>
            <div className="flex justify-between text-sm text-gray-500">
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