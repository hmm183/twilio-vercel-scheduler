import { Octokit } from "@octokit/rest";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const { runAt } = req.body;
    if (!runAt) return res.status(400).send("Missing runAt");

    // 🕒 Convert user-provided date to ISO UTC
    const date = new Date(runAt);
    if (isNaN(date.getTime())) return res.status(400).send("Invalid date format");

    const isoTime = date.toISOString();

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    const owner = "hmm183";
    const repo = "twilio-vercel-scheduler";
    const path = "api/jobs.json";

    // 📥 Read current jobs.json
    const { data: file } = await octokit.repos.getContent({ owner, repo, path });

    const jobsJson = JSON.parse(Buffer.from(file.content, "base64").toString());
    jobsJson.jobs.push({ id: uuidv4(), runAt: isoTime, called: false });

    // 📤 Commit updated jobs.json
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `schedule call @ ${isoTime}`,
      content: Buffer.from(JSON.stringify(jobsJson, null, 2)).toString("base64"),
      sha: file.sha,
    });

    return res.status(200).send("Job scheduled");
  } catch (e) {
    console.error("[/api/schedule] ERROR:", e);
    if (e?.status === 403) {
      return res.status(403).send("Forbidden: Check GITHUB_TOKEN permissions");
    }
    return res.status(500).send("Internal Server Error");
  }
}
