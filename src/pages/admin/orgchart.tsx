import React, { useEffect, useState, useCallback } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import OrgChartViewer from "../../components/Elements/OrgChartViewer";
import { OrgChartNode } from "../../components/Elements/D3OrgChart";
import { useToast } from "../../components/context/ToastContext";

const AdminOrgChartEditor: React.FC = () => {
  const [nodes, setNodes] = useState<OrgChartNode[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Omit<OrgChartNode, "img">> & { img?: string | File; superiorId?: number }>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState<"add" | "edit">("add");
  const [newNode, setNewNode] = useState<Partial<Omit<OrgChartNode, "img">> & { img?: string | File; superiorId?: number }>({});
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const { showToast } = useToast();

  const DEFAULT_PROFILE_IMAGE = 'https://res.cloudinary.com/dr5c99td8/image/upload/w_100,h_100,c_fill,r_max/v1747795819/xrmnclcohou8vu9x6fic.jpg';
  const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/dr5c99td8/image/upload';
  const CLOUDINARY_UPLOAD_PRESET = 'uploads';
  const MAX_FILE_SIZE = 500 * 1024; // 500KB
  const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const uploadImageToCloudinary = async (file: File, userId: string): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", `orgChart/${userId}`);
    formData.append("quality", "auto:good");
    formData.append("fetch_format", "auto");
    formData.append("width", "100");
    formData.append("height", "100");
    formData.append("crop", "fill");
    formData.append("gravity", "face");
    formData.append("radius", "max");

    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error('Image upload failed');
    const data = await response.json();
    return data.secure_url;
  };

  const fetchNodes = useCallback(async () => {
    setLoading(true);
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
          contact: data.contact || "",
          img: data.img || DEFAULT_PROFILE_IMAGE,
          city: data.city || "",
          cluster: data.cluster || "",
          status: data.status || "offline",
          layout: data.layout as "vertical" | "horizontal" || "horizontal",
          subordinates: (data.subordinates || []).map((s: any) => +s),
          superiorId: data.superiorId ?? null,
          section: data.section as "MES" | "FAS" | "CDS" | "PDMU" || null,
        };
      });

      const nodesWithSuperiors = items.map(node => {
        const superior = items.find(n => n.subordinates?.includes(node.id));
        return {
          ...node,
          superiorId: superior?.id
        };
      });

      setNodes(nodesWithSuperiors);
    } catch (error) {
      console.error("Error loading org chart data:", error);
      showToast("Failed to load organization data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  const handleAddUser = async () => {
    if (!newNode.name || !newNode.position1) {
      showToast("Name and Position are required fields", "warning");
      return;
    }
  
    setLoading(true);
    try {
      const newId = Math.max(0, ...nodes.map((n) => n.id)) + 1;
      const superiorId = newNode.superiorId ? +newNode.superiorId : null;
      
      let imageUrl = DEFAULT_PROFILE_IMAGE;
      if (newNode.img instanceof File) {
        imageUrl = await uploadImageToCloudinary(newNode.img, newId.toString());
      } else if (typeof newNode.img === 'string' && newNode.img) {
        imageUrl = newNode.img;
      }

      const newEntry: OrgChartNode = {
        id: newId,
        name: newNode.name || "",
        email: newNode.email || "",
        img: imageUrl,
        city: newNode.city || "",
        cluster: newNode.cluster || "",
        position1: newNode.position1 || "",
        position2: newNode.position2 || "",
        layout: newNode.layout as "vertical" | "horizontal" || "horizontal",
        section: newNode.section as "MES" | "FAS" | "CDS" | "PDMU" || null,
        subordinates: [],
        superiorId: superiorId || undefined,
      };

      const batch = writeBatch(db);
      batch.set(doc(db, "orgdata", newId.toString()), {
        ...newEntry,
        superiorId: superiorId || null,
        section: newNode.section || null,
      });

      if (superiorId) {
        const superior = nodes.find((n) => n.id === superiorId);
        if (superior) {
          batch.update(doc(db, "orgdata", superiorId.toString()), {
            subordinates: [...(superior.subordinates || []), newId],
          });
        }
      }

      await batch.commit();
      showToast("User added successfully", "success");
      setShowModal(false);
      setNewNode({});
      await fetchNodes();
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Error adding user:", error);
      showToast("Failed to add user", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedId || !form) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const currentNode = nodes.find(n => n.id === selectedId);
      if (!currentNode) return;

      let imageUrl = form.img || currentNode.img;
      if (form.img instanceof File) {
        imageUrl = await uploadImageToCloudinary(form.img, selectedId.toString());
      }

      const updateData: Record<string, any> = {
        name: form.name ?? currentNode.name,
        position1: form.position1 ?? currentNode.position1,
        position2: form.position2 ?? currentNode.position2,
        email: form.email ?? currentNode.email,
        img: imageUrl,
        city: form.city ?? currentNode.city,
        cluster: form.cluster ?? currentNode.cluster,
        layout: form.layout ?? currentNode.layout,
        section: form.section ?? currentNode.section ?? null,
        subordinates: currentNode.subordinates || [],
      };

      if (form.superiorId !== undefined) {
        updateData.superiorId = form.superiorId !== null ? form.superiorId : null;
      }

      batch.update(doc(db, "orgdata", selectedId.toString()), updateData);
      await batch.commit();
      showToast("User updated successfully", "success");
      setShowModal(false);
      await fetchNodes();
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Error updating user:", error);
      showToast("Failed to update user", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedId) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      nodes.forEach(node => {
        if (node.subordinates?.includes(selectedId)) {
          const updatedSubordinates = node.subordinates.filter(id => id !== selectedId);
          batch.update(doc(db, "orgdata", node.id.toString()), {
            subordinates: updatedSubordinates
          });
        }
      });

      batch.delete(doc(db, "orgdata", selectedId.toString()));
      await batch.commit();
      showToast("User deleted successfully", "success");
      setSelectedId(null);
      setDeleteConfirm(false);
      await fetchNodes();
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Error deleting user:", error);
      showToast("Failed to delete user", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, mode: "add" | "edit") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      showToast("Only JPEG, PNG, or WebP images are allowed", "warning");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showToast("Image must be less than 500KB", "warning");
      return;
    }

    if (mode === "add") {
      setNewNode(prev => ({ ...prev, img: file }));
    } else {
      setForm(prev => ({ ...prev, img: file }));
    }
  };

  const updateField = (field: keyof OrgChartNode | "superiorId", value: string | number | undefined) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleNodeClick = (node: OrgChartNode) => {
    setSelectedId(node.id);
    const superior = nodes.find(n => n.subordinates?.includes(node.id));
    setForm({
      ...node,
      superiorId: superior?.id
    });
  };

  const resetForm = () => {
    setShowModal(false);
    setNewNode({});
    setForm({});
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Org Chart Admin</h2>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            onClick={() => {
              setEditMode("add");
              setShowModal(true);
            }}
            disabled={loading}
          >
            Add User
          </button>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
            onClick={() => {
              if (selectedId && form) {
                setEditMode("edit");
                setShowModal(true);
              }
            }}
            disabled={!selectedId || loading}
          >
            Edit User
          </button>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
            onClick={() => setDeleteConfirm(true)}
            disabled={!selectedId || loading}
          >
            Delete User
          </button>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <p className="text-lg font-medium">Loading...</p>
          </div>
        </div>
      )}

      <div className="mt-8">
        <OrgChartViewer 
          key={refreshKey} 
          onNodeClick={handleNodeClick}
          selectedNodeId={selectedId}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg mx-4 overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-semibold mb-4">
              {editMode === "add" ? "Add New User" : "Edit User"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Picture</label>
                <input
                  type="file"
                  accept="image/*"
                  className="border p-2 rounded w-full"
                  onChange={(e) => handleImageChange(e, editMode)}
                  disabled={loading}
                />
                {editMode === "edit" && form.img && typeof form.img === 'string' && (
                  <div className="mt-2 text-xs text-gray-500">
                    Current image will be replaced
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name*</label>
                <input
                  placeholder="John Doe"
                  className="border p-2 rounded w-full"
                  value={editMode === "add" ? newNode.name || "" : form.name || ""}
                  onChange={(e) =>
                    editMode === "add"
                      ? setNewNode((prev) => ({ ...prev, name: e.target.value }))
                      : updateField("name", e.target.value)
                  }
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  placeholder="john@example.com"
                  className="border p-2 rounded w-full"
                  value={editMode === "add" ? newNode.email || "" : form.email || ""}
                  onChange={(e) =>
                    editMode === "add"
                      ? setNewNode((prev) => ({ ...prev, email: e.target.value }))
                      : updateField("email", e.target.value)
                  }
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position*</label>
                <input
                  placeholder="Chief Executive Officer"
                  className="border p-2 rounded w-full"
                  value={editMode === "add" ? newNode.position1 || "" : form.position1 || ""}
                  onChange={(e) =>
                    editMode === "add"
                      ? setNewNode((prev) => ({ ...prev, position1: e.target.value }))
                      : updateField("position1", e.target.value)
                  }
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                <input
                  placeholder="CEO"
                  className="border p-2 rounded w-full"
                  value={editMode === "add" ? newNode.position2 || "" : form.position2 || ""}
                  onChange={(e) =>
                    editMode === "add"
                      ? setNewNode((prev) => ({ ...prev, position2: e.target.value }))
                      : updateField("position2", e.target.value)
                  }
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  placeholder="e.g., New York"
                  className="border p-2 rounded w-full"
                  value={editMode === "add" ? newNode.city || "" : form.city || ""}
                  onChange={(e) =>
                    editMode === "add"
                      ? setNewNode((prev) => ({ ...prev, city: e.target.value }))
                      : updateField("city", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cluster</label>
                <input
                  placeholder="e.g., North America"
                  className="border p-2 rounded w-full"
                  value={editMode === "add" ? newNode.cluster || "" : form.cluster || ""}
                  onChange={(e) =>
                    editMode === "add"
                      ? setNewNode((prev) => ({ ...prev, cluster: e.target.value }))
                      : updateField("cluster", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <select
                  className="border p-2 rounded w-full"
                  value={editMode === "add" ? newNode.section || "" : form.section || ""}
                  onChange={(e) =>
                    editMode === "add"
                      ? setNewNode((prev) => ({ 
                          ...prev, 
                          section: e.target.value as "MES" | "FAS" | "CDS" | "PDMU"
                        }))
                      : updateField("section", e.target.value as "MES" | "FAS" | "CDS" | "PDMU")
                  }
                >
                  <option value="">-- Select Section --</option>
                  <option value="MES">Monitoring and Evaluation Section (MES)</option>
                  <option value="FAS">Financial and Administrative Section (FAS)</option>
                  <option value="CDS">Capability Development Section (CDS)</option>
                  <option value="PDMU">Project and Development Monitoring Unit (PDMU)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Layout</label>
                <select
                  className="border p-2 rounded w-full"
                  value={editMode === "add" ? newNode.layout || "horizontal" : form.layout || "horizontal"}
                  onChange={(e) =>
                    editMode === "add"
                      ? setNewNode((prev) => ({ 
                          ...prev, 
                          layout: e.target.value as "vertical" | "horizontal" 
                        }))
                      : updateField("layout", e.target.value as "vertical" | "horizontal")
                  }
                >
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                </select>
              </div>
              
              {editMode === "edit" && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Superior</label>
                  <select
                    className="border p-2 rounded w-full"
                    value={form.superiorId?.toString() || ""}
                    onChange={(e) => updateField("superiorId", e.target.value ? +e.target.value : undefined)}
                  >
                    <option value="">-- No Superior --</option>
                    {nodes
                      .filter(n => n.id !== selectedId)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name} ({n.position1})
                        </option>
                      ))
                    }
                  </select>
                </div>
              )}

              {editMode === "add" && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Superior (Optional)</label>
                  <select
                    className="border p-2 rounded w-full"
                    value={newNode.superiorId?.toString() || ""}
                    onChange={(e) =>
                      setNewNode((prev) => ({ 
                        ...prev, 
                        superiorId: e.target.value ? +e.target.value : undefined 
                      }))
                    }
                  >
                    <option value="">-- Select Superior --</option>
                    {nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name} ({n.position1})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors"
                onClick={resetForm}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                onClick={editMode === "add" ? handleAddUser : handleUpdateUser}
                disabled={loading}
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
            <p className="mb-4">Are you sure you want to delete this user? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors"
                onClick={() => setDeleteConfirm(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                onClick={handleDeleteUser}
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrgChartEditor;