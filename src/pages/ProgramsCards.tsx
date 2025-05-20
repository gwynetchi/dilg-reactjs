import React, { useEffect, useState, useCallback } from 'react';
import { onSnapshot, collection, query, where, doc, getDoc, getFirestore, limit, startAfter, orderBy, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../firebase';
import { Spinner, Card, Row, Col, Container, Badge, Button, Pagination, Breadcrumb, Form, Dropdown } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { CalendarWeek, Calendar2Month, Calendar3, CalendarDate, Search, FilterCircle, XCircle } from 'react-bootstrap-icons';
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
  imageUrl?: string;
}

interface FilterOptions {
  frequency: string | null;
  dateRange: string | null;
}

const ProgramCards: React.FC = () => {
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
  const navigate = useNavigate();
  const location = useLocation();
  const programsPerPage = 9;

  // Debounce search function to avoid excessive queries
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setSearchTerm(term);
      setCurrentPage(1);
      setLastVisible(null);
    }, 300),
    []
  );

  // Get current user's ID and role
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const userDoc = await getDoc(doc(getFirestore(), "users", user.uid));
        const userRole = userDoc.data()?.role?.toLowerCase();
        setRole(userRole);
      } else {
        setUserId(null);
        setRole(null);
      }
    });
  
    return () => unsubscribe();
  }, []);  

  // Fetch programs with pagination
  const fetchPrograms = useCallback(async (reset = false) => {
    if (!userId) return;
    
    setLoading(true);
    
    let q = query(
      collection(db, 'programs'),
      where('participants', 'array-contains', userId),
      orderBy('programName'),
      limit(programsPerPage)
    );
    
    // Add pagination using startAfter if not resetting and we have a last document
    if (!reset && lastVisible) {
      q = query(
        collection(db, 'programs'),
        where('participants', 'array-contains', userId),
        orderBy('programName'),
        startAfter(lastVisible),
        limit(programsPerPage)
      );
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setHasMore(false);
        setLoading(false);
        return;
      }
      
      // Set the last document for pagination
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      setLastVisible(lastDoc);
      
      const newPrograms: Program[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          programName: data.programName,
          frequency: data.frequency,
          duration: data.duration,
          description: data.description || 'No description provided',
          frequencyDetails: data.frequencyDetails,
          participants: data.participants,
          imageUrl: data.imageUrl || '', 
        };
      });
      
      // If resetting, replace programs, otherwise append
      if (reset) {
        setPrograms(newPrograms);
      } else {
        setPrograms(prev => [...prev, ...newPrograms]);
      }
      
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [userId, lastVisible]);

  // Initial fetch and when user changes
  useEffect(() => {
    if (userId) {
      setPrograms([]);
      setLastVisible(null);
      setHasMore(true);
      fetchPrograms(true);
    }
  }, [userId, fetchPrograms]);

  // Load more programs
  const loadMorePrograms = () => {
    if (!loading && hasMore) {
      setCurrentPage(prev => prev + 1);
      fetchPrograms();
    }
  };
  
  // Get frequency icon
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
  
  // Format date for display
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
  
  // Get frequency display text
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
  
  // Apply filters to programs
  const applyFilters = (program: Program) => {
    // Search term filter
    const matchesSearch = 
      program.programName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      program.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Frequency filter
    const matchesFrequency = 
      !filters.frequency || 
      program.frequency.toLowerCase() === filters.frequency.toLowerCase();
    
    // Date range filter (active, upcoming, past)
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
  
  // Filter programs
  const filteredPrograms = programs.filter(applyFilters);
  
  // Handle filter changes
  const handleFilterChange = (filterType: keyof FilterOptions, value: string | null) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      frequency: null,
      dateRange: null
    });
    setSearchTerm('');
  };
  
  // Check if any filters are active
  const hasActiveFilters = searchTerm !== '' || filters.frequency !== null || filters.dateRange !== null;

  // Generate pagination
  const renderPagination = () => {
    if (programs.length === 0) return null;
    
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
      {/* Breadcrumb Navigation */}
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item onClick={() => navigate('/')}>Home</Breadcrumb.Item>
        <Breadcrumb.Item active>My Programs</Breadcrumb.Item>
      </Breadcrumb>
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">My Program Communications</h2>
        <div className="d-flex">
          <div className="position-relative me-2">
            <input
              type="text"
              className="form-control"
              placeholder="Search programs..."
              value={searchTerm}
              onChange={(e) => debouncedSearch(e.target.value)}
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
      
      {/* Loading State when initially loading */}
      {loading && programs.length === 0 ? (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
          <Spinner animation="border" variant="primary" />
        </div>
      ) : filteredPrograms.length === 0 ? (
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
          {/* Programs count summary */}
          <p className="text-muted mb-3">
            Showing {filteredPrograms.length} {filteredPrograms.length === 1 ? 'program' : 'programs'}
            {hasActiveFilters ? ' (filtered)' : ''}
          </p>
          
          {/* Programs Grid */}
          <Row xs={1} md={2} lg={3} className="g-4">
            {filteredPrograms.map((program) => (
              <Col key={program.id}>
                <Card 
                  className="h-100 shadow-sm border-0 program-card"
                  onClick={() => navigate(`/${role}/programs/${program.id}`)}
                  style={{ 
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <Card.Img
                      variant="top"
                      src={program.imageUrl || "/images/logo.png"}
                      style={{ 
                        height: '160px', 
                        objectFit: 'cover',
                        borderTopLeftRadius: 'calc(0.375rem - 1px)',
                        borderTopRightRadius: 'calc(0.375rem - 1px)'
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/images/logo.png";
                      }}
                    />
                    <Badge 
                      bg="primary" 
                      style={{ 
                        position: 'absolute', 
                        bottom: '10px', 
                        right: '10px',
                        fontSize: '0.8rem',
                        padding: '0.35em 0.65em'
                      }}
                    >
                      {program.frequency}
                    </Badge>
                  </div>
                  
                  <Card.Body className="d-flex flex-column">
                    <Card.Title as="h5" className="mb-3">{program.programName}</Card.Title>
                    
                    <Card.Text as="div" className="text-muted small mb-2 flex-grow-1">
                      {program.description && (
                        <p className="mb-3">{program.description.length > 100 ? 
                          `${program.description.substring(0, 100)}...` : 
                          program.description}
                        </p>
                      )}
                    </Card.Text>
                    
                    <div className="program-details mt-auto">
                      <div className="d-flex align-items-center small text-muted mb-2">
                        {getFrequencyIcon(program.frequency)}
                        <span>{getFrequencyText(program)}</span>
                      </div>
                      
                      <div className="d-flex justify-content-between small text-muted">
                        <span>From: {formatDate(program.duration?.from)}</span>
                        <span>To: {formatDate(program.duration?.to)}</span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
          
          {/* Load More Pagination */}
          {renderPagination()}
        </>
      )}
      
      <style>{`
        .program-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
        }
        .breadcrumb-item a {
          cursor: pointer;
          text-decoration: none;
        }
        .breadcrumb-item a:hover {
          text-decoration: underline;
        }
      `}</style>
    </Container>
  );
};

export default ProgramCards;