// 📁 LINE-MSTEAMS/webhook-bridge

// ✅ LINE ↔ Teams 雙向 Webhook Server

const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_GROUP_ID = process.env.LINE_GROUP_ID;

// 📨 LINE → Teams：接收 LINE webhook 並轉發訊息到 Teams
app.post("/webhook/line", async (req, res) => {
  // ✅ LINE 要求 webhook 必須快速回傳 200
  res.sendStatus(200);

  try {
    const events = req.body.events;
    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        const userText = event.message.text;

        const teamsMessage = {
          text: `📩 來自 LINE 的訊息：${userText}`,
        };

        await axios.post(TEAMS_WEBHOOK_URL, teamsMessage);
      }
    }
  } catch (error) {
    console.error("LINE → Teams 發送失敗：", error);
  }
});

// 📤 Teams → LINE：接收 Teams webhook 並轉發訊息到 LINE
app.post("/webhook/teams", async (req, res) => {
  try {
    const message = req.body.text || req.body.message || "(空訊息)";

    const linePayload = {
      to: LINE_GROUP_ID,
      messages: [
        {
          type: "text",
          text: `📢 來自 Teams 的訊息：\n${message}`,
        },
      ],
    };

    await axios.post("https://api.line.me/v2/bot/message/push", linePayload, {
      headers: {
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    res.sendStatus(200);
  } catch (error) {
    console.error("Teams → LINE 發送失敗：", error);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Webhook server 已啟動：http://localhost:${PORT}`);
});
