// Import necessary dependencies
import { useState, useEffect } from "react"; // React hooks for state and lifecycle management
import { getAuth, onAuthStateChanged } from "firebase/auth"; // Firebase authentication methods
import { db } from "../../firebase"; // Import Firestore database instance
import { collection, addDoc, doc, getDoc, deleteDoc, Timestamp, onSnapshot } from "firebase/firestore"; // Firestore functions for CRUD operations
import "../../styles/components/pages.module.css"; // Import styles

// Initialize Firebase authentication
const auth = getAuth();

// Define TypeScript interface for a Link object
interface Link {
  id: string;
  userId: string;
  fullName: string;
  locality: string;
  role: string;
  linkUrl: string;
  createdAt: any;
}

const UploadLink = () => {
  // State management
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Tracks authentication status
  const [fullName, setFullName] = useState(""); // Stores user's full name
  const [locality, setLocality] = useState(""); // Stores user's locality
  const [role, setRole] = useState(""); // Stores user role
  const [link, setLink] = useState(""); // Stores link input
  const [message, setMessage] = useState(""); // Stores messages for the user
  const [uploadedLinks, setUploadedLinks] = useState<Link[]>([]); // Stores uploaded links
  const [loading, setLoading] = useState(true); // Tracks loading state

  // Effect to handle authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        fetchUserDetails(user.uid);
        subscribeToLinks();
      } else {
        setIsAuthenticated(false);
        setFullName("");
        setLocality("");
        setRole("");
      }
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup function
  }, []);

  // Fetch user details from Firestore
  const fetchUserDetails = async (uid: string) => {
    try {
      const userRef = doc(db, "users", uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Ensure all users have their full name recorded
        setFullName(userData?.full_name || "Unknown");
        setLocality(userData?.locality || "Unknown");
        setRole(userData?.role?.toLowerCase() || "Unknown");

        console.log("Fetched User Details:", {
          fullName: userData?.full_name,
          locality: userData?.locality,
          role: userData?.role,
        });
      } else {
        setMessage("⚠️ User data not found.");
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  // Subscribe to Firestore collection for real-time updates
  const subscribeToLinks = () => {
    const unsubscribe = onSnapshot(collection(db, "links"), (snapshot) => {
      const links = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId || "Unknown",
          fullName: data.fullName || "Unknown",
          role: data.role || "Unknown",
          locality: data.locality || "Unknown",
          linkUrl: data.linkUrl || "",
          createdAt: data.createdAt || null,
        };
      });

      // Sort links by creation date (newest first)
      links.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setUploadedLinks(links);
    });

    return unsubscribe;
  };

  // Handle link upload
  const handleUpload = async () => {
    if (!auth.currentUser) {
      setMessage("⚠️ You must be logged in to upload links.");
      return;
    }
  
    if (!link.trim()) {
      setMessage("⚠️ Please provide a link.");
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    if (!/^https?:\/\//.test(link.trim())) {
      setMessage("Only HTTPS links are allowed!");
      setTimeout(() => setMessage(""), 2000);
      return;
    }
    // Restrict roles that cannot upload
    const restrictedRoles = ["viewer", "admin", "lgu"];
    if (restrictedRoles.includes(role)) {
      setMessage(`🔒 You are ${fullName}, a / an ${role}, and cannot upload links.`);
      return;
    }
  
    try {
      console.log("Uploading link with:", { fullName, locality, role });
      setMessage("✅ Link uploaded successfully!");
      await new Promise(resolve => setTimeout(resolve, 500));
      setTimeout(() => setMessage(""), 500);
      await addDoc(collection(db, "links"), {
        userId: auth.currentUser.uid,
        fullName,  // 🔹 Ensure this is stored
        locality,  // 🔹 Ensure this is stored
        role,
        linkUrl: link.trim(),
        createdAt: Timestamp.fromDate(new Date()),
      });
      setLink("");
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setMessage(`⚠️ Failed to upload link: ${error instanceof Error ? error.message : "Unknown error"}`);
      setTimeout(() => setMessage(""), 2000);
    }
  };

  // Handle link deletion
  const handleDelete = async (id: string, userId: string) => {
    console.log("Current User ID:", auth.currentUser?.uid);
    console.log("User Role:", role);
    console.log("Full name:", fullName);

    if (!auth.currentUser || (auth.currentUser.uid !== userId && role !== "evaluator")) {
      setMessage("⚠️ You are not authorized to delete this link.");
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    try {
      setMessage("✅ Link deleted successfully!");

      await new Promise(resolve => setTimeout(resolve, 500));
      setTimeout(() => setMessage(""), 500);
      await deleteDoc(doc(db, "links", id));
    } catch (error) {
      setMessage(`⚠️ Failed to delete link: ${error instanceof Error ? error.message : "Unknown error"}`);
      await new Promise(resolve => setTimeout(resolve, 500));
      setTimeout(() => setMessage(""), 2000);
    }
  };

  // Render UI
  if (loading) return <p>Loading...</p>;
  if (!isAuthenticated) return <p>🔒 You must be logged in to view and upload links.</p>;

  // List of roles that cannot upload links
  const restrictedRoles = ["viewer", "admin", "lgu"];

  return (
    <div className="upload-link-container">
      {restrictedRoles.includes(role) ? (
        <p>🔒 You are {fullName}, a / an {role}, and cannot upload links.</p>
      ) : (
        <>
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Enter link"
            className="upload-input"
          />
          <button onClick={handleUpload} className="upload-button">
            Upload Link
          </button>
        </>
      )}
      {message && <p>{message}</p>}

      <h3>Uploaded Links:</h3>
      {uploadedLinks.length === 0 ? (
        <p>No links uploaded yet.</p>
      ) : (
        <div className="upload-table-container">
          <table className="upload-table">
            <thead>
              <tr>
                <th>Link</th>
                <th>Full Name</th>
                <th>Role</th>
                <th>Locality</th>
                <th>Uploaded On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {uploadedLinks.map((link) => (
                <tr key={link.id}>
                  <td>
                    <a href={link.linkUrl} target="_blank" rel="noopener noreferrer" title={link.linkUrl}>
                      {link.linkUrl.length > 10 ? link.linkUrl.substring(0, 10) + "..." : link.linkUrl}
                    </a>
                  </td>
                  <td>{link.fullName}</td>
                  <td>{link.role}</td>
                  <td>{link.locality}</td>
                  <td>
                    {link.createdAt && link.createdAt.seconds
                      ? new Date(link.createdAt.seconds * 1000).toLocaleString()
                      : "Unknown"}
                  </td>
                  <td>
                    <button onClick={() => handleDelete(link.id, link.userId)} className="delete-button"    disabled={restrictedRoles.includes(role)} // Disable button for restricted users
    title={restrictedRoles.includes(role) ? "You are not allowed to delete links." : ""}
>
                      ❌ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UploadLink;
