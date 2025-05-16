import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import CreatePrograms from "./createPrograms";
import Select, { ActionMeta, MultiValue } from "react-select";
import "bootstrap/dist/css/bootstrap.min.css";
import Swal from "sweetalert2";

interface Program {
  id: string;
  programName: string;
  description: string;
  link: string;
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

const ManagePrograms: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Program>>({});
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [users, setUsers] = useState<User[]>([]);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const formatFullDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Fetch users with roles
  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const userList = snapshot.docs.map((doc) => {
        const data = doc.data();
        const fullName = `${data.fname} ${data.mname || ""} ${data.lname}`.trim() || data.email || "Unknown User";
        return { 
          id: doc.id, 
          fullName,
          email: data.email || "",
          role: data.role || "No Role"
        };
      });
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load users',
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
    if (!editingId) return;

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

  // Fetch programs
  useEffect(() => {
    const fetchPrograms = async () => {
      const snapshot = await getDocs(collection(db, "programs"));
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Program[];
      setPrograms(list);
    };
    fetchPrograms();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditClick = (program: Program) => {
    setEditingId(program.id);
    setEditData(program);
    setImagePreview(program.imageUrl || null);
    setNewImage(null);
  };

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
    if (!editingId) return;
    
    try {
      const imageUrl = await uploadImage();
      
      const updatedData = {
        ...editData,
        ...(imageUrl && { imageUrl })
      };

      const programRef = doc(db, "programs", editingId);
      await updateDoc(programRef, updatedData);
      
      setEditingId(null);
      setPrograms((prev) =>
        prev.map((prog) => (prog.id === editingId ? { ...prog, ...updatedData } : prog))
      );
      
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
  
  const deleteProgram = async (id: string) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        await deleteDoc(doc(db, "programs", id));
        setPrograms(programs.filter((p) => p.id !== id));
        
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Program has been deleted successfully',
          timer: 2000,
          showConfirmButton: false
        });
      }
    });
  };

  const filteredPrograms = programs.filter((p) =>
    p.programName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container py-4">
      <CreatePrograms />
      <h2>Manage Programs</h2>
      
      <div className="row mb-3">
        <div className="col-md-6">
          <input
            type="text"
            className="form-control"
            placeholder="Search programs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <table className="table table-striped">
        <thead>
          <tr>
            <th>Image</th>
            <th>Program Name</th>
            <th>Description</th>
            <th>Link</th>
            <th>Duration</th>
            <th>Frequency</th>
            <th>Participants</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredPrograms.map((program) => (
            <tr
  key={program.id}
  style={{ cursor: "pointer" }}
  onClick={() => window.location.href = `/program-links/${program.id}`}
  title="Click to manage links"
>
  <td>
    {program.imageUrl && (
      <img 
        src={program.imageUrl} 
        alt={program.programName}
        style={{ width: '50px', height: '50px', objectFit: 'cover' }}
        className="img-thumbnail"
      />
    )}
  </td>
  <td>{program.programName}</td>
  <td>{program.description}</td>
  <td>
    {program.link && (
      <a href={program.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
        View Link
      </a>
    )}
  </td>
  <td>
    {formatFullDate(program.duration.from)} - {formatFullDate(program.duration.to)}
  </td>
  <td>{program.frequency}</td>
  <td>{program.participants.length}</td>
  <td>
    <div className="d-flex gap-2">
      <button
        className="btn btn-sm btn-outline-primary"
        data-bs-toggle="modal"
        data-bs-target="#editModal"
        onClick={(e) => {
          e.stopPropagation(); // prevent redirect
          handleEditClick(program);
        }}
      >
        <i className="bi bi-pencil-fill"></i> Edit
      </button>
      <button
        className="btn btn-sm btn-outline-danger"
        onClick={(e) => {
          e.stopPropagation(); // prevent redirect
          deleteProgram(program.id);
        }}
      >
        <i className="bi bi-trash-fill"></i> Delete
      </button>
    </div>
  </td>
</tr>

          ))}
        </tbody>
      </table>

      {/* Edit Modal */}
      <div className="modal fade" id="editModal" tabIndex={-1}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Edit Program</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
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
                    <label className="form-label">Link</label>
                    <input
                      className="form-control"
                      value={editData.link || ""}
                      onChange={(e) => handleChange("link", e.target.value)}
                      placeholder="Link"
                    />
                  </div>
                </div>
              </div>

              <div className="row">
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
              </div>

              {/* Frequency-specific Inputs */}
              {editData.frequency === "daily" && (
                <div className="mb-3">
                  <label className="form-label">Daily Time</label>
                  <input
                    type="time"
                    className="form-control"
                    value={editData.dailyTime || ""}
                    onChange={(e) => handleChange("dailyTime", e.target.value)}
                  />
                </div>
              )}

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
    </div>
  );
};

export default ManagePrograms;