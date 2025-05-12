import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import OrgChartViewer from "../../components/Elements/OrgChartViewer";
import { OrgChartNode } from "../../components/Elements/D3OrgChart";

const AdminOrgChartEditor: React.FC = () => {
  const [nodes, setNodes] = useState<OrgChartNode[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<OrgChartNode>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState<"add" | "edit">("add");
  const [newNode, setNewNode] = useState<Partial<OrgChartNode>>({});

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    try {
      const snapshot = await getDocs(collection(db, "orgdata"));
      const items: OrgChartNode[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: +data.id,
          name: data.name || "",
          position1: data.position1 || "",
          position2: data.position2 || "",
          email: data.email || "",
          status: data.status || "offline",
          icon: data.icon || "",
          layout: data.layout || "horizontal",
          subordinates: (data.subordinates || []).map((s: any) => +s),
        };
      });
      setNodes(items);
    } catch (error) {
      console.error("Error loading org chart data:", error);
    }
  };

  const handleAddUser = async () => {
    const newId = Math.max(0, ...nodes.map((n) => n.id)) + 1;
    const superiorId = +(newNode.superiorId || 0);

    const newEntry: OrgChartNode = {
      id: newId,
      name: newNode.name || "",
      email: newNode.email || "",
      icon: newNode.icon || "",
      position1: newNode.position1 || "",
      position2: newNode.position2 || "",
      layout: newNode.layout || "horizontal",
      status: "offline",
      subordinates: [],
    };

    await setDoc(doc(db, "orgdata", newId.toString()), newEntry);

    if (superiorId) {
      const superior = nodes.find((n) => n.id === superiorId);
      if (superior) {
        const updated = {
          ...superior,
          subordinates: [...(superior.subordinates || []), newId],
        };
        await updateDoc(doc(db, "orgdata", superiorId.toString()), updated);
      }
    }

    setShowModal(false);
    setNewNode({});
    await fetchNodes();
    setRefreshKey((prev) => prev + 1);
  };

  const handleUpdateUser = async () => {
    if (!selectedId || !form) return;
    await updateDoc(doc(db, "orgdata", selectedId.toString()), form);
    setShowModal(false);
    await fetchNodes();
    setRefreshKey((prev) => prev + 1);
  };

  const updateField = (field: keyof OrgChartNode, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleNodeClick = (node: OrgChartNode) => {
    setSelectedId(node.id);
    setForm(node);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Org Chart Admin</h2>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={() => {
              setEditMode("add");
              setShowModal(true);
            }}
          >
            Add
          </button>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            onClick={() => {
              if (selectedId && form) {
                setEditMode("edit");
                setShowModal(true);
              }
            }}
            disabled={!selectedId}
          >
            Update
          </button>
        </div>
      </div>

      <div className="mt-8">
        <OrgChartViewer key={refreshKey} onNodeClick={handleNodeClick} />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full">
            <h3 className="text-lg font-semibold mb-4">
              {editMode === "add" ? "Add New User" : "Edit User"}
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <input
                placeholder="Email"
                className="border p-2 rounded"
                value={editMode === "add" ? newNode.email || "" : form.email || ""}
                onChange={(e) =>
                  editMode === "add"
                    ? setNewNode((prev) => ({ ...prev, email: e.target.value }))
                    : updateField("email", e.target.value)
                }
              />
              <input
                placeholder="Picture URL"
                className="border p-2 rounded"
                value={editMode === "add" ? newNode.icon || "" : form.icon || ""}
                onChange={(e) =>
                  editMode === "add"
                    ? setNewNode((prev) => ({ ...prev, icon: e.target.value }))
                    : updateField("icon", e.target.value)
                }
              />
              <input
                placeholder="Full Name"
                className="border p-2 rounded"
                value={editMode === "add" ? newNode.name || "" : form.name || ""}
                onChange={(e) =>
                  editMode === "add"
                    ? setNewNode((prev) => ({ ...prev, name: e.target.value }))
                    : updateField("name", e.target.value)
                }
              />
              <input
                placeholder="Position"
                className="border p-2 rounded"
                value={editMode === "add" ? newNode.position1 || "" : form.position1 || ""}
                onChange={(e) =>
                  editMode === "add"
                    ? setNewNode((prev) => ({ ...prev, position1: e.target.value }))
                    : updateField("position1", e.target.value)
                }
              />
              <input
                placeholder="Designation"
                className="border p-2 rounded"
                value={editMode === "add" ? newNode.position2 || "" : form.position2 || ""}
                onChange={(e) =>
                  editMode === "add"
                    ? setNewNode((prev) => ({ ...prev, position2: e.target.value }))
                    : updateField("position2", e.target.value)
                }
              />
              <select
                className="border p-2 rounded"
                value={editMode === "add" ? newNode.layout || "horizontal" : form.layout || "horizontal"}
                onChange={(e) =>
                  editMode === "add"
                    ? setNewNode((prev) => ({ ...prev, layout: e.target.value }))
                    : updateField("layout", e.target.value)
                }
              >
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
              </select>
              {editMode === "add" && (
                <select
                  className="border p-2 rounded"
                  onChange={(e) =>
                    setNewNode((prev) => ({ ...prev, superiorId: e.target.value }))
                  }
                >
                  <option value="">-- Select Superior (Optional) --</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={editMode === "add" ? handleAddUser : handleUpdateUser}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrgChartEditor;
