
# Lyrics Visualizer Pro Studio - Local Edition
## Professional Timeline & Layer Based + MCP Chat with Ongsa

### โครงสร้างโปรเจกต์
```
lyrics-visualizer-pro/
├── frontend/   # React + Vite + Konva + Zustand + Three.js
├── backend/    # Express + MCP Server + LowDB (Local JSON DB)
├── database/   # Local JSON files (projects.json)
├── README.md
└── .env.example
```

### วิธีรัน Local (100% Offline ได้)

1. **Backend**
```bash
cd backend
npm install
npm run dev
# จะรันที่ http://localhost:4000
# MCP Tools: http://localhost:4000/mcp
```

2. **Frontend**
```bash
cd frontend
npm install
npm run dev
# จะรันที่ http://localhost:5173
```

3. **Database**
เป็น Local JSON ที่ `database/projects.json` ไม่ต้องตั้งค่าเพิ่ม
Backend ใช้ lowdb อ่าน/เขียนไฟล์นี้โดยตรง

### ฟีเจอร์ที่ทำมาแล้วใน zip นี้
- Multi-track Timeline: Audio, Lyrics, Background x3, Visualizer, Intro/Outro
- Interactive Canvas: คลิกที่คำเพื่อลาก ย่อ-ขยาย หมุนได้อิสระ (Konva)
- Custom Camera: Z-Depth, Roll, Pitch, Fade Duration
- Per-line Styling: ฮุกเด่นกว่าปกติได้
- Preset Catalog 19 แบบครบ
- MCP Server: get_project_state, get_lyrics_timestamps, update_timeline_cue, set_background_transition, trigger_preview_at
- Chat Panel: คุยกับองศาแล้วสั่งแก้ไทม์ไลน์สดๆ
- Smart Background Looper, Export Settings 720p-4K

### Env
ดูไฟล์ .env.example
