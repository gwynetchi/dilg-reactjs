import React, { useEffect, useState, useCallback } from 'react';
import { onSnapshot, collection, query, where, doc, getDoc, getFirestore, limit, startAfter, orderBy, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../firebase';
import { Spinner, Card, Row, Col, Container, Badge, Button, Breadcrumb, Form, Alert, ListGroup, Nav, Tab } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { CalendarWeek, Calendar2Month, Calendar3, CalendarDate, Search, FilterCircle, XCircle, ChevronRight } from 'react-bootstrap-icons';
import debounce from 'lodash/debounce';

interface Program {
  id: string;
  programName: string;
  frequency: string;
  duration: {
    from: string;
    to: string;
  };
  description: string;
  frequencyDetails?: {
    weeklyDay?: string;
    monthlyDate?: string;
    quarterlyMonth?: string;
    quarterlyWeek?: string;
    yearlyMonth?: string;
    yearlyDate?: string;
  };
  participants: string[];
  outcomeArea?: string;
}

interface FilterOptions {
  frequency: string | null;
  dateRange: string | null;
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

const ProgramList: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    frequency: null,
    dateRange: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [indexBuilding, setIndexBuilding] = useState(false);
  const navigate = useNavigate();
  const programsPerPage = 9;

  const handleSearchChange = useCallback(
    debounce((term: string) => {
      setSearchTerm(term);
      setCurrentPage(1);
      setLastVisible(null);
    }, 300),
    []
  );

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const userDoc = await getDoc(doc(getFirestore(), "users", user.uid));
        setRole(userDoc.data()?.role?.toLowerCase() || null);
      } else {
        setUserId(null);
        setRole(null);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!userId) return;

    let unsubscribe: () => void;
    const fetchPrograms = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let q = query(
          collection(db, 'programs'),
          where('participants', 'array-contains', userId),
          orderBy('programName'),
          limit(programsPerPage)
        );
        
        if (currentPage > 1 && lastVisible) {
          q = query(q, startAfter(lastVisible));
        }
        
        unsubscribe = onSnapshot(q, 
          (snapshot) => {
            if (snapshot.empty) {
              setHasMore(false);
              setLoading(false);
              return;
            }
            
            const lastDoc = snapshot.docs[snapshot.docs.length - 1];
            setLastVisible(lastDoc);
            
            const newPrograms = snapshot.docs.map(doc => {
              return {
                id: doc.id,
                programName: doc.data().programName,
                frequency: doc.data().frequency,
                duration: doc.data().duration,
                description: doc.data().description || 'No description provided',
                frequencyDetails: doc.data().frequencyDetails,
                participants: doc.data().participants,
                outcomeArea: doc.data().outcomeArea,
              };
            });
            
            setPrograms(prev => currentPage === 1 ? newPrograms : [...prev, ...newPrograms]);
            setLoading(false);
            setIndexBuilding(false);
          },
          (err) => {
            if (err.code === 'failed-precondition' && err.message.includes('index')) {
              setIndexBuilding(true);
            }
            setError(err.message);
            setLoading(false);
          }
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setLoading(false);
      }
    };

    fetchPrograms();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
    setLastVisible(null);
  }, [searchTerm, filters]);

  const loadMorePrograms = () => {
    if (!loading && hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  };
  
  const getFrequencyIcon = (frequency: string) => {
    switch (frequency.toLowerCase()) {
      case 'weekly':
        return <CalendarWeek className="me-2" />;
      case 'monthly':
        return <Calendar2Month className="me-2" />;
      case 'quarterly':
        return <Calendar3 className="me-2" />;
      case 'yearly':
        return <CalendarDate className="me-2" />;
      default:
        return null;
    }
  };
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };
  
  const getFrequencyText = (program: Program) => {
    const { frequency, frequencyDetails } = program;
    
    switch (frequency.toLowerCase()) {
      case 'weekly':
        return `Weekly on ${frequencyDetails?.weeklyDay || 'scheduled day'}`;
      case 'monthly':
        return `Monthly on day ${frequencyDetails?.monthlyDate || ''}`;
      case 'quarterly':
        if (frequencyDetails?.quarterlyMonth && frequencyDetails?.quarterlyWeek) {
          return `Quarterly in ${frequencyDetails.quarterlyMonth}, week ${frequencyDetails.quarterlyWeek}`;
        }
        return 'Quarterly';
      case 'yearly':
        if (frequencyDetails?.yearlyMonth && frequencyDetails?.yearlyDate) {
          return `Yearly on ${frequencyDetails.yearlyMonth} ${frequencyDetails.yearlyDate}`;
        }
        return 'Yearly';
      default:
        return frequency;
    }
  };
  
  const applyFilters = (program: Program) => {
    const matchesSearch = 
      program.programName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      program.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFrequency = 
      !filters.frequency || 
      program.frequency.toLowerCase() === filters.frequency.toLowerCase();
    
    let matchesDateRange = true;
    if (filters.dateRange) {
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
    
    return matchesSearch && matchesFrequency && matchesDateRange;
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
      dateRange: null
    });
    setSearchTerm('');
  };
  
  const hasActiveFilters = searchTerm !== '' || filters.frequency !== null || filters.dateRange !== null;

  const getStatusBadge = (program: Program) => {
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
      <Badge bg={getBootstrapVariant(outcomeData.color)} className="ms-2 outcome-badge">
        {simplifiedLabels[outcomeArea] || outcomeArea}
      </Badge>
    );
  };

  const getOutcomeColorClass = (outcomeArea: string) => {
    const outcomeData = outcomeOptions.find(option => option.value === outcomeArea);
    if (!outcomeData) return '';
    
    switch (outcomeData.color) {
      case '#ffc107': return 'outcome-yellow';
      case '#0d6efd': return 'outcome-blue';
      case '#198754': return 'outcome-green';
      case '#6f42c1': return 'outcome-purple';
      case '#dc3545': return 'outcome-red';
      default: return '';
    }
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

  const renderPagination = () => {
    if (filteredPrograms.length === 0) return null;
    
    return (
      <div className="d-flex justify-content-center mt-4">
        <Button 
          variant="outline-primary" 
          disabled={loading || !hasMore} 
          onClick={loadMorePrograms}
        >
          {loading ? <Spinner animation="border" size="sm" /> : 'Load More Programs'}
        </Button>
      </div>
    );
  };

  if (!role) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <Container className="py-4">
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
          {error.includes('index') && (
            <div className="mt-2">
              <a 
                href={error.match(/https?:\/\/[^\s]+/)?.[0] || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline-danger"
              >
                Create Required Index
              </a>
            </div>
          )}
        </Alert>
      )}
      {indexBuilding && (
        <Alert variant="info" className="mb-4">
          <Spinner animation="border" size="sm" className="me-2" />
          Database index is building. This may take a few minutes...
        </Alert>
      )}
      <h2 className="mb-0">Regular Reports</h2> 
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item onClick={() => navigate('/')}>Home</Breadcrumb.Item>
        <Breadcrumb.Item active>My Programs</Breadcrumb.Item>
      </Breadcrumb>
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0">My Program Communications</h5> 
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
              <Col md={4}>
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
              <Col md={4}>
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
            </Row>
          </Card.Body>
        </Card>
      )}
      
      {loading && programs.length === 0 ? (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
          <Spinner animation="border" variant="primary" />
        </div>
      ) : baseFilteredPrograms.length === 0 ? (
        // Show this only when there are NO programs at all (after search/filter)
        <div className="text-center p-5 bg-light rounded">
          <h4>No programs found</h4>
          <p className="text-muted">
            {hasActiveFilters 
              ? 'No programs match your current filters. Try adjusting your search criteria.'
              : 'You are not enrolled in any programs yet.'}
          </p>
          {hasActiveFilters && (
            <Button variant="outline-secondary" onClick={clearFilters}>
              Clear All Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <p className="text-muted mb-3">
            Showing {baseFilteredPrograms.length} {baseFilteredPrograms.length === 1 ? 'program' : 'programs'}
            {hasActiveFilters ? ' (filtered)' : ''}
          </p>
          
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
                {filteredPrograms.length === 0 ? (
                  <div className="text-center p-5 bg-light rounded">
                    <h5>No programs found in this category</h5>
                    <p className="text-muted">
                      There are no programs in the "{activeTab === 'all' ? 'All Programs' : outcomeOptions.find(o => o.value === activeTab)?.label}" category
                      {hasActiveFilters ? ' that match your current filters' : ''}.
                    </p>
                    <div className="mt-3">
                      <Button 
                        variant="outline-primary" 
                        onClick={() => setActiveTab('all')}
                        className="me-2"
                      >
                        View All Programs
                      </Button>
                      {hasActiveFilters && (
                        <Button variant="outline-secondary" onClick={clearFilters}>
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <ListGroup className="shadow-sm">
                    {filteredPrograms.map((program) => (
                      <ListGroup.Item 
                        key={program.id} 
                        action
                        onClick={() => navigate(`/${role}/programs/${program.id}`)}
                        className={`program-item py-3 border-start border-4 ${getOutcomeColorClass(program.outcomeArea || '')}`}
                        style={{ transition: 'all 0.2s ease' }}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="program-info">
                            <div className="d-flex align-items-center flex-wrap">
                              <h5 className="mb-1 me-2">{program.programName}</h5>
                              {getOutcomeBadge(program.outcomeArea || '')}
                              {getStatusBadge(program)}
                              <Badge 
                                bg="light" 
                                text="dark" 
                                className="ms-2 border"
                              >
                                {program.frequency}
                              </Badge>
                            </div>
                            
                            <p className="text-muted mb-2 program-description">
                              {program.description.length > 120 ? 
                                `${program.description.substring(0, 120)}...` : 
                                program.description}
                            </p>
                            
                            <div className="d-flex flex-wrap">
                              <div className="me-3 small text-muted d-flex align-items-center">
                                {getFrequencyIcon(program.frequency)}
                                <span>{getFrequencyText(program)}</span>
                              </div>
                              <div className="d-flex small text-muted">
                                <span className="me-3">From: {formatDate(program.duration?.from)}</span>
                                <span>To: {formatDate(program.duration?.to)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <ChevronRight className="ms-2 text-muted" size={20} />
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
          
          {renderPagination()}
        </>
      )}
      
      <style>{`
        .program-item {
          background-color: #ffff;
        }
        .program-item:hover {
          background-color: rgba(13, 110, 253, 0.04);
          transform: translateX(5px);
        }
        .breadcrumb-item a {
          cursor: pointer;
          text-decoration: none;
        }
        .breadcrumb-item a:hover {
          text-decoration: underline;
        }
        .program-description {
          max-width: 90%;
        }
        @media (max-width: 768px) {
          .program-description {
            max-width: 100%;
          }
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
        
        /* Improved List Item Styling */
        .outcome-yellow {
          border-left-color: #ffc107 !important;
          background-color: #fff;
        }
        
        .outcome-blue {
          border-left-color: #0d6efd !important;
          background-color: #fff;
        }
        
        .outcome-green {
          border-left-color: #198754 !important;
          background-color: #fff;
        }
        
        .outcome-purple {
          border-left-color: #6f42c1 !important;
          background-color: #fff;
        }
        
        .outcome-red {
          border-left-color: #dc3545 !important;
          background-color: #fff;
        }
        
        .outcome-badge {
          font-size: 0.75rem;
          font-weight: 500;
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
    </Container>
  );
};

export default ProgramList;