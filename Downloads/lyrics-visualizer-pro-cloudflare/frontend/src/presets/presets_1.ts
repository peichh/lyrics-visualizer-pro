
import { Preset } from '../types';

export const presets: Preset[] = [
  { id: 'minimalist_pulse', name: 'Minimalist Pulse', nameTh: 'มินิมอล พัลส์', style: 'fade tracking', genre: 'Acoustic, Lo-fi, R&B', description: 'ตัวหนังสือเรียบหรู เฟดนุ่ม Tracking ขยายตามบีท', config: { animation: 'pulse', tracking: true } },
  { id: 'typewriter_paper', name: 'Typewriter & Paper', nameTh: 'พิมพ์ดีด', style: 'typewriter cursor', genre: 'Indie Folk, เพลงช้า', description: 'พิมพ์ทีละตัวมี cursor กระพริบ', config: { animation: 'typewriter' } },
  { id: 'kinetic_pop', name: 'Kinetic Pop & Snap', nameTh: 'ป๊อปเด้ง', style: 'bouncy snappy', genre: 'Pop, Funk, City Pop', description: 'เด้งขยายแล้วหดตามกลองสแนร์', config: { animation: 'pop', bouncy: 1.4 } },
  { id: 'karaoke_glow', name: 'Karaoke Glow Fill', nameTh: 'คาราโอเกะเรืองแสง', style: 'highlight fill', genre: 'Ballad, ร้องตาม', description: 'ไฮไลต์สีวิ่งตามพยางค์', config: { animation: 'fill' } },
  { id: 'soft_blur', name: 'Soft Blur & Floating', nameTh: 'เบลอลอย', style: 'blur float', genre: 'Dream Pop, Ambient', description: 'ละลายจากเบลอแล้วชัด ลอยบนอากาศ', config: { animation: 'blur' } },
  { id: 'corner_scatter', name: 'Dynamic Corner Scatter', nameTh: 'กระจายมุม', style: 'scatter', genre: 'Indie Rock, Alt-Pop', description: 'สุ่มโผล่ตามมุมจอ', config: { animation: 'scatter' } },
  { id: 'glitch_tracking', name: 'Monochrome Glitch Tracking', nameTh: 'กลิทช์โมโนโครม', style: 'glitch wave', genre: 'Synthwave, Electronic', description: 'โมเดิร์นตัดกับเส้นคลื่นสั่น', config: { animation: 'glitch' } },
  { id: 'celestial_starlight', name: 'Celestial Starlight Tunnel', nameTh: 'อุโมงค์ดวงดาวทอง (ซิกเนเจอร์)', style: '3D gold tunnel', genre: 'Epic Ballad, OST', description: 'กล้อง 3D บินทะลุกำแพงตัวหนังสือทอง Starlight', config: { animation: 'tunnel', color: 'gold', threeD: true } },
  { id: 'neon_cyber', name: 'Neon Cyber City & Scanline', nameTh: 'ไซเบอร์นีออน', style: 'neon rain', genre: 'Cyberpunk, EDM, Trap', description: 'เรืองแสงนีออนสะท้อนพื้นเปียกฝน scanline', config: { animation: 'neon' } },
  { id: 'liquid_wave', name: 'Liquid & Wave Distortion', nameTh: 'คลื่นของเหลว', style: 'liquid', genre: 'Deep House, Wave', description: 'พริ้วไหวเหมือนคลื่นน้ำ', config: { animation: 'liquid' } },
  { id: 'constellation', name: 'Cosmic Constellation', nameTh: 'กลุ่มดาว', style: 'constellation', genre: 'Fantasy, รักแฟนตาซี', description: 'ต่อกันด้วยเส้นกลุ่มดาว ละอองดาววิ่ง', config: { animation: 'constellation' } },
  { id: 'particle_dissolve', name: 'Particle Dissolve & Rebirth', nameTh: 'แตกสลายเป็นฝุ่น', style: 'particle', genre: 'อกหักแรง, Post-Rock', description: 'แตกเป็นละอองฝุ่นปลิวตามลม', config: { animation: 'dissolve' } },
  { id: 'mystic_runes', name: 'Mystic Runes & Ancient Gold', nameTh: 'อักษรรูนโบราณ', style: 'rune ring', genre: 'Fantasy Folk, Gothic', description: 'วงแหวนเวทมนตร์หมุนรอบตัวหนังสือ', config: { animation: 'rune' } },
  { id: 'dimension_warp', name: 'Dimension Warp & Z-Drop', nameTh: 'วาร์ปมิติ', style: 'warp', genre: 'Dubstep, DnB', description: 'ดูดหมุนเป็นเกลียวแล้วพุ่งกระแทกจอ', config: { animation: 'warp', threeD: true } },
  { id: 'inferno_ember', name: 'Inferno & Ember Sparks', nameTh: 'เปลวไฟ', style: 'fire', genre: 'Rock, Nu-Metal', description: 'ลุกเป็นเปลวไฟมีสะเก็ดลอยตามบีท', config: { animation: 'fire' } },
  { id: 'glass_hologram', name: 'Glassmorphism Hologram', nameTh: 'กระจกโฮโลแกรม', style: 'glass', genre: 'Hyperpop, K-Pop', description: 'กระจกใสสะท้อนรุ้ง เอียงตามมุม', config: { animation: 'glass' } },
  { id: 'aura_nebula', name: 'Aura Nebula Cloud', nameTh: 'หมอกเนบิวลา', style: 'nebula', genre: 'Shoegaze, Chillhop', description: 'หมอกพาสเทลหมุนวนรอบเนื้อร้อง', config: { animation: 'nebula' } },
  { id: 'glitch_overdrive', name: 'Glitch Overdrive', nameTh: 'กลิทช์โอเวอร์ไดรฟ์', style: 'rgb split', genre: 'Glitchcore, Phonk', description: 'RGB แยกชั้น สัญญาณขาดตามบีท', config: { animation: 'rgb' } },
  { id: 'diamond_dust', name: 'Shimmering Diamond Dust', nameTh: 'ฝุ่นเพชร', style: 'diamond', genre: 'Luxury Pop, Diva', description: 'ประกายเพชรวิบวับตาม Hi-hat', config: { animation: 'shimmer' } },
];
