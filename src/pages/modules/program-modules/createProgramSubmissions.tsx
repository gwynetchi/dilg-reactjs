import { setDoc, doc } from "firebase/firestore";
import { db } from "../../../firebase";

// Type for Program reference
interface ProgramRef {
  id: string;
}

// Type for Participant IDs
type Participants = string[];

// Occurrence shape from generateProgramLinks
interface Occurrence {
  date: string;
}

// Type for individual submission entry
interface Submission {
  occurrence: string;  // just the date string
  submittedAt: null;
  status: null;
  evaluatorStatus: "Pending";
  autoStatus: null;
  imageUrl: null;
}

// Function to create program submissions
export const createProgramSubmissions = async (
  programRef: ProgramRef,
  participants: Participants,
  occurrences: Occurrence[]
) => {
  for (const participantId of participants) {
    const submissionDocRef = doc(
      db,
      "programsubmission",
      `${programRef.id}_${participantId}`
    );

    const submissions: Submission[] = occurrences.map(({ date }) => ({
      occurrence: date,
      submittedAt: null,
      status: null,
      evaluatorStatus: "Pending",
      autoStatus: null,
      imageUrl: null,
    }));

    await setDoc(submissionDocRef, {
      programId: programRef.id,
      submittedBy: participantId,
      submissions,
    });
  }
};
