const fs = require('fs');
const fetch = require('node-fetch');

const jobsPath = 'api/jobs.json';

if (!process.env.VERCEL_APP_URL || !process.env.SCHEDULE_SECRET) {
  console.error("[ERROR] Missing environment variables.");
  process.exit(1);
}

const jobsFile = fs.readFileSync(jobsPath, 'utf8');
const jobData = JSON.parse(jobsFile);
const now = new Date();

let updated = false;

(async () => {
  for (let job of jobData.jobs) {
    const jobTime = new Date(job.runAt);
    console.log(`[CHECK] Job: ${job.runAt}, Called: ${job.called}`);
    console.log(`[DEBUG] Now = ${now.toISOString()}, Job Time = ${jobTime.toISOString()}`);

    if (!job.called && jobTime <= now) {
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
