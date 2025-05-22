import React, { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import Select, { ActionMeta, MultiValue } from "react-select";
import Swal from "sweetalert2";
import OutcomeAreaDropdown from "./modules/program-modules/OutcomeAreaDropdown";

interface Program {
  id: string;
  programName: string;
  description: string;
  outcomeArea?: string;

  duration: { from: string; to: string };
  frequency: string;
  participants: string[];
  imageUrl?: string;
  dailyTime?: string;
  weeklyDay?: string;
  monthlyDay?: string;
  yearlyMonth?: string;
  yearlyDay?: string;
  quarter?: string;
  quarterDay?: string;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

interface EditProgramModalProps {
  program: Program | null;
  users: User[];
  onSave: (updatedProgram: Program) => void;
  onClose: () => void;
}

const EditProgramModal: React.FC<EditProgramModalProps> = ({
  program,
  users,
  onSave,
  onClose,
}) => {
  const [editData, setEditData] = useState<Partial<Program>>({});
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (program) {
      setEditData(program);
      setImagePreview(program.imageUrl || null);
      setNewImage(null);
    }
  }, [program]);

  const handleChange = (field: keyof Program, value: any) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewImage(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!newImage) return editData.imageUrl || null;

    const formData = new FormData();
    formData.append('file', newImage);
    formData.append('upload_preset', 'uploads');
    formData.append("resource_type", "auto");

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/dr5c99td8/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Image upload failed');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Error uploading image:', error);
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: 'Failed to upload new image',
      });
      return editData.imageUrl || null;
    }
  };

  const saveChanges = async () => {
    if (!program || !program.id) return;
    
    try {
      const imageUrl = await uploadImage();
      
      const updatedData = {
        ...editData,
        ...(imageUrl && { imageUrl })
      };

      const programRef = doc(db, "programs", program.id);
      await updateDoc(programRef, updatedData as { [x: string]: any });
      
      // Only after successful update, create a properly typed object for the parent component
      const updatedProgram = {
        ...program,
        ...updatedData
      } as Program;
      
      onSave(updatedProgram);
      
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Program updated successfully',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Error updating program:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update program',
      });
    }
  };

  // Group users by roles with counts
  const groupedOptions = Object.entries(
    users.reduce((groups, user) => {
      const role = user.role || "No Role";
      if (!groups[role]) groups[role] = [];
      groups[role].push({ 
        value: user.id, 
        label: user.fullName 
      });
      return groups;
    }, {} as Record<string, { value: string; label: string }[]>)
  ).map(([role, options]) => ({
    label: `${role.charAt(0).toUpperCase() + role.slice(1)} (${options.length})`,
    options: [
      {
        value: `toggle_all_${role}`,
        label: `Select all ${role}`,
        isSelectAll: true,
        role,
      },
      ...options,
    ],
  }));

  const handleParticipantChange = (
    newValue: MultiValue<{ value: string; label: string; isSelectAll?: boolean; role?: string }>,
    actionMeta: ActionMeta<{ value: string; label: string; isSelectAll?: boolean; role?: string }>
  ) => {
    if (actionMeta.action === 'remove-value' || 
        actionMeta.action === 'pop-value' ||
        actionMeta.action === 'deselect-option') {
      const removedValue = actionMeta.removedValue || actionMeta.option;
      
      if (!removedValue) return;
      
      if (!removedValue.isSelectAll) {
        setEditData(prev => ({
          ...prev,
          participants: (prev.participants || []).filter(id => id !== removedValue.value)
        }));
        return;
      }
      
      if (removedValue.isSelectAll && removedValue.role) {
        const usersInRole = users
          .filter(user => user.role === removedValue.role)
          .map(user => user.id);
        setEditData(prev => ({
          ...prev,
          participants: (prev.participants || []).filter(id => !usersInRole.includes(id))
        }));
        return;
      }
    }
    
    const selectedOptions = newValue;
    let newParticipants = [...(editData.participants || [])];
    
    const toggledSelectAlls = selectedOptions
      .filter(option => option.isSelectAll && option.role)
      .map(option => option.role);
  
    toggledSelectAlls.forEach(role => {
      if (!role) return;
      
      const usersInRole = users
        .filter(user => user.role === role)
        .map(user => user.id);
  
      const wasJustSelected = selectedOptions.some(
        opt => opt.isSelectAll && opt.role === role && !(editData.participants || []).includes(opt.value)
      );
  
      if (wasJustSelected) {
        const allCurrentlySelected = usersInRole.every(id => (editData.participants || []).includes(id));
        
        if (allCurrentlySelected) {
          newParticipants = newParticipants.filter(id => !usersInRole.includes(id));
        } else {
          newParticipants = newParticipants.filter(id => {
            const user = users.find(u => u.id === id);
            return user?.role !== role;
          });
          newParticipants = [...newParticipants, ...usersInRole];
        }
      }
    });
  
    const regularSelections = selectedOptions
      .filter(option => !option.isSelectAll)
      .map(option => option.value);
  
    const allSelections = [...new Set([...newParticipants, ...regularSelections])];
    
    setEditData(prev => ({
      ...prev,
      participants: allSelections
    }));
  };

  return (
    <div className="modal fade" id="editModal" tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Edit Program</h5>
            <button 
              type="button" 
              className="btn-close" 
              data-bs-dismiss="modal"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            <div className="row">
              <div className="col-md-4 mb-3">
                <label className="form-label">Program Image</label>
                <input
                  type="file"
                  className="form-control"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {(imagePreview || editData.imageUrl) && (
                  <div className="mt-2">
                    <img 
                      src={imagePreview || editData.imageUrl} 
                      alt="Preview" 
                      className="img-thumbnail" 
                      style={{ maxWidth: '100%', height: 'auto' }}
                    />
                    <button 
                      className="btn btn-sm btn-danger mt-2"
                      onClick={() => {
                        setNewImage(null);
                        setImagePreview(null);
                        handleChange("imageUrl", null);
                      }}
                    >
                      Remove Image
                    </button>
                  </div>
                )}
              </div>
              <div className="col-md-8">
                <div className="mb-3">
                  <label className="form-label">Program Name</label>
                  <input
                    className="form-control"
                    value={editData.programName || ""}
                    onChange={(e) => handleChange("programName", e.target.value)}
                    placeholder="Program Name"
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    value={editData.description || ""}
                    onChange={(e) => handleChange("description", e.target.value)}
                    placeholder="Description"
                    rows={3}
                  />
                </div>
                
<div className="mb-3">
  <label className="form-label">Outcome Area</label>
  <OutcomeAreaDropdown
    value={
      editData.outcomeArea
        ? {
            value: editData.outcomeArea,
            label: editData.outcomeArea,
            color: "#0d6efd", // Default fallback
            textColor: "#fff",
          }
        : null
    }
    onChange={(selected) => {
      handleChange("outcomeArea", selected?.value || "");
    }}
  />
</div>

              </div>
            </div>

            {/* <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Duration</label>
                <div className="row">
                  <div className="col">
                    <input
                      type="date"
                      className="form-control"
                      value={editData.duration?.from || ""}
                      onChange={(e) =>
                        handleChange("duration", {
                          ...editData.duration,
                          from: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="col">
                    <input
                      type="date"
                      className="form-control"
                      value={editData.duration?.to || ""}
                      onChange={(e) =>
                        handleChange("duration", {
                          ...editData.duration,
                          to: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

             <div className="col-md-6 mb-3">
                <label className="form-label">Frequency</label>
                <select
                  className="form-select"
                  value={editData.frequency || ""}
                  onChange={(e) => handleChange("frequency", e.target.value)}
                >
                  <option value="">Select Frequency</option>
                  <option value="yearly">Yearly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                </select>
              </div> 
            </div> */}

            {/* Frequency-specific Inputs */}
            {/* {editData.frequency === "daily" && (
              <div className="mb-3">
                <label className="form-label">Daily Time</label>
                <input
                  type="time"
                  className="form-control"
                  value={editData.dailyTime || ""}
                  onChange={(e) => handleChange("dailyTime", e.target.value)}
                />
              </div>
            )} */}
            
            {/* Weekly-specific fields */}
            {/* {editData.frequency === "weekly" && (
              <div className="mb-3">
                <label className="form-label">Weekly Day</label>
                <select
                  className="form-select"
                  value={editData.weeklyDay || ""}
                  onChange={(e) => handleChange("weeklyDay", e.target.value)}
                >
                  <option value="">Select Day</option>
                  <option value="sunday">Sunday</option>
                  <option value="monday">Monday</option>
                  <option value="tuesday">Tuesday</option>
                  <option value="wednesday">Wednesday</option>
                  <option value="thursday">Thursday</option>
                  <option value="friday">Friday</option>
                  <option value="saturday">Saturday</option>
                </select>
              </div>
            )} */}
            
            {/* Monthly-specific fields */}
            {/* {editData.frequency === "monthly" && (
              <div className="mb-3">
                <label className="form-label">Monthly Day</label>
                <input
                  type="number"
                  className="form-control"
                  min="1"
                  max="31"
                  value={editData.monthlyDay || ""}
                  onChange={(e) => handleChange("monthlyDay", e.target.value)}
                  placeholder="Day of month (1-31)"
                />
              </div>
            )} */}
            
            {/* Quarterly-specific fields */}
            {/* {editData.frequency === "quarterly" && (
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Quarter</label>
                  <select
                    className="form-select"
                    value={editData.quarter || ""}
                    onChange={(e) => handleChange("quarter", e.target.value)}
                  >
                    <option value="">Select Quarter</option>
                    <option value="Q1">Q1 (Jan-Mar)</option>
                    <option value="Q2">Q2 (Apr-Jun)</option>
                    <option value="Q3">Q3 (Jul-Sep)</option>
                    <option value="Q4">Q4 (Oct-Dec)</option>
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Quarter Day</label>
                  <input
                    type="number"
                    className="form-control"
                    min="1"
                    max="31"
                    value={editData.quarterDay || ""}
                    onChange={(e) => handleChange("quarterDay", e.target.value)}
                    placeholder="Day of quarter month"
                  />
                </div>
              </div>
            )} */}
            
            {/* Yearly-specific fields */}
            {/* {editData.frequency === "yearly" && (
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Month</label>
                  <select
                    className="form-select"
                    value={editData.yearlyMonth || ""}
                    onChange={(e) => handleChange("yearlyMonth", e.target.value)}
                  >
                    <option value="">Select Month</option>
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Day</label>
                  <input
                    type="number"
                    className="form-control"
                    min="1"
                    max="31"
                    value={editData.yearlyDay || ""}
                    onChange={(e) => handleChange("yearlyDay", e.target.value)}
                    placeholder="Day of month (1-31)"
                  />
                </div>
              </div>
            )} */}

            {/* Participants */}
            <div className="mb-3">
              <label className="form-label">Participants</label>
              <Select
                options={groupedOptions}
                isMulti
                value={groupedOptions.flatMap(group => group.options).filter((option) => {
                  if ((editData.participants || []).includes(option.value)) return true;
                  if ('isSelectAll' in option && option.isSelectAll && option.role) {
                    const usersInRole = users.filter(user => user.role === option.role);
                    return usersInRole.every(user => (editData.participants || []).includes(user.id));
                  }
                  return false;
                })}
                onChange={handleParticipantChange}
                className="basic-multi-select"
                classNamePrefix="select"
                placeholder="Select participants by role..."
                closeMenuOnSelect={false}
                hideSelectedOptions={false}
                isClearable={false}
                backspaceRemovesValue={true}
                escapeClearsValue={false}
                getOptionLabel={(option) => {
                  if ('isSelectAll' in option && option.isSelectAll && option.role) {
                    const usersInRole = users.filter(u => u.role === option.role);
                    const allSelected = usersInRole.every(u => (editData.participants || []).includes(u.id));
                    const someSelected = usersInRole.some(u => (editData.participants || []).includes(u.id));
                    
                    return allSelected 
                      ? `✓ All ${option.role} selected` 
                      : someSelected
                        ? `↻ ${usersInRole.filter(u => (editData.participants || []).includes(u.id)).length}/${usersInRole.length} ${option.role} selected`
                        : `Select all ${option.role}`;
                  }
                  return option.label;
                }}
                formatGroupLabel={(group) => (
                  <div className="d-flex justify-content-between">
                    <span>{group.label}</span>
                    <span className="badge bg-primary rounded-pill">
                      {group.options.length - 1}
                    </span>
                  </div>
                )}
              />
              
              <div className="selected-participants-summary mt-2">
                <small>
                  Selected: {(editData.participants || []).length} participants | 
                  {Object.entries(
                    (editData.participants || []).reduce((acc, id) => {
                      const user = users.find(u => u.id === id);
                      const role = user?.role || 'No Role';
                      acc[role] = (acc[role] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([role, count]) => (
                    <span key={role} className="badge bg-secondary ms-2">
                      {role}: {count}
                    </span>
                  ))}
                </small>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              data-bs-dismiss="modal"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={saveChanges}
              data-bs-dismiss="modal"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProgramModal;