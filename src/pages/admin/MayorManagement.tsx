
import React, { useState, useEffect, useCallback } from 'react';
import { CityData, MayorManagementProps, MayorData, normalizeCityName } from '../../components/Elements/cavitemap/types';
import { db } from '../../firebase';
import { collection, doc, onSnapshot, writeBatch, deleteDoc } from 'firebase/firestore';

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

  // Real-time data fetching
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const unsubscribeCities = onSnapshot(collection(db, 'cities'), (snapshot) => {
      const updatedCities: Record<string, CityData> = {};
      
      snapshot.forEach((doc) => {
        updatedCities[normalizeCityName(doc.id)] = {
          ...doc.data() as CityData,
          name: doc.id
        };
      });

      setCities(prev => ({ ...prev, ...updatedCities }));
      setIsLoading(false);
    });

    const unsubscribeMayors = onSnapshot(collection(db, 'mayors'), (snapshot) => {
      setCities(prev => {
        const newCities = { ...prev };
        snapshot.forEach((doc) => {
          const cityName = normalizeCityName(doc.id);
          if (newCities[cityName]) {
            newCities[cityName] = {
              ...newCities[cityName],
              mayor: doc.data() as MayorData
            };
          }
        });
        return newCities;
      });
    });

    return () => {
      unsubscribeCities();
      unsubscribeMayors();
    };
  }, []);

  // Event handlers with useCallback for better performance
  const handleEditMayor = useCallback((cityName: string) => {
    setEditingCity(cityName);
  }, []);

  const handleMayorChange = useCallback((field: keyof MayorData, value: string, cityName: string) => {
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
  }, []);

  const handleNewCityChange = useCallback((field: keyof Omit<CityData, 'coordinates'>, value: string) => {
    setNewCity(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleAddCity = useCallback(async () => {
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

      // Reset form
      setIsAddingCity(false);
      setNewCity({ ...DEFAULT_CITY_DATA });
      
      // Callback to parent
      await onSave({ ...cities });
    } catch (error) {
      console.error('Error adding city:', error);
      setError('Failed to add city. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [newCity, cities, onSave]);

  const handleSave = useCallback(async () => {
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
      await onSave({ ...cities });
    } catch (error) {
      console.error('Error saving data:', error);
      setError('Failed to save data. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [editingCity, cities, onSave]);

  const handleDeleteCity = useCallback(async (cityName: string) => {
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

      await onSave({...cities});
    } catch (error) {
      console.error('Error deleting city:', error);
      setError('Failed to delete city. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);

    if (isLoading) {
      return (
        <div className="spinner-overlay">
          <div className="spinner"></div>
        </div>
      );
    }

return (
  <div className="dashboard-container">
    <section id="content">
      <main>
        <div className="head-title">
          <div className="left">
            <h1>Mayor Management</h1>
            <ul className="breadcrumb">
              <li><a className="active" href="/admin/dashboard">Home</a></li>
              <li><i className="bx bx-chevron-right"></i></li>
              <li><span>Mayor Management</span></li>
            </ul>
          </div>
        </div>

          <div className="card p-4 mb-6 h-full overflow-y-auto">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="mb-0">City and Mayor Management</h2>
              <button
                onClick={() => setIsAddingCity(true)}
                className="btn btn-outline-success"
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
              <div className="card p-3 mb-4 bg-light shadow-sm position-relative">
                <h3 className="mb-3">Add New City</h3>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      City Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCity.name}
                      onChange={(e) => handleNewCityChange('name', e.target.value)}
                      className="form-control"
                      placeholder="Enter city name"
                    />
                  </div>

                  {/* Other fields here */}
                </div>

                <div className="d-flex justify-content-end gap-2 mt-3">
                  <button
                    onClick={() => setIsAddingCity(false)}
                    className="btn btn-outline-secondary"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCity}
                    className="btn btn-outline-success"
                    disabled={!newCity.name.trim() || isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Add City'}
                  </button>
                </div>
              </div>
            )}



          {/* Cities List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(cities).map(([normalizedName, cityData]) => {
              const cityName = cityData.name;
              return (
                <div key={normalizedName} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{cityName}</h3>
                  </div>
                    

                  {cityData.image && (
                    <img
                      src={cityData.image}
                      alt={cityName}
                      className="w-full h-32 object-cover rounded-md mb-4 border border-gray-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}

                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {cityData.description || 'No description available'}
                  </p>

                  <div className="text-xs text-gray-500 mb-3">
                    <span className="font-medium text-gray-700">Coordinates:</span> {cityData.coordinates[0].toFixed(4)}, {cityData.coordinates[1].toFixed(4)}
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
                          className="btn btn-outline-secondary"
                          disabled={isSaving}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          className="btn btn-outline-primary"
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

                     <div className="mt-4 flex justify-end space-x-3">
                        <button
                          onClick={() => handleEditMayor(cityName)}
                          className="btn btn-outline-primary"
                          disabled={isSaving}
                        >
                          {cityData.mayor ? 'Edit Mayor' : 'Add Mayor'}
                        </button>
                        
                        <button
                          onClick={() => handleDeleteCity(cityName)}
                          className="btn btn-outline-danger btn-sm"
                          title="Delete city"
                          disabled={isSaving}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                 )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </section>
  </div>
);
};

export default MayorManagement;