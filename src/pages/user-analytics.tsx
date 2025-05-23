import React, { useState, useEffect } from "react";
import Select from "react-select";
import { collection, query, where, onSnapshot, getDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { Table, Card, Container, Row, Col, Badge } from "react-bootstrap";
import { Link } from "react-router-dom";
import "../styles/components/pages.css";
import ChartSwitcher from "../pages/ChartSwitcher";

interface Submission {
  id: string;
  submittedBy: string;
  submittedAt?: { seconds: number };
  evaluatorStatus?: string;
  autoStatus?: string;
  messageID?: string;
  subject?: string;
  occurrence?: string;
  score?: number;
  remarks?: string;
  sourceType: "oneshotreport" | "programreport";
}

interface ChartData {
  status: string;
  autoCount: number;
  manualCount: number;
}

// Status colors matching the original
const statusColors: Record<string, string> = {
  "On Time": "#4CAF50",
  "Late": "#2196F3",
  "Incomplete": "#ffc107",
  "No Submission": "#F44336",
  "For Revision": "#FF9800",
};

const allStatuses = Object.keys(statusColors);

type SourceType = "all" | "oneshotreport" | "programreport";

const UserAnalytics: React.FC = () => {
  // const location = useLocation();
  const [users, setUsers] = useState<Record<string, string>>({});
  const [selectedUser, setSelectedUser] = useState<string>(() => {
    // Try to restore selectedUser from localStorage
    const savedUser = localStorage.getItem('selectedUser');
    return savedUser || "";
  });
  const [selectedMonth, setSelectedMonth] = useState<number | null>(() => {
    // Try to restore selectedMonth from localStorage
    const savedMonth = localStorage.getItem('selectedMonth');
    return savedMonth ? parseInt(savedMonth) : null;
  });
  const [selectedYear, setSelectedYear] = useState<number | null>(() => {
    // Try to restore selectedYear from localStorage
    const savedYear = localStorage.getItem('selectedYear');
    return savedYear ? parseInt(savedYear) : null;
  });
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedSource, setSelectedSource] = useState<SourceType>(() => {
    // Try to restore selectedSource from localStorage
    const savedSource = localStorage.getItem('selectedSource');
    return (savedSource as SourceType) || "all";
  });
  const [statsData, setStatsData] = useState({
    total: 0,
    onTime: 0,
    late: 0,
    incomplete: 0,
  });

  // Save filter states to localStorage whenever they change
  useEffect(() => {
    if (selectedUser) localStorage.setItem('selectedUser', selectedUser);
    if (selectedMonth !== null) localStorage.setItem('selectedMonth', selectedMonth.toString());
    if (selectedYear !== null) localStorage.setItem('selectedYear', selectedYear.toString());
    localStorage.setItem('selectedSource', selectedSource);
  }, [selectedUser, selectedMonth, selectedYear, selectedSource]);

  // Fetch users data
  useEffect(() => {
          const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersList = snapshot.docs.reduce((acc, docSnapshot) => {
        const data = docSnapshot.data();
        acc[docSnapshot.id] = `${data.fname} ${data.mname ? data.mname + " " : ""}${data.lname}`.trim();
        return acc;
      }, {} as Record<string, string>);
      setUsers(usersList);
    });
    return () => unsubscribe();
  }, []);

  // Fetch submissions based on selected user, month, year, and source
  useEffect(() => {
    if (!selectedUser) return;

    setIsLoading(true);
    let allSubmissions: Submission[] = [];
    let oneShotCompleted = false;
    let programCompleted = false;

    // Function to check if all data loading is complete
    const checkAllCompleted = () => {
      if ((selectedSource === "all" && oneShotCompleted && programCompleted) || 
          (selectedSource === "oneshotreport" && oneShotCompleted) || 
          (selectedSource === "programreport" && programCompleted)) {
        
        processSubmissions(allSubmissions);
      }
    };

    // Process submissions after fetching
    const processSubmissions = (subs: Submission[]) => {
      setSubmissions(subs);
      setIsLoading(false);
      
      // Update statistics
      const total = subs.length;
      const onTime = subs.filter(s => s.evaluatorStatus === "On Time").length;
      const late = subs.filter(s => s.evaluatorStatus === "Late").length;
      const incomplete = subs.filter(s => 
        s.evaluatorStatus === "Incomplete" || s.evaluatorStatus === "No Submission" || s.evaluatorStatus === "For Revision").length;
      
      setStatsData({ total, onTime, late, incomplete });
    };

    let oneShotUnsubscribe: (() => void) | undefined;
    let programUnsubscribe: (() => void) | undefined;

    // Fetch one-shot submissions if needed
    if (selectedSource === "all" || selectedSource === "oneshotreport") {
      const oneShotQuery = query(
        collection(db, "submittedDetails"),
        where("submittedBy", "==", selectedUser)
      );

      oneShotUnsubscribe = onSnapshot(oneShotQuery, async (snapshot) => {
        const fetchedSubmissionsPromises = snapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          let sub: Submission = {
            ...data,
            id: docSnapshot.id,
            sourceType: "oneshotreport"
          } as Submission;

          // Apply month and year filters
          if (selectedMonth !== null && (!sub.submittedAt || 
              new Date(sub.submittedAt.seconds * 1000).getMonth() !== selectedMonth)) {
            return null;
          }

          if (selectedYear !== null && (!sub.submittedAt || 
              new Date(sub.submittedAt.seconds * 1000).getFullYear() !== selectedYear)) {
            return null;
          }

          // Fetch communication subject
          if (sub.messageID) {
            try {
              const commDoc = await getDoc(doc(db, "communications", sub.messageID));
              if (commDoc.exists()) {
                sub.subject = commDoc.data().subject;
              }
            } catch (error) {
              console.error("Error fetching communication:", error);
            }
          }

          // Ensure each submission has an autoStatus
          if (!sub.autoStatus) {
            sub.autoStatus = sub.evaluatorStatus || "No Submission";
          }

          return sub;
        });

        const fetchedSubmissions = await Promise.all(fetchedSubmissionsPromises);
        
        // Filter out null submissions (filtered by month/year)
        const validSubmissions = fetchedSubmissions.filter((sub): sub is Submission => sub !== null);
        
        if (selectedSource === "oneshotreport") {
          processSubmissions(validSubmissions);
        } else {
          allSubmissions = [...allSubmissions, ...validSubmissions];
          oneShotCompleted = true;
          checkAllCompleted();
        }
      });

      // Return cleanup function for oneshot query
      if (selectedSource === "oneshotreport") {
        return oneShotUnsubscribe;
      }
    } else {
      oneShotCompleted = true;
    }

    // Fetch program submissions if needed
    if (selectedSource === "all" || selectedSource === "programreport") {
      const programQuery = query(
        collection(db, "programsubmission"),
        where("submittedBy", "==", selectedUser)
      );

      programUnsubscribe = onSnapshot(programQuery, async (snapshot) => {
        let programSubmissions: Submission[] = [];

        // Process each program submission document
        for (const docSnapshot of snapshot.docs) {
          const programData = docSnapshot.data();
          const programId = programData.programId;
          
          // Get program name if available
          let programName = "Program Report";
          try {
            const programDoc = await getDoc(doc(db, "programs", programId));
            if (programDoc.exists()) {
              const programDocData = programDoc.data();
              programName = programDocData.name || programName;
            }
          } catch (error) {
            console.error("Error fetching program details:", error);
          }

          // Process all submissions within the program document
          if (Array.isArray(programData.submissions)) {
            const validSubmissions = programData.submissions
              .map((sub: any, index: number) => {
                // Apply month/year filters on occurrence date
                if (sub.occurrence) {
                  const occurrenceDate = new Date(sub.occurrence);
                  
                  if (selectedMonth !== null && occurrenceDate.getMonth() !== selectedMonth) {
                    return null;
                  }
                  
                  if (selectedYear !== null && occurrenceDate.getFullYear() !== selectedYear) {
                    return null;
                  }
                }

                // Create a submission object
                return {
                  id: `${docSnapshot.id}-${index}`,
                  submittedBy: programData.submittedBy,
                  occurrence: sub.occurrence,
                  evaluatorStatus: sub.evaluatorStatus || "No Submission",
                  autoStatus: sub.autoStatus || sub.evaluatorStatus || "No Submission",
                  score: sub.score,
                  remarks: sub.remarks,
                  subject: programName,
                  submittedAt: sub.submittedAt,
                  sourceType: "programreport"
                } as Submission;
              })
              .filter((sub: Submission | null): sub is Submission => sub !== null);

            programSubmissions = [...programSubmissions, ...validSubmissions];
          }
        }
        
        if (selectedSource === "programreport") {
          processSubmissions(programSubmissions);
        } else {
          allSubmissions = [...allSubmissions, ...programSubmissions];
          programCompleted = true;
          checkAllCompleted();
        }
      });

      // Return cleanup function for program query
      if (selectedSource === "programreport") {
        return programUnsubscribe;
      }
    } else {
      programCompleted = true;
      checkAllCompleted();
    }

    // Return composite cleanup function
    return () => {
      if (oneShotUnsubscribe) oneShotUnsubscribe();
      if (programUnsubscribe) programUnsubscribe();
    };
  }, [selectedUser, selectedMonth, selectedYear, selectedSource]);

  // Prepare data for the chart
  useEffect(() => {
    const statusCountAuto: Record<string, number> = allStatuses.reduce(
      (acc, status) => ({ ...acc, [status]: 0 }),
      {}
    );
    
    const statusCountManual: Record<string, number> = allStatuses.reduce(
      (acc, status) => ({ ...acc, [status]: 0 }),
      {}
    );

    submissions.forEach((sub) => {
      const evaluatorStatus = sub.evaluatorStatus || "No Submission";
      const autoStatus = sub.autoStatus || evaluatorStatus;
      
      statusCountManual[evaluatorStatus] += 1;
      statusCountAuto[autoStatus] += 1;
    });

    setChartData(allStatuses.map((status) => ({ 
      status, 
      autoCount: statusCountAuto[status], 
      manualCount: statusCountManual[status] 
    })));
  }, [submissions]);

  const renderStatusBadge = (status: string) => {
    let variant;
    switch (status) {
      case "On Time":
        variant = "success";
        break;
      case "Late":
        variant = "danger";
        break;
      case "Incomplete":
        variant = "warning";
        break;
      case "For Revision":
        variant = "info";
        break;
      default:
        variant = "secondary";
    }
    return <Badge bg={variant}>{status}</Badge>;
  };

  const formatDateTime = (value?: { seconds: number } | string | null) => {
    if (!value) return "Not Submitted";
    
    let date;
    if (typeof value === 'string') {
      date = new Date(value);
    } else if (value.seconds) {
      date = new Date(value.seconds * 1000);
    } else {
      return "Not Submitted";
    }
    
    const formattedDate = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    
    // Only show time if we have seconds (timestamp)
    if (typeof value !== 'string') {
      const formattedTime = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });
      return `${formattedDate} ${formattedTime}`;
    }
    
    return formattedDate;
  };




  return (
    <Container fluid className="dashboard-container px-4">
      <section id="content">
        <main>
          <div className="head-title mb-4">
            <div className="left">
              <h2>User Statistics Monitoring</h2>
              <ul className="breadcrumb">
                <li>
                  <Link to="/dashboards" className="active">Home</Link>
                </li>
                <li>
                  <i className="bx bx-chevron-right"></i>
                </li>
                <li>
                  <Link to="/evaluator/analytics" className="active">Analytics</Link>
                </li>
                <li>
                  <i className="bx bx-chevron-right"></i>
                </li>
                <li>
                  <Link to="">User Analytics Report</Link>
                </li>
              </ul>
            </div>
          </div>

          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Card.Title className="mb-3">Data Filters</Card.Title>
              <Row>
                <Col md={3} className="mb-3">
                  <label className="form-label">Select User</label>
                  <Select
                    options={Object.entries(users).map(([id, name]) => ({ value: id, label: name }))}
                    onChange={(option) => setSelectedUser(option?.value || "")}
                    placeholder="Select User"
                    isClearable
                    className="custom-select-container"
                    value={selectedUser ? { value: selectedUser, label: users[selectedUser] || selectedUser } : null}
                  />
                </Col>
                <Col md={3} className="mb-3">
                  <label className="form-label">Select Month</label>
                  <Select
                    options={Array.from({ length: 12 }, (_, i) => ({ 
                      value: i, 
                      label: new Date(0, i).toLocaleString('default', { month: 'long' }) 
                    }))}
                    onChange={(option) => setSelectedMonth(option?.value ?? null)}
                    placeholder="Select Month"
                    isClearable
                    className="custom-select-container"
                    value={selectedMonth !== null ? {
                      value: selectedMonth,
                      label: new Date(0, selectedMonth).toLocaleString('default', { month: 'long' })
                    } : null}
                  />
                </Col>
                <Col md={3} className="mb-3">
                  <label className="form-label">Select Year</label>
                  <Select
                    options={Array.from({ length: 10 }, (_, i) => ({ 
                      value: new Date().getFullYear() - i, 
                      label: (new Date().getFullYear() - i).toString() 
                    }))}
                    onChange={(option) => setSelectedYear(option?.value ?? null)}
                    placeholder="Select Year"
                    isClearable
                    className="custom-select-container"
                    value={selectedYear !== null ? { value: selectedYear, label: selectedYear.toString() } : null}
                  />
                </Col>
                <Col md={3} className="mb-3">
                  <label className="form-label">Report Source</label>
                  <Select
                    options={[
                      { value: "all", label: "All Sources" },
                      { value: "oneshotreport", label: "One Shot Reports" },
                      { value: "programreport", label: "Program Reports" }
                    ]}
                    value={{ value: selectedSource, label: selectedSource === "all" ? "All Sources" : 
                             selectedSource === "oneshotreport" ? "One Shot Reports" : "Program Reports" }}
                    onChange={(option) => setSelectedSource(option?.value as SourceType || "all")}
                    className="custom-select-container"
                  />
                </Col>
              </Row>
              {/* <Row>
                <Col md={12} className="text-end">
                  <Button variant="secondary" onClick={clearFilters}>Clear Filters</Button>
                </Col>
              </Row> */}
            </Card.Body>
          </Card>

          {selectedUser && (
            <>
              <Row className="mb-4">
                <Col md={3}>
                  <Card className="shadow-sm h-100 text-center">
                    <Card.Body>
                      <h6 className="text-muted">Total Submissions</h6>
                      <h2 className="mb-0">{statsData.total}</h2>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="shadow-sm h-100 text-center">
                    <Card.Body>
                      <h6 className="text-muted">On Time</h6>
                      <h2 className="mb-0 text-success">{statsData.onTime}</h2>
                      <small>{statsData.total > 0 ? Math.round(statsData.onTime / statsData.total * 100) : 0}%</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="shadow-sm h-100 text-center">
                    <Card.Body>
                      <h6 className="text-muted">Late</h6>
                      <h2 className="mb-0 text-primary">{statsData.late}</h2>
                      <small>{statsData.total > 0 ? Math.round(statsData.late / statsData.total * 100) : 0}%</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="shadow-sm h-100 text-center">
                    <Card.Body>
                      <h6 className="text-muted">Incomplete/Missing</h6>
                      <h2 className="mb-0 text-warning">{statsData.incomplete}</h2>
                      <small>{statsData.total > 0 ? Math.round(statsData.incomplete / statsData.total * 100) : 0}%</small>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {chartData.length > 0 && (
                <ChartSwitcher 
                  data={chartData}
                  title="Submission Status Distribution"
                  statusColors={statusColors}
                />
              )}

              <Card className="shadow-sm mb-4">
                <Card.Body>
                  <Card.Title className="mb-3">Submission Details</Card.Title>
                  {isLoading ? (
                    <div className="text-center p-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="mt-2">Loading submission data...</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <Table striped bordered hover className="align-middle">
                        <thead className="bg-light">
                          <tr>
                            <th>Date</th>
                            <th>Subject/Program</th>
                            <th className="text-center">Source</th>
                            <th className="text-center">Auto Status</th>
                            <th className="text-center">Evaluator Status</th>
                            <th className="text-center">Score</th>
                            <th>Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {submissions.length > 0 ? (
                            submissions.map((sub) => (
                              <tr key={sub.id}>
                                <td>{formatDateTime(sub.occurrence || sub.submittedAt)}</td>
                                <td>{sub.subject || "N/A"}</td>
                                <td className="text-center">
                                  <Badge bg="secondary">
                                    {sub.sourceType === "oneshotreport" ? "One Shot Report" : "Program Report"}
                                  </Badge>
                                </td>
                                <td className="text-center">{renderStatusBadge(sub.autoStatus || "No Submission")}</td>
                                <td className="text-center">{renderStatusBadge(sub.evaluatorStatus || "No Submission")}</td>
                                <td className="text-center">{sub.score ?? "N/A"}</td>
                                <td>{sub.remarks || "None"}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="text-center py-4">
                                {selectedUser ? "No submissions found for selected filters." : "Please select a user to view their submissions."}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </>
          )}
        </main>
      </section>
    </Container>
  );
};

export default UserAnalytics;