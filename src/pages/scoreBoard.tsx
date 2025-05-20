import { useState, useEffect, useCallback, useRef } from 'react';
import { db,  } from '../firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
} from 'firebase/firestore';


interface User {
  id: string;
  fullName: string;
  totalReports: number;
  lateReports: number;
  pendingReports: number;
  score: number;
  averageScore: number;
}

const TOP_N = 10; // show top 10 users

const Scoreboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const confettiRef = useRef<HTMLCanvasElement>(null);
const [source, setSource] = useState<'program' | 'details' | 'all'>('program');
const [month, setMonth] = useState<number | 'all'>('all');
const [year, setYear] = useState<number | 'all'>('all');

  const fetchRecipientDetails = useCallback(async (uid: string): Promise<string> => {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const { fname, mname, lname, email } = userDoc.data();
      const fullName = `${fname || ''} ${mname || ''} ${lname || ''}`.trim();
      return fullName || email || uid;
    }
    return 'Unknown User';
  }, []);

  const triggerConfetti = () => {
    const canvas = confettiRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * 100,
      color: `hsl(${Math.random() * 360}, 100%, 50%)`,
      tilt: Math.random() * 10 - 5,
    }));

    let angle = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angle += 0.01;
      for (const p of particles) {
        p.y += Math.cos(angle + p.d) + 1 + p.r / 2;
        p.x += Math.sin(angle);
        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
      }
    };

    let animationFrame = requestAnimationFrame(function animate() {
      draw();
      animationFrame = requestAnimationFrame(animate);
    });

    setTimeout(() => {
      cancelAnimationFrame(animationFrame);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 6000);
  };
  const USE_SUBMITTED_DETAILS = false; // Change to true when needed
 
  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), async (usersSnapshot) => {
      const usersList: User[] = await Promise.all(
        usersSnapshot.docs.map(async (userDoc) => {
          const userId = userDoc.id;

          const fullName = await fetchRecipientDetails(userId);

let totalReports = 0;
let lateReports = 0;
let pendingReports = 0;
let scores: number[] = [];

if (source === 'details' || source === 'all') {
  const submittedDetailsRef = collection(db, 'submittedDetails');
  const queryRef = query(submittedDetailsRef, where('submittedBy', '==', userId));
  const detailsSnap = await getDocs(queryRef);

  let filteredDetails = detailsSnap.docs.map(doc => doc.data());

  // Apply month/year filter
  if (month !== 'all' || year !== 'all') {
    filteredDetails = filteredDetails.filter(d => {
      const date = d.submittedAt?.toDate?.();
      if (!date) return false;
      const m = date.getMonth() + 1;
      const y = date.getFullYear();
      return (month === 'all' || m === month) && (year === 'all' || y === year);
    });
  }

  totalReports += filteredDetails.length;
  lateReports += filteredDetails.filter(d => d.autoStatus === 'Late' || d.evaluatorStatus === 'Late').length;
  pendingReports += filteredDetails.filter(d => d.evaluatorStatus === 'Pending').length;

  scores.push(
    ...filteredDetails
      .map(d => d.score)
      .filter((s): s is number => typeof s === 'number')
  );
}


if (source === 'program' || source === 'all') {
  const programSubmissionRef = collection(db, 'programsubmission');
  const programSubQuery = query(programSubmissionRef, where('submittedBy', '==', userId));
  const submissionSnap = await getDocs(programSubQuery);

  let allSubmissions = submissionSnap.docs.flatMap((doc) => {
    const data = doc.data();
    return Array.isArray(data.submissions) ? data.submissions : [];
  });

  if (month !== 'all' || year !== 'all') {
    allSubmissions = allSubmissions.filter((s) => {
      const date = s.timestamp?.toDate?.();
      if (!date) return false;
      const m = date.getMonth() + 1;
      const y = date.getFullYear();
      return (month === 'all' || m === month) && (year === 'all' || y === year);
    });
  }

  totalReports += allSubmissions.length;
  lateReports += allSubmissions.filter(s => s.autoStatus === 'Late' || s.evaluatorStatus === 'Late').length;
  pendingReports += allSubmissions.filter(s => s.evaluatorStatus === 'Pending').length;
  scores.push(...allSubmissions
    .map((s) => s.score)
    .filter((s): s is number => typeof s === 'number'));
}


const totalScore = scores.reduce((sum, val) => sum + val, 0);
const averageScore = scores.length > 0 ? totalScore / scores.length : 0;

          return {
            id: userId,
            fullName,
            totalReports,
            lateReports,
            pendingReports,
            score: totalScore,
            averageScore: parseFloat(averageScore.toFixed(2)),
          };
        })
      );

      // sort by total score descending
      usersList.sort((a, b) => b.score - a.score);
      setUsers(usersList.slice(0, TOP_N));
      setLoading(false);
    });

    return () => unsubscribeUsers();
  }, [fetchRecipientDetails, source, month, year]);




  const handleMedalClick = (index: number) => {
    if (index <= 2) triggerConfetti();
  };

  if (loading) {
    return (
      <div className="spinner-overlay">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <main>
      <canvas
        ref={confettiRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      />

      <div className="dashboard-container">
        <h1>Top {TOP_N} Scoreboard</h1>
<div className="row g-3 align-items-center mb-3">
  <div className="col-md-4">
    <label htmlFor="sourceSelect" className="form-label">Source:</label>
    <select
      id="sourceSelect"
      className="form-select"
      value={source}
      onChange={(e) => setSource(e.target.value as any)}
    >
      <option value="program">Program Submissions and Reports</option>
      <option value="details">One-shot Reports</option>
      <option value="all">All</option>
    </select>
  </div>

  <div className="col-md-4">
    <label htmlFor="monthSelect" className="form-label">Month:</label>
    <select
      id="monthSelect"
      className="form-select"
      value={month}
      onChange={(e) =>
        setMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))
      }
    >
      <option value="all">All</option>
      {[...Array(12)].map((_, i) => (
        <option key={i} value={i + 1}>
          {new Date(0, i).toLocaleString('default', { month: 'long' })}
        </option>
      ))}
    </select>
  </div>

  <div className="col-md-4">
    <label htmlFor="yearSelect" className="form-label">Year:</label>
    <select
      id="yearSelect"
      className="form-select"
      value={year}
      onChange={(e) =>
        setYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))
      }
    >
      <option value="all">All</option>
      {[2023, 2024, 2025].map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  </div>
</div>

        <table className="scoreboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>User</th>
              <th>Total Reports</th>
              <th>Late</th>
              <th>Pending</th>
              <th>Total Score</th>
              <th>Average Score</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user, index) => {
                let medal = '';
                let rowStyle = {};

                if (index === 0) {
                  medal = ' 🥇';
                  rowStyle = { backgroundColor: '#fff9c4' };
                } else if (index === 1) {
                  medal = ' 🥈';
                  rowStyle = { backgroundColor: '#c0c0c0' };
                } else if (index === 2) {
                  medal = ' 🥉';
                  rowStyle = { backgroundColor: '#ffe0b2' };
                }

                return (
                  <tr key={user.id} style={rowStyle} onClick={() => handleMedalClick(index)}>
                    <td>{index + 1}{medal}</td>
                    <td>{user.fullName}</td>
                    <td>{user.totalReports}</td>
                    <td>{user.lateReports}</td>
                    <td>{user.pendingReports}</td>
                    <td>{user.score}</td>
                    <td>{user.averageScore}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7}>No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
};

export default Scoreboard;
