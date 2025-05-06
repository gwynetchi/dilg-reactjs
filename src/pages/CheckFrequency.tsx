import { useEffect} from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase'; // Adjust path to your Firebase config
import { getAuth } from 'firebase/auth';

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
    console.log("🟡 CheckFrequency mounted: checking for due programs...");
    const checkPrograms = async () => {
      const user = getAuth().currentUser;
      if (!user) return null;

      try {
        const now = new Date();
        const due: Program[] = [];

        const programsSnapshot = await getDocs(collection(db, 'programs'));

        for (const doc of programsSnapshot.docs) {
          const data = doc.data();
          const programId = doc.id;
          const fromDate = new Date(data?.duration?.from);
          const toDate = new Date(data?.duration?.to);
          const isInDurationRange = now >= fromDate && now <= toDate;

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

          console.log(`--- Checking program ${data.programName} ---`);
          console.log('Now:', now.toISOString());
          console.log('Frequency:', data.frequency);
          console.log('Details:', data.frequencyDetails);
          console.log('Last sent:', lastSent?.toISOString() ?? 'never');
          console.log('Should send:', shouldSend);

          if (shouldSend && isInDurationRange) {
            console.log(`✅ Will send: Due and within duration range.`);
            due.push({
              id: programId,
              programName: data.programName,
              frequency: data.frequency,
              frequencyDetails: data.frequencyDetails,
              participants: data.participants || [],
              createdBy: data.createdBy || '',
            });
          } else if (!isInDurationRange) {
            console.log(`📆 Skipping ${data.programName}: outside duration (${fromDate.toISOString()} to ${toDate.toISOString()})`);
          } else if (!shouldSend) {
            console.log(`⏭ Skipping ${data.programName}: not due for sending yet.`);
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
  const diffInDays = lastSent
    ? Math.floor((now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  switch (frequency) {
    case 'Daily': {
      const interval = frequencyDetails?.interval || 1;
      const targetTime = frequencyDetails?.time || '08:00';
      const [targetHour, targetMinute] = targetTime.split(':').map(Number);

      const nowHasPassedTargetTime =
        now.getHours() > targetHour ||
        (now.getHours() === targetHour && now.getMinutes() >= targetMinute);

      if (!lastSent) {
        return nowHasPassedTargetTime;
      }

      return diffInDays! >= interval && nowHasPassedTargetTime;
    }

    case 'Weekly': {
      const rawDay = frequencyDetails?.weeklyDay?.trim()?.toLowerCase();

      const dayMap: { [key: string]: number } = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };

      const targetDay = frequencyDetails?.dayOfWeek ?? dayMap[rawDay] ?? 1;
      const today = now.getDay();

      const daysUntilTarget = (targetDay - today + 7) % 7;
      const isDueSoon = daysUntilTarget === 0 || daysUntilTarget === 1;

      if (!lastSent) {
        return isDueSoon;
      }

      return isDueSoon && diffInDays! >= 7;
    }

    case 'Monthly': {
      const targetDate = Number(frequencyDetails?.day ?? frequencyDetails?.monthlyDay) || 1;
      const isDueSoon = now.getDate() === targetDate || now.getDate() === targetDate - 1;

      if (!lastSent) {
        return isDueSoon;
      }

      return isDueSoon && diffInDays! >= 28;
    }

    case 'Quarterly': {
      const quarterlyDay = Number(frequencyDetails?.day ?? frequencyDetails?.quarterDay) || 1;
      const isDueSoon = now.getDate() === quarterlyDay || now.getDate() === quarterlyDay - 1;

      if (!lastSent) {
        return isDueSoon;
      }

      const monthsSinceStart =
        now.getMonth() - lastSent.getMonth() +
        12 * (now.getFullYear() - lastSent.getFullYear());

      return isDueSoon && monthsSinceStart >= 3;
    }

    case 'Yearly': {
      const yearlyMonth = Number(frequencyDetails?.month) || 0;
      const yearlyDay = Number(frequencyDetails?.day) || 1;
      const isDueSoon =
        now.getMonth() === yearlyMonth &&
        (now.getDate() === yearlyDay || now.getDate() === yearlyDay - 1);

      if (!lastSent) {
        return isDueSoon;
      }

      return isDueSoon && now.getFullYear() !== lastSent.getFullYear();
    }

    default:
      return false;
  }
}

export default CheckFrequency;
 