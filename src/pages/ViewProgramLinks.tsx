import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";

interface Occurrence {
  date: string;
  monitoringLink: string | null;
  submissionLink: string | null;
}

const ViewProgramLinks: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);

  useEffect(() => {
    const fetchOccurrences = async () => {
      const q = query(
        collection(db, "programlinks"),
        where("programId", "==", programId)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        const items: Occurrence[] = (data.occurrences || []).map((item: any) => ({
          date: item.date,
          monitoringLink: item.monitoringLink || "",
          submissionLink: item.submissionLink || "",
        }));
        setOccurrences(items);
      }
    };

    fetchOccurrences();
  }, [programId]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="container mt-5">
      <h2 className="mb-4">
        <i className="bi bi-link-45deg me-2"></i>
        View Program Links
      </h2>

      <div className="table-responsive">
        <table className="table table-bordered align-middle">
          <thead className="table-light">
            <tr>
              <th>Date</th>
              <th>Monitoring Link</th>
              <th>Submission Link</th>
            </tr>
          </thead>
          <tbody>
            {occurrences.map((occ) => (
              <tr key={occ.date}>
                <td className="fw-semibold">{formatDate(occ.date)}</td>
                <td>
                  {occ.monitoringLink ? (
                    <a
                      href={occ.monitoringLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline-primary btn-sm"
                    >
                      Open Monitoring
                    </a>
                  ) : (
                    <span className="text-muted">Not set</span>
                  )}
                </td>
                <td>
                  {occ.submissionLink ? (
                    <a
                      href={occ.submissionLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline-success btn-sm"
                    >
                      Open Submission
                    </a>
                  ) : (
                    <span className="text-muted">Not set</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ViewProgramLinks