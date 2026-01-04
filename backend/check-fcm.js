import "dotenv/config";

console.log("🔍 FCM Configuration Check\n");

const checks = {
  "Firebase Service Account": !!process.env.FIREBASE_SERVICE_ACCOUNT,
  "Appwrite FCM Collection": !!process.env.APPWRITE_FCM_TOKENS_COLLECTION_ID,
};

let allPassed = true;

for (const [key, value] of Object.entries(checks)) {
  console.log(`${value ? "✅" : "❌"} ${key}`);
  if (!value) allPassed = false;
}

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log(`\n✅ Firebase JSON valid (Project: ${serviceAccount.project_id})`);
  } catch (error) {
    console.log("\n❌ Firebase Service Account JSON is invalid");
    allPassed = false;
  }
}

console.log("\n" + (allPassed ? "✅ All checks passed!" : "❌ Fix issues above"));
process.exit(allPassed ? 0 : 1);
