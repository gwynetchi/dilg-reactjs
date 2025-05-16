import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "../../../firebase";

interface FrequencyDetails {
  dailyTime?: string;
  weeklyDay?: string;
  monthlyDay?: string;
  quarter?: string;
  quarterDay?: string;
  yearlyMonth?: string;
  yearlyDay?: string;
}

interface Duration {
  from: string; // yyyy-mm-dd
  to: string;   // yyyy-mm-dd
}

export const generateProgramLinks = async (
  programId: string,
  frequency: string,
  frequencyDetails: FrequencyDetails,
  duration: Duration
) => {
  const startDate = new Date(duration.from);
  const endDate = new Date(duration.to);
  const links: { date: string; submissionlink: string | null; monitoringlink: string | null }[] = [];

  for (
    let date = new Date(startDate);
    date <= endDate;
    date.setDate(date.getDate() + 1)
  ) {
    const d = new Date(date); // clone
    const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "long" });
    const day = d.getDate();
    const month = d.getMonth() + 1;

    switch (frequency) {
      case "Daily":
        links.push({ date: d.toISOString().split("T")[0], monitoringlink: null, submissionlink: null, });
        break;

      case "Weekly":
        if (dayOfWeek === frequencyDetails.weeklyDay) {
          links.push({ date: d.toISOString().split("T")[0], monitoringlink: null, submissionlink: null, });
        }
        break;

      case "Monthly":
        if (day === Number(frequencyDetails.monthlyDay)) {
          links.push({ date: d.toISOString().split("T")[0], monitoringlink: null, submissionlink: null, });
        }
        break;

      case "Quarterly":
        const quarterMonths: Record<string, number[]> = {
          "1": [0, 1, 2],   // Jan-Mar
          "2": [3, 4, 5],   // Apr-Jun
          "3": [6, 7, 8],   // Jul-Sep
          "4": [9, 10, 11], // Oct-Dec
        };
        if (
          quarterMonths[frequencyDetails.quarter || ""]?.includes(d.getMonth()) &&
          day === Number(frequencyDetails.quarterDay)
        ) {
          links.push({ date: d.toISOString().split("T")[0], monitoringlink: null, submissionlink: null, });
        }
        break;

      case "Yearly":
        if (
          day === Number(frequencyDetails.yearlyDay) &&
          month === Number(frequencyDetails.yearlyMonth)
        ) {
          links.push({ date: d.toISOString().split("T")[0], monitoringlink: null, submissionlink: null, });
        }
        break;
    }
  }

  if (links.length > 0) {
    await addDoc(collection(db, "programlinks"), {
      programId,
      frequency,
      occurrences: links,
      createdAt: Timestamp.now(),
    });
  }

  return links;
};
