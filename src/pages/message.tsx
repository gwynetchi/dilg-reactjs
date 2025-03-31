import { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, where, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore";
import { useLocation } from "react-router-dom";
import DOMPurify from "dompurify";

const Messaging = ({ setUnreadMessages }: { setUnreadMessages: React.Dispatch<React.SetStateAction<number>> }) => {
  const [messages, setMessages] = useState<{ sender: string; text: string; timestamp: number }[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const auth = getAuth();
  const db = getFirestore();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const location = useLocation();
  const isMessagingPage = location.pathname.includes("/message");

  const deleteOldMessages = async () => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const messagesRef = collection(db, "messages");
    const oldMessagesQuery = query(messagesRef, where("timestamp", "<", thirtyDaysAgo));

    const snapshot = await getDocs(oldMessagesQuery);
    snapshot.forEach(async (docSnap) => {
      await deleteDoc(doc(db, "messages", docSnap.id));
    });
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

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const messagesData = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          return {
            sender: data.sender,
            text: data.text,
            timestamp: data.timestamp,
          };
        })
      );

      setMessages(messagesData);

      if (!isMessagingPage) {
        setUnreadMessages((prev) => prev + snapshot.docs.length);
      }
    }, (error) => {
      console.error("Error fetching messages:", error);
      setError("Failed to load messages. Please try again later.");
    });

    return () => unsubscribe();
  }, [isMessagingPage, setUnreadMessages]);

  useEffect(() => {
    // Scroll to the latest message when messages are updated
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const fetchUserFullName = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return data.fname && data.lname
          ? `${data.fname} ${data.mname ? data.mname + " " : ""}${data.lname}`
          : auth.currentUser?.email || "Anonymous";
      }
    } catch (error) {
      console.error("Error fetching user full name:", error);
    }
    return auth.currentUser?.email || "Anonymous";
  };

  const sendMessage = async () => {
    if (newMessage.trim() === "") return;
    const messageToSend = newMessage;
    setNewMessage("");

    try {
      const user = auth.currentUser;
      if (!user) {
        setError("You must be logged in to send a message.");
        return;
      }

      const fullName = await fetchUserFullName(user.uid);

      await addDoc(collection(db, "messages"), {
        sender: fullName,
        text: messageToSend,
        timestamp: Date.now(),
      });

      setError(null);

      if (!isMessagingPage) {
        setUnreadMessages((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message. Please try again.");
    }
  };

  const formatMessage = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const formattedText = text.replace(
      urlRegex,
      (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
    );

    return DOMPurify.sanitize(formattedText);
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
            <div className="timestamp">{formatTimestamp(msg.timestamp)}</div>
          </div>
        ))}
        {/* Scroll to the latest message */}
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
              setNewMessage((prev) => prev + "\n"); // Append a new line
            }
          }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default Messaging;
