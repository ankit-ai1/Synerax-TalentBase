// Gets a Google Drive refresh token — run this ONCE on your own computer.
// Usage:  GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy npm run google-token
import http from "node:http";
import { auth } from "@googleapis/drive";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error("\n❌ Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.\n");
  console.error("   Example: GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy npm run google-token\n");
  process.exit(1);
}

const PORT = 5555;
const redirect = `http://localhost:${PORT}`;
const client = new auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirect);

const url = client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/drive"],
});

const server = http.createServer(async (req, res) => {
  const code = new URL(req.url, redirect).searchParams.get("code");
  if (!code) {
    res.end("No code received");
    return;
  }
  try {
    const { tokens } = await client.getToken(code);
    res.end("Done! Check the terminal for your refresh token. You can close this tab.");
    console.log("\n✅ GOOGLE_REFRESH_TOKEN=" + tokens.refresh_token + "\n");
    console.log("Add this to .env.local and to your Vercel Environment Variables.\n");
  } catch (e) {
    res.end("Error: " + e.message);
    console.error(e);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log("\n1) Open this link in your browser and sign in with the Google account whose Drive you want to use:\n");
  console.log(url + "\n");
  console.log('2) Click "Allow". (If you see "Google hasn\'t verified this app", click Advanced > Go to app — it\'s your own app.)\n');
});
