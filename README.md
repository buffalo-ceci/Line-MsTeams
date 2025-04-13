# 📡 LINE ↔ Microsoft Teams Webhook Bridge

此專案提供一個 Node.js 伺服器，用於實現 LINE Bot 與 Microsoft Teams 之間的雙向訊息轉發。

---

## 🧩 功能
- 接收 LINE 使用者訊息，自動轉送到 Microsoft Teams 頻道
- 接收 Teams webhook 訊息，自動發送給 LINE 使用者或群組

---

## 📁 專案結構
```
Line-MsTeams/
├── web-hook/             # Webhook server 程式碼
│   └── index.js
├── .env                        # 環境變數（請依照 .env.example 建立）
├── .env.example                # 環境變數範例
└── README.md                   # 使用說明
```

---

## ⚙️ 安裝與執行
```bash
git clone https://github.com/buffalo-ceci/Line-MsTeams
cd Line-MsTeams/web-hook
npm install
cp .env.example .env
# 修改 .env 為你的實際資料
node index.js
```

---

## 🔐 .env 設定說明
```
PORT=3000

# Teams Webhook URL（Teams → Incoming Webhook）
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/your_webhook_url

# LINE 設定
LINE_CHANNEL_ACCESS_TOKEN=你的LINE Bot存取金鑰
LINE_GROUP_ID=你的LINE群組ID或使用者ID
```

> 📌 LINE_GROUP_ID 可透過 LINE webhook 事件內容獲得，例如 `source.groupId`

---

## 🌐 Webhook 路由說明

### 1. `/webhook/line`
- 由 LINE Messaging API 呼叫
- 接收 LINE 使用者訊息並發送到 Teams

### 2. `/webhook/teams`
- 可由 Power Automate 或自定系統呼叫
- 接收訊息並發送給 LINE 群組或使用者

---

## 🚀 推薦工具
- [Ngrok](https://ngrok.com/)：可讓本地端伺服器開放外網使用
- [Power Automate](https://flow.microsoft.com/)：Teams webhook 出發工具

---

## 🛠 待辦與擴充建議
- 支援圖片與貼圖轉發
- 整合 GitHub PR/Issue 通知
- LINE 使用者識別與回覆對話功能

---

開發者：@buffalo-ceci 🐃 | 專案管理應用於 MRT 工程協作

歡迎 fork、改進與實戰應用 🚇✨

