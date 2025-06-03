import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import { Link, useNavigate } from "react-router-dom";

const Calendar: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showComms, setShowComms] = useState(true);
  const [showSubs, setShowSubs] = useState(true);
  const navigate = useNavigate();

  // Track authenticated user and fetch role
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);

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

  // Fetch communication deadlines
  useEffect(() => {
    if (!userId) return;

    const commRef = collection(db, "communications");
    const q = query(commRef, where("recipients", "array-contains", userId));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const commEvents = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          if (!data.deadline) return null;

          let senderName = "Unknown";
          if (data.createdBy) {
            const senderRef = doc(db, "users", data.createdBy);
            const senderSnap = await getDoc(senderRef);
            if (senderSnap.exists()) {
              const senderData = senderSnap.data();
              senderName = `${senderData.fname} ${senderData.mname ? senderData.mname + " " : ""}${senderData.lname}`;
            }
          }

          return {
            id: "comm-" + docSnapshot.id,
            title: `${data.subject} - ${senderName}`,
            start: data.deadline.toDate(),
            backgroundColor: "#007bff", // blue
            borderColor: "#007bff",
            textColor: "white",
            extendedProps: {
              type: "communication",
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

      setEvents((prev) => {
        const filtered = prev.filter(e => !e.id.startsWith("comm-"));
        return [...filtered, ...commEvents.filter(Boolean)];
      });
    });

    return () => unsubscribe();
  }, [userId]);

  // Fetch programsubmission deadlines
  useEffect(() => {
    if (!userId) return;

    const subsRef = collection(db, "programsubmission");
    const q = query(subsRef, where("submittedBy", "==", userId));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const subEvents: any[] = [];

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        const programId = data.programId;

        let programName = "Program";
        if (programId) {
          const programRef = doc(db, "programs", programId);
          const programSnap = await getDoc(programRef);
          if (programSnap.exists()) {
            const programData = programSnap.data();
            programName = programData.programName || "Program";
          }
        }

        if (Array.isArray(data.submissions)) {
          for (let i = 0; i < data.submissions.length; i++) {
            const sub = data.submissions[i];
            if (sub.occurrence) {
              subEvents.push({
                id: `sub-${docSnap.id}-${i}`,
                title: `${programName} - ${sub.evaluatorStatus || "Pending"}`,
                start: new Date(sub.occurrence),
backgroundColor: "#fd7e14", // orange
borderColor: "#fd7e14",

                textColor: "black",
                extendedProps: {
                  type: "submission",
                  programId,
                  submissionId: docSnap.id,
                  occurrence: sub.occurrence,
                },
              });
            }
          }
        }
      }

      setEvents((prev) => {
        const filtered = prev.filter(e => !e.id.startsWith("sub-"));
        return [...filtered, ...subEvents];
      });
    });

    return () => unsubscribe();
  }, [userId]);

  const handleEventClick = (clickInfo: any) => {
    const props = clickInfo.event.extendedProps;
    if (!userRole) return;

    if (props.type === "communication") {
      const rolePaths: { [key: string]: string } = {
        ProvincialOffice: "Provincial Office",
        FieldOffice: "Field Office",
        ClusterOffice: "Cluster Office",
        Admin: "admin",
      };
      const rolePath = rolePaths[userRole] || "Field Office";
      navigate(`/${rolePath}/inbox/${props.messageId}`);
    } else if (props.type === "submission") {
      navigate(`/programdetails/${props.programId}`);
    }
  };

  const filteredEvents = events.filter((event) => {
    if (event.id.startsWith("comm-") && showComms) return true;
    if (event.id.startsWith("sub-") && showSubs) return true;
    return false;
  });

  return (
    <div className="dashboard-container">
      <main>
        <div className="head-title">
          <div className="left">
            <h1>Deadlines</h1>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb">
                <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                <li className="breadcrumb-item active">Calendar</li>
              </ol>
            </nav>
          </div>
        </div>


        <div className="calendar-container"></div>
        
        {/* Filters */}
          <div className="filter-options" style={{ display: "flex", gap: "1rem" }}>
            <div 
              className={`filter-option ${showComms ? 'active' : ''}`} 
              onClick={() => setShowComms(!showComms)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                backgroundColor: showComms ? "#007bff" : "#e9ecef",
                color: showComms ? "white" : "#495057",
                transition: "all 0.2s ease",
                fontWeight: "500"
              }}
            >
              <span style={{ 
                display: "inline-block", 
                width: "12px", 
                height: "12px", 
                backgroundColor: "#007bff",
                marginRight: "8px",
                borderRadius: "50%",
                border: "2px solid white"
              }}></span>
              One Shot
            </div>
            
            <div 
              className={`filter-option ${showSubs ? 'active' : ''}`} 
              onClick={() => setShowSubs(!showSubs)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                backgroundColor: showSubs ? "#fd7e14" : "#e9ecef",
                color: showSubs ? "white" : "#495057",
                transition: "all 0.2s ease",
                fontWeight: "500"
              }}
            >
              <span style={{ 
                display: "inline-block", 
                width: "12px", 
                height: "12px", 
                backgroundColor: "#fd7e14",
                marginRight: "8px",
                borderRadius: "50%",
                border: "2px solid white"
              }}></span>
              Regular Reports
            </div>
          </div>
<FullCalendar

  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
  initialView="dayGridMonth"
  events={filteredEvents}
  eventClick={handleEventClick} // ✅ Add this line
  headerToolbar={{
    left: "prev,next today",
    center: "title",
    right: "dayGridMonth,timeGridWeek,timeGridDay",
  }}
  height="auto"
  expandRows={true}
  dayMaxEventRows={3}
  dayMaxEvents={true}
eventContent={(eventInfo) => {
  const isSubmission = eventInfo.event.extendedProps.type === "submission";
  const bgColor = isSubmission ? "" : "";
  
  // Add appropriate boxicon based on event type
  const iconClass = isSubmission ? "bx bxs-doughnut-chart" : "bx bxs-inbox";

  if (isSubmission) {
    const title = eventInfo.event.title;
    const occurrence = eventInfo.event.extendedProps.occurrence;


    const occurrenceTime = new Date(occurrence).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return (
      <div
        style={{
          fontSize: "0.85em",
          backgroundColor: bgColor,
          color: "#0B093B",
          borderRadius: "4px",
          wordWrap: "break-word",
          overflowWrap: "break-word",
          whiteSpace: "normal",
          maxWidth: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "2px" }}>
          <i className={iconClass} style={{ marginRight: "4px", fontSize: "14px" }}></i>
          <b>{title}</b>
        </div>
        <small>Time: {occurrenceTime}</small>
      </div>
    );
  } else {
    const { subject, senderName, time } = eventInfo.event.extendedProps;

    return (
      <div
        style={{
          padding: "2px",
          fontSize: "0.85em",
          backgroundColor: bgColor,
          color: "#0B093B",
          borderRadius: "4px",
          wordWrap: "break-word",
          overflowWrap: "break-word",
          whiteSpace: "normal",
          maxWidth: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "2px" }}>
          <i className={iconClass} style={{ marginRight: "4px", fontSize: "14px" }}></i>
          <b>{subject}</b>
        </div>
        <small>{senderName}</small>
        <br />
        <small>{time}</small>
      </div>
    );
  }
}}

/>

      </main>
    </div>
  );
};

export default Calendar;