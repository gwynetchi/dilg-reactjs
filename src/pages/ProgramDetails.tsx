// ProgramDetails.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Card, Container, Spinner, Button } from 'react-bootstrap';

interface FrequencyDetails {
  weeklyDay?: string;
  monthlyDate?: string;
  quarterlyMonth?: string;
  quarterlyWeek?: string;
  yearlyMonth?: string;
  yearlyDate?: string;
}

interface Program {
  programName: string;
  frequency: string;
  duration: {
    from: string;
    to: string;
  };
  frequencyDetails?: FrequencyDetails;
  participants: string[];
}

const ProgramDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProgram = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'programs', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProgram({
            programName: data.programName,
            frequency: data.frequency,
            duration: data.duration,
            frequencyDetails: data.frequencyDetails || {},
            participants: data.participants || [],
          });
        }
      } catch (error) {
        console.error('Error fetching program:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgram();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (!program) {
    return (
      <Container className="mt-5 text-center">
        <h4>Program not found.</h4>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Button variant="link" onClick={() => navigate(-1)}>
        ← Back to My Programs
      </Button>
      <Card className="shadow p-4">
        <Card.Body>
          <Card.Title>{program.programName}</Card.Title>
          <Card.Text>
            <p><strong>Frequency:</strong> {program.frequency}</p>
            <p><strong>Duration:</strong> {program.duration.from} to {program.duration.to}</p>

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
    </Container>
  );
};

export default ProgramDetails;
