const fs = require('fs');
const fetch = require('node-fetch');

// Load jobs
const jobsPath = 'api/jobs.json';
const jobsFile = fs.readFileSync(jobsPath, 'utf8');
const jobData = JSON.parse(jobsFile);
const now = new Date();

let updated = false;

(async () => {
  for (let job of jobData.jobs) {
    console.log(`[CHECK] Job: ${job.runAt}, Called: ${job.called}`);
    if (!job.called && new Date(job.runAt) <= now) {
      console.log(`[TRIGGER] Job at ${job.runAt} is due. Sending call...`);

      try {
        const res = await fetch(`https://${process.env.VERCEL_APP_URL}/api/cron-call`, {
          method: 'POST',
          headers: {
            'x-schedule-secret': process.env.SCHEDULE_SECRET,
          },
        });

        const text = await res.text();
        console.log(`[RESPONSE] Status ${res.status}: ${text}`);

        if (res.ok) {
          job.called = true;
          updated = true;
        } else {
          console.warn(`[FAILURE] Call failed, not marking job.`);
        }
      } catch (e) {
        console.error(`[ERROR] Fetch to /cron-call failed:`, e);
      }
    }
  }

  if (updated) {
    fs.writeFileSync(jobsPath, JSON.stringify(jobData, null, 2));
    console.log(`[UPDATE] jobs.json updated successfully.`);
  } else {
    console.log(`[INFO] No jobs updated.`);
  }
})();
