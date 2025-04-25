import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const lastSentTime = useRef<number>(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // Unified state for both sending and loading
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const auth = getAuth();
  const db = getFirestore();
  const { pathname } = useLocation();
  const isMessagingPage = pathname.includes("/message");
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

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

  const MAX_MESSAGE_LENGTH = 1000;
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
  const MAX_IMAGE_SIZE_MB = 5;
  const DEBOUNCE_DELAY_MS = 1000; // 1 SECOND COOLDOWN
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedImage(null);
    setError(null);

    // Validate image type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Only JPG, PNG, or GIF images are allowed');
      return;
    }

    // Validate image size
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setError(`Image must be smaller than ${MAX_IMAGE_SIZE_MB}MB`);
      return;
    }

    setSelectedImage(file);
  };

  const cancelImageUpload = () => {
    setSelectedImage(null);
    setUploadProgress(null);
  };

  const formatTimestamp = useCallback((timestamp: number) => 
    new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }), []);

  const formattedMessages = useMemo(() => 
    messages.map(msg => ({
      ...msg,
      formattedText: DOMPurify.sanitize(msg.text),
      formattedTime: formatTimestamp(msg.timestamp)
    })), [messages, formatTimestamp]);

  const sendMessage = async () => {
    const now = Date.now();
    if ((!newMessage.trim() && !selectedImage) || 
        isProcessing || // Use unified isProcessing state
        now - lastSentTime.current < DEBOUNCE_DELAY_MS) {
      return;
    }

    if (newMessage.length > MAX_MESSAGE_LENGTH) {
      setError(`Message must be shorter than ${MAX_MESSAGE_LENGTH} characters`);
      return;
    }

    setIsProcessing(true); // Set unified processing state
    lastSentTime.current = now;

    try {
      const user = auth.currentUser;
      if (!user) {
        setError("You must be logged in to send a message.");
        setIsProcessing(false);
        return;
      }

      const fullName = await fetchUserFullName(user.uid);
      let imageUrl = null;

      if (selectedImage) {
        const formData = new FormData();
        formData.append("file", selectedImage);
        formData.append("upload_preset", "uploads");
        formData.append("folder", "messageImages");

        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        imageUrl = await new Promise<string>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const data = JSON.parse(xhr.responseText);
              resolve(data.secure_url);
            } else {
              reject(new Error('Image upload failed'));
            }
          };
          xhr.onerror = () => reject(new Error('Image upload failed'));
          xhr.open('POST', 'https://api.cloudinary.com/v1_1/dr5c99td8/image/upload');
          xhr.send(formData);
        });
      }

      await addDoc(collection(db, "messages"), {
        sender: fullName,
        text: newMessage.substring(0, MAX_MESSAGE_LENGTH),
        timestamp: Date.now(),
        imageUrl,
      });

      setNewMessage("");
      setSelectedImage(null);
      setUploadProgress(null);
      setError(null);
      if (!isMessagingPage) setUnreadMessages((prev) => prev + 1);
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message. Please try again.");
    } finally {
      setIsProcessing(false); // Reset processing state after completion
    }
  };

  useEffect(() => {
    deleteOldMessages();
    setIsProcessing(true); // Set processing state for initial load
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
        setIsProcessing(false); // Stop processing spinner after loading messages

        if (!isMessagingPage) {
          setUnreadMessages((prev) => prev + snapshot.docs.length);
        }
      },
      (error) => {
        console.error("Error fetching messages:", error);
        setError("Failed to load messages. Please try again later.");
        setIsProcessing(false);
      }
    );

    return () => unsubscribe();
  }, [deleteOldMessages, isMessagingPage, setUnreadMessages]);

  useEffect(scrollToBottom, [messages]);

  return (
    <div className="chat-container">
      <h2>Messaging</h2>
      {error && <div className="error-message">{error}</div>}

      {isProcessing ? (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading messages...</p>
        </div>
      ) : (
        <>
          <div className="chat-box">
            {formattedMessages.map((msg, i) => (
              <div key={i} className="chat-message">
                <strong>{msg.sender}:</strong>
                <p
                  style={{ whiteSpace: "pre-wrap" }}
                  dangerouslySetInnerHTML={{ __html: msg.formattedText }}
                />
                {msg.imageUrl && (
                  <div className="uploaded-image">
                    <img
                      src={msg.imageUrl}
                      alt="Uploaded content"
                      style={{ maxWidth: "100%", marginTop: "10px" }}
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="timestamp">{msg.formattedTime}</div>
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
              maxLength={MAX_MESSAGE_LENGTH}
              disabled={isProcessing}
            />
            <div className="file-upload-container">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                id="message-image-upload"
                style={{ display: 'none' }}
              />
              <label htmlFor="message-image-upload" className="upload-button">
                📎 Attach Image
              </label>
              {selectedImage && (
                <div className="preview-image">
                  <p>Selected image: {selectedImage.name}</p>
                  <img
                    src={URL.createObjectURL(selectedImage)}
                    alt="Preview"
                    style={{ maxWidth: "100%", maxHeight: "200px" }}
                  />
                  <button onClick={cancelImageUpload} className="cancel-button">
                    × Remove
                  </button>
                  {uploadProgress !== null && (
                    <div className="upload-progress">
                      <progress value={uploadProgress} max="100" />
                      <span>{uploadProgress}%</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="message-counter">
              {newMessage.length}/{MAX_MESSAGE_LENGTH}
            </div>
            <button 
              onClick={sendMessage} 
              disabled={isProcessing || (!newMessage.trim() && !selectedImage)}
            >
              {isProcessing ? <div className="spinner" /> : "Send"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Messaging;
