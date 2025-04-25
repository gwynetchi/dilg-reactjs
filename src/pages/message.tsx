import { useState, useEffect, useRef, useCallback } from "react";
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

interface Message {
  sender: string;
  text: string;
  timestamp: number;
  imageUrl: string | null;
}

const Messaging = ({
  setUnreadMessages,
}: {
  setUnreadMessages: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const auth = getAuth();
  const db = getFirestore();
  const { pathname } = useLocation();
  const isMessagingPage = pathname.includes("/message");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const deleteOldMessages = useCallback(async () => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const oldMessagesQuery = query(
      collection(db, "messages"),
      where("timestamp", "<", thirtyDaysAgo)
    );

    const snapshot = await getDocs(oldMessagesQuery);
    const deletePromises = snapshot.docs.map((docSnap) =>
      deleteDoc(doc(db, "messages", docSnap.id))
    );
    await Promise.all(deletePromises);
  }, [db]);

  const fetchUserFullName = useCallback(
    async (uid: string) => {
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          const { fname, mname, lname, email } = userDoc.data();
          return fname && lname
            ? `${fname} ${mname ? mname + " " : ""}${lname}`
            : email || "Anonymous";
        }
      } catch (err) {
        console.error("Error fetching user name:", err);
      }
      return auth.currentUser?.email || "Anonymous";
    },
    [auth, db]
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedImage(file);
  };

  const formatTimestamp = (timestamp: number) =>
    new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  const sendMessage = async () => {
    if (!newMessage.trim() && !selectedImage) return;

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setError("You must be logged in to send a message.");
        setIsLoading(false);
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
          { method: "POST", body: formData }
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
      if (!isMessagingPage) setUnreadMessages((prev) => prev + 1);
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message. Please try again.");
      setIsLoading(false); // ✅ Still stop loading on error
    }
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
      scrollToBottom();
      setIsLoading(false); // ✅ Stop spinner after messages are displayed

      if (!isMessagingPage) {
        setUnreadMessages((prev) => prev + snapshot.docs.length);
      }
    },
    (error) => {
      console.error("Error fetching messages:", error);
      setError("Failed to load messages. Please try again later.");
      setIsLoading(false);
    }
  );

  return () => unsubscribe();
}, [deleteOldMessages, isMessagingPage, setUnreadMessages]);


  useEffect(scrollToBottom, [messages]);

  const formatMessage = (text: string) => DOMPurify.sanitize(text);

  return (
    <div className="chat-container">
      <h2>Messaging</h2>
      {error && <div className="error-message">{error}</div>}

      <div className="chat-box">
        {messages.map((msg, i) => (
          <div key={i} className="chat-message">
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
          {isLoading ? <div className="spinner" /> : "Send"}
        </button>
      </div>
    </div>
  );
};

export default Messaging;
