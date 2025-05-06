// OrgChartPage.tsx
import React, { useEffect, useState } from "react";
import D3OrgChart, { OrgChartNode } from "./D3OrgChart";
import { db } from "../../firebase"; // adjust this path if needed
import { collection, getDocs } from "firebase/firestore";

const OrgChartPage: React.FC = () => {
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
            layout: data.layout || "",
            status: data.status || "active", // default to "active" if not present
            icon: data.icon || "",           // default to empty string if not present
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
  }, []);
  
  
  if (loading) return <div className="p-6">Loading org chart...</div>;

  return (
    <div className="relative p-6">
      <D3OrgChart data={data} />
    </div>
  );
};

export default OrgChartPage;
