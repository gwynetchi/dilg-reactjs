import React, { useState, useEffect, useCallback } from 'react';
import { CityData, MayorManagementProps, MayorData, normalizeCityName } from '../../components/Elements/cavitemap/types';
import { db } from '../../firebase';
import { collection, doc, onSnapshot, writeBatch, deleteDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';

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

  // SweetAlert configurations
  const showSuccessAlert = (title: string, text: string) => {
    Swal.fire({
      icon: 'success',
      title: title,
      text: text,
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  };

  const showErrorAlert = (title: string, text: string) => {
    Swal.fire({
      icon: 'error',
      title: title,
      text: text,
      confirmButtonText: 'Try Again',
      confirmButtonColor: '#dc3545'
    });
  };

  const showConfirmDialog = (title: string, text: string, confirmText: string = 'Yes, delete it!') => {
    return Swal.fire({
      title: title,
      text: text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancel'
    });
  };

  // Real-time data fetching with error handling
  useEffect(() => {
    setIsLoading(true);

    const unsubscribeCities = onSnapshot(
      collection(db, 'cities'), 
      (snapshot) => {
        const updatedCities: Record<string, CityData> = {};
        
        snapshot.forEach((doc) => {
          updatedCities[normalizeCityName(doc.id)] = {
            ...doc.data() as CityData,
            name: doc.id
          };
        });

        setCities(prev => ({ ...prev, ...updatedCities }));
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching cities:', error);
        setIsLoading(false);
        showErrorAlert('Data Loading Error', 'Failed to load cities data. Please refresh the page.');
      }
    );

    const unsubscribeMayors = onSnapshot(
      collection(db, 'mayors'), 
      (snapshot) => {
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
      },
      (error) => {
        console.error('Error fetching mayors:', error);
        showErrorAlert('Data Loading Error', 'Failed to load mayors data. Please refresh the page.');
      }
    );

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

  const handleNewMayorChange = useCallback((field: keyof MayorData, value: string) => {
    setNewCity(prev => ({
      ...prev,
      mayor: {
        ...(prev.mayor || DEFAULT_MAYOR_DATA),
        [field]: value
      }
    }));
  }, []);

  const handleAddCity = useCallback(async () => {
    const normalizedName = normalizeCityName(newCity.name);
    if (!normalizedName) {
      showErrorAlert('Validation Error', 'City name is required and cannot be empty.');
      return;
    }

    if (cities[normalizedName]) {
      showErrorAlert('Duplicate City', 'A city with this name already exists. Please choose a different name.');
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
      if (newCity.mayor?.name?.trim()) {
        const mayorRef = doc(db, 'mayors', normalizedName);
        batch.set(mayorRef, newCity.mayor);
      }

      await batch.commit();

      // Reset form
      setIsAddingCity(false);
      setNewCity({ ...DEFAULT_CITY_DATA });
      
      // Show success message
      showSuccessAlert('City Added Successfully', `${newCity.name} has been added to the system.`);
      
      // Callback to parent
      await onSave({ ...cities });
    } catch (error) {
      console.error('Error adding city:', error);
      showErrorAlert('Save Failed', 'Failed to add the city. Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  }, [newCity, cities, onSave]);

  const handleSave = useCallback(async () => {
    if (!editingCity) return;
    
    setIsSaving(true);
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
      if (cityData.mayor?.name?.trim()) {
        batch.set(mayorRef, cityData.mayor);
      } else {
        try {
          await deleteDoc(mayorRef);
        } catch (error) {
          // Mayor document might not exist, which is fine
          console.log('Mayor document does not exist, skipping deletion');
        }
      }

      await batch.commit();
      setEditingCity(null);
      
      showSuccessAlert('Changes Saved', `Mayor information for ${editingCity} has been updated successfully.`);
      
      await onSave({ ...cities });
    } catch (error) {
      console.error('Error saving data:', error);
      showErrorAlert('Save Failed', 'Failed to save changes. Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  }, [editingCity, cities, onSave]);

  const handleDeleteCity = useCallback(async (cityName: string) => {
    const result = await showConfirmDialog(
      'Delete City',
      `Are you sure you want to delete ${cityName}? This action cannot be undone and will remove all associated data.`,
      'Yes, delete it!'
    );

    if (!result.isConfirmed) return;

    setIsSaving(true);
    try {
      const normalizedName = normalizeCityName(cityName);
      
      // Delete from Firestore
      const batch = writeBatch(db);
      batch.delete(doc(db, 'cities', normalizedName));
      batch.delete(doc(db, 'mayors', normalizedName));
      await batch.commit();

      showSuccessAlert('City Deleted', `${cityName} has been successfully removed from the system.`);
      
      await onSave({...cities});
    } catch (error) {
      console.error('Error deleting city:', error);
      showErrorAlert('Delete Failed', 'Failed to delete the city. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [cities, onSave]);

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <section id="content">
        <main>
          {/* Header Section */}
          <div className="head-title mb-4">
            <div className="left">
              <h1 className="display-6 fw-bold text-primary mb-2">Mayor Management</h1>
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                  <li className="breadcrumb-item">
                    <a href="/admin/dashboard" className="text-decoration-none">
                      <i className="bi bi-house-door me-1"></i>Home
                    </a>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">Mayor Management</li>
                </ol>
              </nav>
            </div>
          </div>

          {/* Main Content Card */}
          <div className="card shadow-lg border-0" style={{ borderRadius: '16px' }}>
            <div className="card-header bg-gradient-primary text-white border-0" style={{ borderRadius: '16px 16px 0 0' }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="card-title mb-1 h4 text-white fw-bold">City and Mayor Management</h2>
                  <p className="text-white-50 mb-0 small">Manage cities and their respective mayors</p>
                </div>
                <button
                  onClick={() => setIsAddingCity(true)}
                  className="btn btn-light d-flex align-items-center gap-2 fw-semibold"
                  disabled={isSaving}
                  style={{ borderRadius: '12px' }}
                >
                  <i className="bi bi-plus-circle"></i>
                  Add New City
                </button>
              </div>
            </div>

            <div className="card-body p-4">
              {/* Add New City Form */}
              {isAddingCity && (
                <div className="card border-0 mb-4 shadow-sm" style={{ borderRadius: '16px', background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
                  <div className="card-header bg-success text-white border-0" style={{ borderRadius: '16px 16px 0 0' }}>
                    <h3 className="card-title mb-0 h5 fw-bold">
                      <i className="bi bi-plus-circle me-2"></i>Add New City
                    </h3>
                  </div>
                  <div className="card-body p-4">
                    <div className="row g-3">
                      {/* City Information Section */}
                      <div className="col-12">
                        <div className="d-flex align-items-center mb-3">
                          <div className="bg-primary rounded-circle p-2 me-3">
                            <i className="bi bi-building text-white"></i>
                          </div>
                          <h6 className="text-primary mb-0 fw-bold">City Information</h6>
                        </div>
                      </div>
                      
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          City Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          value={newCity.name}
                          onChange={(e) => handleNewCityChange('name', e.target.value)}
                          className="form-control"
                          placeholder="Enter city name"
                          style={{ borderRadius: '12px' }}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">City Image URL</label>
                        <input
                          type="url"
                          value={newCity.image}
                          onChange={(e) => handleNewCityChange('image', e.target.value)}
                          className="form-control"
                          placeholder="https://example.com/image.jpg"
                          style={{ borderRadius: '12px' }}
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-semibold">City Description</label>
                        <textarea
                          value={newCity.description}
                          onChange={(e) => handleNewCityChange('description', e.target.value)}
                          className="form-control"
                          rows={3}
                          placeholder="Enter city description"
                          style={{ borderRadius: '12px' }}
                        />
                      </div>

                      {/* Mayor Information Section */}
                      <div className="col-12 mt-4">
                        <div className="d-flex align-items-center mb-3">
                          <div className="bg-info rounded-circle p-2 me-3">
                            <i className="bi bi-person-badge text-white"></i>
                          </div>
                          <h6 className="text-info mb-0 fw-bold">Mayor Information (Optional)</h6>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Mayor Name</label>
                        <input
                          type="text"
                          value={newCity.mayor?.name || ''}
                          onChange={(e) => handleNewMayorChange('name', e.target.value)}
                          className="form-control"
                          placeholder="Enter mayor name"
                          style={{ borderRadius: '12px' }}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Political Party</label>
                        <input
                          type="text"
                          value={newCity.mayor?.politicalParty || ''}
                          onChange={(e) => handleNewMayorChange('politicalParty', e.target.value)}
                          className="form-control"
                          placeholder="Enter political party"
                          style={{ borderRadius: '12px' }}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Term Start</label>
                        <input
                          type="date"
                          value={newCity.mayor?.termStart || ''}
                          onChange={(e) => handleNewMayorChange('termStart', e.target.value)}
                          className="form-control"
                          style={{ borderRadius: '12px' }}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Term End</label>
                        <input
                          type="date"
                          value={newCity.mayor?.termEnd || ''}
                          onChange={(e) => handleNewMayorChange('termEnd', e.target.value)}
                          className="form-control"
                          style={{ borderRadius: '12px' }}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Mayor Image URL</label>
                        <input
                          type="url"
                          value={newCity.mayor?.image || ''}
                          onChange={(e) => handleNewMayorChange('image', e.target.value)}
                          className="form-control"
                          placeholder="https://example.com/mayor.jpg"
                          style={{ borderRadius: '12px' }}
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-semibold">Mayor Biography</label>
                        <textarea
                          value={newCity.mayor?.bio || ''}
                          onChange={(e) => handleNewMayorChange('bio', e.target.value)}
                          className="form-control"
                          rows={4}
                          placeholder="Enter mayor's biography"
                          style={{ borderRadius: '12px' }}
                        />
                      </div>
                    </div>

                    <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                      <button
                        onClick={() => {
                          setIsAddingCity(false);
                          setNewCity({ ...DEFAULT_CITY_DATA });
                        }}
                        className="btn btn-outline-secondary"
                        disabled={isSaving}
                        style={{ borderRadius: '12px' }}
                      >
                        <i className="bi bi-x-circle me-1"></i>Cancel
                      </button>
                      <button
                        onClick={handleAddCity}
                        className="btn btn-success"
                        disabled={!newCity.name.trim() || isSaving}
                        style={{ borderRadius: '12px' }}
                      >
                        {isSaving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Saving...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check-circle me-1"></i>Add City
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Cities Grid */}
              <div className="row g-4">
                {Object.entries(cities).map(([normalizedName, cityData]) => {
                  const cityName = cityData.name;
                  const isEditing = editingCity === cityName;
                  
                  return (
                    <div key={normalizedName} className="col-12 col-lg-6 col-xl-4">
                      <div 
                        className={`card h-100 shadow-sm border-0 position-relative transition-all ${
                          isEditing ? 'border-primary shadow-lg' : ''
                        }`}
                        style={{ 
                          borderRadius: '20px',
                          transform: isEditing ? 'scale(1.02)' : 'scale(1)',
                          transition: 'all 0.3s ease',
                          background: isEditing 
                            ? 'linear-gradient(135deg, #f8f9ff 0%, #e3f2fd 100%)' 
                            : 'white'
                        }}
                      >


                        {/* City Image */}
                        {cityData.image && (
                          <div className="position-relative">
                            <img
                              src={cityData.image}
                              alt={cityName}
                              className="card-img-top"
                              style={{ 
                                height: '200px', 
                                objectFit: 'cover',
                                borderRadius: '20px 20px 0 0'
                              }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <div className="position-absolute bottom-0 end-0 m-3">
                              <span className="badge bg-dark bg-opacity-75">
                                <i className="bi bi-geo-fill me-1"></i>
                                {cityData.coordinates[0].toFixed(2)}, {cityData.coordinates[1].toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        <div className="card-body d-flex flex-column p-4">
                          {/* City Header */}
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <h5 className="card-title text-primary fw-bold mb-0 fs-4">{cityName}</h5>
                            <div className="dropdown">
                              <button 
                                className="btn btn-sm btn-outline-primary dropdown-toggle shadow-sm" 
                                type="button" 
                                data-bs-toggle="dropdown"
                                style={{ borderRadius: '12px' }}
                              >
                                <i className="bi bi-three-dots"></i>
                              </button>
                              <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0" style={{ borderRadius: '12px', zIndex: 1050 }}>
                                <li>
                                  <button 
                                    className="dropdown-item d-flex align-items-center" 
                                    onClick={() => handleEditMayor(cityName)}
                                    disabled={isSaving}
                                  >
                                    <i className="bi bi-pencil me-2 text-primary"></i>
                                    {cityData.mayor ? 'Edit Mayor' : 'Add Mayor'}
                                  </button>
                                </li>
                                <li><hr className="dropdown-divider" /></li>
                                <li>
                                  <button 
                                    className="dropdown-item d-flex align-items-center text-danger" 
                                    onClick={() => handleDeleteCity(cityName)}
                                    disabled={isSaving}
                                  >
                                    <i className="bi bi-trash me-2"></i>Delete City
                                  </button>
                                </li>
                              </ul>
                            </div>
                          </div>

                          {/* City Description */}
                          <div className="bg-light p-3 rounded-3 mb-3">
                            <p className="card-text text-muted small mb-0" style={{ minHeight: '60px' }}>
                              {cityData.description || 'No description available'}
                            </p>
                          </div>

                          {isEditing ? (
                            // Edit Mayor Form
                            <div className="border-top pt-3 mt-auto">
                              <div className="d-flex align-items-center mb-3">
                                <div className="bg-info rounded-circle p-2 me-3">
                                  <i className="bi bi-person-badge text-white"></i>
                                </div>
                                <h6 className="text-info mb-0 fw-bold">Edit Mayor Information</h6>
                              </div>
                              <div className="row g-2">
                                {Object.entries(DEFAULT_MAYOR_DATA).map(([field]) => (
                                  <div key={field} className="col-12">
                                    <label className="form-label small fw-semibold text-capitalize">
                                      {field.replace(/([A-Z])/g, ' $1').trim()}
                                    </label>
                                    {field === 'bio' ? (
                                      <textarea
                                        value={cityData.mayor?.[field as keyof MayorData] || ''}
                                        onChange={(e) => handleMayorChange(field as keyof MayorData, e.target.value, cityName)}
                                        className="form-control form-control-sm"
                                        rows={3}
                                        placeholder={`Enter ${field}`}
                                        style={{ borderRadius: '8px' }}
                                      />
                                    ) : (
                                      <input
                                        type={field.includes('term') ? 'date' : 'text'}
                                        value={cityData.mayor?.[field as keyof MayorData] || ''}
                                        onChange={(e) => handleMayorChange(field as keyof MayorData, e.target.value, cityName)}
                                        className="form-control form-control-sm"
                                        placeholder={`Enter ${field}`}
                                        style={{ borderRadius: '8px' }}
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>

                              <div className="d-flex justify-content-end gap-2 mt-3">
                                <button
                                  onClick={() => setEditingCity(null)}
                                  className="btn btn-sm btn-outline-secondary"
                                  disabled={isSaving}
                                  style={{ borderRadius: '8px' }}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleSave}
                                  className="btn btn-sm btn-primary"
                                  disabled={isSaving}
                                  style={{ borderRadius: '8px' }}
                                >
                                  {isSaving ? (
                                    <>
                                      <span className="spinner-border spinner-border-sm me-1"></span>
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <i className="bi bi-check-lg me-1"></i>Save
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          ) : (
                            // Display Mayor Info
                            <div className="border-top pt-3 mt-auto">
                              {cityData.mayor?.name?.trim() ? (
                                <div className="bg-gradient-info p-3 rounded-3" style={{ background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)' }}>
                                  <div className="d-flex align-items-center mb-3">
                                    <div className="bg-info rounded-circle p-2 me-3">
                                      <i className="bi bi-person-badge text-white"></i>
                                    </div>
                                    <h6 className="text-info mb-0 fw-bold">Current Mayor</h6>
                                  </div>
                                  <div className="d-flex align-items-start gap-3 mb-3">
                                    {cityData.mayor.image && (
                                      <img
                                        src={cityData.mayor.image}
                                        alt={cityData.mayor.name}
                                        className="rounded-circle border border-3 border-white shadow"
                                        style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = '/images/default-mayor.png';
                                        }}
                                      />
                                    )}
                                    <div className="flex-grow-1">
                                      <h6 className="mb-1 fw-bold text-dark">{cityData.mayor.name}</h6>
                                      <div className="small text-muted">
                                        {cityData.mayor.politicalParty && (
                                          <div className="mb-1">
                                            <i className="bi bi-flag me-1 text-primary"></i>
                                            {cityData.mayor.politicalParty}
                                          </div>
                                        )}
                                        {(cityData.mayor.termStart || cityData.mayor.termEnd) && (
                                          <div>
                                            <i className="bi bi-calendar-range me-1 text-success"></i>
                                            {cityData.mayor.termStart} - {cityData.mayor.termEnd}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {cityData.mayor.bio && (
                                    <p className="small text-muted mb-0" style={{ fontSize: '0.8rem' }}>
                                      {cityData.mayor.bio}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-4 bg-light rounded-3">
                                  <div className="text-muted mb-3">
                                    <i className="bi bi-person-x" style={{ fontSize: '3rem', opacity: 0.5 }}></i>
                                  </div>
                                  <h6 className="text-muted fw-semibold">No Mayor Information</h6>
                                  <p className="text-muted small mb-0">Click "Add Mayor" to get started</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Empty State */}
              {Object.keys(cities).length === 0 && (
                <div className="text-center py-5">
                  <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{ width: '120px', height: '120px' }}>
                    <i className="bi bi-building text-muted" style={{ fontSize: '4rem' }}></i>
                  </div>
                  <h5 className="text-muted fw-bold mb-2">No Cities Found</h5>
                  <p className="text-muted mb-4">Get started by adding your first city to the system</p>
                  <button
                    onClick={() => setIsAddingCity(true)}
                    className="btn btn-primary btn-lg"
                    style={{ borderRadius: '12px' }}
                  >
                    <i className="bi bi-plus-circle me-2"></i>Add Your First City
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </section>

      {/* Custom Styles */}
      <style>{`
        .bg-gradient-primary {
          background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
        }
        
        .transition-all {
          transition: all 0.3s ease;
        }
        
        .card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
        }
        
        .dropdown-menu {
          animation: fadeInUp 0.2s ease;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .form-control:focus {
          border-color: #007bff;
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }
        
        .btn {
          transition: all 0.2s ease;
        }
        
        .btn:hover {
          transform: translateY(-1px);
        }
        
        .badge {
          font-size: 0.75em;
          padding: 0.5em 0.75em;
        }
        
        .spinner-border {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MayorManagement;