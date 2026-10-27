# Deploy to GitHub + Cloudflare

## 1. อัพขึ้น GitHub
git init
git add .
git commit -m "feat: pro studio local + cloudflare ready"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/lyrics-visualizer-pro.git
git push -u origin main

## 2. Cloudflare D1 (Database)
Dashboard > Workers & Pages > D1 > Create Database lyrics-visualizer-db

cd backend-worker
npx wrangler d1 create lyrics-visualizer-db
# เอา database_id ไปใส่ใน wrangler.toml

npx wrangler d1 execute lyrics-visualizer-db --file=../database/schema.sql

## 3. Deploy Backend Worker (MCP API)
cd backend-worker
npm install
npx wrangler deploy
# จะได้ URL https://lyrics-visualizer-pro-api.xxx.workers.dev

## 4. Deploy Frontend to Cloudflare Pages
Cloudflare Dashboard > Pages > Connect to Git
- Root: frontend
- Build: npm run build
- Output: dist
- Env:
  VITE_BACKEND_URL = https://your-worker-url.workers.dev
  VITE_MCP_URL = https://your-worker-url.workers.dev/mcp

## 5. Fullstack แบบ Pages Functions (ทางเลือก)
ย้ายโค้ดจาก backend-worker/src/index.ts ไป frontend/functions/api/[[route]].ts
Pages จะทำหน้าที่ทั้ง Frontend + API ในตัวเดียว