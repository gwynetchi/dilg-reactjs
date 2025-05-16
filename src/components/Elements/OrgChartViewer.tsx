import React, { useEffect, useState } from "react";
import D3OrgChart, { OrgChartNode } from "./D3OrgChart";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import { FirebaseError } from "firebase/app";

interface OrgChartViewerProps {
  onNodeClick?: (node: OrgChartNode) => void;
  key?: number;
}

const DEFAULT_NODE: Partial<OrgChartNode> = {
  name: "",
  position1: "",
  position2: "",
  email: "",
  contact: "",
  img: "",
  city: "",
  cluster: "",
  subordinates: [],
  layout: "horizontal",
  status: "offline",
  icon: "",
};

const OrgChartViewer: React.FC<OrgChartViewerProps> = ({ onNodeClick, key }) => {
  const [data, setData] = useState<OrgChartNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchOrgChart = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!db) {
          throw new Error("Firebase database is not initialized");
        }

        const snapshot = await getDocs(collection(db, "orgdata"));
        
        if (!snapshot || !snapshot.docs) {
          throw new Error("Invalid data format received from Firebase");
        }

        const items: OrgChartNode[] = snapshot.docs.map((doc) => {
          try {
            const docData = doc.data();
            if (!docData) {
              console.warn("Empty document encountered");
              return null;
            }

            // Safely parse node data with fallbacks
            const node: OrgChartNode = {
              ...DEFAULT_NODE,
              id: typeof docData.id === "string" ? parseInt(docData.id) : docData.id ?? 0,
              name: String(docData.name ?? DEFAULT_NODE.name),
              position1: String(docData.position1 ?? DEFAULT_NODE.position1),
              position2: String(docData.position2 ?? DEFAULT_NODE.position2),
              email: String(docData.email ?? DEFAULT_NODE.email),
              contact: String(docData.contact ?? DEFAULT_NODE.contact),
              img: String(docData.img ?? DEFAULT_NODE.img),
              city: String(docData.city ?? DEFAULT_NODE.city),
              cluster: String(docData.cluster ?? DEFAULT_NODE.cluster),
              subordinates: Array.isArray(docData.subordinates) 
                ? docData.subordinates.map((s: any) => 
                    typeof s === "string" ? parseInt(s) : (s || 0)
                  )
                : [],
              layout: ["horizontal", "vertical"].includes(docData.layout)
                ? docData.layout as "horizontal" | "vertical"
                : "horizontal",
              status: String(docData.status ?? DEFAULT_NODE.status),
              icon: String(docData.icon ?? DEFAULT_NODE.icon),
            };

            // Validate required fields
            if (isNaN(node.id)) {
              console.warn(`Invalid ID for node: ${docData.id}`);
              return null;
            }

            return node;
          } catch (e) {
            console.error(`Error processing document ${doc.id}:`, e);
            return null;
          }
        }).filter((node): node is OrgChartNode => node !== null);

        if (isMounted) {
          setData(items);
        }
      } catch (error) {
        if (isMounted) {
          const errorMessage = error instanceof FirebaseError 
            ? `Firebase error: ${error.code} - ${error.message}`
            : error instanceof Error
            ? error.message
            : "Unknown error occurred";
          
          console.error("Error fetching org chart data:", error);
          setError(errorMessage);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOrgChart();

    return () => {
      isMounted = false;
    };
  }, [key]);

  const handleNodeClick = (node: OrgChartNode) => {
    try {
      if (onNodeClick) {
        onNodeClick(node);
      }
    } catch (e) {
      console.error("Error handling node click:", e);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-pulse text-gray-600">Loading organization chart...</div>
        <div className="mt-2 text-sm text-gray-500">Please wait while we load the data</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        <div className="font-bold">Error loading organization chart</div>
        <div className="mt-2 text-sm">{error}</div>
        <button 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-6 text-center text-gray-600">
        <div>No organization data available</div>
        <div className="mt-2 text-sm">The organization chart is empty</div>
      </div>
    );
  }

  return (
    <div className="relative p-6">
      <D3OrgChart 
        data={data} 
        onNodeClick={handleNodeClick} 
      />
    </div>
  );
};

export default OrgChartViewer;