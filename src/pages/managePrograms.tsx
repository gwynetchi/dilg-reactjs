import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import "bootstrap/dist/css/bootstrap.min.css";

interface Program {
  id: string;
  programName: string;
  description: string;
  link: string;
  duration: { from: string; to: string };
  frequency: string;
  participants: string[];
  dailyTime?: string;
  weeklyDay?: string;
  monthlyDay?: string;
  yearlyMonth?: string;
  yearlyDay?: string;
  quarter?: string;
  quarterDay?: string;
}

const ManagePrograms: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Program>>({});
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    const fetchPrograms = async () => {
      const snapshot = await getDocs(collection(db, "programs"));
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Program[];
      setPrograms(list);
    };
    fetchPrograms();
  }, []);

  const handleEditClick = (program: Program) => {
    setEditingId(program.id);
    setEditData(program);
  };

  const handleChange = (field: keyof Program, value: any) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const handleParticipantChange = (index: number, value: string) => {
    const updated = [...(editData.participants || [])];
    updated[index] = value;
    handleChange("participants", updated);
  };

  const addParticipant = () => {
    handleChange("participants", [...(editData.participants || []), ""]);
  };

  const removeParticipant = (index: number) => {
    const updated = [...(editData.participants || [])];
    updated.splice(index, 1);
    handleChange("participants", updated);
  };

  const saveChanges = async () => {
    if (!editingId) return;
    const programRef = doc(db, "programs", editingId);
    await updateDoc(programRef, editData);
    setEditingId(null);
    setPrograms((prev) =>
      prev.map((prog) => (prog.id === editingId ? { ...prog, ...editData } : prog))
    );
  };

  const deleteProgram = async (id: string) => {
    await deleteDoc(doc(db, "programs", id));
    setPrograms(programs.filter((p) => p.id !== id));
  };

  const filteredPrograms = programs.filter((p) =>
    p.programName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container py-4">
      <h2>Manage Programs</h2>
      <input
        type="text"
        className="form-control mb-3"
        placeholder="Search programs..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Program Name</th>
            <th>Description</th>
            <th>Link</th>
            <th>Duration</th>
            <th>Frequency</th>
            <th>Participants</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredPrograms.map((program) => (
            <tr key={program.id}>
              <td>{program.programName}</td>
              <td>{program.description}</td>
              <td>{program.link}</td>
              <td>
                {program.duration.from} - {program.duration.to}
              </td>
              <td>{program.frequency}</td>
              <td>{program.participants.length}</td>
              <td>
                <button
                  className="btn btn-sm btn-primary me-2"
                  data-bs-toggle="modal"
                  data-bs-target="#editModal"
                  onClick={() => handleEditClick(program)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => deleteProgram(program.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Edit Modal */}
      <div className="modal fade" id="editModal" tabIndex={-1}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Edit Program</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <div className="modal-body">
              <input
                className="form-control mb-2"
                value={editData.programName || ""}
                onChange={(e) => handleChange("programName", e.target.value)}
                placeholder="Program Name"
              />
              <textarea
                className="form-control mb-2"
                value={editData.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Description"
              />
              <input
                className="form-control mb-2"
                value={editData.link || ""}
                onChange={(e) => handleChange("link", e.target.value)}
                placeholder="Link"
              />
              <div className="row mb-2">
                <div className="col">
                  <input
                    type="date"
                    className="form-control"
                    value={editData.duration?.from || ""}
                    onChange={(e) =>
                      handleChange("duration", {
                        ...editData.duration,
                        from: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="col">
                  <input
                    type="date"
                    className="form-control"
                    value={editData.duration?.to || ""}
                    onChange={(e) =>
                      handleChange("duration", {
                        ...editData.duration,
                        to: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <input
                className="form-control mb-2"
                value={editData.frequency || ""}
                onChange={(e) => handleChange("frequency", e.target.value)}
                placeholder="Frequency"
              />
              <div className="mb-2">
                <label className="form-label">Participants</label>
                {(editData.participants || []).map((p, idx) => (
                  <div key={idx} className="input-group mb-1">
                    <input
                      className="form-control"
                      value={p}
                      onChange={(e) => handleParticipantChange(idx, e.target.value)}
                    />
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => removeParticipant(idx)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button className="btn btn-outline-primary" onClick={addParticipant}>
                  Add Participant
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={saveChanges}
                data-bs-dismiss="modal"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagePrograms;