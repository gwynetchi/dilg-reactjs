// components/SendDueCommunications.tsx
import { useEffect } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

type Props = {
  duePrograms: {
    id: string;
    programName: string;
    participants: string[];
    createdBy: string;
  }[];
};

const SendDueCommunications = ({ duePrograms }: Props) => {
  useEffect(() => {
    const send = async () => {
      for (const program of duePrograms) {
        for (const participantId of program.participants) {
          try {
            await addDoc(collection(db, 'programcommunications'), {
              programId: program.id,
              recipients: participantId,
              createdBy: program.createdBy,
              subject: `Scheduled communication for ${program.programName}`,
              createdAt: Timestamp.now(),
              sentAt: Timestamp.now(), // ✅ ADD THIS
              deadline: Timestamp.fromDate(new Date()), // Or a calculated due date if needed

            });
            
            console.log(`Sent to ${participantId} for program ${program.programName}`);
          } catch (err) {
            console.error(`Failed to send for ${participantId}:`, err);
          }
        }
      }
    };

    if (duePrograms.length > 0) {
      console.log("⚪ No due programs to send communications for.");
      send();
    }
  }, [duePrograms]);

  return null;
};

export default SendDueCommunications;
