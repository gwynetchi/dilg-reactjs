import { useState, useEffect } from 'react';
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

  // Function to fetch recipient details (full name)
  const fetchRecipientDetails = async (uid: string): Promise<string> => {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      return `${data.fname} ${data.mname || ""} ${data.lname}`; // Full name format
    }
    return 'Unknown User'; // Fallback if user doesn't exist
  };

  // Fetch user data and their submitted reports metrics
  useEffect(() => {
    const fetchScoreboardData = async () => {
      try {
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);

        const usersList: User[] = [];
        for (const userDoc of usersSnapshot.docs) {
          const userId = userDoc.id;

          // Fetch reports for each user
          const reportsRef = collection(db, 'submittedDetails');
          const reportsQuery = query(reportsRef, where('submittedBy', '==', userId));
          const reportsSnapshot = await getDocs(reportsQuery);

          const totalReports = reportsSnapshot.size;
          const lateReportsQuery = query(reportsRef, where('submittedBy', '==', userId), where('evaluatorStatus', '==', 'Late'));
          const lateReportsSnapshot = await getDocs(lateReportsQuery);
          const lateReports = lateReportsSnapshot.size;

          const pendingReportsQuery = query(reportsRef, where('submittedBy', '==', userId), where('evaluatorStatus', '==', 'Pending'));
          const pendingReportsSnapshot = await getDocs(pendingReportsQuery);
          const pendingReports = pendingReportsSnapshot.size;

          // Fetch the full name of the user
          const fullName = await fetchRecipientDetails(userId);

          // Calculate score (you can modify the logic to suit your needs)
          const score = totalReports - lateReports - pendingReports; // Example scoring logic

          usersList.push({
            id: userId,
            fullName,
            totalReports,
            lateReports,
            pendingReports,
            score,
          });
        }

        // Sort users based on their scores (descending order)
        usersList.sort((a, b) => b.score - a.score);

        setUsers(usersList);
      } catch (error) {
        console.error('Error fetching scoreboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchScoreboardData();
  }, []);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setCurrentUser(user);
          // Fetch user role from Firestore
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
  

  const handleScoreChange = async (uid: string, newScore: number) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { score: newScore });
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === uid ? { ...user, score: newScore } : user
        )
      );
    } catch (error) {
      console.error('Error updating score in Firestore:', error);
      alert('Failed to update score!');  // Optional alert to inform the user
    }
  };

  // Ensure the current user is an Evaluator before allowing score changes
  const isEvaluator = currentUser?.role === 'Evaluator' || currentUser?.role === 'evaluator';

  if (loading) {
    return <div>Loading scoreboard...</div>;
  }

  return (
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
            {isEvaluator && <th>Adjust Score</th>} {/* Only show this column for Evaluators */}
          </tr>
        </thead>
        <tbody>
          {users.length > 0 ? (
            users.map((user, index) => (
              <tr key={user.id}>
                <td>{index + 1}</td>
                <td>{user.fullName}</td>
                <td>{user.totalReports}</td>
                <td>{user.lateReports}</td>
                <td>{user.pendingReports}</td>
                <td>{user.score}</td>
                {isEvaluator && (
                  <td>
                    <input
                      type="number"
                      value={user.score}
                      onChange={(e) => handleScoreChange(user.id, parseInt(e.target.value))}
                      onBlur={(e) => handleScoreChange(user.id, parseInt(e.target.value))}
                      min="0"
                      style={{ width: '60px' }}
                    />
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7}>No users found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Scoreboard;
