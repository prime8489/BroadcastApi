// index.js

const express = require('express');
const axios = require('axios');
const { Low, JSONFile } = require('lowdb');

const app = express();
app.use(express.json());

// Your Telegram Bot Token (Fixed, not asked again)
const BOT_TOKEN = '8109496235:AAEK72pVLP6duBLYKAdfGFZRqrEkCZW8uyc';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Setup Database
const adapter = new JSONFile('db/users.json');
const db = new Low(adapter);

// Initialize Database
async function initDB() {
  await db.read();
  db.data ||= { users: [] };
  await db.write();
}
initDB();

// Save new users automatically (Webhook)
app.post('/webhook', async (req, res) => {
  const update = req.body;

  if (update.message) {
    const userId = update.message.from.id;

    await db.read();
    if (!db.data.users.includes(userId)) {
      db.data.users.push(userId);
      await db.write();
      console.log(`✅ New user saved: ${userId}`);
    }
  }

  res.sendStatus(200);
});

// Broadcast API
app.post('/broadcast', async (req, res) => {
  const { message, photo_url } = req.body;

  if (!message) {
    return res.status(400).json({ error: '❌ Message is required!' });
  }

  await db.read();
  const users = db.data.users;

  if (users.length === 0) {
    return res.status(400).json({ error: '❌ No users found to broadcast!' });
  }

  const results = [];

  for (const userId of users) {
    try {
      if (photo_url) {
        await axios.post(`${TELEGRAM_API}/sendPhoto`, {
          chat_id: userId,
          photo: photo_url,
          caption: message,
          parse_mode: "HTML"
        });
      } else {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: userId,
          text: message,
          parse_mode: "HTML"
        });
      }
      results.push({ userId, status: "✅ Sent" });
    } catch (error) {
      results.push({ userId, status: "❌ Failed", error: error.message });
    }
  }

  res.json({ status: "✅ Broadcast Completed", results });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
