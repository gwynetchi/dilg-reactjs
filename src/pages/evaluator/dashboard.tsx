import { useState, useEffect, useRef } from "react";
import React from 'react';
import { db, auth } from "../../firebase";
import {
  collection,
  onSnapshot,
  getDocs,
  query,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  where,
  orderBy,
  limit
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
// import "../../styles/components/evalDashboard.css";
import ReportMetricsChart from "../../pages/ReportMetricsChart";
import ResultsFramework from '../../components/framework/Outcomes';
import TodoList from '../../pages/TodoList';

// Component styles with reduced sizes
const dashboardStyles = {
  container: {
    padding: "15px",
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    marginBottom: "20px",
    overflow: "hidden"
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 15px",
    borderBottom: "1px solid #eaeaea",
    backgroundColor: "#f8f9fa"
  },
  sectionContent: {
    padding: "15px"
  },
  metricCard: {
    padding: "12px",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    marginBottom: "10px",
    display: "flex",
    alignItems: "center",
    backgroundColor: "#fff"
  },
  metricIcon: {
    fontSize: "24px",
    marginRight: "10px"
  },
  metricContent: {
    flex: 1
  },
  metricLabel: {
    fontSize: "12px",
    color: "#666",
    marginBottom: "2px"
  },
  metricValue: {
    fontSize: "16px",
    fontWeight: "bold"
  },
  metricProgress: {
    height: "4px",
    backgroundColor: "#e9ecef",
    borderRadius: "2px",
    marginTop: "5px",
    position: "relative" as const
  },
  progressBar: {
    height: "100%",
    borderRadius: "2px",
    position: "absolute" as const
  },
  percentText: {
    fontSize: "10px",
    position: "absolute" as const,
    right: "0",
    top: "-15px"
  }
};

const Dashboard = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeUsers, setActiveUsers] = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const [onTimeReports, setOnTimeReports] = useState(0);
  const [lateReports, setLateReports] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [forRevision, setForRevision] = useState(0);
  const [incomplete, setIncomplete] = useState(0);
  const [noSubmission, setNoSubmission] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [filteredReports, setFilteredReports] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [reportsPerPage] = useState(10);
  const [chartType, setChartType] = useState("bar");
  const [isFrameworkCollapsed, setIsFrameworkCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    evaluatorStatus: "",
    remarks: ""
  });
  const [refreshKey, setRefreshKey] = useState(0);

  // Refs for scrolling
  const reportsDataRef = useRef<HTMLDivElement | null>(null);


  // Auth state effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);
    });
    return () => unsubscribe();
  }, []);

  // Users fetch effect
  useEffect(() => {
    const fetchRegisteredUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        setActiveUsers(usersSnapshot.size);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchRegisteredUsers();
  }, [refreshKey]);


  // Reports fetch effect
  useEffect(() => {
    setLoading(true);
    const fetchReportsData = async () => {
      try {
        const submitRef = collection(db, "submittedDetails");
        const submitSnapshot = await getDocs(submitRef);
        const allReports = submitSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as any),
        }));

        const filtered = allReports.filter((report: any) => {
          const date = report?.submittedAt?.toDate?.();
          if (!date) return false;
          const monthMatches = selectedMonth
            ? date.getMonth() + 1 === parseInt(selectedMonth)
            : true;
          const yearMatches = selectedYear
            ? date.getFullYear() === parseInt(selectedYear)
            : true;
          return monthMatches && yearMatches;
        });

        const enrichedReports = await Promise.all(
          filtered.map(async (report) => {
            const userDoc = await getDoc(doc(db, "users", report.submittedBy));
            const userData = userDoc.exists() ? userDoc.data() : {};
            const fullName =
              userData.fname && userData.lname
                ? `${userData.fname} ${
                    userData.mname ? userData.mname + " " : ""
                  }${userData.lname}`
                : userData.email || "Anonymous";
            return {
              ...report,
              userName: fullName,
              email: userData.email || "No email available",
            };
          })
        );

        enrichedReports.sort((a, b) => {
          const dateA = a.submittedAt?.toDate?.() || new Date(0);
          const dateB = b.submittedAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime(); // Sort by newest first
        });

        setFilteredReports(enrichedReports);
        setTotalReports(enrichedReports.length);
        setCurrentPage(1); // Reset to first page when filters change

        const statusQueries = [
          { status: "On Time", setter: setOnTimeReports },
          { status: "Pending", setter: setPendingReports },
          { status: "Late", setter: setLateReports },
          { status: "For Revision", setter: setForRevision },
          { status: "No Submission", setter: setNoSubmission },
          { status: "Incomplete", setter: setIncomplete },
        ];

        statusQueries.forEach(({ status, setter }) => {
          const count = enrichedReports.filter(
            (report: any) => report.evaluatorStatus === status
          ).length;
          setter(count);
        });
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportsData();
  }, [selectedMonth, selectedYear, refreshKey]);

  // Toggle visibility functions
  const toggleFramework = () => setIsFrameworkCollapsed(!isFrameworkCollapsed);
  // const toggleTodo = () => setIsTodoCollapsed(!isTodoCollapsed);

  // Reset filters
  const resetFilters = () => {
    setSelectedMonth("");
    setSelectedYear("");
  };

  // Refresh data
  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey(prevKey => prevKey + 1);
  };

   // Handle view report
   const handleViewReport = (report: any) => {
    setSelectedReport(report);
    setShowViewModal(true);
  };

  // Handle edit report
  const handleEditReport = (report: any) => {
    setSelectedReport(report);
    setEditFormData({
      evaluatorStatus: report.evaluatorStatus || "Pending",
      remarks: report.remarks || ""
    });
    setShowEditModal(true);
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    if (!selectedReport) return;
    
    try {
      setLoading(true);
      await updateDoc(doc(db, "submittedDetails", selectedReport.id), {
        evaluatorStatus: editFormData.evaluatorStatus,
        remarks: editFormData.remarks,
        lastUpdated: new Date()
      });
      
      setShowEditModal(false);
      // Refresh data after update
      handleRefresh();
    } catch (error) {
      console.error("Error updating report:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Apply filters
  const applyFilters = () => {
    handleRefresh();
  };


  // Pagination functions
  const indexOfLastReport = currentPage * reportsPerPage;
  const indexOfFirstReport = indexOfLastReport - reportsPerPage;
  const currentReports = filteredReports.slice(indexOfFirstReport, indexOfLastReport);
  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case "On Time": return "#4CAF50"; // green
      case "Pending": return "#9E9E9E"; // grey
      case "Late": return "#2196F3"; // blue
      case "For Revision": return "#FF9800"; // orange
      case "No Submission": return "#F44336"; // red
      case "Incomplete": return "#E91E63"; // yellow
      default: return "#9E9E9E" ; // grey
    }
  };

  const scrollToReportsData = () => {
    reportsDataRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Calculate percentage
  const getPercentage = (value: number) => {
    return totalReports > 0 ? (value / totalReports * 100).toFixed(1) : "0.0";
  };

  
  if (!currentUser) {
    return <div>Please log in to view your tasks.</div>;
  }

  // Metric card data
  const metricCards = [
    { 
      label: "Total Reports", 
      value: totalReports, 
      icon: "bx bx-file",
      color: "black" 
    },
    { 
      label: "Active Users", 
      value: activeUsers, 
      icon: "bx bx-user-check",
      color: "#673AB7" 
    },
    {
      label: "On Time",
      value: onTimeReports,
      percent: getPercentage(onTimeReports),
      icon: "bx bx-check-circle",
      color: "#4CAF50"
    },
    {
      label: "Pending",
      value: pendingReports,
      percent: getPercentage(pendingReports),
      icon: "bx bx-time",
      color: "#9E9E9E"
    },
    {
      label: "Late",
      value: lateReports,
      percent: getPercentage(lateReports),
      icon: "bx bx-error",
      color: "#2196F3"
    },
    {
      label: "For Revision",
      value: forRevision,
      percent: getPercentage(forRevision),
      icon: "bx bx-revision",
      color: "#FF9800"
    },
    {
      label: "Incomplete",
      value: incomplete,
      percent: getPercentage(incomplete),
      icon: "bx bx-x-circle",
      color: "#FFC107"
    },
    {
      label: "No Submission",
      value: noSubmission,
      percent: getPercentage(noSubmission),
      icon: "bx bx-block",
      color: "#F44336"
    }
    
  ];

  

  return (
    <div style={dashboardStyles.container} className="dashboard-container">
      <div className="container-fluid p-0">
        {/* Page Header */}
        <div className="mb-3">
          <h1 className="h3">Evaluator Dashboard</h1>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <a href="/dashboards">Home</a>
              </li>
              <li className="breadcrumb-item active">Dashboard Tools</li>
            </ol>
          </nav>
        </div>

        {/* DILG Results Framework - Placed at the top */}
        <div className="row mb-3">
          <div className="col-12">
            <div style={dashboardStyles.sectionCard}>
              <div style={dashboardStyles.sectionHeader}>
                <h5 className="mb-0">DILG Results Framework</h5>
                <button className="btn btn-sm btn-light" onClick={toggleFramework}>
                  <i className={`bx ${isFrameworkCollapsed ? 'bx-chevron-down' : 'bx-chevron-up'}`}></i>
                </button>
              </div>
              <div className={`${isFrameworkCollapsed ? 'd-none' : ''}`} style={{maxHeight: "250px", overflow: "auto"}}>
                <ResultsFramework />
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          {/* Main Content Area - 9 columns */}
          <div className="col-lg-9 col-md-8 mb-3">
          
            {/* Filters Row */}
            <div className="card mb-3">
              <div className="card-body">
                <div className="row g-2 align-items-center">
                  <div className="col-md-4 d-flex align-items-center">
                    <label htmlFor="month" className="form-label small mb-0 me-2">Month:</label>
                    <select
                      id="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="form-select form-select-sm"
                    >
                      <option value="">All Months</option>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(0, i).toLocaleString("default", { month: "long" })}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-4 d-flex align-items-center">
                    <label htmlFor="year" className="form-label small mb-0 me-2">Year:</label>
                    <select
                      id="year"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="form-select form-select-sm"
                    >
                      <option value="">All Years</option>
                      {Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="col-md-4 d-flex justify-content-end">
                    <button className="btn btn-sm btn-primary me-2">
                      <i className="bx bx-filter-alt"></i> Apply
                    </button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={resetFilters}>
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics and Chart in a single container */}
            <div className="card mb-3">
              <div className="card-body">
                <div className="row">
                  {/* Metrics Column - reduced from 7 to 6 columns */}
                  <div className="col-lg-5">
                    <h6 className="mb-3">Evaluation Metrics</h6>
                    <div className="row g-2">
                      {metricCards.map((metric, index) => (
                        <div key={index} className="col-md-6 col-lg-6">
                          <div className="card">
                            <div className="card-body p-2" style={{borderLeft: `3px solid ${metric.color}`}}>
                              <div className="d-flex align-items-center">
                                <div style={{color: metric.color, fontSize: "20px"}} className="me-2">
                                  <i className={metric.icon}></i>
                                </div>
                                <div>
                                  <div className="small text-muted">{metric.label}</div>
                                  <div className="fw-bold">{metric.value}</div>
                                  {metric.percent && (
                                    <div className="progress mt-1" style={{height: "3px"}}>
                                      <div 
                                        className="progress-bar" 
                                        role="progressbar"
                                        style={{width: `${metric.percent}%`, backgroundColor: metric.color}}
                                        aria-valuenow={parseFloat(metric.percent)}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                      ></div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Chart Column - increased from 5 to 6 columns */}
                  <div className="col-lg-7">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0">Report Metrics Visualization</h6>
                      <div className="btn-group btn-group-sm">
                        <button 
                          className={`btn ${chartType === 'bar' ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => setChartType('bar')}
                        >
                          Bar
                        </button>
                        <button 
                          className={`btn ${chartType === 'pie' ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => setChartType('pie')}
                        >
                          Pie
                        </button>
                        <button 
                          className={`btn ${chartType === 'line' ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => setChartType('line')}
                        >
                          Line
                        </button>
                      </div>
                    </div>
                    <div className="chart-container" style={{height: "280px"}}>
                      <ReportMetricsChart
                        totalReports={totalReports}
                        pendingReports={pendingReports}
                        lateReports={lateReports}
                        onTimeReports={onTimeReports}
                        forRevision={forRevision}
                        incomplete={incomplete}
                        noSubmission={noSubmission}
                        chartType={chartType}
                        colors={{
                          onTime: "#4CAF50",
                          pending: "#9E9E9E",
                          late: "#2196F3",
                          forRevision: "#FF9800", 
                          incomplete: "#FFC107",
                          noSubmission: "#F44336",
                          total: "black"
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Data Table */}
            <div className="card" ref={reportsDataRef}>
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Reports Data</h5>
                <div>
                  <button 
                    className="btn btn-sm btn-outline-secondary"
                    onClick={handleRefresh}
                    disabled={loading}
                  >
                    {loading ? (
                      <span>
                        <i className="bx bx-loader-alt bx-spin me-1"></i> Loading...
                      </span>
                    ) : (
                      <span>
                        <i className="bx bx-refresh"></i> Refresh
                      </span>
                    )}
                  </button>
                </div>
              </div>
              <div className="card-body p-0">
                {loading && filteredReports.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="bx bx-loader-alt bx-spin fs-2 text-primary"></i>
                    <p className="mt-2">Loading data...</p>
                  </div>
                ) : filteredReports.length ? (
                  <div className="table-responsive">
                    <table className="table table-striped table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>User</th>
                          <th>Submitted At</th>
                          <th>Status</th>
                          <th>Remarks</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentReports.map((report) => {
                          const date = report.submittedAt?.toDate?.();
                          const statusColor = getStatusColor(report.evaluatorStatus);
                          
                          return (
                            <tr key={report.id}>
                              <td>
                                <div className="d-flex align-items-center">
                                  <div className="rounded-circle bg-light text-center d-flex align-items-center justify-content-center me-2" style={{width: "30px", height: "30px", minWidth: "30px"}}>
                                    {report.userName?.charAt(0) || "U"}
                                  </div>
                                  <div>
                                    <div className="fw-bold small">{report.userName || "Anonymous"}</div>
                                    <div className="text-muted small">{report.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="small">{date ? `${date.toLocaleString('default', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : "N/A"}</td>
                              <td>
                                <span 
                                  className="badge"
                                  style={{ backgroundColor: statusColor }}
                                >
                                  {report.evaluatorStatus}
                                </span>
                              </td>
                              <td className="small">{report.remarks || "—"}</td>
                              <td>
                                <button 
                                  className="btn btn-sm btn-light me-1"
                                  onClick={() => handleViewReport(report)}
                                >
                                  <i className="bx bx-show"></i>
                                </button>
                                <button 
                                  className="btn btn-sm btn-light"
                                  onClick={() => handleEditReport(report)}
                                >
                                  <i className="bx bx-edit"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    
                    {/* Pagination Controls */}
                    <div className="d-flex justify-content-between align-items-center p-3 border-top">
                      <div className="small text-muted">
                        Showing {indexOfFirstReport + 1} to {Math.min(indexOfLastReport, filteredReports.length)} of {filteredReports.length} entries
                      </div>
                      <nav>
                        <ul className="pagination pagination-sm mb-0">
                          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button 
                              className="page-link"
                              onClick={() => paginate(currentPage - 1)}
                              disabled={currentPage === 1}
                            >
                              Previous
                            </button>
                          </li>
                          
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(num => 
                              num === 1 || 
                              num === totalPages || 
                              (num >= currentPage - 1 && num <= currentPage + 1)
                            )
                            .map((number, idx, array) => {
                              // Add ellipsis
                              if (idx > 0 && array[idx - 1] !== number - 1) {
                                return (
                                  <React.Fragment key={`ellipsis-${number}`}>
                                    <li className="page-item disabled">
                                      <span className="page-link">...</span>
                                    </li>
                                    <li className={`page-item ${currentPage === number ? 'active' : ''}`}>
                                      <button 
                                        className="page-link"
                                        onClick={() => paginate(number)}
                                      >
                                        {number}
                                      </button>
                                    </li>
                                  </React.Fragment>
                                );
                              }
                              return (
                                <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
                                  <button 
                                    className="page-link"
                                    onClick={() => paginate(number)}
                                  >
                                    {number}
                                  </button>
                                </li>
                              );
                            })
                          }
                          
                          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                            <button 
                              className="page-link"
                              onClick={() => paginate(currentPage + 1)}
                              disabled={currentPage === totalPages}
                            >
                              Next
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <i className="bx bx-search-alt fs-2 text-muted"></i>
                    <p className="mt-2">No reports found for the selected period.</p>
                    <button className="btn btn-sm btn-outline-primary" onClick={resetFilters}>Reset Filters</button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Sidebar - 3 columns */}
          <div className="col-lg-3 col-md-4">

            {/* To-Do List Section in Sidebar */}
            <TodoList />

            {/* Additional stats widget - can be shown or hidden based on needs */}
            <div className="card mb-3">
              <div className="card-header">
                <h5 className="mb-0">Key Statistics</h5>
              </div>
              <div className="card-body p-0">
                <ul className="list-group list-group-flush">
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    <span>
                      <i className="bx bx-check-circle text-success me-2"></i> Completion Rate
                    </span>
                    <span className="badge bg-success rounded-pill">
                      {totalReports > 0 ? Math.round((onTimeReports / totalReports) * 100) : 0}%
                    </span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    <span>
                      <i className="bx bx-error text-danger me-2"></i> Issues Rate
                    </span>
                    <span className="badge bg-danger rounded-pill">
                      {totalReports > 0 ? Math.round(((lateReports + incomplete) / totalReports) * 100) : 0}%
                    </span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    <span>
                      <i className="bx bx-revision text-warning me-2"></i> Revision Rate
                    </span>
                    <span className="badge bg-warning rounded-pill">
                      {totalReports > 0 ? Math.round((forRevision / totalReports) * 100) : 0}%
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Recent Activity Widget */}
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Recent Activity</h5>
              </div>
              <div className="card-body p-0">
                <ul className="list-group list-group-flush">
                  {filteredReports.slice(0, 5).map((report, idx) => {
                    const date = report.submittedAt?.toDate?.();
                    const statusColor = getStatusColor(report.evaluatorStatus);
                    
                    return (
                      <li key={idx} className="list-group-item px-3 py-2">
                        <div className="d-flex align-items-center">
                          <div className="rounded-circle me-2" style={{
                            width: "8px", 
                            height: "8px", 
                            backgroundColor: statusColor
                          }}></div>
                          <div>
                            <div className="small">
                              <strong>{report.userName?.split(' ')[0] || "User"}</strong> submitted a report
                            </div>
                            <div className="text-muted smaller">
                              {date ? new Date(date).toLocaleString([], {
                                month: 'short',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : "N/A"}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  {filteredReports.length === 0 && (
                    <li className="list-group-item text-center text-muted py-3">
                      <i className="bx bx-loader-alt"></i> No recent activity
                    </li>
                  )}
                </ul>
              </div>
              {filteredReports.length > 5 && (
                <div className="card-footer text-center py-2">
                  <button 
                      className="btn btn-link btn-sm p-0 text-decoration-none"
                      onClick={scrollToReportsData}
                    >
                      View all activity
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;