import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, doc, getDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Spinner, Container } from 'react-bootstrap';
import MessageTable, { Message } from './modules/program-modules/messagetable';

const ProgramMessages: React.FC = () => {
  const { programId } = useParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [programName, setProgramName] = useState<string>('');
  const [programDescription, setProgramDescription] = useState<string>('');
  const [programLink, setProgramLink] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Get current user
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Fetch program info
  useEffect(() => {
    if (!programId) return;

    const fetchProgramInfo = async () => {
      const programRef = doc(db, 'programs', programId);
      const docSnap = await getDoc(programRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProgramName(data.programName || 'Program');
        setProgramDescription(data.description || '');
        setProgramLink(data.link || '');
      }
    };

    fetchProgramInfo();
  }, [programId]);

  // Fetch messages
  useEffect(() => {
    if (!programId || !userId) return;

    const q = query(
      collection(db, 'programcommunications'),
      where('programId', '==', programId),
      where('recipients', 'in', [userId])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Message, 'id'>),
      }));
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [programId, userId]);

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <Container className="mt-4">
      <h3>{programName}</h3>
      {programDescription && <p>{programDescription}</p>}
      {programLink && (
        <p>
          <a href={programLink} target="_blank" rel="noopener noreferrer">
            {programLink}
          </a>
        </p>
      )}

      <MessageTable
        messages={messages}
        userId={userId!}
        senderNames={{}} // Replace with actual sender names map
        openMessage={() => {}} // Replace with real handler
        handleDeleteRequest={() => {}} // Replace with real handler
      />
    </Container>
  );
};

export default ProgramMessages;
