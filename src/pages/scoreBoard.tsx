import { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';


interface User {
  id: string;
  fullName: string;
  totalReports: number;
  lateReports: number;
  pendingReports: number;
  score: number;
}

const Scoreboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [editingScore, setEditingScore] = useState<string | null>(null);
  const [newScore, setNewScore] = useState<number | null>(null);
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const [prevTopUserId, setPrevTopUserId] = useState<string | null>(null);



  // Fetch user details (full name) and return it as a promise
  const fetchRecipientDetails = useCallback(async (uid: string): Promise<string> => {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      return `${data.fname} ${data.mname || ""} ${data.lname}`;
    }
    return 'Unknown User';
  }, []);

  // Optimized fetch function for user and report data
  useEffect(() => {
    const fetchScoreboardData = async () => {
      try {
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
  
        // Concurrently fetch reports for each user and their full name
        const usersList: User[] = await Promise.all(usersSnapshot.docs.map(async (userDoc) => {
          const userId = userDoc.id;

          // Fetch reports data
          const reportsRef = collection(db, 'submittedDetails');
          const totalReportsQuery = query(reportsRef, where('submittedBy', '==', userId));
          const totalReportsSnapshot = await getDocs(totalReportsQuery);
          const totalReports = totalReportsSnapshot.size;

          const lateReportsQuery = query(reportsRef, where('submittedBy', '==', userId), where('evaluatorStatus', '==', 'Late'));
          const lateReportsSnapshot = await getDocs(lateReportsQuery);
          const lateReports = lateReportsSnapshot.size;

          const pendingReportsQuery = query(reportsRef, where('submittedBy', '==', userId), where('evaluatorStatus', '==', 'Pending'));
          const pendingReportsSnapshot = await getDocs(pendingReportsQuery);
          const pendingReports = pendingReportsSnapshot.size;

          // Fetch the user's full name
          const fullName = await fetchRecipientDetails(userId);

          // Calculate score
          const score = totalReports - lateReports - pendingReports;

          return {
            id: userId,
            fullName,
            totalReports,
            lateReports,
            pendingReports,
            score,
          };
        }));

        const triggerConfetti = () => {
          const canvas = confettiRef.current;
          if (!canvas) return;

          // Sort users based on their scores (descending order)
          usersList.sort((a, b) => b.score - a.score);

          // Trigger confetti if the top user has changed
          if (usersList.length > 0 && usersList[0].id !== prevTopUserId) {
            setPrevTopUserId(usersList[0].id);  // Just update the prevTopUserId
            triggerConfetti();  // Call confetti once, outside of recursion
          }          
        
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
        
          let animationFrame: number;
          const animate = () => {
            draw();
            animationFrame = requestAnimationFrame(animate);
          };
        
          animate();
        
          setTimeout(() => {
            cancelAnimationFrame(animationFrame);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }, 10000);
        };
        

        // Sort users based on their scores (descending order)
        usersList.sort((a, b) => b.score - a.score);
        if (usersList.length > 0 && usersList[0].id === auth.currentUser?.uid) {
          triggerConfetti();
        }
        setUsers(usersList);
      } catch (error) {
        console.error('Error fetching scoreboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchScoreboardData();
  }, [fetchRecipientDetails]);

  // Fetch current user data
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setCurrentUser(user);
          const userRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const role = userDoc.data()?.role;
            if (role) {
              setCurrentUser((prevUser: any) => ({ ...prevUser, role }));
            }
          }
        } else {
          setCurrentUser(null);
        }
      });
      return () => unsubscribe();
    };

    fetchCurrentUser();
  }, []);

  // Handle score update
  const handleScoreChange = (_uid: string, newScore: number) => {
    setNewScore(newScore);
  };

  const handleSaveScore = async (uid: string) => {
    try {
      if (newScore !== null) {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, { score: newScore });
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === uid ? { ...user, score: newScore } : user
          )
        );
        setEditingScore(null);
        setNewScore(null);
      }
    } catch (error) {
      console.error('Error updating score in Firestore:', error);
      alert('Failed to update score!');
    }
  };

  const toggleEditMode = (uid: string, score: number) => {
    if (editingScore === uid) {
      setEditingScore(null);
    } else {
      setEditingScore(uid);
      setNewScore(score);
    }
  };

  const isEvaluator = currentUser?.role === 'Evaluator' || currentUser?.role === 'evaluator';

  if (loading) {
    return <div>Loading scoreboard...</div>;
  }

  return ( <main>
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
      <h1>Scoreboard</h1>
      <table className="scoreboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>User</th>
            <th>Total Reports</th>
            <th>Late Reports</th>
            <th>Pending Reports</th>
            <th>Score</th>
            {isEvaluator && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
  {users.length > 0 ? (
    users.map((user, index) => {
      let medal = '';
      let rowStyle = {};

      if (index === 0) {
        medal = ' 🥇';
        rowStyle = { backgroundColor: '#fff9c4' }; // gold tint
      } else if (index === 1) {
        medal = ' 🥈';
        rowStyle = { backgroundColor: '#f0f0f0' }; // silver tint
      } else if (index === 2) {
        medal = ' 🥉';
        rowStyle = { backgroundColor: '#ffe0b2' }; // bronze tint
      } else {
        // Clear any row style so it uses default (no zebra striping override)
        rowStyle = { backgroundColor: 'transparent' };
      }

      return (
        <tr key={user.id} style={rowStyle}>
          <td>{index + 1}{medal}</td>
          <td>{user.fullName}</td>
          <td>{user.totalReports}</td>
          <td>{user.lateReports}</td>
          <td>{user.pendingReports}</td>
          <td>{user.score}</td>
          {isEvaluator && (
            <td>
              <button
                onClick={() => toggleEditMode(user.id, user.score)}
                style={{ marginRight: '10px' }}
              >
                {editingScore === user.id ? 'Cancel Edit' : 'Edit'}
              </button>
              {editingScore === user.id && (
                <>
                  <input
                    type="number"
                    value={newScore || ''}
                    onChange={(e) => handleScoreChange(user.id, parseInt(e.target.value))}
                    min="0"
                    style={{ width: '60px' }}
                  />
                  <button onClick={() => handleSaveScore(user.id)}>Save</button>
                </>
              )}
            </td>
          )}
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
