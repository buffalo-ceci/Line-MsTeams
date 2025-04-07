// 📁 LINE-MSTEAMS/webhook-bridge

// ✅ LINE ↔ Teams 雙向 Webhook Server
const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL;
if (!TEAMS_WEBHOOK_URL) {
  console.error("❌ 錯誤：請確認 .env 檔案內是否正確設定 TEAMS_WEBHOOK_URL");
  process.exit(1); // 中止 server，避免發送 undefined URL
}


// 多組 LINE Configs
const lineConfigs = [
  {
    token: process.env.LINE_CHANNEL_ACCESS_TOKEN_1,
    groupIds: process.env.LINE_GROUP_IDS_1.split(","),
  },
  {
    token: process.env.LINE_CHANNEL_ACCESS_TOKEN_2,
    groupIds: process.env.LINE_GROUP_IDS_2.split(","),
  },
];

// 🧠 從使用者來源抓取名稱（只用第一組 token）
async function getUsername(source) {
  const headers = {
    Authorization: `Bearer ${lineConfigs[0].token}`, // 預設第一組取名稱
  };

  try {
    if (source.type === "user") {
      const res = await axios.get(`https://api.line.me/v2/bot/profile/${source.userId}`, { headers });
      return res.data.displayName;
    } else if (source.type === "group") {
      const res = await axios.get(`https://api.line.me/v2/bot/group/${source.groupId}/member/${source.userId}`, { headers });
      return res.data.displayName;
    } else if (source.type === "room") {
      const res = await axios.get(`https://api.line.me/v2/bot/room/${source.roomId}/member/${source.userId}`, { headers });
      return res.data.displayName;
    } else {
      return "未知使用者";
    }
  } catch (err) {
    console.error("⚠️ 無法取得 LINE 使用者名稱：", err.response?.data || err.message);
    return "未知使用者";
  }
}

// LINE ➜ Teams
app.post("/webhook/line", async (req, res) => {
  console.log("📥 收到 LINE webhook 請求！");
  res.sendStatus(200);

  try {
    const events = req.body.events;

    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        const userText = event.message.text;
        const username = await getUsername(event.source);

        const teamsMessage = {
          text: `📩 來自 LINE ${username} 的訊息：${userText}`,
        };

        await axios.post(TEAMS_WEBHOOK_URL, teamsMessage);
        console.log(`✅ 已將訊息轉發到 Teams：${teamsMessage.text}`);
      }
    }
  } catch (error) {
    console.error("❌ LINE → Teams 發送失敗：", error.message || error);
  }
});

// Teams ➜ LINE (推播到所有群組)
app.post("/webhook/teams", async (req, res) => {

  try {
    const { text = "", message = "", attachments = [], stickerId, packageId } = req.body || {};
    console.log("📥 收到 Teams webhook：", req.body);

    const lineMessages = [];

    if (text.trim()) lineMessages.push({ type: "text", text: text.trim() });
    if (message.trim()) lineMessages.push({ type: "text", text: message.trim() });

    if (stickerId && packageId) {
      lineMessages.push({
        type: "sticker",
        packageId: String(packageId),
        stickerId: String(stickerId),
      });
    }

    for (const url of attachments) {
      const lowerUrl = typeof url === "string" ? url.toLowerCase() : "";
      if (lowerUrl.endsWith(".jpg") || lowerUrl.endsWith(".jpeg") || lowerUrl.endsWith(".png")) {
        lineMessages.push({ type: "image", originalContentUrl: url, previewImageUrl: url });
      } else if (lowerUrl.endsWith(".mp4")) {
        lineMessages.push({ type: "video", originalContentUrl: url, previewImageUrl: url });
      } else if (url) {
        lineMessages.push({ type: "text", text: `📎 附件：${url}` });
      }
    }

    if (lineMessages.length === 0) {
      lineMessages.push({ type: "text", text: "⚠️ 收到 Teams 空訊息。" });
    }

    for (const config of lineConfigs) {
      for (const groupId of config.groupIds) {
        try {
          await axios.post(
            "https://api.line.me/v2/bot/message/push",
            { to: groupId, messages: lineMessages },
            {
              headers: {
                Authorization: `Bearer ${config.token}`,
                "Content-Type": "application/json",
              },
            }
          );
          console.log(`✅ 發送到 LINE 群組：${groupId}`);
        } catch (err) {
          console.error(`❌ 傳送到 ${groupId} 失敗：`, err.response?.data || err.message);
        }
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Teams → LINE 發送失敗：", error.message || error);
    res.status(500).send("Server Error");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Webhook server 已啟動：http://localhost:${PORT}`);
});


function validateEnvVars() {
  const requiredVars = [
    "PORT",
    "TEAMS_WEBHOOK_URL",
    "LINE_CHANNEL_ACCESS_TOKEN_1",
    "LINE_GROUP_IDS_1",
  ];
  let missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(`❌ 缺少必要的 .env 變數: ${missing.join(", ")}`);
    process.exit(1);
  }
}

validateEnvVars();
