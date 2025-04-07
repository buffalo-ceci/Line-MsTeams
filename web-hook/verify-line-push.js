// verify-line-push.js

require("dotenv").config();
const axios = require("axios");

const configs = [
  {
    name: "LINE_CHANNEL_ACCESS_TOKEN_1",
    token: process.env.LINE_CHANNEL_ACCESS_TOKEN_1,
    groups: (process.env.LINE_GROUP_IDS_1 || "").split(","),
  },
  {
    name: "LINE_CHANNEL_ACCESS_TOKEN_2",
    token: process.env.LINE_CHANNEL_ACCESS_TOKEN_2,
    groups: (process.env.LINE_GROUP_IDS_2 || "").split(","),
  },
];

async function tryPushMessage(token, groupId) {
  try {
    const res = await axios.post(
      "https://api.line.me/v2/bot/message/push",
      {
        to: groupId,
        messages: [{ type: "text", text: "👋 測試訊息 from verify-line-push.js" }],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 5000,
      }
    );
    return true;
  } catch (err) {
    return err.response?.status || err.message;
  }
}

(async () => {
  console.log("🔍 開始驗證每組 Token 是否能發送到群組...\n");

  for (const config of configs) {
    if (!config.token) {
      console.warn(`⚠️ ${config.name} 未設定，略過。`);
      continue;
    }

    for (const groupId of config.groups) {
      if (!groupId || groupId.trim().length < 10) {
        console.warn(`⚠️ 無效的群組 ID，略過。`);
        continue;
      }

      process.stdout.write(`📤 ${config.name} ➜ 群組 ${groupId} ... `);
      const result = await tryPushMessage(config.token, groupId.trim());
      if (result === true) {
        console.log("✅ 成功發送！");
      } else if (result === 401) {
        console.log("❌ 失敗（401 Unauthorized）：Token 有效但沒有權限發送到該群組");
      } else {
        console.log("❌ 發送失敗：", result);
      }
    }
  }

  console.log("\n✔️ 驗證完成");
})();
