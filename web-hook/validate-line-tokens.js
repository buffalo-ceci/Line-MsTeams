// validate-line-tokens.js

require("dotenv").config();
console.log("📂 確認 .env 已載入 →", process.env.LINE_CHANNEL_ACCESS_TOKEN_1?.slice(0, 10) || "未定義");

const axios = require("axios");

const tokens = [
  { name: "LINE_CHANNEL_ACCESS_TOKEN_1", token: process.env.LINE_CHANNEL_ACCESS_TOKEN_1 },
  { name: "LINE_CHANNEL_ACCESS_TOKEN_2", token: process.env.LINE_CHANNEL_ACCESS_TOKEN_2 },
];

async function validateToken(name, token) {
  try {
    const response = await axios.get("https://api.line.me/v2/bot/info", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log(`✅ ${name} 有效！`);
    console.log(`   → botId: ${response.data.userId}, type: ${response.data.basicId}`);
  } catch (error) {
    console.error(`❌ ${name} 驗證失敗：`, error.response?.data || error.message);
  }
}

(async () => {
  console.log("🔍 開始檢查 LINE Token 是否有效...\n");
  for (const { name, token } of tokens) {
    if (!token) {
      console.warn(`⚠️ ${name} 未設定`);
      continue;
    }
    await validateToken(name, token);
  }
})();
