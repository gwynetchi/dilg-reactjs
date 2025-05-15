import React, { useEffect, useState } from "react";
import D3OrgChart, { OrgChartNode } from "./D3OrgChart";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";

interface OrgChartViewerProps {
  onNodeClick?: (node: OrgChartNode) => void;
  key?: number;
}

const OrgChartViewer: React.FC<OrgChartViewerProps> = ({ onNodeClick, key }) => {
  const [data, setData] = useState<OrgChartNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrgChart = async () => {
      try {
        const snapshot = await getDocs(collection(db, "orgdata"));
        const items: OrgChartNode[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: typeof data.id === "string" ? parseInt(data.id) : data.id,
            name: data.name || "",
            position1: data.position1 || "",
            position2: data.position2 || "",
            email: data.email || "",
            contact: data.contact || "",
            img: data.img || "",
            subordinates: (data.subordinates || []).map((s: any) =>
              typeof s === "string" ? parseInt(s) : s
            ),
            layout: data.layout || "horizontal",
            status: data.status || "active",
            icon: data.icon || "",
          };
        });
        setData(items);
      } catch (error) {
        console.error("Error fetching org chart data:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchOrgChart();
  }, [key]);
  
  if (loading) return <div className="p-6">Loading org chart...</div>;

  return (
    <div className="relative p-6">
      <D3OrgChart data={data} onNodeClick={onNodeClick} />
    </div>
  );
};

export default OrgChartViewer;
