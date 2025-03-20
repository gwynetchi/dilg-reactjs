import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  getDoc,
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

  useEffect(() => {
    const fetchCommunications = async () => {
      const querySnapshot = await getDocs(collection(db, "communications"));
      const fetchedCommunications = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Communication[];
      setCommunications(fetchedCommunications);
    };
    fetchCommunications();
  }, []);

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!selectedSubject) {
        setSubmissions({});
        setChartData([]);
        return;
      }
      setLoading(true);
      try {
        console.log("Fetching submissions for:", selectedSubject);

        // Get deadline from communication
        const commRef = doc(db, "communications", selectedSubject);
        const commSnap = await getDoc(commRef);
        const deadline = commSnap.exists() ? commSnap.data().deadline?.seconds * 1000 : null;

        // Query submissions
        const submissionsQuery = query(
          collection(db, "submittedDetails"),
          where("messageId", "==", selectedSubject)
        );
        const querySnapshot = await getDocs(submissionsQuery);
        const fetchedSubmissions = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Submission[];

        console.log(`Found ${fetchedSubmissions.length} submissions for ${selectedSubject}:`, fetchedSubmissions);

        // Default statuses
        const statusCounts: Record<string, number> = {
          "On Time": 0,
          Late: 0,
          Incomplete: 0,
          "No Submission": 0,
          "For Revision": 0,
        };

        // Process each submission
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

        // Convert to chart data format
        const formattedData: ChartData[] = Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count,
        }));

        // Include all received communications, even those without submissions
        if (fetchedSubmissions.length === 0) {
          statusCounts["No Submission"]++;
          setSubmissions((prev) => ({ ...prev, [selectedSubject]: [] }));
        } else {
          setSubmissions((prev) => ({ ...prev, [selectedSubject]: fetchedSubmissions }));
        }

        setChartData(formattedData);
      } catch (error) {
        console.error("Error fetching submissions:", error);
      }
      setLoading(false);
    };

    fetchSubmissions();
  }, [selectedSubject]);

  const handleStatusChange = async (submissionId: string, newStatus: string) => {
    try {
      const submissionRef = doc(db, "submittedDetails", submissionId);
      await updateDoc(submissionRef, { manualStatus: newStatus });

      setSubmissions((prev) => ({
        ...prev,
        [selectedSubject]: prev[selectedSubject].map((sub) =>
          sub.id === submissionId ? { ...sub, manualStatus: newStatus } : sub
        ),
      }));
      alert("Status updated successfully!");
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
                        <Form.Select value={sub.manualStatus || ""} onChange={(e) => handleStatusChange(sub.id, e.target.value)}>
                          <option value="">Select Status</option>
                          <option value="On Time">On Time</option>
                          <option value="Late">Late</option>
                          <option value="Incomplete">Incomplete</option>
                          <option value="No Submission">No Submission</option>
                          <option value="For Revision">For Revision</option>
                        </Form.Select>
                      </td>
                      <td>
                        <Button variant="primary" onClick={() => handleStatusChange(sub.id, sub.manualStatus || "")}>
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
