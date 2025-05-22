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

  if (frequency === "Daily") {
    for (
      let date = new Date(startDate);
      date <= endDate;
      date.setDate(date.getDate() + 1)
    ) {
      const d = new Date(date);
      links.push({
        date: d.toISOString().split("T")[0],
        monitoringlink: null,
        submissionlink: null,
      });
    }

  } else if (frequency === "Weekly") {
    for (
      let date = new Date(startDate);
      date <= endDate;
      date.setDate(date.getDate() + 1)
    ) {
      const d = new Date(date);
      const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "long" });
      if (dayOfWeek === frequencyDetails.weeklyDay) {
        links.push({
          date: d.toISOString().split("T")[0],
          monitoringlink: null,
          submissionlink: null,
        });
      }
    }

  } else if (frequency === "Monthly") {
    for (
      let date = new Date(startDate);
      date <= endDate;
      date.setDate(date.getDate() + 1)
    ) {
      const d = new Date(date);
      if (d.getDate() === Number(frequencyDetails.monthlyDay)) {
        links.push({
          date: d.toISOString().split("T")[0],
          monitoringlink: null,
          submissionlink: null,
        });
      }
    }

  } else if (frequency === "Yearly") {
    for (
      let date = new Date(startDate);
      date <= endDate;
      date.setDate(date.getDate() + 1)
    ) {
      const d = new Date(date);
      const day = d.getDate();
      const month = d.getMonth() + 1;
      if (
        day === Number(frequencyDetails.yearlyDay) &&
        month === Number(frequencyDetails.yearlyMonth)
      ) {
        links.push({
          date: d.toISOString().split("T")[0],
          monitoringlink: null,
          submissionlink: null,
        });
      }
    }

  } else if (frequency === "Quarterly") {
    const quarterDay = Number(frequencyDetails.quarterDay);
    const quarterMonthOffset = Number(frequencyDetails.quarter); // 1 = first, 2 = second, 3 = third

    if (quarterDay && quarterMonthOffset) {
      const quarters = [0, 3, 6, 9]; // Jan, Apr, Jul, Oct
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();

      for (let year = startYear; year <= endYear; year++) {
        for (const baseMonth of quarters) {
          const month = baseMonth + (quarterMonthOffset - 1);
          const d = new Date(year, month, quarterDay);

          if (
            d.getDate() === quarterDay &&
            d.getMonth() === month &&
            d >= startDate &&
            d <= endDate
          ) {
            links.push({
              date: d.toISOString().split("T")[0],
              monitoringlink: null,
              submissionlink: null,
            });
          }
        }
      }
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
