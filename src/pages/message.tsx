import { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  where,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { useLocation } from "react-router-dom";
import DOMPurify from "dompurify";

const Messaging = ({
  setUnreadMessages,
}: {
  setUnreadMessages: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const [messages, setMessages] = useState<
    {
      imageUrl: any;
      sender: string;
      text: string;
      timestamp: number;
    }[]
  >([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Loading state
  const auth = getAuth();
  const db = getFirestore();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const location = useLocation();
  const isMessagingPage = location.pathname.includes("/message");

  const deleteOldMessages = async () => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const messagesRef = collection(db, "messages");
    const oldMessagesQuery = query(
      messagesRef,
      where("timestamp", "<", thirtyDaysAgo)
    );

    const snapshot = await getDocs(oldMessagesQuery);
    snapshot.forEach(async (docSnap) => {
      await deleteDoc(doc(db, "messages", docSnap.id));
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  useEffect(() => {
    deleteOldMessages();

    const messagesRef = collection(db, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const messagesData = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            return {
              sender: data.sender,
              text: data.text,
              timestamp: data.timestamp,
              imageUrl: data.imageUrl || null,
            };
          })
        );

        setMessages(messagesData);

        if (!isMessagingPage) {
          setUnreadMessages((prev) => prev + snapshot.docs.length);
        }
      },
      (error) => {
        console.error("Error fetching messages:", error);
        setError("Failed to load messages. Please try again later.");
      }
    );

    return () => unsubscribe();
  }, [isMessagingPage, setUnreadMessages]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const fetchUserFullName = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const fullName =
          data.fname && data.lname
            ? `${data.fname} ${data.mname ? data.mname + " " : ""}${data.lname}`
            : data.email || "Anonymous";
        return fullName;
      }
    } catch (error) {
      console.error("Error fetching user full name:", error);
    }
    return auth.currentUser?.email || "Anonymous";
  };

  const sendMessage = async () => {
    if (newMessage.trim() === "" && !selectedImage) return;

    setIsLoading(true); // Start loading

    try {
      const user = auth.currentUser;
      if (!user) {
        setError("You must be logged in to send a message.");
        setIsLoading(false); // Stop loading on error
        return;
      }

      const fullName = await fetchUserFullName(user.uid);
      let imageUrl = null;

      if (selectedImage) {
        const formData = new FormData();
        formData.append("file", selectedImage);
        formData.append("upload_preset", "uploads");
        formData.append("folder", "messageImages");

        const res = await fetch(
          "https://api.cloudinary.com/v1_1/dr5c99td8/image/upload",
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await res.json();
        imageUrl = data.secure_url;
      }

      await addDoc(collection(db, "messages"), {
        sender: fullName,
        text: newMessage,
        timestamp: Date.now(),
        imageUrl,
      });

      setNewMessage("");
      setSelectedImage(null);
      setError(null);

      if (!isMessagingPage) {
        setUnreadMessages((prev) => prev + 1);
      }

      setIsLoading(false); // Stop loading after message is sent
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message. Please try again.");
      setIsLoading(false); // Stop loading on error
    }
  };

  const formatMessage = (text: string) => {
    return DOMPurify.sanitize(text);
  };

  return (
    <div className="chat-container">
      <h2>Messaging</h2>
      {error && <div className="error-message">{error}</div>}
      <div className="chat-box">
        {messages.map((msg, index) => (
          <div key={index} className="chat-message">
            <strong>{msg.sender}:</strong>
            <p
              style={{ whiteSpace: "pre-wrap" }}
              dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }}
            />
            {msg.imageUrl && (
              <div className="uploaded-image">
                <img
                  src={msg.imageUrl}
                  alt="Uploaded"
                  style={{ maxWidth: "100%", marginTop: "10px" }}
                />
              </div>
            )}
            <div className="timestamp">{formatTimestamp(msg.timestamp)}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <textarea
          className="message-input"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            } else if (e.key === "Enter" && e.shiftKey) {
              setNewMessage((prev) => prev + "\n");
            }
          }}
        />
        <input type="file" accept="image/*" onChange={handleFileUpload} />
        {selectedImage && (
          <div className="preview-image">
            <p>Selected image:</p>
            <img
              src={URL.createObjectURL(selectedImage)}
              alt="Preview"
              style={{ maxWidth: "100%", maxHeight: "200px" }}
            />
          </div>
        )}
        <button onClick={sendMessage} disabled={isLoading}>
          {isLoading ? (
            <div className="spinner"></div> // Simple loading spinner
          ) : (
            "Send"
          )}
        </button>
      </div>
    </div>
  );
};

export default Messaging;
