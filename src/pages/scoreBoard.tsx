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
  const [editingScore, setEditingScore] = useState<string | null>(null); // Manage which user's score is being edited
  const [newScore, setNewScore] = useState<number | null>(null); // Track the updated score

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
  

  const handleScoreChange = (_uid: string, newScore: number) => {
    setNewScore(newScore); // Temporarily update the score
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
        setEditingScore(null); // Stop editing after saving
        setNewScore(null); // Clear the updated score
      }
    } catch (error) {
      console.error('Error updating score in Firestore:', error);
      alert('Failed to update score!');  // Optional alert to inform the user
    }
  };

  const toggleEditMode = (uid: string, score: number) => {
    if (editingScore === uid) {
      setEditingScore(null); // Disable editing if the same user is clicked
    } else {
      setEditingScore(uid); // Enable editing for the clicked user
      setNewScore(score); // Pre-fill the input field with the current score
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
            {isEvaluator && <th>Actions</th>} {/* Change to "Actions" */}
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
