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
  updateDoc,
} from "firebase/firestore";
import DOMPurify from "dompurify";

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  imageUrl: string | null;
  seenBy: string[];
}

const Messaging = ({
  setUnreadMessages,
}: {
  setUnreadMessages: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const auth = getAuth();
  const db = getFirestore();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastSentTime = useRef<number>(0);

  const MAX_MESSAGE_LENGTH = 1000;
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif"];
  const MAX_IMAGE_SIZE_MB = 5;
  const DEBOUNCE_DELAY_MS = 1000;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const deleteOldMessages = useCallback(async () => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const oldMessagesQuery = query(
      collection(db, "chats"),
      where("timestamp", "<", thirtyDaysAgo)
    );
    const snapshot = await getDocs(oldMessagesQuery);
    const deletePromises = snapshot.docs.map((docSnap) =>
      deleteDoc(doc(db, "chats", docSnap.id))
    );
    await Promise.all(deletePromises);
  }, [db]);

  const fetchUserFullName = useCallback(async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const { fname, mname, lname, email } = userDoc.data() || {};
        return fname && lname
          ? `${fname} ${mname ? mname + " " : ""}${lname}`
          : email || "Anonymous";
      }
    } catch (err) {
      console.error("Error fetching user name:", err);
    }
    return auth.currentUser?.email || "Anonymous";
  }, [auth, db]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Only JPG, PNG, or GIF images are allowed");
      return;
    }
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
    messages.map((msg) => ({
      ...msg,
      formattedText: DOMPurify.sanitize(msg.text),
      formattedTime: formatTimestamp(msg.timestamp),
    })), [messages, formatTimestamp]);

  const sendMessage = async () => {
    const now = Date.now();
    if (isProcessing || (now - lastSentTime.current < DEBOUNCE_DELAY_MS)) return;

    if (!newMessage.trim() && !selectedImage) return;
    if (newMessage.length > MAX_MESSAGE_LENGTH) {
      setError(`Message must be shorter than ${MAX_MESSAGE_LENGTH} characters`);
      return;
    }

    setIsProcessing(true);
    lastSentTime.current = now;

    try {
      const user = auth.currentUser;
      if (!user) {
        setError("You must be logged in to send a message.");
        return;
      }

      const fullName = await fetchUserFullName(user.uid);
      let imageUrl: string | null = null;

      if (selectedImage) {
        const formData = new FormData();
        formData.append("file", selectedImage);
        formData.append("upload_preset", "uploads");
        formData.append("folder", `messageImages/${user.uid}`);

        imageUrl = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const data = JSON.parse(xhr.responseText);
              resolve(data.secure_url);
            } else {
              reject(new Error("Image upload failed"));
            }
          };
          xhr.onerror = () => reject(new Error("Image upload failed"));
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          };
          xhr.open("POST", "https://api.cloudinary.com/v1_1/dr5c99td8/image/upload");
          xhr.send(formData);
        });
      }

      await addDoc(collection(db, "chats"), {
        sender: fullName,
        text: newMessage.substring(0, MAX_MESSAGE_LENGTH),
        timestamp: now,
        imageUrl,
        seenBy: [user.uid],
      });

      setNewMessage("");
      setSelectedImage(null);
      setUploadProgress(null);
      setError(null);
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    deleteOldMessages();
    setIsProcessing(true);

    const messagesRef = collection(db, "chats");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const user = auth.currentUser;
      if (!user) return;

      const fetchedMessages: Message[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        sender: docSnap.data().sender,
        text: docSnap.data().text,
        timestamp: docSnap.data().timestamp,
        imageUrl: docSnap.data().imageUrl || null,
        seenBy: docSnap.data().seenBy || [],
      }));

      setMessages(fetchedMessages);
      scrollToBottom();
      setIsProcessing(false);

      const unseenMessages = fetchedMessages.filter(msg => !msg.seenBy.includes(user.uid));
      setUnreadMessages(unseenMessages.length);

      const batchUpdates = unseenMessages.map(msg =>
        updateDoc(doc(db, "chats", msg.id), {
          seenBy: [...msg.seenBy, user.uid],
        })
      );

      if (batchUpdates.length > 0) {
        await Promise.all(batchUpdates);
      }
    }, (err) => {
      console.error("Error fetching messages:", err);
      setError("Failed to load messages. Please try again later.");
      setIsProcessing(false);
    });

    return () => unsubscribe();
  }, [deleteOldMessages, setUnreadMessages, scrollToBottom]);

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
            {formattedMessages.map((msg, index) => (
              <div key={index} className="chat-message">
                <strong>{msg.sender}:</strong>
                <p
                  style={{ whiteSpace: "pre-wrap" }}
                  dangerouslySetInnerHTML={{ __html: msg.formattedText }}
                />
                {msg.imageUrl && (
                  <div className="uploaded-image">
                    <img
                      src={msg.imageUrl}
                      alt="Uploaded"
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
                style={{ display: "none" }}
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
              className="send-button"
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
