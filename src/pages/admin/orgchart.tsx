import React, { useEffect, useState, useCallback } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import OrgChartViewer from "../../components/Elements/OrgChartViewer";
import { OrgChartNode } from "../../components/Elements/D3OrgChart";
import { useToast } from "../../components/context/ToastContext";
import UserModal from "../../pages/admin/orgchartModals/UserModal";
import DeleteConfirmModal from "../../pages/admin/orgchartModals/DeleteConfirmModal";
import LoadingOverlay from "../../pages/admin/orgchartModals/LoadingOverlay";

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
    if (!newNode.name?.trim() || !newNode.position1?.trim()) {
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
        name: newNode.name.trim(),
        email: newNode.email?.trim() || "",
        img: imageUrl,
        city: newNode.city?.trim() || "",
        cluster: newNode.cluster?.trim() || "",
        position1: newNode.position1.trim(),
        position2: newNode.position2?.trim() || "",
        layout: (newNode.layout as "vertical" | "horizontal") || "horizontal",
        section: (newNode.section as "MES" | "FAS" | "CDS" | "PDMU") || null,
        subordinates: [],
        superiorId: superiorId || undefined,
        // contact: "", // Add missing contact field
        // status: "offline" // Add missing status field
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
    
    if (!form.name?.trim() || !form.position1?.trim()) {
      showToast("Name and Position are required fields", "warning");
      return;
    }
    
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
        name: form.name?.trim() ?? currentNode.name,
        position1: form.position1?.trim() ?? currentNode.position1,
        position2: form.position2?.trim() ?? currentNode.position2,
        email: form.email?.trim() ?? currentNode.email,
        img: imageUrl,
        city: form.city?.trim() ?? currentNode.city,
        cluster: form.cluster?.trim() ?? currentNode.cluster,
        layout: form.layout ?? currentNode.layout,
        section: form.section ?? currentNode.section ?? null,
        subordinates: currentNode.subordinates || [],
      };

      if (form.superiorId !== undefined) {
        updateData.superiorId = form.superiorId !== null ? form.superiorId : null;
        
        // Handle superior change logic
        const oldSuperior = nodes.find(n => n.subordinates?.includes(selectedId));
        const newSuperior = form.superiorId ? nodes.find(n => n.id === form.superiorId) : null;
        
        // Remove from old superior
        if (oldSuperior && oldSuperior.id !== form.superiorId) {
          const updatedSubordinates = oldSuperior.subordinates?.filter(id => id !== selectedId) || [];
          batch.update(doc(db, "orgdata", oldSuperior.id.toString()), {
            subordinates: updatedSubordinates
          });
        }
        
        // Add to new superior
        if (newSuperior && !newSuperior.subordinates?.includes(selectedId)) {
          batch.update(doc(db, "orgdata", newSuperior.id.toString()), {
            subordinates: [...(newSuperior.subordinates || []), selectedId]
          });
        }
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

  const selectedNode = nodes.find(n => n.id === selectedId);
  const totalUsers = nodes.length;
  const usersWithSuperiors = nodes.filter(n => n.superiorId).length;

  return (
    <>
      {/* Bootstrap CSS CDN */}
      <link 
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" 
        rel="stylesheet" 
      />
      <link 
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" 
        rel="stylesheet" 
      />

      <div className="container-fluid py-4">
        {/* Header Section */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-primary text-white">
                <div className="row align-items-center">
                  <div className="col-md-6">
                    <h3 className="mb-0">
                      <i className="bi bi-diagram-3 me-2"></i>
                      Organization Chart Admin
                    </h3>
                    <small className="opacity-75">Manage your organization structure</small>
                  </div>
                  <div className="col-md-6 text-md-end mt-2 mt-md-0">
                    <div className="btn-group" role="group">
                      <button
                        className="btn btn-light btn-sm"
                        onClick={() => {
                          setEditMode("add");
                          setNewNode({}); // Reset newNode when opening add modal
                          setShowModal(true);
                        }}
                        disabled={loading}
                      >
                        <i className="bi bi-person-plus me-1"></i>
                        Add User
                      </button>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => {
                          if (selectedId && selectedNode) {
                            setEditMode("edit");
                            const superior = nodes.find(n => n.subordinates?.includes(selectedId));
                            setForm({
                              ...selectedNode,
                              superiorId: superior?.id
                            });
                            setShowModal(true);
                          }
                        }}
                        disabled={!selectedId || loading}
                      >
                        <i className="bi bi-person-gear me-1"></i>
                        Edit User
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          if (selectedId) {
                            setDeleteConfirm(true);
                          }
                        }}
                        disabled={!selectedId || loading}
                      >
                        <i className="bi bi-person-x me-1"></i>
                        Delete User
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm bg-primary text-white">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h6 className="card-title opacity-75 mb-1">Total Users</h6>
                    <h3 className="mb-0">{totalUsers}</h3>
                  </div>
                  <div className="ms-3">
                    <i className="bi bi-people" style={{ fontSize: '2rem', opacity: 0.7 }}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm bg-success text-white">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h6 className="card-title opacity-75 mb-1">Hierarchy Links</h6>
                    <h3 className="mb-0">{usersWithSuperiors}</h3>
                  </div>
                  <div className="ms-3">
                    <i className="bi bi-diagram-2" style={{ fontSize: '2rem', opacity: 0.7 }}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            {selectedNode && (
              <div className="card border-0 shadow-sm bg-info text-white">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <img
                        src={selectedNode.img}
                        alt={selectedNode.name}
                        className="rounded-circle border border-white border-2"
                        style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                      />
                    </div>
                    <div className="flex-grow-1">
                      <h6 className="card-title opacity-75 mb-1">Selected User</h6>
                      <h5 className="mb-0">{selectedNode.name}</h5>
                      <small className="opacity-75">{selectedNode.position1}</small>
                    </div>
                    <div className="ms-3">
                      <i className="bi bi-person-check" style={{ fontSize: '2rem', opacity: 0.7 }}></i>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {!selectedNode && (
              <div className="card border-0 shadow-sm bg-secondary text-white">
                <div className="card-body text-center">
                  <i className="bi bi-cursor" style={{ fontSize: '2rem', opacity: 0.7 }}></i>
                  <h6 className="mt-2 mb-0">Click on a user in the chart to select</h6>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Organization Chart Section */}
        <div className="row">
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-light border-bottom">
                <div className="d-flex align-items-center justify-content-between">
                  <h5 className="mb-0">
                    <i className="bi bi-diagram-3 me-2"></i>
                    Organization Structure
                  </h5>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => {
                      fetchNodes();
                      setRefreshKey(prev => prev + 1);
                    }}
                    disabled={loading}
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    Refresh
                  </button>
                </div>
              </div>
              <div className="card-body p-0" style={{ minHeight: '500px', backgroundColor: '#f8f9fa' }}>
                <OrgChartViewer 
                  key={refreshKey} 
                  onNodeClick={handleNodeClick}
                  selectedNodeId={selectedId}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <UserModal
          show={showModal}
          mode={editMode}
          nodes={nodes}
          selectedId={selectedId}
          form={form}
          newNode={newNode}
          loading={loading}
          onClose={resetForm}
          onSave={editMode === "add" ? handleAddUser : handleUpdateUser}
          onImageChange={handleImageChange}
          onFieldUpdate={updateField}
          onNewNodeUpdate={setNewNode}
        />

        <DeleteConfirmModal
          show={deleteConfirm}
          loading={loading}
          userName={selectedNode?.name}
          userPosition={selectedNode?.position1}
          onConfirm={handleDeleteUser}
          onCancel={() => setDeleteConfirm(false)}
        />

        <LoadingOverlay show={loading} message="Processing..." />
      </div>
    </>
  );
};

export default AdminOrgChartEditor;