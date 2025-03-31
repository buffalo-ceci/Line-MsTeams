#!/bin/bash

# 啟動 Node.js server（背景執行並輸出到 log）
echo "🚀 啟動 Node.js webhook server..."
node index.js > webhook.log 2>&1 &

# 等待伺服器啟動（2秒）
sleep 2

# 啟動 ngrok（記得先設定過 authtoken）
echo "🌐 啟動 ngrok..."
ngrok http 3000
