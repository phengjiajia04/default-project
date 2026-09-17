# Default Project

複雜軟體專案的標準開發環境，已預先配置 Git、Node.js、Python 與 GitHub 整合。

目前包含「🔪 快刀廚房」烹飪切菜網頁遊戲，請見下方遊玩說明。

## 🎮 快刀廚房（切菜小遊戲）

原生 JavaScript + Canvas 打造，零依賴。點擊掉落的食材，在腐壞前全部切完；小心 💣 炸彈！

```bash
npm start
```

啟動後會自動開啟瀏覽器：http://localhost:3000

操作方式：點擊 / 輕觸食材進行切割，切得越快連擊越高分。空格或 Enter 可開始/重來。

## 環境需求

| 工具 | 版本 | 驗證指令 |
| ---- | ---- | -------- |
| Git | >= 2.39 | `git --version` |
| Node.js | >= 20 | `node --version` |
| npm | >= 10 | `npm --version` |
| Python | >= 3.11 | `python3 --version` |
| GitHub CLI | >= 2.0 | `gh --version` |

## 快速開始

```bash
# 1. 安裝依賴
npm install
python3 -m pip install -r requirements.txt

# 2. 設定環境變數
cp .env.example .env

# 3. 執行測試
npm test
python3 -m pytest tests/
```

## 專案結構

```
.
├── .github/workflows/   # CI/CD Pipeline
├── config/              # 設定檔
├── data/                # 資料檔案
├── docs/                # 文件
├── public/              # 網頁遊戲（index.html / style.css / game.js）
├── scripts/             # 開發腳本
├── server.js            # 零依賴 Node 靜態伺服器
├── src/                 # 主程式碼
├── tests/               # 測試
├── .env.example         # 環境變數範例
├── .gitignore           # Git 忽略規則
└── package.json         # Node.js 專案設定
```

## GitHub 流程

```bash
gh auth status                 # 確認登入狀態
git push                       # 推送變更
gh pr create                   # 建立 Pull Request
gh workflow run <name>         # 手動觸發 CI
```

## 授權

授權資訊待補充。