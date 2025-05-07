import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../firebase";

interface Occurrence {
  date: string;
  monitoringLink: string | null;
  submissionLink: string | null;
}

const ProgramLinksManager: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [docId, setDocId] = useState<string | null>(null);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchOccurrences = async () => {
      const q = query(
        collection(db, "programlinks"),
        where("programId", "==", programId)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        setDocId(docData.id);
        const raw = docData.data().occurrences || [];

        // Ensure both fields exist
        const enriched: Occurrence[] = raw.map((item: any) => ({
          date: item.date,
          monitoringLink: item.monitoringLink || "",
          submissionLink: item.submissionLink || "",
        }));

        setOccurrences(enriched);
      }
    };

    fetchOccurrences();
  }, [programId]);

  const handleChange = (
    index: number,
    field: "monitoringLink" | "submissionLink",
    value: string
  ) => {
    const updated = [...occurrences];
    updated[index][field] = value;
    setOccurrences(updated);
  };

  const saveLink = async (index: number) => {
    if (!docId) return;
    setLoadingIndex(index);

    const updatedOccurrences = [...occurrences];
    const ref = doc(db, "programlinks", docId);
    await updateDoc(ref, {
      occurrences: updatedOccurrences,
    });

    setLoadingIndex(null);
  };

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
        <i className="bi bi-calendar-link me-2"></i>
        Manage Program Links
      </h2>

      <div className="table-responsive">
        <table className="table table-bordered align-middle">
          <thead className="table-dark">
            <tr>
              <th>Date</th>
              <th>Monitoring Link</th>
              <th>Submission Link</th>
              <th style={{ width: "120px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {occurrences.map((occ, index) => (
              <tr key={occ.date}>
                <td className="fw-semibold">{formatDate(occ.date)}</td>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Monitoring link"
                    value={occ.monitoringLink || ""}
                    onChange={(e) =>
                      handleChange(index, "monitoringLink", e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Submission link"
                    value={occ.submissionLink || ""}
                    onChange={(e) =>
                      handleChange(index, "submissionLink", e.target.value)
                    }
                  />
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => saveLink(index)}
                    disabled={loadingIndex === index}
                  >
                    {loadingIndex === index ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-1"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-save me-1"></i>Save
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProgramLinksManager;
