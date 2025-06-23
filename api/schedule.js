// api/schedule.js
import { Octokit } from "@octokit/rest";
import { v4 as uuid } from "uuid";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const runAt = req.body.runAt;
  if (!runAt) return res.status(400).send("Missing runAt");

  const octo = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const owner = "YOUR_GITHUB_USERNAME";
  const repo  = "twilio-vercel-scheduler";
  const path  = "api/jobs.json";

  // 1) fetch current jobs.json
  const { data: file } = await octo.repos.getContent({ owner, repo, path });
  const payload = JSON.parse(Buffer.from(file.content, "base64").toString());

  // 2) append new job
  payload.jobs.push({ id: uuid(), runAt, called: false });

  // 3) commit it back
  await octo.repos.createOrUpdateFileContents({
    owner, repo, path,
    message: `schedule call @ ${runAt}`,
    content: Buffer.from(JSON.stringify(payload, null, 2)).toString("base64"),
    sha: file.sha,
  });

  res.status(200).send("ok");
}
