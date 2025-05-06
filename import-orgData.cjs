const admin = require("firebase-admin");
const fs = require("fs");

const serviceAccount = require("./serviceAccountKey.json"); // Adjust path if needed

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const orgData = JSON.parse(fs.readFileSync("orgData.json", "utf8"));

async function importOrgData() {
  const batch = db.batch();
  const collectionRef = db.collection("orgdata"); // 👈 using 'orgdata'

  orgData.forEach((node) => {
    const docRef = collectionRef.doc(node.id.toString());
    batch.set(docRef, node, { merge: true });
  });

  await batch.commit();
  console.log("✅ Successfully imported to 'orgdata' collection.");
}

importOrgData().catch(console.error);

