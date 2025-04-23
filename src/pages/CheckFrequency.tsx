// components/CheckFrequency.tsx
import { useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase'; // Adjust path to your Firebase config

type Program = {
  id: string;
  programName: string;
  frequency: string;
  frequencyDetails: any;
  participants: string[];
  createdBy: string;
};

type Props = {
  onDuePrograms: (programs: Program[]) => void;
};

const CheckFrequency = ({ onDuePrograms }: Props) => {


  useEffect(() => {
    const checkPrograms = async () => {
      try {
        const now = new Date();
        const due: Program[] = [];

        const programsSnapshot = await getDocs(collection(db, 'programs'));

        for (const doc of programsSnapshot.docs) {
          const data = doc.data();
          const programId = doc.id;

          const commQuery = query(
            collection(db, 'programcommunications'),
            where('programId', '==', programId)
          );
          const commSnap = await getDocs(commQuery);
          const sentDates = commSnap.docs.map((d) => d.data().sentAt?.toDate());

          const lastSent = sentDates.length
            ? new Date(Math.max(...sentDates.map((d) => d?.getTime() || 0)))
            : null;

          const shouldSend = shouldSendCommunication(
            data.frequency,
            data.frequencyDetails,
            lastSent,
            now
          );

          if (shouldSend) {
            due.push({
              id: programId,
              programName: data.programName,
              frequency: data.frequency,
              frequencyDetails: data.frequencyDetails,
              participants: data.participants || [],
              createdBy: data.createdBy || '',
            });
          }
        }

        onDuePrograms(due);

      } catch (error) {
        console.error('Permission error or fetch failed:', error);
      }
    };

    checkPrograms();
  }, [onDuePrograms]);

  return null;
};

function shouldSendCommunication(
  frequency: string,
  frequencyDetails: any,
  lastSent: Date | null,
  now: Date
): boolean {
  if (!lastSent) {
    return matchesCalendarSchedule(frequency, frequencyDetails, now);
  }

  const diffInDays = Math.floor((now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24));

  switch (frequency) {
    case 'Daily': {
      const interval = frequencyDetails?.interval || 1;
      const targetTime = frequencyDetails?.time || '08:00'; // default 8:00 AM
      const [targetHour, targetMinute] = targetTime.split(':').map(Number);
      const nowHasPassedTargetTime =
        now.getHours() > targetHour ||
        (now.getHours() === targetHour && now.getMinutes() >= targetMinute);

      return diffInDays >= interval && nowHasPassedTargetTime;
    }

    case 'Weekly': {
      const targetDay = frequencyDetails?.dayOfWeek ?? 1; // Monday default
      return now.getDay() === targetDay && diffInDays >= 7;
    }

    case 'Monthly': {
      const targetDate = frequencyDetails?.day ?? 1;
      return now.getDate() === targetDate && diffInDays >= 28;
    }

    case 'Quarterly': {
      const quarterlyDay = frequencyDetails?.day ?? 1;
      const monthsSinceStart =
        now.getMonth() - lastSent.getMonth() + 12 * (now.getFullYear() - lastSent.getFullYear());
      return now.getDate() === quarterlyDay && monthsSinceStart >= 3;
    }

    case 'Yearly': {
      const yearlyMonth = frequencyDetails?.month ?? 0;
      const yearlyDay = frequencyDetails?.day ?? 1;
      return (
        now.getMonth() === yearlyMonth &&
        now.getDate() === yearlyDay &&
        now.getFullYear() !== lastSent.getFullYear()
      );
    }

    default:
      return false;
  }
}

function matchesCalendarSchedule(
  frequency: string,
  frequencyDetails: any,
  now: Date
): boolean {
  switch (frequency) {
    case 'Daily': {
      const targetTime = frequencyDetails?.time || '08:00';
      const [targetHour, targetMinute] = targetTime.split(':').map(Number);
      return (
        now.getHours() > targetHour ||
        (now.getHours() === targetHour && now.getMinutes() >= targetMinute)
      );
    }

    case 'Weekly':
      return now.getDay() === (frequencyDetails?.dayOfWeek ?? 1); // Monday default

    case 'Monthly':
      return now.getDate() === (frequencyDetails?.day ?? 1);

    case 'Quarterly':
      return now.getDate() === (frequencyDetails?.day ?? 1);

    case 'Yearly':
      return (
        now.getMonth() === (frequencyDetails?.month ?? 0) &&
        now.getDate() === (frequencyDetails?.day ?? 1)
      );

    default:
      return false;
  }
}

export default CheckFrequency;
