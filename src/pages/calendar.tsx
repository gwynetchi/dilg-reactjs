import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
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

  // Fetch deadlines in real-time with sender info
  useEffect(() => {
    if (!userId) return;

    const commRef = collection(db, "communications");
    const q = query(commRef, where("recipients", "array-contains", userId));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const updatedEvents = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          if (!data.deadline) return null; // Ensure message has a deadline

          let senderName = "Unknown";

          // Fetch sender details
          if (data.createdBy) {
            const senderRef = doc(db, "users", data.createdBy);
            const senderSnap = await getDoc(senderRef);
            if (senderSnap.exists()) {
              const senderData = senderSnap.data();
              senderName = `${senderData.fname} ${senderData.mname ? senderData.mname + " " : ""}${senderData.lname}`.trim();
            }
          }

          return {
            id: docSnapshot.id,
            title: `${data.subject} - ${senderName}`, // Include sender in title
            start: data.deadline.toDate(), // Convert Firestore Timestamp
            extendedProps: {
              messageId: docSnapshot.id,
              senderName,
              subject: data.subject,
              time: new Date(data.deadline.toDate()).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              }),              
            },
          };
        })
      );

      setEvents(updatedEvents.filter(Boolean)); // Remove null values
    });

    return () => unsubscribe();
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

    const rolePath = rolePaths[userRole] || "viewer" || "evaluator" || "admin" || "lgu"; // Default to "viewer" if role is unknown
    navigate(`/${rolePath}/inbox/${messageId}`);
  };

  return (
    <div className="dashboard-container">
        <main>
        <div className="head-title">
            <div className="left">
              <h1>Deadlines</h1>
              <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <a href="/dashboards">Home</a>
              </li>
              <li className="breadcrumb-item active">Calendar</li>
            </ol>
          </nav>
            </div>
          </div>

          <div className="calendar-container"></div>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={events}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            height="auto"
            expandRows={true}          // ✅ Allows full row height to show all events
            dayMaxEventRows={3}     // ✅ Let it expand the number of visible rows
            dayMaxEvents={true}
            eventClick={handleEventClick}
            eventContent={(eventInfo) => (
              <div style={{
                wordWrap: "break-word",
                overflowWrap: "break-word",
                whiteSpace: "normal",
                maxWidth: "100%",
                padding: "2px",
                fontSize: "0.8em",
              }}>
                <b>{eventInfo.event.extendedProps.subject}</b>
                <br />
                <small>{eventInfo.event.extendedProps.senderName}</small>
                <br />
                <small>{eventInfo.event.extendedProps.time}</small>
              </div>
            )}
          />
      </main>
    </div>
  );
};

export default Calendar;
