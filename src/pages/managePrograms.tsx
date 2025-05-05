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
import Swal from "sweetalert2"; // Import SweetAlert2

// Define Program interface
interface Program {
  id: string;
  programName: string;
  description: string;
  link: string;
  duration: { from: string; to: string };
  frequency: string;
  participants: string[];
  dailyTime?: string;
  weeklyDay?: string;
  monthlyDay?: string;
  yearlyMonth?: string;
  yearlyDay?: string;
  quarter?: string;
  quarterDay?: string;
}

// Define User interface for select options
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
  };

  const handleChange = (field: keyof Program, value: any) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const saveChanges = async () => {
    if (!editingId) return;
    const programRef = doc(db, "programs", editingId);
    await updateDoc(programRef, editData);
    setEditingId(null);
    setPrograms((prev) =>
      prev.map((prog) => (prog.id === editingId ? { ...prog, ...editData } : prog))
    );
    
    // Show SweetAlert success message
    Swal.fire({
      icon: 'success',
      title: 'Success!',
      text: 'Program updated successfully',
      timer: 2000,
      showConfirmButton: false
    });
  };
  
  const deleteProgram = async (id: string) => {
    // Ask for confirmation first
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
        
        // Show delete success message
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
              <td>{program.programName}</td>
              <td>{program.description}</td>
              <td>{program.link}</td>
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
      <div className="modal fade" id="editModal" tabIndex={-1} >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Edit Program</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">
              <input
                className="form-control mb-2"
                value={editData.programName || ""}
                onChange={(e) => handleChange("programName", e.target.value)}
                placeholder="Program Name"
              />
              <textarea
                className="form-control mb-2"
                value={editData.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Description"
              />
              <input
                className="form-control mb-2"
                value={editData.link || ""}
                onChange={(e) => handleChange("link", e.target.value)}
                placeholder="Link"
              />
              <div className="row mb-2">
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

              {/* Frequency */}
              <select
                className="form-select mb-2"
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

              {/* Frequency-specific Inputs */}
              {editData.frequency === "daily" && (
                <input
                  type="time"
                  className="form-control mb-2"
                  value={editData.dailyTime || ""}
                  onChange={(e) => handleChange("dailyTime", e.target.value)}
                />
              )}

              {editData.frequency === "weekly" && (
                <select
                  className="form-select mb-2"
                  value={editData.weeklyDay || ""}
                  onChange={(e) => handleChange("weeklyDay", e.target.value)}
                >
                  <option value="">Select a day</option>
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(
                    (day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    )
                  )}
                </select>
              )}

              {editData.frequency === "monthly" && (
                <select
                  className="form-select mb-2"
                  value={editData.monthlyDay || ""}
                  onChange={(e) => handleChange("monthlyDay", e.target.value)}
                >
                  <option value="">Select day of month</option>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              )}

              {editData.frequency === "quarterly" && (
                <div className="d-flex gap-2 mb-2">
                  <select
                    className="form-select"
                    value={editData.quarter || ""}
                    onChange={(e) => handleChange("quarter", e.target.value)}
                  >
                    <option value="">Select Quarter</option>
                    <option value="1">Q1 (Jan–Mar)</option>
                    <option value="2">Q2 (Apr–Jun)</option>
                    <option value="3">Q3 (Jul–Sep)</option>
                    <option value="4">Q4 (Oct–Dec)</option>
                  </select>

                  <select
                    className="form-select"
                    value={editData.quarterDay || ""}
                    onChange={(e) => handleChange("quarterDay", e.target.value)}
                    disabled={!editData.quarter}
                  >
                    <option value="">Select Day</option>
                    {editData.quarter &&
                      Array.from(
                        { length: new Date(new Date().getFullYear(), Number(editData.quarter) * 3 - 2, 0).getDate() },
                        (_, i) => (
                          <option key={i + 1} value={String(i + 1)}>
                            {i + 1}
                          </option>
                        )
                      )}
                  </select>
                </div>
              )}

              {editData.frequency === "yearly" && (
                <div className="d-flex gap-2 mb-2">
                  <select
                    className="form-select"
                    value={editData.yearlyMonth || ""}
                    onChange={(e) => handleChange("yearlyMonth", e.target.value)}
                  >
                    <option value="">Select Month</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1)}>
                        {new Date(0, i).toLocaleString("default", { month: "long" })}
                      </option>
                    ))}
                  </select>

                  <select
                    className="form-select"
                    value={editData.yearlyDay || ""}
                    onChange={(e) => handleChange("yearlyDay", e.target.value)}
                    disabled={!editData.yearlyMonth}
                  >
                    <option value="">Select Day</option>
                    {editData.yearlyMonth &&
                      Array.from(
                        { length: new Date(new Date().getFullYear(), Number(editData.yearlyMonth), 0).getDate() },
                        (_, i) => (
                          <option key={i + 1} value={String(i + 1)}>
                            {i + 1}
                          </option>
                        )
                      )}
                  </select>
                </div>
              )}

              {/* Participants */}
              <div className="mb-2">
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