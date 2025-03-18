import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";

const Calendar: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();

  // Track authenticated user and fetch role
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);

        // Fetch user role from Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserRole(userSnap.data().role);
        }
      } else {
        setUserId(null);
        setUserRole(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch deadlines from "communications" collection where recipient is the logged-in user
  useEffect(() => {
    if (!userId) return;

    const fetchDeadlines = async () => {
      try {
        const commRef = collection(db, "communications");
        const q = query(commRef, where("recipient", "==", userId));
        const querySnapshot = await getDocs(q);

        const fetchedEvents = querySnapshot.docs
          .map((doc) => {
            const data = doc.data();

            if (!data.deadline) return null; // Ensure the message has a deadline

            return {
              id: doc.id,
              title: `${data.subject} - ${data.title}`,
              start: data.deadline.toDate(), // Convert Firestore Timestamp
              extendedProps: {
                messageId: doc.id, // Store message ID for navigation
              },
            };
          })
          .filter(Boolean); // Remove null values

        setEvents(fetchedEvents);
      } catch (error) {
        console.error("Error fetching deadlines:", error);
      }
    };

    fetchDeadlines();
  }, [userId]);

  // Handle event click to open message details
  const handleEventClick = (clickInfo: any) => {
    const messageId = clickInfo.event.extendedProps.messageId;
    if (!userRole) {
      console.error("User role not found.");
      return;
    }

    // Define role-based paths
    const rolePaths: { [key: string]: string } = {
      Evaluator: "evaluator",
      Viewer: "viewer",
      LGU: "lgu",
      Admin: "admin",
    };

    const rolePath = rolePaths[userRole] || "viewer"; // Default to "viewer" if role is unknown
    navigate(`/${rolePath}/communication/${messageId}`);
  };

  return (
    <div className="calendar-container">
      <h2>Deadlines</h2>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        height="80vh"
        eventClick={handleEventClick} // Add event click handler
      />
    </div>
  );
};

export default Calendar;
