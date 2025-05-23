import React, { useState, useEffect } from 'react';
import { OrgChartNode } from '../../../components/Elements/D3OrgChart';

interface UserModalProps {
  show: boolean;
  mode: 'add' | 'edit';
  nodes: OrgChartNode[];
  selectedId: number | null;
  form: Partial<Omit<OrgChartNode, "img">> & { img?: string | File; superiorId?: number };
  newNode: Partial<Omit<OrgChartNode, "img">> & { img?: string | File; superiorId?: number };
  loading: boolean;
  onClose: () => void;
  onSave: () => void;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>, mode: 'add' | 'edit') => void;
  onFieldUpdate: (field: keyof OrgChartNode | 'superiorId', value: string | number | undefined) => void;
  onNewNodeUpdate: (
    updates: Partial<Omit<OrgChartNode, "img">> & { img?: string | File; superiorId?: number }
  ) => void;
}

interface ValidationErrors {
  name?: string;
  email?: string;
  position1?: string;
  section?: string;
  cluster?: string;
  superiorId?: string;
}

const UserModal: React.FC<UserModalProps> = ({
  show,
  mode,
  nodes,
  selectedId,
  form,
  newNode,
  loading,
  onClose,
  onSave,
  onImageChange,
  onFieldUpdate,
  onNewNodeUpdate,
}) => {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const isAddMode = mode === 'add';
  const currentData = isAddMode ? newNode : form;

  // Clear errors when modal is closed or mode changes
  useEffect(() => {
    if (!show) {
      setErrors({});
      setTouched({});
    }
  }, [show, mode]);

  const validateField = (field: string, value: string | undefined): string | undefined => {
    switch (field) {
      case 'name':
        if (!value || value.trim().length === 0) return 'Full name is required';
        if (value.trim().length < 2) return 'Full name must be at least 2 characters';
        break;
      case 'email':
        if (!value || value.trim().length === 0) return 'Email address is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) return 'Please enter a valid email address';
        break;
      case 'position1':
        if (!value || value.trim().length === 0) return 'Position is required';
        if (value.trim().length < 2) return 'Position must be at least 2 characters';
        break;
      case 'section':
        if (!value || value.trim().length === 0) return 'Section is required';
        break;
      case 'cluster':
        if (!value || value.trim().length === 0) return 'Cluster is required';
        break;
      case 'superiorId':
        if (!value || value.toString().trim().length === 0) return 'Superior is required';
        break;
      default:
        return undefined;
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    const requiredFields = ['name', 'email', 'position1', 'section', 'cluster', 'superiorId'];

    requiredFields.forEach(field => {
      const value = currentData[field as keyof typeof currentData] as string | number;
      const error = validateField(field, value?.toString());
      if (error) {
        newErrors[field as keyof ValidationErrors] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string | number | undefined) => {
    // Clear error for this field when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }

    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));

    if (isAddMode) {
      onNewNodeUpdate({ ...newNode, [field]: value });
    } else {
      onFieldUpdate(field as keyof OrgChartNode | 'superiorId', value);
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));

    const value = currentData[field as keyof typeof currentData] as string | number;
    const error = validateField(field, value?.toString());
    
    if (error) {
      setErrors(prev => ({
        ...prev,
        [field]: error
      }));
    }
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave();
    } else {
      // Mark all required fields as touched to show errors
      const requiredFields = ['name', 'email', 'position1', 'section', 'cluster', 'superiorId'];
      const newTouched: Record<string, boolean> = {};
      requiredFields.forEach(field => {
        newTouched[field] = true;
      });
      setTouched(newTouched);
    }
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              <i className={`bi ${isAddMode ? 'bi-person-plus' : 'bi-person-gear'} me-2`}></i>
              {isAddMode ? 'Add New User' : 'Edit User'}
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              disabled={loading}
            ></button>
          </div>

          <div className="modal-body">
            <form>
              {/* Profile Picture Section */}
              <div className="mb-4 p-3 bg-light rounded">
                <h6 className="fw-bold mb-3">
                  <i className="bi bi-image me-2"></i>Profile Picture <span className="text-muted">(Optional)</span>
                </h6>
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <input
                      type="file"
                      accept="image/*"
                      className="form-control"
                      onChange={(e) => onImageChange(e, mode)}
                      disabled={loading}
                    />
                    <div className="form-text">
                      Maximum size: 500KB. Supported formats: JPEG, PNG, WebP
                    </div>
                  </div>
                  <div className="col-md-4">
                    {!isAddMode && form.img && typeof form.img === 'string' && (
                      <div className="text-center">
                        <img
                          src={form.img}
                          alt="Current"
                          className="img-thumbnail rounded-circle"
                          style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                        />
                        <small className="d-block text-muted mt-1">Current</small>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Basic Information */}
              <div className="mb-4">
                <h6 className="fw-bold mb-3">
                  <i className="bi bi-person me-2"></i>Basic Information
                </h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${errors.name && touched.name ? 'is-invalid' : ''}`}
                      placeholder="e.g., John Doe"
                      value={currentData.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      onBlur={() => handleBlur('name')}
                      disabled={loading}
                    />
                    {errors.name && touched.name && (
                      <div className="invalid-feedback">{errors.name}</div>
                    )}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">
                      Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className={`form-control ${errors.email && touched.email ? 'is-invalid' : ''}`}
                      placeholder="e.g., john.doe@company.com"
                      value={currentData.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      onBlur={() => handleBlur('email')}
                      disabled={loading}
                    />
                    {errors.email && touched.email && (
                      <div className="invalid-feedback">{errors.email}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Position Information */}
              <div className="mb-4">
                <h6 className="fw-bold mb-3">
                  <i className="bi bi-briefcase me-2"></i>Position Information
                </h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      Position <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${errors.position1 && touched.position1 ? 'is-invalid' : ''}`}
                      placeholder="e.g., Chief Executive Officer"
                      value={currentData.position1 || ''}
                      onChange={(e) => handleInputChange('position1', e.target.value)}
                      onBlur={() => handleBlur('position1')}
                      disabled={loading}
                    />
                    {errors.position1 && touched.position1 && (
                      <div className="invalid-feedback">{errors.position1}</div>
                    )}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">
                      Designation <span className="text-muted">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., CEO"
                      value={currentData.position2 || ''}
                      onChange={(e) => handleInputChange('position2', e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">
                      Section <span className="text-danger">*</span>
                    </label>
                    <select
                      className={`form-select ${errors.section && touched.section ? 'is-invalid' : ''}`}
                      value={currentData.section || ''}
                      onChange={(e) => handleInputChange('section', e.target.value)}
                      onBlur={() => handleBlur('section')}
                      disabled={loading}
                    >
                      <option value="">-- Select Section --</option>
                      <option value="MES">Monitoring and Evaluation Section (MES)</option>
                      <option value="FAS">Financial and Administrative Section (FAS)</option>
                      <option value="CDS">Capability Development Section (CDS)</option>
                      <option value="PDMU">Project and Development Monitoring Unit (PDMU)</option>
                    </select>
                    {errors.section && touched.section && (
                      <div className="invalid-feedback">{errors.section}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div className="mb-4">
                <h6 className="fw-bold mb-3">
                  <i className="bi bi-geo-alt me-2"></i>Location Information
                </h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      City <span className="text-muted">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., Trece Martires"
                      value={currentData.city || ''}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">
                      Cluster <span className="text-danger">*</span>
                    </label>
                    <select
                      className={`form-select ${errors.cluster && touched.cluster ? 'is-invalid' : ''}`}
                      value={currentData.cluster || ''}
                      onChange={(e) => handleInputChange('cluster', e.target.value)}
                      onBlur={() => handleBlur('cluster')}
                      disabled={loading}
                    >
                      <option value="">-- Select Cluster --</option>
                      <option value="A">Cluster A</option>
                      <option value="B">Cluster B</option>
                      <option value="C">Cluster C</option>
                      <option value="D">Cluster D</option>
                    </select>
                    {errors.cluster && touched.cluster && (
                      <div className="invalid-feedback">{errors.cluster}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Hierarchy Information */}
              <div className="mb-4">
                <h6 className="fw-bold mb-3">
                  <i className="bi bi-diagram-3 me-2"></i>Hierarchy
                </h6>
                <div className="col-12">
                  <label className="form-label">
                    Superior <span className="text-danger">*</span>
                  </label>
                  <select
                    className={`form-select ${errors.superiorId && touched.superiorId ? 'is-invalid' : ''}`}
                    value={currentData.superiorId?.toString() || ''}
                    onChange={(e) => handleInputChange('superiorId', e.target.value ? +e.target.value : undefined)}
                    onBlur={() => handleBlur('superiorId')}
                    disabled={loading}
                  >
                    <option value="">-- Select Superior --</option>
                    {nodes
                      .filter(n => n.id !== selectedId)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name} ({n.position1})
                        </option>
                      ))
                    }
                  </select>
                  {errors.superiorId && touched.superiorId && (
                    <div className="invalid-feedback">{errors.superiorId}</div>
                  )}
                </div>
              </div>

              {/* Error Summary */}
              {Object.keys(errors).length > 0 && Object.values(touched).some(Boolean) && (
                <div className="alert alert-danger" role="alert">
                  <h6 className="alert-heading">
                    <i className="bi bi-exclamation-triangle me-2"></i>Please fix the following errors:
                  </h6>
                  <ul className="mb-0">
                    {Object.entries(errors).map(([field, error]) => (
                      touched[field] && error && <li key={field}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </form>
          </div>

          <div className="modal-footer bg-light">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              <i className="bi bi-x-circle me-2"></i>Cancel
            </button>
            <button
              type="button"
              className={`btn ${isAddMode ? 'btn-primary' : 'btn-success'}`}
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Saving...
                </>
              ) : (
                <>
                  <i className={`bi ${isAddMode ? 'bi-plus-circle' : 'bi-check-circle'} me-2`}></i>
                  {isAddMode ? 'Add User' : 'Update User'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserModal;