import React, { useState, useEffect } from 'react';
import { CityData, MayorManagementProps, MayorData, normalizeCityName } from '../../components/Elements/cavitemap/types';
import { db } from '../../firebase';
import { collection, doc, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';

const MayorManagement: React.FC<MayorManagementProps> = ({ onSave }) => {
  const [editingCity, setEditingCity] = useState<string | null>(null);
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [newCity, setNewCity] = useState<Omit<CityData, 'mayor'> & { mayor?: MayorData }>({
    name: '',
    image: '',
    description: '',
    coordinates: [14.2814, 120.8640]
  });
  const [cities, setCities] = useState<Record<string, CityData>>({});
  const [mayors, setMayors] = useState<Record<string, MayorData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch cities
        const citiesSnapshot = await getDocs(collection(db, 'cities'));
        const citiesData: Record<string, CityData> = {};
        citiesSnapshot.forEach((doc) => {
          citiesData[normalizeCityName(doc.id)] = doc.data() as CityData;
        });

        // Fetch mayors
        const mayorsSnapshot = await getDocs(collection(db, 'mayors'));
        const mayorsData: Record<string, MayorData> = {};
        mayorsSnapshot.forEach((doc) => {
          mayorsData[normalizeCityName(doc.id)] = doc.data() as MayorData;
        });

        setCities(citiesData);
        setMayors(mayorsData);
      } catch (error) {
        console.error('Error fetching data:', error);
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
          ...(prev[normalizedName]?.mayor || {
            name: '',
            bio: '',
            image: '',
            termStart: '',
            termEnd: '',
            politicalParty: ''
          }),
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

  const handleCoordinateChange = (index: number, value: string) => {
    const newCoordinates = [...newCity.coordinates] as [number, number];
    newCoordinates[index] = parseFloat(value) || 0;
    setNewCity(prev => ({
      ...prev,
      coordinates: newCoordinates
    }));
  };

  const handleAddCity = async () => {
    const normalizedName = normalizeCityName(newCity.name);
    if (!normalizedName) {
      alert('City name is required');
      return;
    }

    if (cities[normalizedName]) {
      alert('City already exists');
      return;
    }

    setIsSaving(true);
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
      if (newCity.mayor) {
        setMayors(prev => ({
          ...prev,
          [normalizedName]: newCity.mayor as MayorData
        }));
      }

      setIsAddingCity(false);
      setNewCity({
        name: '',
        image: '',
        description: '',
        coordinates: [14.2814, 120.8640]
      });

      await onSave(updatedCities);
    } catch (error) {
      console.error('Error adding city:', error);
      alert('Failed to add city');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editingCity) return;
    
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      const normalizedName = normalizeCityName(editingCity);
      const cityData = cities[normalizedName];
      
      // Update city document
      const cityRef = doc(db, 'cities', normalizedName);
      batch.set(cityRef, {
        name: cityData.name,
        image: cityData.image,
        description: cityData.description,
        coordinates: cityData.coordinates
      });

      // Update mayor document if exists
      if (cityData.mayor) {
        const mayorRef = doc(db, 'mayors', normalizedName);
        batch.set(mayorRef, cityData.mayor);
      }

      await batch.commit();
      
      // Update mayors state if needed
      if (cityData.mayor) {
        setMayors(prev => ({
          ...prev,
          [normalizedName]: cityData.mayor as MayorData
        }));
      }
      
      setEditingCity(null);
      await onSave(cities);
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Failed to save data');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCity = async (cityName: string) => {
    if (window.confirm(`Are you sure you want to delete ${cityName}?`)) {
      setIsSaving(true);
      try {
        const normalizedName = normalizeCityName(cityName);
        
        // Delete from Firestore
        await deleteDoc(doc(db, 'cities', normalizedName));
        if (mayors[normalizedName]) {
          await deleteDoc(doc(db, 'mayors', normalizedName));
        }

        // Update local state
        const { [normalizedName]: _, ...remainingCities } = cities;
        setCities(remainingCities);
        
        setMayors(prev => {
          const { [normalizedName]: _, ...remaining } = prev;
          return remaining;
        });

        await onSave(remainingCities);
      } catch (error) {
        console.error('Error deleting city:', error);
        alert('Failed to delete city');
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Merge cities and mayors data
  const citiesWithMayors = Object.entries(cities).map(([cityName, cityData]) => ({
    ...cityData,
    mayor: mayors[normalizeCityName(cityName)] || cityData.mayor
  }));

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
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          disabled={isSaving}
        >
          Add New City
        </button>
      </div>

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
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <input
                type="text"
                value={newCity.image}
                onChange={(e) => handleNewCityChange('image', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                placeholder="https://example.com/image.jpg"
              />
              {newCity.image && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Image Preview:</p>
                  <img 
                    src={newCity.image} 
                    alt="Preview" 
                    className="h-20 object-cover rounded border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newCity.description}
                onChange={(e) => handleNewCityChange('description', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                rows={3}
                placeholder="Enter city description"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <input
                  type="number"
                  value={newCity.coordinates[0]}
                  onChange={(e) => handleCoordinateChange(0, e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  step="0.000001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <input
                  type="number"
                  value={newCity.coordinates[1]}
                  onChange={(e) => handleCoordinateChange(1, e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  step="0.000001"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsAddingCity(false)}
                className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCity}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:bg-green-300"
                disabled={!newCity.name.trim()}
              >
                Add City
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cities List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {citiesWithMayors.map(({ name: cityName, ...cityData }) => (
          <div key={cityName} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg">{cityName}</h3>
              <button
                onClick={() => handleDeleteCity(cityName)}
                className="text-red-500 hover:text-red-700 text-sm"
                title="Delete city"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mayor Name</label>
                  <input
                    type="text"
                    value={cityData.mayor?.name || ''}
                    onChange={(e) => handleMayorChange('name', e.target.value, cityName)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bio</label>
                  <textarea
                    value={cityData.mayor?.bio || ''}
                    onChange={(e) => handleMayorChange('bio', e.target.value, cityName)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm"
                    rows={2}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Image URL</label>
                  <input
                    type="text"
                    value={cityData.mayor?.image || ''}
                    onChange={(e) => handleMayorChange('image', e.target.value, cityName)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Term Start</label>
                    <input
                      type="date"
                      value={cityData.mayor?.termStart || ''}
                      onChange={(e) => handleMayorChange('termStart', e.target.value, cityName)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Term End</label>
                    <input
                      type="date"
                      value={cityData.mayor?.termEnd || ''}
                      onChange={(e) => handleMayorChange('termEnd', e.target.value, cityName)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Political Party</label>
                  <input
                    type="text"
                    value={cityData.mayor?.politicalParty || ''}
                    onChange={(e) => handleMayorChange('politicalParty', e.target.value, cityName)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm"
                  />
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
              </div>
            )}
            
            <div className="mt-4 flex justify-end space-x-2">
              {editingCity === cityName ? (
                <>
                  <button
                    onClick={() => setEditingCity(null)}
                    className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Save Mayor
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleEditMayor(cityName)}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  {cityData.mayor ? 'Edit Mayor' : 'Add Mayor'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MayorManagement;