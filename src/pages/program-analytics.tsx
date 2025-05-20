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
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { Table, Modal, Button, Form, Card, Container, Row, Col, Badge } from "react-bootstrap";
import "../styles/components/pages.css";
import { Link } from "react-router-dom";
import ChartSwitcher from "../pages/ChartSwitcher";

interface Submission {
  id: string;
  occurrence?: string;
  submittedBy: string;
  submittedAt?: { seconds: number };
  status?: string;
  autoStatus?: string;
  evaluatorStatus?: string;
  remark?: string;
  score?: number | null
  docId: string;
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
  const [programs, setPrograms] = useState<{ id: string; programName: string }[]>([]);
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
  const [selectedProgramName, setSelectedProgramName] = useState<string>("");
  const [submissionStats, setSubmissionStats] = useState({
    total: 0,
    onTime: 0,
    late: 0,
    incomplete: 0,
    noSubmission: 0,
    forRevision: 0,
  });
  // Add state for score modal
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [currentScore, setCurrentScore] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "programs"), (snapshot) => {
      const fetchedPrograms = snapshot.docs.map((doc) => {
        const data = doc.data();
        return { id: doc.id, programName: data.programName };
      });

      setPrograms(fetchedPrograms);
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

    // If there are no submissions for this program, mark all as "No Submission"
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

    // Calculate submission statistics
    const totalSubmissions = submissions[selectedSubject]?.length || 0;
    const onTimeCount = submissions[selectedSubject]?.filter(s => s.autoStatus === "On Time").length || 0;
    const lateCount = submissions[selectedSubject]?.filter(s => s.autoStatus === "Late").length || 0;
    const incompleteCount = submissions[selectedSubject]?.filter(s => s.autoStatus === "Incomplete").length || 0;
    const noSubmissionCount = submissions[selectedSubject]?.filter(s => s.autoStatus === "No Submission").length || 0;
    const forRevisionCount = submissions[selectedSubject]?.filter(s => s.autoStatus === "For Revision").length || 0;

    setSubmissionStats({
      total: totalSubmissions,
      onTime: onTimeCount,
      late: lateCount,
      incomplete: incompleteCount,
      noSubmission: noSubmissionCount,
      forRevision: forRevisionCount
    });

    setChartData(formattedChartData);
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
      setSelectedProgramName("");
      return;
    }

    setLoading(true);

    const fetchProgramData = async () => {
      try {
        const programRef = doc(db, "programs", selectedSubject);
        const programSnap = await getDoc(programRef);

        if (!programSnap.exists()) {
          setLoading(false);
          return;
        }

        const programData = programSnap.data();
        const recipients = programData.participants || [];
        
        // Set program name for display
        setSelectedProgramName(programData.programName || "");

        setSelectedDeadline(`${programData.duration?.from} to ${programData.duration?.to}`);

        const submissionsQuery = query(
          collection(db, "programsubmission"),
          where("programId", "==", selectedSubject)
        );

        const unsubscribe = onSnapshot(submissionsQuery, (snapshot) => {
          if (snapshot.empty) {
            // No submissions at all
            const noSubmissions = recipients.map((userId: string) => ({
              id: userId,
              submittedBy: userId,
              autoStatus: "No Submission",
              docId: '',
            }));
            setSubmissions({ [selectedSubject]: noSubmissions });
            setLoading(false);
            return;
          }

          const fetchedSubmissions: Submission[] = [];

          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const allSubmissions = data.submissions || [];
            const submittedBy = data.submittedBy;

            allSubmissions.forEach((entry: any) => {
              const autoStatus = entry.submitted
                ? (entry.autoStatus || "On Time")
                : "No Submission";

              fetchedSubmissions.push({
                id: `${docSnap.id}_${entry.occurrence}`,
                docId: docSnap.id,
                occurrence: entry.occurrence,
                submittedBy,
                submittedAt: entry.submittedAt || null,
                status: entry.status || null,
                autoStatus,
                evaluatorStatus: entry.evaluatorStatus || "Pending",
                remark: entry.remarks || "",
                score: entry.score || null,
              });
            });
          });

          const submittedUserIDs = new Set(fetchedSubmissions.map((sub) => sub.submittedBy));
          const missingRecipients = recipients
            .filter((userId: string) => !submittedUserIDs.has(userId))
            .map((userId: string) => ({
              id: userId,
              submittedBy: userId,
              autoStatus: "No Submission",
              docId: '',
            }));

          setSubmissions({
            [selectedSubject]: [...fetchedSubmissions, ...missingRecipients],
          });

          setLoading(false);
        });

        return unsubscribe;
      } catch (err) {
        console.error("Error loading program data:", err);
        setLoading(false);
      }
    };

    fetchProgramData();
  }, [selectedSubject]);

  const handleStatusUpdate = async (
    userId: string,
    occurrence: string,
    newStatus: string
  ) => {
    try {
      // Get the user's programsubmission document
      const q = query(
        collection(db, "programsubmission"),
        where("submittedBy", "==", userId),
        where("programId", "==", selectedSubject)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.error("No programsubmission document found");
        return;
      }

      const docRef = snapshot.docs[0].ref;
      const data = snapshot.docs[0].data();

      // Update the matching occurrence inside the submissions array
      const updatedSubmissions = data.submissions.map((sub: any) =>
        sub.occurrence === occurrence
          ? { ...sub, evaluatorStatus: newStatus }
          : sub
      );

      await updateDoc(docRef, { submissions: updatedSubmissions });

      // Update local state
      setSubmissions((prev) => {
        if (!selectedSubject || !prev[selectedSubject]) return prev;

        return {
          ...prev,
          [selectedSubject]: prev[selectedSubject].map((sub) =>
            sub.submittedBy === userId && sub.occurrence === occurrence
              ? { ...sub, evaluatorStatus: newStatus }
              : sub
          ),
        };
      });

      console.log(`Evaluator status updated for ${userId} - ${occurrence}`);
    } catch (error) {
      console.error("Failed to update evaluator status:", error);
      alert("Error updating evaluator status.");
    }
  };

  const handleSaveRemark = async () => {
    if (!currentSubmissionId) return;

    const currentSubmission = submissions[selectedSubject]?.find(sub => sub.id === currentSubmissionId);

    if (!currentSubmission) {
      console.error("Submission not found in state");
      return;
    }

    const { docId, occurrence } = currentSubmission;

    try {
      // Fetch the programsubmission document by docId
      const docRef = doc(db, "programsubmission", docId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.error("Submission document not found");
        return;
      }

      const data = docSnap.data();
      const submissionsArray = data.submissions || [];

      // Update the correct submission entry by occurrence
      const updatedSubmissions = submissionsArray.map((entry: any) =>
        entry.occurrence === occurrence
          ? { ...entry, remarks: remarkText }
          : entry
      );

      // Save the updated array
      await updateDoc(docRef, { submissions: updatedSubmissions });

      // Update local state
      setSubmissions((prev) => {
        if (!selectedSubject || !prev[selectedSubject]) return prev;

        return {
          ...prev,
          [selectedSubject]: prev[selectedSubject].map((sub) =>
            sub.id === currentSubmissionId
              ? { ...sub, remark: remarkText }
              : sub
          ),
        };
      });

      console.log("Remark successfully updated.");
    } catch (error) {
      console.error("Error updating remark:", error);
      alert("Failed to save remark.");
    }

    setShowRemarkModal(false);
  };

  // Add function to handle saving scores
  const handleSaveScore = async () => {
    if (!currentSubmissionId) return;

    const currentSubmission = submissions[selectedSubject]?.find(sub => sub.id === currentSubmissionId);

    if (!currentSubmission) {
      console.error("Submission not found in state");
      return;
    }

    const { docId, occurrence } = currentSubmission;

    try {
      // Fetch the programsubmission document by docId
      const docRef = doc(db, "programsubmission", docId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.error("Submission document not found");
        return;
      }

      const data = docSnap.data();
      const submissionsArray = data.submissions || [];

      // Update the correct submission entry by occurrence
      const updatedSubmissions = submissionsArray.map((entry: any) =>
        entry.occurrence === occurrence
          ? { ...entry, score: currentScore }
          : entry
      );

      // Save the updated array
      await updateDoc(docRef, { submissions: updatedSubmissions });

      // Update local state
      setSubmissions((prev) => {
        if (!selectedSubject || !prev[selectedSubject]) return prev;

        return {
          ...prev,
          [selectedSubject]: prev[selectedSubject].map((sub) =>
            sub.id === currentSubmissionId
              ? { ...sub, score: currentScore }
              : sub
          ),
        };
      });

      console.log("Score successfully updated.");
    } catch (error) {
      console.error("Error updating score:", error);
      alert("Failed to save score.");
    }

    setShowScoreModal(false);
  };

  // Status badge with appropriate color
  const StatusBadge = ({ status }: { status: string }) => {
    const color = statusColors[status] || "#6c757d";
    return (
      <Badge
        bg=""
        style={{ backgroundColor: color, fontSize: '0.85rem', padding: '0.35em 0.65em' }}
      >
        {status}
      </Badge>
    );
  };

  // Format date and time in a user-friendly way
  const formatDateTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const formattedDate = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

    return `${formattedDate} at ${formattedTime}`;
  };

  return (
    <Container fluid className="px-4 py-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Program Monitoring and Scheduled Reports</h2>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <Link to="/dashboards">Home</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/evaluator/analytics">Analytics</Link>
              </li>
              <li className="breadcrumb-item active">Program Monitoring</li>
            </ol>
          </nav>
        </div>
      </div>

      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Card.Title className="mb-3">Select Program</Card.Title>
          <Select
            options={programs.map((program) => ({
              value: program.id,
              label: program.programName,
            }))}
            onChange={(selectedOption) => setSelectedSubject(selectedOption?.value || "")}
            placeholder="Search or Select Program"
            isClearable
            className="mb-3"
          />
          
          {selectedProgramName && (
            <div className="mt-3">
              <h4>{selectedProgramName}</h4>
              <p className="text-muted">
                <i className="bx bx-calendar me-2"></i>
                {selectedDeadline || "No deadline set"}
              </p>
            </div>
          )}
        </Card.Body>
      </Card>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading program data...</p>
        </div>
      ) : selectedSubject && (
        <>
          <Row className="mb-4">
            <Col>
              <ChartSwitcher 
                data={chartData} 
                title="Submission Status Distribution" 
                statusColors={statusColors} 
              />
            </Col>
          </Row>

          <Row className="mb-4">
            <Col>
              <Card className="shadow-sm">
                <Card.Body>
                  <Card.Title className="mb-3">Submission Statistics</Card.Title>
                  <Row>
                    <Col md={2} sm={4} xs={6} className="mb-3">
                      <div className="p-3 bg-light rounded text-center">
                        <h3>{submissionStats.total}</h3>
                        <p className="mb-0 text-muted">Total</p>
                      </div>
                    </Col>
                    <Col md={2} sm={4} xs={6} className="mb-3">
                      <div className="p-3 rounded text-center" style={{ backgroundColor: `${statusColors["On Time"]}20` }}>
                        <h3 style={{ color: statusColors["On Time"] }}>{submissionStats.onTime}</h3>
                        <p className="mb-0 text-muted">On Time</p>
                      </div>
                    </Col>
                    <Col md={2} sm={4} xs={6} className="mb-3">
                      <div className="p-3 rounded text-center" style={{ backgroundColor: `${statusColors["Late"]}20` }}>
                        <h3 style={{ color: statusColors["Late"] }}>{submissionStats.late}</h3>
                        <p className="mb-0 text-muted">Late</p>
                      </div>
                    </Col>
                    <Col md={2} sm={4} xs={6} className="mb-3">
                      <div className="p-3 rounded text-center" style={{ backgroundColor: `${statusColors["Incomplete"]}20` }}>
                        <h3 style={{ color: statusColors["Incomplete"] }}>{submissionStats.incomplete}</h3>
                        <p className="mb-0 text-muted">Incomplete</p>
                      </div>
                    </Col>
                    <Col md={2} sm={4} xs={6} className="mb-3">
                      <div className="p-3 rounded text-center" style={{ backgroundColor: `${statusColors["No Submission"]}20` }}>
                        <h3 style={{ color: statusColors["No Submission"] }}>{submissionStats.noSubmission}</h3>
                        <p className="mb-0 text-muted">No Submission</p>
                      </div>
                    </Col>
                    <Col md={2} sm={4} xs={6} className="mb-3">
                      <div className="p-3 rounded text-center" style={{ backgroundColor: `${statusColors["For Revision"]}20` }}>
                        <h3 style={{ color: statusColors["For Revision"] }}>{submissionStats.forRevision}</h3>
                        <p className="mb-0 text-muted">For Revision</p>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title className="mb-3">Submission Evaluation</Card.Title>
              
              <div className="table-responsive">
                <Table striped hover className="table-borderless align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th>Name</th>
                      <th>Submitted At</th>
                      <th>Auto Status</th>
                      <th>Evaluator Status</th>
                      <th>Actions</th>
                                            <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions[selectedSubject]?.length > 0 ? (
                      submissions[selectedSubject].map((sub) => (
                        <tr key={sub.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="bg-light rounded-circle p-2 me-2 text-center" style={{ width: '40px', height: '40px' }}>
                                <i className="bx bx-user fs-5"></i>
                              </div>
                              <div>{users[sub.submittedBy] || "Unknown User"}</div>
                            </div>
                          </td>
                          <td>
                            {sub.submittedAt
                              ? formatDateTime(sub.submittedAt.seconds)
                              : <span className="text-muted">Not Submitted</span>}
                          </td>
                          <td>
                            <StatusBadge status={sub.autoStatus || "No Submission"} />
                          </td>
                          <td>
                            <Select
                              menuPosition="fixed"
                              menuPlacement="auto"
                              className="status-select"
                              value={allStatuses
                                .map((status) => ({ value: status, label: status, color: statusColors[status] }))
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
                                handleStatusUpdate(sub.submittedBy, sub.occurrence || "", selectedOption.value);
                              }}
                              styles={{
                                control: (base) => ({
                                  ...base,
                                  borderColor: "#dee2e6",
                                  boxShadow: "none",
                                  "&:hover": {
                                    borderColor: "#ced4da"
                                  }
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
                              <i className="bx bx-message-square-detail me-1"></i>
                              {sub.remark ? "Edit Remark" : "Add Remark"}
                            </Button>
                                                          <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => {
                                  setCurrentSubmissionId(sub.id);
                                  setCurrentScore(sub.score !== undefined ? sub.score : null);
                                  setShowScoreModal(true);
                                }}
                              >
                                Add/Edit Score
                              </Button>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <span className="me-2 fw-bold">{sub.score !== null ? sub.score : '-'}</span>

                            </div>
                          </td>

                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-4">
                          <i className="bx bx-info-circle fs-4 mb-2 d-block text-muted"></i>
                          {selectedSubject ? "No submissions found for this program." : "Select a program to view submissions."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </>
      )}

      {/* Remark Modal */}
      <Modal show={showRemarkModal} onHide={() => setShowRemarkModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bx bx-message-square-detail me-2"></i>
            Add Evaluation Remark
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Remark</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              placeholder="Enter your feedback or remark about this submission..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowRemarkModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveRemark}>
            <i className="bx bx-save me-1"></i>
            Save Remark
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Score Modal */}
      <Modal show={showScoreModal} onHide={() => setShowScoreModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bx bx-star me-2"></i>
            Add/Edit Score
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Score (0-10)</Form.Label>
            <Form.Control
              type="number"
              min="0"
              max="10"
              value={currentScore !== null ? currentScore : ''}
              onChange={(e) => setCurrentScore(e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Enter a score from 0 to 10"
            />
            <Form.Text className="text-muted">
              Enter a number between 0 (lowest) and 10 (highest)
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowScoreModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveScore}>
            <i className="bx bx-save me-1"></i>
            Save Score
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Analytics;