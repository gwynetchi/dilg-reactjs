import React, { useState, useEffect } from 'react';
import { CityData, MayorManagementProps, MayorData, normalizeCityName } from '../../components/Elements/cavitemap/types';
import { db } from '../../firebase';
import { collection, doc, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';

const DEFAULT_MAYOR_DATA: MayorData = {
  name: '',
  bio: '',
  image: '',
  termStart: '',
  termEnd: '',
  politicalParty: ''
};

const DEFAULT_CITY_DATA: Omit<CityData, 'mayor'> = {
  name: '',
  image: '',
  description: '',
  coordinates: [14.2814, 120.8640]
};

const MayorManagement: React.FC<MayorManagementProps> = ({ onSave }) => {
  const [editingCity, setEditingCity] = useState<string | null>(null);
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [newCity, setNewCity] = useState<Omit<CityData, 'mayor'> & { mayor?: MayorData }>({
    ...DEFAULT_CITY_DATA
  });
  const [cities, setCities] = useState<Record<string, CityData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const citiesSnapshot = await getDocs(collection(db, 'cities'));
        const mayorsSnapshot = await getDocs(collection(db, 'mayors'));

        const citiesData: Record<string, CityData> = {};
        citiesSnapshot.forEach((doc) => {
          const cityData = doc.data() as CityData;
          citiesData[normalizeCityName(doc.id)] = cityData;
        });

        // Merge mayor data into cities
        mayorsSnapshot.forEach((doc) => {
          const cityName = normalizeCityName(doc.id);
          if (citiesData[cityName]) {
            citiesData[cityName] = {
              ...citiesData[cityName],
              mayor: doc.data() as MayorData
            };
          }
        });

        setCities(citiesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleEditMayor = (cityName: string) => {
    setEditingCity(cityName);
  };

  const handleMayorChange = (field: keyof MayorData, value: string, cityName: string) => {
    const normalizedName = normalizeCityName(cityName);
    setCities(prev => ({
      ...prev,
      [normalizedName]: {
        ...prev[normalizedName],
        mayor: {
          ...(prev[normalizedName]?.mayor || DEFAULT_MAYOR_DATA),
          [field]: value
        }
      }
    }));
  };

  const handleNewCityChange = (field: keyof Omit<CityData, 'coordinates'>, value: string) => {
    setNewCity(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddCity = async () => {
    const normalizedName = normalizeCityName(newCity.name);
    if (!normalizedName) {
      setError('City name is required');
      return;
    }

    if (cities[normalizedName]) {
      setError('City already exists');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const batch = writeBatch(db);
      
      // Add city document
      const cityRef = doc(db, 'cities', normalizedName);
      const cityData = {
        name: newCity.name,
        image: newCity.image,
        description: newCity.description,
        coordinates: newCity.coordinates
      };
      batch.set(cityRef, cityData);

      // Add mayor document if exists
      if (newCity.mayor) {
        const mayorRef = doc(db, 'mayors', normalizedName);
        batch.set(mayorRef, newCity.mayor);
      }

      await batch.commit();

      // Update local state
      const updatedCities = {
        ...cities,
        [normalizedName]: {
          ...cityData,
          mayor: newCity.mayor
        }
      };

      setCities(updatedCities);
      setIsAddingCity(false);
      setNewCity({ ...DEFAULT_CITY_DATA });
      await onSave(updatedCities);
    } catch (error) {
      console.error('Error adding city:', error);
      setError('Failed to add city. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editingCity) return;
    
    setIsSaving(true);
    setError(null);
    try {
      const batch = writeBatch(db);
      const normalizedName = normalizeCityName(editingCity);
      const cityData = cities[normalizedName];
      
      // Update city document (without mayor info)
      const cityRef = doc(db, 'cities', normalizedName);
      batch.set(cityRef, {
        name: cityData.name,
        image: cityData.image,
        description: cityData.description,
        coordinates: cityData.coordinates
      });

      // Update or delete mayor document
      const mayorRef = doc(db, 'mayors', normalizedName);
      if (cityData.mayor) {
        batch.set(mayorRef, cityData.mayor);
      } else {
        await deleteDoc(mayorRef);
      }

      await batch.commit();
      setEditingCity(null);
      await onSave(cities);
    } catch (error) {
      console.error('Error saving data:', error);
      setError('Failed to save data. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCity = async (cityName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${cityName}?`)) return;

    setIsSaving(true);
    setError(null);
    try {
      const normalizedName = normalizeCityName(cityName);
      
      // Delete from Firestore
      const batch = writeBatch(db);
      batch.delete(doc(db, 'cities', normalizedName));
      batch.delete(doc(db, 'mayors', normalizedName));
      await batch.commit();

      // Update local state
      const { [normalizedName]: _, ...remainingCities } = cities;
      setCities(remainingCities);
      await onSave(remainingCities);
    } catch (error) {
      console.error('Error deleting city:', error);
      setError('Failed to delete city. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md h-full flex items-center justify-center">
        <p>Loading cities and mayors...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">City and Mayor Management</h2>
        <button
          onClick={() => setIsAddingCity(true)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
          disabled={isSaving}
        >
          Add New City
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Add New City Form */}
      {isAddingCity && (
        <div className="mb-8 p-4 border rounded-lg bg-gray-50 shadow-sm">
          <h3 className="font-bold text-lg mb-4">Add New City</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newCity.name}
                onChange={(e) => handleNewCityChange('name', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                placeholder="Enter city name"
              />
            </div>
            
            {/* Rest of the new city form remains the same */}
            {/* ... */}

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsAddingCity(false)}
                className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleAddCity}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:bg-green-300"
                disabled={!newCity.name.trim() || isSaving}
              >
                {isSaving ? 'Saving...' : 'Add City'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cities List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(cities).map(([normalizedName, cityData]) => {
          const cityName = cityData.name;
          return (
            <div key={normalizedName} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">{cityName}</h3>
                <button
                  onClick={() => handleDeleteCity(cityName)}
                  className="text-red-500 hover:text-red-700 text-sm"
                  title="Delete city"
                  disabled={isSaving}
                >
                  Delete
                </button>
              </div>
              
              {cityData.image && (
                <img 
                  src={cityData.image} 
                  alt={cityName} 
                  className="w-full h-32 object-cover rounded mb-3"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              
              <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                {cityData.description || 'No description available'}
              </p>
              
              <div className="text-xs text-gray-500 mb-3">
                Coordinates: {cityData.coordinates[0].toFixed(4)}, {cityData.coordinates[1].toFixed(4)}
              </div>
              
              {editingCity === cityName ? (
                <div className="space-y-3 mt-3">
                  {/* Mayor edit form fields */}
                  {Object.entries(DEFAULT_MAYOR_DATA).map(([field]) => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 capitalize">
                        {field}
                      </label>
                      {field === 'bio' ? (
                        <textarea
                          value={cityData.mayor?.[field as keyof MayorData] || ''}
                          onChange={(e) => handleMayorChange(field as keyof MayorData, e.target.value, cityName)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm"
                          rows={field === 'bio' ? 3 : 1}
                        />
                      ) : (
                        <input
                          type={field.includes('term') ? 'date' : 'text'}
                          value={cityData.mayor?.[field as keyof MayorData] || ''}
                          onChange={(e) => handleMayorChange(field as keyof MayorData, e.target.value, cityName)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm"
                        />
                      )}
                    </div>
                  ))}
                  
                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      onClick={() => setEditingCity(null)}
                      className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Mayor'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {cityData.mayor ? (
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center space-x-3">
                        {cityData.mayor.image && (
                          <img 
                            src={cityData.mayor.image} 
                            alt={cityData.mayor.name} 
                            className="w-12 h-12 rounded-full object-cover border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/default-mayor.png';
                            }}
                          />
                        )}
                        <div>
                          <h4 className="font-semibold text-sm">{cityData.mayor.name}</h4>
                          <p className="text-xs text-gray-600">{cityData.mayor.politicalParty}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-700 mt-1 line-clamp-2">{cityData.mayor.bio}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Term: {cityData.mayor.termStart} to {cityData.mayor.termEnd}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-3">No mayor information available</p>
                  )}
                  
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => handleEditMayor(cityName)}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      disabled={isSaving}
                    >
                      {cityData.mayor ? 'Edit Mayor' : 'Add Mayor'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MayorManagement;