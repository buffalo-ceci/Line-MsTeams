// 📁 LINE-MSTEAMS/webhook-bridge

const express = require("express");
const axios = require("axios");
require("dotenv").config();
const { htmlToText } = require("html-to-text");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ✅ 多組 LINE + Teams config 對應關係
const channelPairs = [
  {
    token: process.env.LINE_CHANNEL_ACCESS_TOKEN_1,
    groupIds: process.env.LINE_GROUP_IDS_1.split(","),
    teamsWebhook: process.env.TEAMS_WEBHOOK_URL_1,
  },
  {
    token: process.env.LINE_CHANNEL_ACCESS_TOKEN_2,
    groupIds: process.env.LINE_GROUP_IDS_2.split(","),
    teamsWebhook: process.env.TEAMS_WEBHOOK_URL_2,
  },
];

// ✅ 確保 .env 設定完整
function validateEnvVars() {
  const requiredVars = [
    "PORT",
    "LINE_CHANNEL_ACCESS_TOKEN_1",
    "LINE_GROUP_IDS_1",
    "TEAMS_WEBHOOK_URL_1",
    "LINE_CHANNEL_ACCESS_TOKEN_2",
    "LINE_GROUP_IDS_2",
    "TEAMS_WEBHOOK_URL_2",
  ];
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(`❌ 缺少必要的 .env 變數: ${missing.join(", ")}`);
    process.exit(1);
  }
}
validateEnvVars();

// 🔍 根據 groupId 找出對應 config
function findConfigByGroupId(groupId) {
  return channelPairs.find((config) => config.groupIds.includes(groupId));
}

// 🧠 從 LINE 使用者來源抓取名稱
async function getUsername(source) {
  const config = findConfigByGroupId(source.groupId);
  const headers = {
    Authorization: `Bearer ${config?.token}`,
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

// 🔁 LINE ➜ 對應 Teams webhook（依 groupId 決定）
app.post("/webhook/line", async (req, res) => {
  console.log("📥 收到 LINE webhook 請求！");
  res.sendStatus(200);

  try {
    const events = req.body.events;

    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        const userText = event.message.text;
        const groupId = event.source.groupId;
        const config = findConfigByGroupId(groupId);

        if (!config) {
          console.warn(`⚠️ 未知的 LINE 群組 ID：${groupId}，無法轉發`);
          continue;
        }

        const username = await getUsername(event.source);
        const teamsMessage = {
          text: `📩 來自 LINE ${username} 的訊息：\n${userText}`,
        };

        const channelIndex = channelPairs.findIndex(cfg => cfg.groupIds.includes(groupId)) + 1;
        console.log(`🔁 來自群組 ${groupId} ➜ 對應 Teams${channelIndex}`);

        await axios.post(config.teamsWebhook, teamsMessage);
        console.log(`✅ 已將訊息轉發到 Teams${channelIndex}：${teamsMessage.text}`);
      }
    }
  } catch (error) {
    console.error("❌ LINE → Teams 發送失敗：", error.message || error);
  }
});

// 🔁 Teams ➜ 對應 LINE 群組（根據指定 webhook URL）
app.post("/webhook/teams/:channel", async (req, res) => {
  const channel = req.params.channel;
  const config = channelPairs[channel - 1];
  if (!config) return res.status(400).send("Invalid channel");

  try {
    let { text = "", message = "", attachments = [], stickerId, packageId } = req.body || {};
    console.log(`📥 收到 Teams${channel} webhook：`, req.body);

    if (text.includes("<")) {
      text = htmlToText(text, {
        wordwrap: false,
        selectors: [{ selector: 'a', format: 'inline' }],
      });
    }

    text = text.replace(/ALL/gi, "").replace(/\n{2,}/g, "\n").trim();
    const lines = text.split("\n").map(line => line.trim()).filter(Boolean);

    let username = "未知使用者";
    let subject = "無主旨";
    let body = "";
    let fileUrl = "";
    let fileName = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/^RT\s+/.test(line)) {
        username = line.replace(/^RT\s+/, "").trim();
        continue;
      }

      if (!subject || subject === "無主旨") {
        if (/簡報|說明|報告|監測/i.test(line)) {
          subject = line;
          continue;
        }
      }

      if (!fileUrl && line.match(/\.pdf\s*\((https?:\/\/.*?)\)/i)) {
        const match = line.match(/(.*?)\s*\((https?:\/\/.*?)\)/);
        if (match) {
          fileName = match[1].trim();
          fileUrl = match[2].trim();
          continue;
        }
      }

      if (!body) {
        body = line;
      }
    }

    if (!fileUrl) {
      for (const url of attachments) {
        if (typeof url === "string" && url.toLowerCase().endsWith(".pdf")) {
          fileUrl = url;
          fileName = decodeURIComponent(url.split("/").pop()?.split("?")[0] || "附件.pdf");
          break;
        }
      }
    }

    let finalText = `📢 RT ${username}\n主旨：${subject}\n內文："${body || ""}"`;
    if (fileUrl && fileName) {
      finalText += `\n\n📎 檔案：${fileName}\n🔗 ${fileUrl}`;
    }

    const lineMessages = [{ type: "text", text: finalText }];

    if (stickerId && packageId) {
      lineMessages.push({
        type: "sticker",
        packageId: String(packageId),
        stickerId: String(stickerId),
      });
    }

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
        const errorData = err.response?.data || err.message;
        console.error(`❌ 傳送到 ${groupId} 失敗：\n`, JSON.stringify(errorData, null, 2));
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
  console.log("📊 啟用的 groupId ➜ Teams 對應如下：");
  channelPairs.forEach((pair, idx) => {
    console.log(`Teams${idx + 1}:`);
    pair.groupIds.forEach(id => console.log(`  - ${id}`));
  });
});
