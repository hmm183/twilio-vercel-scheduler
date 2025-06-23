// api/twiml.js
export default function handler(_, res) {
  res.setHeader("Content-Type", "application/xml");
  res.status(200).send(`
    <Response>
      <Say voice="alice">Hello! This is your scheduled reminder.</Say>
    </Response>
  `);
}
