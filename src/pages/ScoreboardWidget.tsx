import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import '../styles/ScoreboardWidget.css';

// Define types for our user data
interface TopUser {
  id: string;
  fullName: string;
  score: number;
}

interface Particle {
  x: number;
  y: number;
  r: number;
  d: number;
  color: string;
  tilt: number;
}

const ScoreboardWidget: React.FC = () => {
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const confettiRef = useRef<HTMLCanvasElement | null>(null);
  const navigate = useNavigate();

  const fetchRecipientDetails = async (uid: string): Promise<string> => {
    try {
      const userRef = doc(db, "users", uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        const { fname, mname, lname, email } = data as {
          fname?: string;
          mname?: string;
          lname?: string;
          email?: string;
        };

        const hasName = fname || mname || lname;
        if (hasName) {
          const fullName = `${fname || ""} ${mname || ""} ${lname || ""}`.trim();
          return fullName;
        }

        return email || uid;
      }

      return 'Unknown User';
    } catch (error) {
      console.error('Error fetching user details:', error);
      return 'Unknown User';
    }
  };

  const triggerConfetti = (): void => {
    const canvas = confettiRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const particles: Particle[] = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 4 + 2,
      d: Math.random() * 100,
      color: `hsl(${Math.random() * 360}, 100%, 50%)`,
      tilt: Math.random() * 10 - 5,
    }));

    let angle = 0;

    const draw = (): void => {
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
    const animate = (): void => {
      draw();
      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    setTimeout(() => {
      cancelAnimationFrame(animationFrame);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 3000);
  };

  useEffect(() => {
    const fetchTopUsers = async (): Promise<void> => {
      try {
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);

        const usersList: TopUser[] = await Promise.all(usersSnapshot.docs.map(async (userDoc) => {
          const userId = userDoc.id;

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

          const fullName = await fetchRecipientDetails(userId);
          const score = totalReports - lateReports - pendingReports;

          return {
            id: userId,
            fullName,
            score,
          };
        }));

        // Sort by score and only keep top 3
        usersList.sort((a, b) => b.score - a.score);
        setTopUsers(usersList.slice(0, 3));
      } catch (error) {
        console.error('Error fetching top users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopUsers();
  }, []);

  const handleMedalClick = (): void => {
    triggerConfetti();
  };

  const navigateToScoreboard = (): void => {
    navigate('/scoreBoard');
  };

  if (loading) return (
    <div className="widget-loading">
      <div className="spinner-sm"></div>
    </div>
  );

  return (
    <div className="card mb-3">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h3 className="widget-title">Top LGUs</h3>
        <button 
          className="btn btn-sm btn-outline-primary view-all-btn"
          onClick={navigateToScoreboard}
        >
          View All
        </button>
      </div>
      <canvas
        ref={confettiRef}
        className="confetti-canvas"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          width: '100%',
          height: '100%',
        }}
      />
      <div className="card-body">
        {topUsers.length > 0 ? (
          topUsers.map((user, index) => {
            let medal = '';
            let badgeClass = '';

            if (index === 0) {
              medal = '🥇';
              badgeClass = 'gold-badge';
            } else if (index === 1) {
              medal = '🥈';
              badgeClass = 'silver-badge';
            } else if (index === 2) {
              medal = '🥉';
              badgeClass = 'bronze-badge';
            }

            return (
              <div 
                key={user.id} 
                className={`top-user-card ${badgeClass}`}
                onClick={handleMedalClick}
              >
                <div className="medal">{medal}</div>
                <div className="user-details">
                  <div className="user-name">{user.fullName}</div>
                  <div className="user-score">Score: {user.score}</div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-data">No users found</div>
        )}
      </div>
    </div>
  );
};

export default ScoreboardWidget;