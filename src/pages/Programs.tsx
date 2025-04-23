import React, { useEffect, useState } from 'react';
import { onSnapshot, collection } from 'firebase/firestore';
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

const MyProgramInbox: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
  
    const programsRef = collection(db, 'programs');
  
    const unsubscribe = onSnapshot(programsRef, (snapshot) => {
      const myPrograms: Program[] = [];
  
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.participants?.includes(userId)) {
          myPrograms.push({
            id: doc.id,
            programName: data.programName,
            frequency: data.frequency,
            duration: data.duration,
            frequencyDetails: data.frequencyDetails,
            participants: data.participants,
          });
        }
      });
  
      setPrograms(myPrograms);
      setLoading(false);
    });
  
    return () => unsubscribe(); // Cleanup the listener on unmount
  }, [userId]);
  

  if (loading)
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
                onClick={() => navigate(program.id)}
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

export default MyProgramInbox;
