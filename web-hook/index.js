// 📁 LINE-MSTEAMS/webhook-bridge

// ✅ LINE ↔ Teams 雙向 Webhook Server

const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_GROUP_ID = process.env.LINE_GROUP_ID;

// 📨 LINE → Teams：接收 LINE webhook 並轉發訊息到 Teams
app.post("/webhook/line", async (req, res) => {
  console.log("📥 收到 LINE webhook 請求！");
  console.log("Body:", JSON.stringify(req.body));

  res.sendStatus(200); // ✅ 立即回應 LINE

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

// 📤 Teams → LINE：接收 Teams webhook 並轉發訊息到 LINE（支援 text, message, attachments, images, stickers, videos）
app.post("/webhook/teams", async (req, res) => {
  try {
    const {
      text = "",
      message = "",
      attachments = [],
      stickerId,
      packageId
    } = req.body || {};

    console.log("📥 收到 Teams webhook：", req.body);

    const lineMessages = [];

    // 處理文字
    if (text.trim()) lineMessages.push({ type: "text", text: text.trim() });
    if (message.trim()) lineMessages.push({ type: "text", text: message.trim() });

    // 處理貼圖
    if (stickerId && packageId) {
      lineMessages.push({
        type: "sticker",
        packageId: String(packageId),
        stickerId: String(stickerId)
      });
    }

    // 處理附件
    for (const url of attachments) {
      if (!url || typeof url !== "string") continue;

      const lowerUrl = url.toLowerCase();
      if (lowerUrl.endsWith(".jpg") || lowerUrl.endsWith(".jpeg") || lowerUrl.endsWith(".png")) {
        lineMessages.push({
          type: "image",
          originalContentUrl: url,
          previewImageUrl: url
        });
      } else if (lowerUrl.endsWith(".mp4")) {
        lineMessages.push({
          type: "video",
          originalContentUrl: url,
          previewImageUrl: url
        });
      } else {
        lineMessages.push({ type: "text", text: `📎 附件：${url}` });
      }
    }

    // 預設訊息
    if (lineMessages.length === 0) {
      lineMessages.push({ type: "text", text: "⚠️ 收到 Teams 空訊息。" });
    }

    // 傳送至 LINE
    await axios.post("https://api.line.me/v2/bot/message/push", {
      to: LINE_GROUP_ID,
      messages: lineMessages
    }, {
      headers: {
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    console.log("✅ 發送成功");
    res.status(200).send("OK"); // 告訴 Power Automate 執行成功
  } catch (error) {
    console.error("❌ Teams → LINE 發送失敗：", error.message || error);
    res.status(500).send("Server Error");
  }
});


app.listen(PORT, () => {
  console.log(`🚀 Webhook server 已啟動：http://localhost:${PORT}`);
});
