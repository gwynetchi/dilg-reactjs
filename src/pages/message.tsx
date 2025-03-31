import { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, where, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore";
import { useLocation } from "react-router-dom";
import DOMPurify from "dompurify";

const Messaging = ({ setUnreadMessages }: { setUnreadMessages: React.Dispatch<React.SetStateAction<number>> }) => {
  const [messages, setMessages] = useState<{
    mentions: never[]; sender: string; text: string; timestamp: number
  }[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<{[x: string]: string; username: string, fullName: string }[]>([]); // Store full name or email with username
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
            mentions: data.mentions || [], // Add mentions with a default empty array
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

  // Fetch user full name (or email if full name is not set)
  const fetchUserFullName = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const fullName = data.fname && data.lname
          ? `${data.fname} ${data.mname ? data.mname + " " : ""}${data.lname}`
          : auth.currentUser?.email || "Anonymous";
        return fullName;
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
  
      // Detect mentions in the message text (e.g., @username)
      const mentionRegex = /@([a-zA-Z0-9_]+)/g; // Matches '@username' format
      const mentions = [];
      let match;
      while ((match = mentionRegex.exec(messageToSend)) !== null) {
        const username = match[1];
        mentions.push(username); // Store the username (or user ID if needed)
  
        // Send a notification to the mentioned user
        const mentionedUserRef = query(
          collection(db, "users"),
          where("username", "==", username)
        );
        const mentionedUserSnapshot = await getDocs(mentionedUserRef);
        mentionedUserSnapshot.forEach(async (docSnap) => {
          const mentionedUser = docSnap.data();
          // Create a notification for the mentioned user
          await addDoc(collection(db, "notifications"), {
            userId: mentionedUser.uid,
            messageId: "", // You can store the message ID here if needed
            message: `${fullName} mentioned you in a message`,
            timestamp: Date.now(),
            seen: false, // Set to false initially
          });
        });
      }
  
      // Save the message to Firestore along with mentions
      await addDoc(collection(db, "messages"), {
        sender: fullName,
        text: messageToSend,
        timestamp: Date.now(),
        mentions: mentions, // Store the mentioned usernames here
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
  
  // Format message text and highlight mentions
  const formatMessage = (text: string, mentions: string[]) => {
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  
    // Replace mentions with highlighted spans
    const formattedText = text.replace(mentionRegex, (match, username) => {
      if (mentions.includes(username)) {
        return `<span class="mention">@${username}</span>`;
      }
      return match;
    });
  
    return DOMPurify.sanitize(formattedText); // Sanitizing to avoid XSS attacks
  };

  const handleMentionInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    // Detect if the user is typing a mention (i.e., starts with @)
    const mentionRegex = /@([a-zA-Z0-9_]+)$/; // Look for the last word after '@'
    const match = value.match(mentionRegex);

    if (match) {
      const searchQuery = match[1];
      fetchUsersForMention(searchQuery); // Fetch users whose username matches the query
    } else {
      setMentionSuggestions([]);
    }
  };

  const fetchUsersForMention = async (queryText: string) => {
    try {
      const usersRef = collection(db, "users");
  
      // Use a query to search by email or full name
      const q = query(
        usersRef,
        where("email", ">=", queryText),
        where("email", "<=", queryText + "\uf8ff")
      );
  
      // Fetch documents based on the query
      const snapshot = await getDocs(q);
  
      // Process the snapshot to extract necessary details (email or full name)
      const suggestions = snapshot.docs.map((doc) => {
        const userData = doc.data();
        const fullName = `${userData.fname} ${userData.mname ? userData.mname + " " : ""}${userData.lname}`;
        return { email: userData.email, fullName: fullName.trim(), username: userData.username || userData.email };
      });
  
      setMentionSuggestions(suggestions);
    } catch (error) {
      console.error("Error fetching users for mention:", error);
    }
  };

  const handleMentionSelect = (mention: string) => {
    // Replace the current mention input with the selected mention
    const mentionRegex = /@([a-zA-Z0-9_]+)$/;
    const updatedMessage = newMessage.replace(mentionRegex, `@${mention}`);
    setNewMessage(updatedMessage);
    setMentionSuggestions([]); // Hide the suggestion list
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
              dangerouslySetInnerHTML={{ __html: formatMessage(msg.text, msg.mentions || []) }}
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
          onChange={handleMentionInputChange}
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
        {/* Mention Suggestions Dropdown */}
        {mentionSuggestions.length > 0 && (
          <ul className="mention-suggestions">
            {mentionSuggestions.map((suggestion, index) => (
              <li key={index} onClick={() => handleMentionSelect(suggestion.fullName || suggestion.email)}>
                @{suggestion.fullName || suggestion.email}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Messaging;
