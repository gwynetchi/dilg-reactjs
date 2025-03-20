import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Form, Table, Button } from "react-bootstrap";
import "../styles/components/pages.css";

interface Communication {
  id: string;
  subject: string;
  deadline?: { seconds: number };
}

interface Submission {
  id: string;
  submittedBy: string;
  submittedAt?: { seconds: number };
  status?: string;
  manualStatus?: string;
}

interface ChartData {
  status: string;
  count: number;
}

const Analytics: React.FC = () => {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>({});
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [pendingStatus, setPendingStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "communications"), (snapshot) => {
      const fetchedCommunications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Communication[];
      setCommunications(fetchedCommunications);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedSubject) {
      setSubmissions({});
      setChartData([]);
      return;
    }

    setLoading(true);

    const fetchDeadline = async () => {
      const commRef = doc(db, "communications", selectedSubject);
      const commSnap = await getDoc(commRef);
      return commSnap.exists() ? commSnap.data().deadline?.seconds * 1000 : null;
    };

    fetchDeadline().then((deadline) => {
      const submissionsQuery = query(
        collection(db, "submittedDetails"),
        where("messageId", "==", selectedSubject)
      );

      const unsubscribe = onSnapshot(submissionsQuery, (snapshot) => {
        const fetchedSubmissions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Submission[];

        const statusCounts: Record<string, number> = {
          "On Time": 0,
          Late: 0,
          Incomplete: 0,
          "No Submission": 0,
          "For Revision": 0,
        };

        fetchedSubmissions.forEach((sub) => {
          let status = sub.status || "No Submission";

          if (sub.submittedAt && deadline) {
            const submittedAt = sub.submittedAt.seconds * 1000;
            status = submittedAt <= deadline ? "On Time" : "Late";
          }

          if (sub.manualStatus && statusCounts.hasOwnProperty(sub.manualStatus)) {
            status = sub.manualStatus;
          }

          statusCounts[status]++;
        });

        if (fetchedSubmissions.length === 0) {
          statusCounts["No Submission"]++;
        }

        setSubmissions({ [selectedSubject]: fetchedSubmissions });
        setChartData(Object.entries(statusCounts).map(([status, count]) => ({ status, count })));
        setLoading(false);
      });

      return () => unsubscribe();
    });
  }, [selectedSubject]);

  const handleStatusChange = (submissionId: string, newStatus: string) => {
    setPendingStatus((prev) => ({
      ...prev,
      [submissionId]: newStatus,
    }));
  };

  const handleSaveStatus = async (submissionId: string) => {
    if (!pendingStatus[submissionId]) return;

    try {
      const submissionRef = doc(db, "submittedDetails", submissionId);
      await updateDoc(submissionRef, { manualStatus: pendingStatus[submissionId] });

      alert("Status updated successfully!");
      setPendingStatus((prev) => {
        const updatedStatus = { ...prev };
        delete updatedStatus[submissionId];
        return updatedStatus;
      });
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status.");
    }
  };

  return (
    <div className="dashboard-container">
      <section id="content">
        <main>
          <h2>Submission Analytics</h2>
          <Form.Select onChange={(e) => setSelectedSubject(e.target.value)} value={selectedSubject}>
            <option value="">Select Subject</option>
            {communications.map((comm) => (
              <option key={comm.id} value={comm.id}>
                {comm.subject}
              </option>
            ))}
          </Form.Select>

          {loading ? (
            <p>Loading data...</p>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="status" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: "center", marginTop: "20px" }}>No data available for this subject.</p>
          )}

          <h3>Modify Submission Status</h3>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Submitted At</th>
                <th>Auto Status</th>
                <th>Evaluator Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {selectedSubject && submissions[selectedSubject] ? (
                submissions[selectedSubject].length > 0 ? (
                  submissions[selectedSubject].map((sub) => (
                    <tr key={sub.id}>
                      <td>{sub.submittedBy}</td>
                      <td>{sub.submittedAt ? new Date(sub.submittedAt.seconds * 1000).toLocaleString() : "Not Submitted"}</td>
                      <td>{sub.status || "No Submission"}</td>
                      <td>
                        <Form.Select
                          value={pendingStatus[sub.id] ?? sub.manualStatus ?? ""}
                          onChange={(e) => handleStatusChange(sub.id, e.target.value)}
                        >
                          <option value="">Select Status</option>
                          <option value="On Time">On Time</option>
                          <option value="Late">Late</option>
                          <option value="Incomplete">Incomplete</option>
                          <option value="No Submission">No Submission</option>
                          <option value="For Revision">For Revision</option>
                        </Form.Select>
                      </td>
                      <td>
                        <Button variant="primary" onClick={() => handleSaveStatus(sub.id)} disabled={!pendingStatus[sub.id]}>
                          Save
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>No submissions found.</td>
                  </tr>
                )
              ) : (
                <tr>
                  <td colSpan={5}>Please select a subject.</td>
                </tr>
              )}
            </tbody>
          </Table>
        </main>
      </section>
    </div>
  );
};

export default Analytics;
