const fs = require('fs');
const fetch = require('node-fetch');

// Load jobs.json
const jobsPath = 'api/jobs.json';
const jobsFile = fs.readFileSync(jobsPath, 'utf8');
const jobData = JSON.parse(jobsFile);
const now = new Date();

let updated = false;

(async () => {
  for (let job of jobData.jobs) {
    if (!job.called && new Date(job.runAt) <= now) {
      console.log(`[PROCESSING] Calling job scheduled at: ${job.runAt}`);

      const response = await fetch(`https://${process.env.VERCEL_APP_URL}/api/cron-call`, {
        method: 'POST',
        headers: {
          'x-schedule-secret': process.env.SCHEDULE_SECRET,
        },
      });

      if (response.ok) {
        job.called = true;
        updated = true;
        console.log(`[SUCCESS] Call triggered and job marked as called.`);
      } else {
        const err = await response.text();
        console.error(`[FAILURE] Call failed. Status: ${response.status}, Body: ${err}`);
      }
    }
  }

  if (updated) {
    fs.writeFileSync(jobsPath, JSON.stringify(jobData, null, 2));
    console.log(`[DONE] jobs.json updated successfully.`);
  } else {
    console.log(`[DONE] No jobs due at this time.`);
  }
})();
