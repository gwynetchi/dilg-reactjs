import React, { useEffect, useState, useCallback } from "react";
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
import { Search, FilterCircle, XCircle } from 'react-bootstrap-icons';
import { Card, Button, Form, Row, Col, Badge, Nav, Tab } from 'react-bootstrap';
import debounce from 'lodash/debounce';

interface Program {
  id: string;
  programName: string;
  description: string;
  outcomeArea: string; // Changed from optional to required
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

interface FilterOptions {
  frequency: string | null;
  dateRange: string | null;
  outcomeArea: string | null;
}

interface OutcomeOption {
  value: string;
  label: string;
  color: string;
  textColor: string;
}

const outcomeOptions: OutcomeOption[] = [
  {
    value: "Excellence in Local Governance Upheld",
    label: "Excellence in Local Governance Upheld",
    color: "#ffc107", // Bootstrap yellow
    textColor: "#000",
  },
  {
    value: "Peaceful, Orderly, and Safe Communities Strengthened",
    label: "Peaceful, Orderly, and Safe Communities Strengthened",
    color: "#0d6efd", // Bootstrap blue
    textColor: "#fff",
  },
  {
    value: "Resilient Communities Reinforced",
    label: "Resilient Communities Reinforced",
    color: "#198754", // Bootstrap green
    textColor: "#fff",
  },
  {
    value: "Inclusive Communities Enabled",
    label: "Inclusive Communities Enabled",
    color: "#6f42c1",
    textColor: "#fff",
  },
  {
    value: "Highly Trusted Department and Partner",
    label: "Highly Trusted Department and Partner",
    color: "#dc3545", // Bootstrap red
    textColor: "#fff",
  },
];

const ManagePrograms: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState<FilterOptions>({
    frequency: null,
    dateRange: null,
    outcomeArea: null,
  });

