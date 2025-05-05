import React, { useEffect, useState } from 'react';
import { onSnapshot, collection, query, where, doc, getDoc, getFirestore } from 'firebase/firestore';
import { db } from '../firebase';
import { Spinner, Card, Row, Col, Container, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

interface Program {
  id: string;
  programName: string;
  frequency: string;
  duration: {
    from: string;
    to: string;
  };
  frequencyDetails?: {
    weeklyDay?: string;
    monthlyDate?: string;
    quarterlyMonth?: string;
    quarterlyWeek?: string;
    yearlyMonth?: string;
    yearlyDate?: string;
  };
  participants: string[];
}

const ProgramCards: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null); // ✅ Add this
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRole = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(getFirestore(), "users", user.uid));
        const userRole = userDoc.data()?.role?.toLowerCase();
        setRole(userRole);
      }
    };
    fetchRole();
  }, []);

  // Get current user ID
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Fetch programs where current user is a participant
  useEffect(() => {
    if (!userId) return;

    const q = query(collection(db, 'programs'), where('participants', 'array-contains', userId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const myPrograms: Program[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Program, 'id'>),
      }));
      setPrograms(myPrograms);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  if (loading || !role)
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" />
      </div>
    );

  return (
    <Container className="mt-4">
      <h3 className="mb-4">My Program Communications</h3>
      {programs.length === 0 ? (
        <Alert variant="info">No programs found.</Alert>
      ) : (
        <Row xs={1} sm={2} md={3} lg={4} className="g-4">
          {programs.map((program) => (
            <Col key={program.id}>
              <Card
                onClick={() => navigate(`/${role}/programs/${program.id}`)}
                style={{ cursor: 'pointer', height: '100%' }}
                className="shadow-sm h-100"
              >
                <Card.Img
                  variant="top"
                  src="/images/logo.png"
                  style={{ height: '100px', objectFit: 'cover' }}
                />
                <Card.Body>
                  <Card.Title>{program.programName}</Card.Title>
                  <Card.Text>
                    <p><strong>Frequency:</strong> {program.frequency}</p>
                    <p><strong>From:</strong> {program.duration?.from}</p>
                    <p><strong>To:</strong> {program.duration?.to}</p>

                    {program.frequency === 'weekly' && program.frequencyDetails?.weeklyDay && (
                      <p><strong>Weekly Day:</strong> {program.frequencyDetails.weeklyDay}</p>
                    )}
                    {program.frequency === 'monthly' && program.frequencyDetails?.monthlyDate && (
                      <p><strong>Monthly Date:</strong> {program.frequencyDetails.monthlyDate}</p>
                    )}
                    {program.frequency === 'quarterly' && (
                      <>
                        {program.frequencyDetails?.quarterlyMonth && (
                          <p><strong>Quarter:</strong> {program.frequencyDetails.quarterlyMonth}</p>
                        )}
                        {program.frequencyDetails?.quarterlyWeek && (
                          <p><strong>Week:</strong> {program.frequencyDetails.quarterlyWeek}</p>
                        )}
                      </>
                    )}
                    {program.frequency === 'yearly' && (
                      <>
                        {program.frequencyDetails?.yearlyMonth && (
                          <p><strong>Month:</strong> {program.frequencyDetails.yearlyMonth}</p>
                        )}
                        {program.frequencyDetails?.yearlyDate && (
                          <p><strong>Date:</strong> {program.frequencyDetails.yearlyDate}</p>
                        )}
                      </>
                    )}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default ProgramCards;
