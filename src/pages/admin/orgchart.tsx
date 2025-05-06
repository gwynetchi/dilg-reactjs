import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { getAuth } from "firebase/auth";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
} from "firebase/firestore";

interface OrgNode {
  id: string;
  parentId: string | null;
  name: string;
  title: string;
}

const OrgChartAdmin: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<OrgNode | null>(null);
  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchUserRole = async () => {
      if (currentUser) {
        const userDocs = await getDocs(collection(db, "users"));
        userDocs.forEach((docSnap) => {
          if (docSnap.id === currentUser.uid) {
            setRole(docSnap.data().role);
          }
        });
      }
    };
    fetchUserRole();
  }, [currentUser]);

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "orgChartNodes"));
      const data: OrgNode[] = [];
      snapshot.forEach((doc) =>
        data.push({ id: doc.id, ...doc.data() } as OrgNode)
      );
      setNodes(data);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 1000;
    const height = 600;
    const g = svg
      .append("g")
      .attr("transform", "translate(50,50)");

    const zoom = d3.zoom().on("zoom", (event) => {
      if (svgRef.current) {
        d3.select(svgRef.current).attr("transform", event.transform);
      }
    });
    svg.call(zoom);

    const root = d3
      .stratify<OrgNode>()
      .id((d) => d.id)
      .parentId((d) => d.parentId)(nodes);

    const treeLayout = d3.tree<d3.HierarchyNode<OrgNode>>().size([width - 200, height - 200]);
    const treeData = treeLayout(root as d3.HierarchyNode<OrgNode>);

    g.selectAll("line")
      .data(treeData.links())
      .enter()
      .append("line")
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y)
      .attr("stroke", "#ccc");

    const nodeGroup = g
      .selectAll("g.node")
      .data(treeData.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d: d3.HierarchyPointNode<OrgNode>) => `translate(${d.x},${d.y})`)
      .call(
        d3
          .drag<SVGGElement, d3.HierarchyPointNode<OrgNode>>()
          .on("drag", (event, d) => {
            const target = event.sourceEvent.target.parentNode;
            d3.select(target).attr(
              "transform",
              `translate(${event.x}, ${event.y})`
            );
          })
      )
      .on("click", (event, d) => {
        if (role === "admin") setEditingNode(d.data);
      });

    nodeGroup
      .append("circle")
      .attr("r", 25)
      .attr("fill", "#4caf50");

    nodeGroup
      .append("text")
      .attr("dy", 5)
      .attr("text-anchor", "middle")
      .text((d) => d.data.name);
  }, [nodes, role]);

  const handleUpdate = async () => {
    if (editingNode) {
      const ref = doc(db, "orgChartNodes", editingNode.id);
      await updateDoc(ref, {
        name: editingNode.name,
        title: editingNode.title,
      });
      setEditingNode(null);
    }
  };

  const handleDelete = async () => {
    if (editingNode) {
      await deleteDoc(doc(db, "orgChartNodes", editingNode.id));
      setEditingNode(null);
      setNodes((prev) => prev.filter((n) => n.id !== editingNode.id));
    }
  };

  const handleAdd = async () => {
    if (editingNode) {
      const newNode = {
        name: "New Node",
        title: "Title",
        parentId: editingNode.id,
      };
      const docRef = await addDoc(collection(db, "orgChartNodes"), newNode);
      setNodes((prev) => [...prev, { id: docRef.id, ...newNode }]);
    }
  };

  return (
    <div className="dashboard-container">
      <h2>Organization Chart</h2>
      <svg ref={svgRef} width={1000} height={600}></svg>

      {editingNode && role === "admin" && (
        <div className="modal">
          <h3>Edit Node</h3>
          <input
            type="text"
            value={editingNode.name}
            onChange={(e) =>
              setEditingNode({ ...editingNode, name: e.target.value })
            }
            placeholder="Name"
          />
          <input
            type="text"
            value={editingNode.title}
            onChange={(e) =>
              setEditingNode({ ...editingNode, title: e.target.value })
            }
            placeholder="Title"
          />
          <div style={{ marginTop: "10px" }}>
            <button onClick={handleUpdate}>Save</button>
            <button onClick={handleAdd}>Add Child</button>
            <button onClick={handleDelete}>Delete</button>
            <button onClick={() => setEditingNode(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgChartAdmin;
