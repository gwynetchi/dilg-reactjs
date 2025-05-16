import React, { useState, useEffect } from "react";
import Select from "react-select";
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  getDoc,
  onSnapshot,
  documentId,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../firebase";
import { Table, Modal, Button, Form, Card, Badge, Spinner, Container, Row, Col } from "react-bootstrap";
import "../styles/components/pages.css";
import { Link } from "react-router-dom";
import ChartSwitcher from "../pages/ChartSwitcher";

interface Communication {
  id: string;
  subject: string;
  recipients: [];
  deadline?: { seconds: number };
  submitID: [];
}

interface Submission {
  id: string;
  submittedBy: string;
  submittedAt?: { seconds: number };
  status?: string;
  autoStatus?: string;
  evaluatorStatus?: string;
  remark?: string;
}

interface ChartData {
  status: string;
  autoCount: number;
  manualCount: number;
}

// Define all possible statuses
const allStatuses = ["On Time", "Late", "Incomplete", "No Submission", "For Revision"];

// Define colors for each status
const statusColors: Record<string, string> = {
  "On Time": "#28a745",
  "Late": "#dc3545", 
  "Incomplete": "#ffc107",
  "No Submission": "#6c757d",
  "For Revision": "#17a2b8",
};

const Analytics: React.FC = () => {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>({});
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [pendingStatus, setPendingStatus] = useState<Record<string, string>>({});
  const [selectedDeadline, setSelectedDeadline] = useState<string | null>(null);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null);
  const [remarkText, setRemarkText] = useState("");
  const [summaryStats, setSummaryStats] = useState({
    total: 0,
    onTime: 0,
    late: 0,
    notSubmitted: 0,
    forRevision: 0,
    incomplete: 0,
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "communications"), (snapshot) => {
      const fetchedCommunications = snapshot.docs.map((doc) => {
        const data = doc.data() as Communication;
        return { ...data, id: doc.id };
      });
      
      setCommunications(fetchedCommunications);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedSubject) {
      setChartData(allStatuses.map((status) => ({ status, autoCount: 0, manualCount: 0 })));
      return;
    }
  
    const statusCount: Record<string, { autoCount: number; manualCount: number }> = {};
  
    // Initialize all statuses with 0
    allStatuses.forEach((status) => {
      statusCount[status] = { autoCount: 0, manualCount: 0 };
    });
  
    // If there are no submissions for this communication, mark all as "No Submission"
    if (!submissions[selectedSubject] || submissions[selectedSubject].length === 0) {
      statusCount["No Submission"].autoCount = 1;
    } else {
      submissions[selectedSubject].forEach((sub) => {
        const autoStatus = sub.autoStatus || "No Submission";
        const evaluatorStatus =
          sub.evaluatorStatus && sub.evaluatorStatus !== "Pending" ? sub.evaluatorStatus : "";
  
        statusCount[autoStatus].autoCount += 1;
  
        if (evaluatorStatus) {
          statusCount[evaluatorStatus].manualCount += 1;
        }
      });
    }
  
    const formattedChartData = allStatuses.map((status) => ({
      status,
      autoCount: statusCount[status].autoCount,
      manualCount: statusCount[status].manualCount,
    }));
  
    setChartData(formattedChartData);
    
    // Update summary statistics
    if (submissions[selectedSubject]) {
      const total = submissions[selectedSubject].length;
      const stats = {
        total,
        onTime: statusCount["On Time"].autoCount,
        late: statusCount["Late"].autoCount,
        notSubmitted: statusCount["No Submission"].autoCount,
        forRevision: statusCount["For Revision"].manualCount,
        incomplete: statusCount["Incomplete"].autoCount || statusCount["Incomplete"].manualCount,
      };
      setSummaryStats(stats);
    }
  }, [submissions, selectedSubject]);
  
  useEffect(() => {
    // Fetch user data to map user IDs to full names
    const unsubscribe = onSnapshot(collection(db, "users"), (querySnapshot) => {
      const usersList = querySnapshot.docs.reduce((acc, doc) => {
        const data = doc.data();
        const fullName = `${data.fname} ${data.mname ? data.mname + " " : ""}${data.lname}`.trim();
        acc[doc.id] = fullName;
        return acc;
      }, {} as Record<string, string>);

      setUsers(usersList);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedSubject) {
      setSubmissions({});
      setChartData([]);
      setSelectedDeadline(null);
      return;
    }

    setLoading(true);

    const fetchCommunicationData = async () => {
      const commRef = doc(db, "communications", selectedSubject);
      const commSnap = await getDoc(commRef);
      
      if (commSnap.exists()) {
        const data = commSnap.data() as Communication;
        const deadline = data.deadline?.seconds ? data.deadline.seconds * 1000 : null;
        setSelectedDeadline(
          deadline
            ? new Date(deadline).toLocaleString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              }).replace("at", "")
            : "No Deadline"
        );      

        return { deadline, submitIDs: data.submitID || [], recipients: data.recipients || [] };
      }

      return { deadline: null, submitIDs: [], recipients: [] };
    };

    fetchCommunicationData().then(({ deadline, submitIDs, recipients }) => {
      if (!recipients.length) {
        // No recipients assigned, clear submissions
        setSubmissions({ [selectedSubject]: [] });
        setLoading(false);
        return;
      }

      if (!submitIDs.length) {
        // No submissions at all, all recipients get "No Submission"
        setSubmissions({
          [selectedSubject]: recipients.map((userId) => ({
            id: userId,
            submittedBy: userId,
            autoStatus: "No Submission",
          })),
        });
        setLoading(false);
        return;
      }

      // Fetch submitted details for given submitIDs
      const submissionsQuery = query(
        collection(db, "submittedDetails"),
        where(documentId(), "in", submitIDs)
      );

      const unsubscribe = onSnapshot(submissionsQuery, (snapshot) => {
        const fetchedSubmissions = snapshot.docs.map((doc) => {
          const data = doc.data() as Submission;
          let autoStatus = "No Submission";

          if (data.submittedAt && deadline) {
            const submittedAt = data.submittedAt.seconds * 1000;
            autoStatus = submittedAt <= deadline ? "On Time" : "Late";
          }

          return { ...data, id: doc.id, autoStatus, submittedBy: data.submittedBy };
        });

        // Extract users who have submitted
        const submittedUserIDs = fetchedSubmissions.map((sub) => sub.submittedBy);

        // Find recipients who have NOT submitted
        const missingRecipients = recipients
          .filter((userId) => !submittedUserIDs.includes(userId))
          .map((userId) => ({
            id: userId,
            submittedBy: userId,
            autoStatus: "No Submission",
          }));

        setSubmissions({ [selectedSubject]: [...fetchedSubmissions, ...missingRecipients] });
        setLoading(false);
      });

      return () => unsubscribe();
    });
  }, [selectedSubject]);

  const handleStatusUpdate = async (submissionId: string | undefined, newStatus: string) => {
    if (!submissionId) {
      console.error("Submission ID is undefined");
      alert("Error: Submission ID is missing.");
      return;
    }
  
    try {
      const submissionRef = doc(db, "submittedDetails", submissionId);
      await updateDoc(submissionRef, { evaluatorStatus: newStatus });
  
      setSubmissions((prev) => {
        if (!selectedSubject || !prev[selectedSubject]) return prev;
        return {
          ...prev,
          [selectedSubject]: prev[selectedSubject].map((sub) =>
            sub.id === submissionId ? { ...sub, evaluatorStatus: newStatus } : sub
          ),
        };
      });
  
      console.log(`Updated evaluator status for submission ${submissionId} to ${newStatus}`);
    } catch (error) {
      console.error("Error updating evaluator status:", error);
      alert("Failed to update evaluator status.");
    }
  };

  const handleSaveRemark = async () => {
    if (currentSubmissionId) {
      try {
        const submissionRef = doc(db, "submittedDetails", currentSubmissionId);
        
        // Get the submission to access submittedBy
        const submissionSnap = await getDoc(submissionRef);
        if (submissionSnap.exists()) {
          const submittedBy = submissionSnap.data().submittedBy;

          // Update the remark
          await updateDoc(submissionRef, { remark: remarkText });

          // Remove user from 'seenBy' in 'communications'
          const commsRef = doc(db, "communications", selectedSubject);
          await updateDoc(commsRef, {
            seenBy: arrayRemove(submittedBy)
          });
          
          // Update local state
          setSubmissions(prev => {
            if (!selectedSubject || !prev[selectedSubject]) return prev;
            return {
              ...prev,
              [selectedSubject]: prev[selectedSubject].map(sub => 
                sub.id === currentSubmissionId ? { ...sub, remark: remarkText } : sub
              )
            };
          });
        }
        setShowRemarkModal(false);
      } catch (error) {
        console.error("Error saving remark:", error);
        alert("Failed to save remark.");
      }
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return <Badge bg="secondary">Pending</Badge>;
    
    const bgColor = status === "On Time" ? "success" :
                    status === "Late" ? "danger" :
                    status === "Incomplete" ? "warning" :
                    status === "For Revision" ? "info" : "secondary";
    
    return <Badge bg={bgColor}>{status}</Badge>;
  };

  const renderSummaryCards = () => {
    if (!selectedSubject) return null;
    
    return (
      <Row className="mb-4">
        <Col md={2}>
          <Card className="text-center h-100 shadow-sm">
            <Card.Body>
              <h2 className="mb-0">{summaryStats.total}</h2>
              <Card.Text>Total Recipients</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center h-100 shadow-sm" style={{ borderLeft: `4px solid ${statusColors["On Time"]}` }}>
            <Card.Body>
              <h2 className="mb-0">{summaryStats.onTime}</h2>
              <Card.Text>On Time</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center h-100 shadow-sm" style={{ borderLeft: `4px solid ${statusColors["Late"]}` }}>
            <Card.Body>
              <h2 className="mb-0">{summaryStats.late}</h2>
              <Card.Text>Late</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center h-100 shadow-sm" style={{ borderLeft: `4px solid ${statusColors["No Submission"]}` }}>
            <Card.Body>
              <h2 className="mb-0">{summaryStats.notSubmitted}</h2>
              <Card.Text>Not Submitted</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center h-100 shadow-sm" style={{ borderLeft: `4px solid ${statusColors["Incomplete"]}` }}>
            <Card.Body>
              <h2 className="mb-0">{summaryStats.incomplete}</h2>
              <Card.Text>Incomplete</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center h-100 shadow-sm" style={{ borderLeft: `4px solid ${statusColors["For Revision"]}` }}>
            <Card.Body>
              <h2 className="mb-0">{summaryStats.forRevision}</h2>
              <Card.Text>For Revision</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );
  };

  return (
    <div className="dashboard-container">
      <section id="content">
        <main>
          <div className="head-title">
            <div className="left">
              <h2>Submission And Compliance Report</h2>
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
                  <Link to="/evaluator/analytics/submission-analytics">Submissions and Compliance</Link>
                </li>
              </ul>
            </div>
          </div>
          
          <Container fluid className="px-0">
            <Card className="shadow-sm mb-4">
              <Card.Body>
                <Card.Title className="mb-3">Select Communication</Card.Title>
                <Select
                  options={communications.map((comm) => ({
                    value: comm.id,
                    label: comm.subject,
                  }))}
                  onChange={(selectedOption) => setSelectedSubject(selectedOption?.value || "")}
                  placeholder="Search or Select Subject"
                  isClearable
                  className="mb-3"
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderColor: '#ced4da',
                      boxShadow: 'none',
                      '&:hover': {
                        borderColor: '#80bdff'
                      }
                    })
                  }}
                />
                
                {selectedSubject && (
                  <div className="d-flex align-items-center">
                    <i className="bx bx-calendar-event me-2" style={{ fontSize: '1.2rem', color: '#6c757d' }}></i>
                    <span>Deadline: <strong>{selectedDeadline || "No Deadline"}</strong></span>
                  </div>
                )}
              </Card.Body>
            </Card>

            {selectedSubject && renderSummaryCards()}

            {loading ? (
              <div className="text-center my-5">
                <Spinner animation="border" role="status" variant="primary">
                  <span className="visually-hidden">Loading...</span>
                </Spinner>
                <p className="mt-2">Loading data...</p>
              </div>
            ) : selectedSubject ? (
              <ChartSwitcher 
                data={chartData} 
                statusColors={statusColors} 
                title="Submission Status Distribution"
              />
            ) : null}
  
            {selectedSubject && (
              <Card className="shadow-sm">
                <Card.Header className="bg-white">
                  <h4 className="mb-0">Submission Details</h4>
                </Card.Header>
                <Card.Body className="p-0">
                  <Table hover responsive className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th>Name</th>
                        <th>Submitted At</th>
                        <th>Auto Status</th>
                        <th>Evaluator Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions[selectedSubject]?.length > 0 ? (
                        submissions[selectedSubject].map((sub) => (
                          <tr key={sub.id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="ms-2">
                                  <h6 className="mb-0">{users[sub.submittedBy] || "Unknown User"}</h6>
                                  {sub.remark && (
                                    <small className="text-muted">
                                      <i className="bx bx-comment-detail"></i> Has remark
                                    </small>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              {sub.submittedAt
                                ? (
                                  <div>
                                    <div>{new Date(sub.submittedAt.seconds * 1000).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })}</div>
                                    <small className="text-muted">
                                      {new Date(sub.submittedAt.seconds * 1000).toLocaleTimeString("en-US", {
                                        hour: "numeric",
                                        minute: "numeric",
                                        hour12: true,
                                      })}
                                    </small>
                                  </div>
                                )
                                : <span className="text-danger">Not Submitted</span>
                              }
                            </td>
                            <td>{getStatusBadge(sub.autoStatus)}</td>
                            <td>
                              <Select
                                menuPosition="fixed"
                                menuPlacement="auto"
                                value={allStatuses
                                  .map((status) => ({ 
                                    value: status, 
                                    label: status, 
                                    color: statusColors[status] 
                                  }))
                                  .find((option) => option.value === (pendingStatus[sub.id] ?? sub.evaluatorStatus ?? "Pending"))
                                }
                                options={allStatuses.map((status) => ({
                                  value: status,
                                  label: status,
                                  color: statusColors[status],
                                }))}
                                onChange={(selectedOption) => {
                                  if (!selectedOption) return;
                                  setPendingStatus((prev) => ({ ...prev, [sub.id]: selectedOption.value }));
                                  handleStatusUpdate(sub.id, selectedOption.value);
                                }}
                                styles={{
                                  control: (base) => ({
                                    ...base,
                                    borderColor: "#ced4da",
                                    boxShadow: "none",
                                    minHeight: "36px",
                                    height: "36px",
                                  }),
                                  valueContainer: (base) => ({
                                    ...base,
                                    height: '36px',
                                    padding: '0 8px'
                                  }),
                                  indicatorsContainer: (base) => ({
                                    ...base,
                                    height: '36px'
                                  }),
                                  option: (base, { data }) => ({
                                    ...base,
                                    backgroundColor: data.color,
                                    color: "#fff",
                                  }),
                                  singleValue: (base, { data }) => ({
                                    ...base,
                                    color: data.color,
                                  }),
                                }}
                              />
                            </td>
                            <td>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="d-flex align-items-center"
                                onClick={() => {
                                  setCurrentSubmissionId(sub.id);
                                  setRemarkText(sub.remark || "");
                                  setShowRemarkModal(true);
                                }}
                              >
                                <i className="bx bx-message-square-edit me-1"></i> 
                                {sub.remark ? "Edit Remark" : "Add Remark"}
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="text-center py-4">
                            <div className="text-muted">
                              <i className="bx bx-search" style={{ fontSize: '2rem' }}></i>
                              <p className="mb-0 mt-2">
                                {selectedSubject 
                                  ? "No submissions found for this subject." 
                                  : "Select a subject to view submissions."}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}

            <Modal 
              show={showRemarkModal} 
              onHide={() => setShowRemarkModal(false)}
              centered
              backdrop="static"
            >
              <Modal.Header closeButton>
                <Modal.Title>
                  <i className="bx bx-message-square-detail me-2"></i>
                  Add Feedback Remark
                </Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Form.Group className="mb-3">
                  <Form.Label>Remark</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={remarkText}
                    onChange={(e) => setRemarkText(e.target.value)}
                    placeholder="Enter your feedback or remarks about this submission..."
                  />
                  <Form.Text className="text-muted">
                    Note: Adding a remark will notify the recipient.
                  </Form.Text>
                </Form.Group>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowRemarkModal(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleSaveRemark}
                  disabled={!remarkText.trim()}
                >
                  Save Remark
                </Button>
              </Modal.Footer>
            </Modal>
          </Container>
        </main>
      </section>
    </div>
  );
};

export default Analytics;