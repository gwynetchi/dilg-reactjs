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
import Select from "react-select";
import "bootstrap/dist/css/bootstrap.min.css";
import Swal from "sweetalert2";

// Updated Program interface with imageUrl
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

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, "users"));
      const userList = snapshot.docs.map((doc) => {
        const data = doc.data();
        const fullName = `${data.fname} ${data.mname || ""} ${data.lname}`.trim();
        return { id: doc.id, fullName };
      });
      setUsers(userList);
    };

    fetchUsers();
  }, []);

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
      
      // Create preview
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
      // Upload new image if one was selected
      const imageUrl = await uploadImage();
      
      // Prepare updated data
      const updatedData = {
        ...editData,
        ...(imageUrl && { imageUrl }) // Only include imageUrl if it exists
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
            <tr key={program.id}>
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
                  <a href={program.link} target="_blank" rel="noopener noreferrer">
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
                    onClick={() => handleEditClick(program)}
                  >
                    <i className="bi bi-pencil-fill"></i> Edit
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => deleteProgram(program.id)}
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

              {/* Other frequency inputs remain the same... */}

              {/* Participants */}
              <div className="mb-3">
                <label className="form-label">Participants</label>
                <Select
                  isMulti
                  options={users.map((user) => ({
                    value: user.id,
                    label: user.fullName,
                  }))}
                  value={(editData.participants || [])
                    .map((id) => {
                      const user = users.find((u) => u.id === id);
                      return user ? { value: user.id, label: user.fullName } : null;
                    })
                    .filter(Boolean)} 
                  onChange={(selectedOptions) =>
                    handleChange(
                      "participants",
                      selectedOptions.map((option) => option?.value).filter((value) => value !== null)
                    )
                  }
                  placeholder="Select participants..."
                />
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