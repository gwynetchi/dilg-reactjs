import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const SentCommunications: React.FC = () => {
  const { id } = useParams();
  const [communication, setCommunication] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommunication = async () => {
      if (!id) return; 

      setLoading(true);
      try {
        const docRef = doc(db, "communications", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setCommunication(docSnap.data());
        } else {
          console.error("No such communication!");
        }
      } catch (error) {
        console.error("Error fetching communication:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunication();
  }, [id]);

  if (loading) return <p>Loading communication details...</p>;
  if (!communication) return <p>No communication found.</p>;

  return (
    <div>
      <h1>Communication Details</h1>
      <p><strong>Subject:</strong> {communication.subject}</p>
      <p><strong>Recipients:</strong> {communication.recipients.join(", ")}</p>
      <p><strong>Deadline:</strong> {new Date(communication.deadline.seconds * 1000).toLocaleString()}</p>
      <p><strong>Remarks:</strong> {communication.remarks}</p>
      <p><strong>Link:</strong> <a href={communication.link} target="_blank" rel="noopener noreferrer">{communication.link}</a></p>
    </div>
  );
};

export default SentCommunications;