  const handleSearchChange = useCallback(
    debounce((term: string) => {
      setSearchTerm(term);
    }, 300),
    []
  );

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
  setPrograms(prev => 
    prev.map(prog => prog.id === updatedProgram.id ? updatedProgram : prog)
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

  // Apply filters function
  const applyFilters = (program: Program) => {
    const matchesSearch = 
      program.programName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (program.description && program.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFrequency = 
      !filters.frequency || 
      program.frequency.toLowerCase() === filters.frequency.toLowerCase();
    
    const matchesOutcome = 
      !filters.outcomeArea || 
      program.outcomeArea === filters.outcomeArea;
    
    let matchesDateRange = true;
    if (filters.dateRange && program.duration) {
      const now = new Date();
      const startDate = new Date(program.duration.from);
      const endDate = new Date(program.duration.to);
      
      if (filters.dateRange === 'active') {
        matchesDateRange = now >= startDate && now <= endDate;
      } else if (filters.dateRange === 'upcoming') {
        matchesDateRange = now < startDate;
      } else if (filters.dateRange === 'past') {
        matchesDateRange = now > endDate;
      }
    }
    
    return matchesSearch && matchesFrequency && matchesDateRange && matchesOutcome;
  };

  // Filter programs by search and filters (excluding tab filtering)
  const baseFilteredPrograms = programs.filter(applyFilters);
  
  // Filter by active tab
  const filteredPrograms = baseFilteredPrograms.filter(program => {
    return activeTab === 'all' || program.outcomeArea === activeTab;
  });

  const handleFilterChange = (filterType: keyof FilterOptions, value: string | null) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };
  
  const clearFilters = () => {
    setFilters({
      frequency: null,
      dateRange: null,
      outcomeArea: null
    });
    setSearchTerm('');
  };
  
  const hasActiveFilters = searchTerm !== '' || filters.frequency !== null || filters.dateRange !== null || filters.outcomeArea !== null;

  const getStatusBadge = (program: Program) => {
    if (!program.duration) return null;
    
    const now = new Date();
    const startDate = new Date(program.duration.from);
    const endDate = new Date(program.duration.to);
    
    if (now < startDate) {
      return <Badge bg="info" className="ms-2">Upcoming</Badge>;
    } else if (now > endDate) {
      return <Badge bg="secondary" className="ms-2">Past</Badge>;
    } else {
      return <Badge bg="success" className="ms-2">Active</Badge>;
    }
  };

  const getOutcomeBadge = (outcomeArea: string) => {
    if (!outcomeArea) return null;
    
    const outcomeData = outcomeOptions.find(option => option.value === outcomeArea);
    if (!outcomeData) return null;
    
    // Use simplified badge labels for better readability
    const simplifiedLabels: Record<string, string> = {
      "Excellence in Local Governance Upheld": "Excellence",
      "Peaceful, Orderly, and Safe Communities Strengthened": "Peaceful",
      "Resilient Communities Reinforced": "Resilient", 
      "Inclusive Communities Enabled": "Inclusive",
      "Highly Trusted Department and Partner": "Trusted"
    };
    
    const getBootstrapVariant = (color: string) => {
      switch (color) {
        case '#ffc107': return 'warning';
        case '#0d6efd': return 'primary';
        case '#198754': return 'success';
        case '#6f42c1': return 'purple';
        case '#dc3545': return 'danger';
        default: return 'secondary';
      }
    };
    
    return (
      <Badge bg={getBootstrapVariant(outcomeData.color)} className="me-2 outcome-badge">
        {simplifiedLabels[outcomeArea] || outcomeArea}
      </Badge>
    );
  };

  const getTabColorClass = (outcomeArea: string) => {
    const outcomeData = outcomeOptions.find(option => option.value === outcomeArea);
    if (!outcomeData) return 'outcome-tab-all';
    
    switch (outcomeData.color) {
      case '#ffc107': return 'outcome-tab-yellow';
      case '#0d6efd': return 'outcome-tab-blue';
      case '#198754': return 'outcome-tab-green';
      case '#6f42c1': return 'outcome-tab-purple';
      case '#dc3545': return 'outcome-tab-red';
      default: return 'outcome-tab-all';
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  const navigateToDetails = (programId: string) => {
    window.location.href = `/program-links/${programId}`;
  };

  return (
    
    <div className="container py-4">
              <div className="head-title">
          <div className="left">
            <h1>Regular Reports and Program Management</h1>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link to="/">Dashboard</Link>
                </li>
                <li className="breadcrumb-item active">Regular Reports and Programs</li>
              </ol>
            </nav>
          </div>
        </div>


      {/* Include CreatePrograms component directly */}
      <CreatePrograms />

      {/* Filter Controls */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0"></h5> 
        <div className="d-flex">
          <div className="position-relative me-2">
            <input
              type="text"
              className="form-control"
              placeholder="Search programs..."
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <Search className="position-absolute" style={{ right: '10px', top: '10px' }} />
          </div>
          <Button 
            variant={isFilterOpen ? "primary" : "outline-primary"}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <FilterCircle className="me-1" /> Filter
          </Button>
        </div>
      </div>
      
      {/* Filter Panel */}
      {isFilterOpen && (
        <Card className="mb-4 shadow-sm">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Filter Programs</h5>
              {hasActiveFilters && (
                <Button variant="link" className="p-0 text-decoration-none" onClick={clearFilters}>
                  <XCircle className="me-1" /> Clear All Filters
                </Button>
              )}
            </div>
            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Frequency</Form.Label>
                  <Form.Select 
                    value={filters.frequency || ''} 
                    onChange={(e) => handleFilterChange('frequency', e.target.value || null)}
                  >
                    <option value="">All Frequencies</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Date Range</Form.Label>
                  <Form.Select
                    value={filters.dateRange || ''}
                    onChange={(e) => handleFilterChange('dateRange', e.target.value || null)}
                  >
                    <option value="">All Programs</option>
                    <option value="active">Active Programs</option>
                    <option value="upcoming">Upcoming Programs</option>
                    <option value="past">Past Programs</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Outcome Area</Form.Label>
                  <Form.Select
                    value={filters.outcomeArea || ''}
                    onChange={(e) => handleFilterChange('outcomeArea', e.target.value || null)}
                  >
                    <option value="">All Outcome Areas</option>
                    {outcomeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Results Summary */}
      <p className="text-muted mb-3">
        Showing {baseFilteredPrograms.length} {baseFilteredPrograms.length === 1 ? 'program' : 'programs'}
        {hasActiveFilters ? ' (filtered)' : ''}
      </p>

      {/* Outcome Area Tabs */}
      <Tab.Container id="outcome-tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'all')}>
        <Nav variant="tabs" className="outcome-nav mb-3">
          <Nav.Item>
            <Nav.Link eventKey="all" className="outcome-tab-all">
              All Programs ({baseFilteredPrograms.length})
            </Nav.Link>
          </Nav.Item>
          {outcomeOptions.map((option) => {
            const count = baseFilteredPrograms.filter(p => p.outcomeArea === option.value).length;
            return (
              <Nav.Item key={option.value}>
                <Nav.Link eventKey={option.value} className={getTabColorClass(option.value)}>
                  {option.label} ({count})
                </Nav.Link>
              </Nav.Item>
            );
          })}
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey={activeTab}>
            <div className="card shadow-sm">
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
                    <p className="mt-2">
                      {activeTab === 'all' 
                        ? (hasActiveFilters 
                            ? 'No programs match your current filters. Try adjusting your search criteria.'
                            : 'No programs found.')
                        : `No programs found in the "${outcomeOptions.find(o => o.value === activeTab)?.label}" category${hasActiveFilters ? ' that match your current filters' : ''}.`
                      }
                    </p>
                    <div className="mt-3">
                      {activeTab !== 'all' && (
                        <Button 
                          variant="outline-primary" 
                          onClick={() => setActiveTab('all')}
                          className="me-2"
                        >
                          View All Programs
                        </Button>
                      )}
                      {hasActiveFilters && (
                        <Button variant="outline-secondary" onClick={clearFilters}>
                          Clear Filters
                        </Button>
                      )}
                    </div>
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
                            <td>
                              <div className="fw-medium">{program.programName}</div>
                              <div className="d-flex flex-wrap">
                                {getOutcomeBadge(program.outcomeArea)}
                                {getStatusBadge(program)}
                              </div>
                            </td>
                            <td className="text-muted">{truncateText(program.description, 80)}</td>
                            <td>
                              {program.duration ? (
                                <>
                                  <span className="badge bg-light text-dark border">
                                    {formatFullDate(program.duration.from)}
                                  </span>
                                  <i className="bi bi-arrow-right mx-1"></i>
                                  <span className="badge bg-light text-dark border">
                                    {formatFullDate(program.duration.to)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-muted">No duration set</span>
                              )}
                            </td>
                            <td>
                              <span className="badge bg-info bg-opacity-10 text-info">
                                {program.frequency}
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-success bg-opacity-10 text-success">
                                <i className="bi bi-people-fill me-1"></i>
                                {program.participants ? program.participants.length : 0}
                              </span>
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <div className="d-flex gap-2">
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
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      {/* Edit Modal Component */}
      {selectedProgram && (
        <EditProgramModal
          program={selectedProgram}
          users={users}
          onSave={handleProgramUpdate}
          onClose={handleModalClose}
        />
      )}

      {/* Custom Styles */}
      <style>{`
        .outcome-badge {
          font-size: 0.75rem;
          font-weight: 500;
        }
        
        /* Improved Tab Styling */
        .outcome-nav .nav-tabs .nav-link {
          transition: all 0.3s ease;
          font-weight: 500;
          border-bottom: 3px solid transparent;
          background-color: transparent;
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 0.75rem 1rem;
          white-space: nowrap;
          border-radius: 0.375rem 0.375rem 0 0;
          border: 1px solid transparent;
          border-bottom: none;
          margin-bottom: -1px;
        }
        
        .outcome-nav .nav-tabs .nav-link:hover {
          background-color: rgba(0,0,0,0.03);
          border-color: #dee2e6;
          border-bottom: none;
        }
        
        .outcome-tab-all.nav-link {
          color: #495057;
        }
        
        .outcome-tab-all.nav-link.active {
          color: #495057;
          background-color: #fff;
          border-color: #dee2e6;
          border-bottom: 3px solid #495057;
          font-weight: 600;
        }
        
        .outcome-tab-yellow.nav-link {
          color: #856404;
        }
        
        .outcome-tab-yellow.nav-link.active {
          color: #856404;
          background-color: #fff;
          border-color: #dee2e6;
          border-bottom: 3px solid #ffc107;
          font-weight: 600;
        }
        
        .outcome-tab-blue.nav-link {
          color: #004085;
        }
        
        .outcome-tab-blue.nav-link.active {
          color: #004085;
          background-color: #fff;
          border-color: #dee2e6;
          border-bottom: 3px solid #0d6efd;
          font-weight: 600;
        }
        
        .outcome-tab-green.nav-link {
          color: #155724;
        }
        
        .outcome-tab-green.nav-link.active {
          color: #155724;
          background-color: #fff;
          border-color: #dee2e6;
          border-bottom: 3px solid #198754;
          font-weight: 600;
        }
        
        .outcome-tab-purple.nav-link {
          color: #4a2c6b;
        }
        
        .outcome-tab-purple.nav-link.active {
          color: #4a2c6b;
          background-color: #fff;
          border-color: #dee2e6;
          border-bottom: 3px solid #6f42c1;
          font-weight: 600;
        }
        
        .outcome-tab-red.nav-link {
          color: #721c24;
        }
        
        .outcome-tab-red.nav-link.active {
          color: #721c24;
          background-color: #fff;
          border-color: #dee2e6;
          border-bottom: 3px solid #dc3545;
          font-weight: 600;
        }
        
        /* Responsive improvements */
        .outcome-nav {
          overflow-x: auto;
          flex-wrap: nowrap;
          scrollbar-width: thin;
          border-bottom: 1px solid #dee2e6;
        }
        
        .outcome-nav .nav-tabs {
          border-bottom: none;
          min-width: max-content;
        }
        
        .outcome-nav::-webkit-scrollbar {
          height: 5px;
        }
        
        .outcome-nav::-webkit-scrollbar-thumb {
          background-color: rgba(0,0,0,.2);
          border-radius: 5px;
        }
        
        @media (max-width: 768px) {
          .outcome-nav .nav-link {
            font-size: 0.875rem;
            padding: 0.625rem 0.875rem;
            white-space: nowrap;
            min-height: 44px;
          }
        }
        
        @media (max-width: 576px) {
          .outcome-nav .nav-link {
            font-size: 0.8rem;
            padding: 0.5rem 0.75rem;
            min-height: 40px;
          }
        }
      `}</style>
    </div>
  );
};

export default ManagePrograms;