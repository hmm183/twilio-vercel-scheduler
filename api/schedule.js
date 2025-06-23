export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).end();

    const runAt = req.body.runAt;
    if (!runAt) return res.status(400).send('Missing runAt');

    const { Octokit } = await import("@octokit/rest");
    const { v4: uuidv4 } = await import("uuid");
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    const owner = 'hmm183'; // ✅ update this
    const repo = 'twilio-vercel-scheduler'; // ✅ confirm this
    const path = 'api/jobs.json';

    const { data: file } = await octokit.repos.getContent({ owner, repo, path });

    const jobs = JSON.parse(Buffer.from(file.content, 'base64').toString());
    jobs.jobs.push({ id: uuidv4(), runAt, called: false });

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `schedule call @ ${runAt}`,
      content: Buffer.from(JSON.stringify(jobs, null, 2)).toString('base64'),
      sha: file.sha,
    });

    return res.status(200).send('ok');
  } catch (e) {
    console.error('[schedule.js] error:', e);
    res.status(500).send('Internal Server Error');
  }
}
