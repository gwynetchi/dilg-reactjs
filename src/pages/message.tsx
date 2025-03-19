import { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";
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

  // Fetch real-time messages
  useEffect(() => {
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
        // If the user is not on the message page, update the unread message count
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
    setNewMessage(""); // Clear input field immediately
    try {
      await addDoc(collection(db, "messages"), {
        sender: auth.currentUser?.email || "Anonymous",
        text: messageToSend,
        timestamp: Date.now(),
      });
      setError(null); // Clear previous errors
      // If the user is not on the messaging page, increment the unread messages count
      if (!isMessagingPage) {
        setUnreadMessages((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message. Please try again.");
    }
  };

  return (
    <div className="chat-container">
      <h2>Messaging</h2>
      {error && <div className="error-message">{error}</div>}
      <div className="chat-box">
        {messages.map((msg, index) => (
          <div key={index} className="chat-message">
            <strong>{msg.sender}:</strong> {msg.text}
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
