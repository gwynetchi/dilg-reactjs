import { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useLocation } from "react-router-dom";
import "../styles/components/pages.css";

const Messaging = ({ setUnreadMessages }: { setUnreadMessages: React.Dispatch<React.SetStateAction<number>> }) => {
  const [messages, setMessages] = useState<{ sender: string; text: string; timestamp: number }[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const auth = getAuth();
  const db = getFirestore();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const location = useLocation();
  const isMessagingPage = location.pathname.includes("/message");

  // Delete messages older than 30 minutes
  const deleteOldMessages = async () => {
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000; // 30 minutes in milliseconds
    const messagesRef = collection(db, "messages");
    const oldMessagesQuery = query(messagesRef, where("timestamp", "<", thirtyMinutesAgo));

    const snapshot = await getDocs(oldMessagesQuery);
    snapshot.forEach(async (docSnap) => {
      await deleteDoc(doc(db, "messages", docSnap.id));
    });
  };

  // Fetch real-time messages & delete old ones
  useEffect(() => {
    deleteOldMessages(); // Cleanup old messages on load

    const messagesRef = collection(db, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        sender: doc.data().sender,
        text: doc.data().text,
        timestamp: doc.data().timestamp,
      }));
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (newMessage.trim() === "") return;
    const messageToSend = newMessage;
    setNewMessage("");

    try {
      await addDoc(collection(db, "messages"), {
        sender: auth.currentUser?.email || "Anonymous",
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

  // Function to format messages with clickable links
  const formatMessage = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
  };

  return (
    <div className="chat-container">
      <h2>Messaging</h2>
      {error && <div className="error-message">{error}</div>}
      <div className="chat-box">
        {messages.map((msg, index) => (
          <div key={index} className="chat-message">
            <strong>{msg.sender}:</strong>
            <span dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }} />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input">
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default Messaging;
