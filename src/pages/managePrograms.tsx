import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import CreatePrograms from "./createPrograms";
import "bootstrap/dist/css/bootstrap.min.css";
import Swal from "sweetalert2";
import EditProgramModal from "../pages/EditProgramModal";
import { Link } from "react-router-dom";

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
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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

  // Fetch programs
  useEffect(() => {
    const fetchPrograms = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "programs"));
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Program[];
        setPrograms(list);
      } catch (error) {
        console.error("Error fetching programs:", error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load programs',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchPrograms();
    fetchUsers();
  }, []);

  const handleEditClick = (program: Program) => {
    setSelectedProgram(program);
  };

  const handleModalClose = () => {
    setSelectedProgram(null);
  };

  const handleProgramUpdate = (updatedProgram: Program) => {
    setPrograms((prev) =>
      prev.map((prog) => (prog.id === updatedProgram.id ? { ...prog, ...updatedProgram } : prog))
    );
    setSelectedProgram(null);
    
    Swal.fire({
      icon: 'success',
      title: 'Updated!',
      text: 'Program has been updated successfully',
      timer: 2000,
      showConfirmButton: false
    });
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
        try {
          await deleteDoc(doc(db, "programs", id));
          setPrograms(programs.filter((p) => p.id !== id));
          
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Program has been deleted successfully',
            timer: 2000,
            showConfirmButton: false
          });
        } catch (error) {
          console.error("Error deleting program:", error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to delete program',
          });
        }
      }
    });
  };

  const filteredPrograms = programs.filter((p) =>
    p.programName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  const navigateToDetails = (programId: string) => {
    window.location.href = `/program-links/${programId}`;
  };

  return (
    <div className="container py-4">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/">Dashboard</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Manage Programs
          </li>
        </ol>
      </nav>

      {/* Include CreatePrograms component directly */}
      <CreatePrograms />

      <div className="card shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
          <h5 className="card-title mb-0">Manage Programs</h5>
          <div className="col-md-4">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search programs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading programs...</p>
            </div>
          ) : filteredPrograms.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-folder2-open display-4 text-muted"></i>
              <p className="mt-2">No programs found. {searchTerm && "Try adjusting your search."}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Image</th>
                    <th>Program Name</th>
                    <th>Description</th>
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
                      className="align-middle"
                      onClick={() => navigateToDetails(program.id)}
                      style={{ cursor: "pointer" }}
                      title="Click to manage program links"
                    >
                      <td className="text-center" style={{ width: "80px" }}>
                        {program.imageUrl ? (
                          <img 
                            src={program.imageUrl} 
                            alt={program.programName}
                            className="rounded-circle"
                            style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div 
                            className="bg-light rounded-circle d-flex align-items-center justify-content-center"
                            style={{ width: '48px', height: '48px' }}
                          >
                            <i className="bi bi-calendar-event text-muted"></i>
                          </div>
                        )}
                      </td>
                      <td className="fw-medium">{program.programName}</td>
                      <td className="text-muted">{truncateText(program.description, 80)}</td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {formatFullDate(program.duration.from)}
                        </span>
                        <i className="bi bi-arrow-right mx-1"></i>
                        <span className="badge bg-light text-dark border">
                          {formatFullDate(program.duration.to)}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-info bg-opacity-10 text-info">
                          {program.frequency}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-success bg-opacity-10 text-success">
                          <i className="bi bi-people-fill me-1"></i>
                          {program.participants.length}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="d-flex gap-2">
                          {program.link && (
                            <a 
                              href={program.link} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="btn btn-sm btn-outline-secondary"
                              title="Open program link"
                            >
                              <i className="bi bi-link-45deg"></i> Link
                            </a>
                          )}
                                                      <button
                            className="btn btn-sm btn-outline-primary"
                            data-bs-toggle="modal"
                            data-bs-target="#editModal"
                            onClick={(e) => {
                              e.stopPropagation(); // prevent redirect
                              handleEditClick(program);
                            }}
                            title="Edit program"
                          >
                            <i className="bi bi-pencil-fill"></i> Edit
                          </button>
                                                      <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={(e) => {
                              e.stopPropagation(); // prevent redirect
                              deleteProgram(program.id);
                            }}
                            title="Delete program"
                          >
                            <i className="bi bi-trash-fill"></i> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {filteredPrograms.length > 0 && (
          <div className="card-footer bg-white">
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted">
                Showing {filteredPrograms.length} of {programs.length} programs
              </small>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal Component */}
      {selectedProgram && (
        <EditProgramModal
          program={selectedProgram}
          users={users}
          onSave={handleProgramUpdate}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default ManagePrograms;