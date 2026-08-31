"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Player = { x: number; y: number; vx: number; vy: number; facing: 1 | -1; duck: boolean; grounded: boolean };
type Rock = { x: number; y: number; vx: number; vy: number; life: number };
type Crow = { x: number; y: number; hit: boolean; fall: number; phase: number };

const WORLD = 5200;
const obstacles = [
  { x: 960, w: 55, h: 44, kind: "bin" },
  { x: 1690, w: 76, h: 34, kind: "crate" },
  { x: 2540, w: 50, h: 55, kind: "stone" },
  { x: 3650, w: 64, h: 48, kind: "stone" },
];

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const throwRef = useRef(false);
  const rocksLabel = useRef<HTMLSpanElement>(null);
  const distanceLabel = useRef<HTMLSpanElement>(null);
  const objectiveLabel = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);

  const begin = useCallback(() => setStarted(true), []);
  const setKey = (key: string, on: boolean) => {
    keysRef.current[key] = on;
    if (on) begin();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let frame = 0;
    let last = performance.now();
    let camera = 0;
    let stones = 6;
    let regen = 0;
    let flash = 0;
    let nextFlash = 2.5;
    let shake = 0;
    let throwAnim = 0;
    let throwReleasePending = false;
    let stridePhase = 0;
    let orbCollected = false;
    let transformTimer = 0;
    let powerMessageTimer = 0;
    const player: Player = { x: 300, y: 0, vx: 0, vy: 0, facing: 1, duck: false, grounded: true };
    const thrown: Rock[] = [];
    const crows: Crow[] = [
      { x: 1220, y: -132, hit: false, fall: 0, phase: 0.3 },
      { x: 2210, y: -175, hit: false, fall: 0, phase: 1.8 },
      { x: 3070, y: -115, hit: false, fall: 0, phase: 2.9 },
      { x: 4140, y: -155, hit: false, fall: 0, phase: 4.4 },
    ];
    const bg = new Image();
    bg.src = "/game-bg-v2.png";
    const sprite = new Image();
    sprite.src = "/hero-sprites-v2.png";
    const motionSprite = new Image();
    motionSprite.src = "/hero-motion-v3.png";
    const runSprite = new Image();
    runSprite.src = "/hero-motion-v4.png";
    const throwSprite = new Image();
    throwSprite.src = "/hero-throw-v4.png";
    const transformSprite = new Image();
    transformSprite.src = "/hero-power-transform-v1.png";
    const poweredSprite = new Image();
    poweredSprite.src = "/hero-powered-v1.png";

    type AtlasFrame = { x: number; y: number; w: number; h: number };
    const motionFrames: AtlasFrame[][] = [
      [
        { x: 59, y: 173, w: 81, h: 249 }, { x: 238, y: 183, w: 137, h: 239 },
        { x: 419, y: 187, w: 149, h: 235 }, { x: 635, y: 183, w: 121, h: 239 },
        { x: 839, y: 184, w: 96, h: 238 }, { x: 1002, y: 186, w: 128, h: 236 },
        { x: 1198, y: 187, w: 112, h: 236 }, { x: 1365, y: 187, w: 120, h: 235 },
      ],
      [
        { x: 28, y: 599, w: 151, h: 219 }, { x: 225, y: 620, w: 123, h: 197 },
        { x: 385, y: 604, w: 183, h: 205 }, { x: 570, y: 578, w: 185, h: 207 },
        { x: 789, y: 604, w: 157, h: 215 }, { x: 993, y: 632, w: 116, h: 187 },
        { x: 1149, y: 604, w: 156, h: 215 }, { x: 1316, y: 607, w: 186, h: 206 },
      ],
    ];
    const runFrames: AtlasFrame[] = [
      { x: 30, y: 599, w: 155, h: 218 }, { x: 213, y: 615, w: 154, h: 211 },
      { x: 402, y: 604, w: 160, h: 213 }, { x: 586, y: 592, w: 179, h: 220 },
      { x: 791, y: 599, w: 170, h: 213 }, { x: 970, y: 610, w: 147, h: 214 },
      { x: 1152, y: 605, w: 148, h: 221 }, { x: 1330, y: 604, w: 163, h: 213 },
    ];
    const throwFrames: AtlasFrame[] = [
      { x: 174, y: 144, w: 118, h: 303 }, { x: 493, y: 142, w: 151, h: 306 },
      { x: 817, y: 153, w: 183, h: 294 }, { x: 1128, y: 153, w: 196, h: 294 },
      { x: 136, y: 573, w: 290, h: 283 }, { x: 450, y: 591, w: 219, h: 267 },
      { x: 835, y: 565, w: 160, h: 294 }, { x: 1211, y: 569, w: 112, h: 293 },
    ];
    const duckFrame: AtlasFrame = { x: 751, y: 688, w: 163, h: 206 };
    const jumpRiseFrame: AtlasFrame = { x: 312, y: 532, w: 158, h: 331 };
    const jumpFallFrame: AtlasFrame = { x: 540, y: 568, w: 155, h: 275 };
    const transformFrames: AtlasFrame[] = [
      { x: 132, y: 128, w: 113, h: 289 }, { x: 493, y: 103, w: 126, h: 315 },
      { x: 874, y: 80, w: 149, h: 340 }, { x: 1232, y: 67, w: 165, h: 353 },
      { x: 108, y: 550, w: 176, h: 371 }, { x: 463, y: 527, w: 200, h: 395 },
      { x: 809, y: 512, w: 234, h: 414 }, { x: 1158, y: 512, w: 294, h: 415 },
    ];
    const poweredRunFrames: AtlasFrame[] = [
      { x: 59, y: 92, w: 281, h: 353 }, { x: 430, y: 98, w: 262, h: 344 },
      { x: 804, y: 90, w: 279, h: 347 }, { x: 1161, y: 74, w: 302, h: 319 },
    ];
    const poweredIdleFrame: AtlasFrame = { x: 83, y: 555, w: 222, h: 362 };
    const poweredJumpFrame: AtlasFrame = { x: 436, y: 522, w: 211, h: 339 };
    const poweredDuckFrame: AtlasFrame = { x: 780, y: 620, w: 230, h: 291 };
    const poweredThrowFrame: AtlasFrame = { x: 1090, y: 594, w: 356, h: 317 };
    const THROW_DURATION = .52;
    const TRANSFORM_DURATION = 1.35;
    const POWER_ORB_X = 3260;
    const CHARACTER_HEIGHT = 136;
    const MOTION_HEIGHT = 125;
    const DUCK_HEIGHT = 84;
    const POWERED_HEIGHT = 174;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(320, rect.width);
      h = Math.max(360, rect.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    };
    resize();
    window.addEventListener("resize", resize);

    const keyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["a", "d", "w", "s", " ", "control", "arrowleft", "arrowright", "arrowup"].includes(k)) e.preventDefault();
      keysRef.current[k] = true;
      begin();
    };
    const keyUp = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", keyDown, { passive: false });
    window.addEventListener("keyup", keyUp);

    const line = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    };

    const drawSkyLayer = (t: number) => {
      const ratio = bg.naturalWidth ? bg.naturalWidth / bg.naturalHeight : 2.5;
      const ih = h * 1.06;
      const iw = ih * ratio;
      const off = -((camera * .055) % iw);
      ctx.save();
      ctx.filter = "saturate(.72) contrast(1.18) brightness(.7)";
      if (bg.complete) for (let i = -1; i < 3; i++) ctx.drawImage(bg, off + i * iw, -h * .03, iw, ih);
      else { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#11192b"); g.addColorStop(1, "#03050a"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
      ctx.filter = "none";
      const cloud = ctx.createRadialGradient(w * .58, h * .08, 0, w * .58, h * .08, w * .65);
      cloud.addColorStop(0, `rgba(164,186,255,${.06 + flash * .32})`);
      cloud.addColorStop(.5, "rgba(9,13,25,.08)"); cloud.addColorStop(1, "rgba(1,2,5,.58)");
      ctx.fillStyle = cloud; ctx.fillRect(0, 0, w, h);
      ctx.restore();

      if (flash > .15) {
        ctx.save(); ctx.strokeStyle = `rgba(225,234,255,${flash})`; ctx.lineWidth = 2.2; ctx.shadowBlur = 22; ctx.shadowColor = "#aabfff";
        const lx = w * .63; ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx - 22, h * .13); ctx.lineTo(lx + 3, h * .2); ctx.lineTo(lx - 35, h * .38); ctx.stroke(); ctx.restore();
      }
    };

    const drawMidLayer = (floor: number, t: number) => {
      ctx.save();
      const midCam = camera * .31;
      ctx.strokeStyle = "rgba(5,7,10,.95)"; ctx.lineWidth = 4;
      const fenceStart = 540 - midCam;
      line(fenceStart, floor - 92, WORLD - midCam, floor - 92); line(fenceStart, floor - 38, WORLD - midCam, floor - 38);
      ctx.fillStyle = "rgba(5,7,10,.95)";
      for (let x = 570; x < WORLD; x += 42) {
        const sx = x - midCam; line(sx, floor - 118, sx, floor); ctx.beginPath(); ctx.moveTo(sx - 5, floor - 116); ctx.lineTo(sx, floor - 132); ctx.lineTo(sx + 5, floor - 116); ctx.fill();
      }
      ctx.fillStyle = "rgba(5,7,10,.92)";
      for (let x = 690; x < WORLD; x += 138) {
        const sx = x - midCam; const gh = 30 + (x % 47);
        ctx.beginPath(); ctx.roundRect(sx, floor - gh, 28, gh, [12, 12, 2, 2]); ctx.fill();
      }
      ctx.globalAlpha = .16; ctx.fillStyle = "#b9c9e6";
      for (let i = 0; i < 4; i++) { const mx = ((t * (5 + i) + i * 340 - midCam * .08) % (w + 600)) - 300; ctx.beginPath(); ctx.ellipse(mx, floor - 45 - i * 17, 210, 17, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    };

    const drawTree = (x: number, floor: number, scale = 1) => {
      const sx = x - camera;
      ctx.save(); ctx.translate(sx, floor); ctx.scale(scale, scale); ctx.strokeStyle = "#050609"; ctx.lineCap = "round"; ctx.lineWidth = 9;
      line(0, 0, 0, -150); ctx.lineWidth = 5; line(0, -95, -48, -137); line(-22, -116, -66, -108); line(0, -122, 45, -171); line(24, -145, 70, -142); line(39, -160, 57, -190); line(-43, -133, -61, -167); ctx.restore();
    };

    const drawWorldLayer = (floor: number, t: number) => {
      const ground = ctx.createLinearGradient(0, floor - 5, 0, h); ground.addColorStop(0, "#202735"); ground.addColorStop(.07, "#080b10"); ground.addColorStop(1, "#020306");
      ctx.fillStyle = ground; ctx.fillRect(0, floor, w, h - floor);
      ctx.strokeStyle = "rgba(116,132,157,.18)"; ctx.lineWidth = 1;
      const seam = -((camera * 1.0) % 86); for (let x = seam - 86; x < w + 86; x += 86) { line(x, floor, x - 42, h); line(x, floor + 34, x + 86, floor + 34); }
      ctx.strokeStyle = "rgba(188,207,237,.16)"; line(0, floor + 2, w, floor + 2);
      [620, 1440, 2260, 3180, 4430].forEach((x) => {
        const sx = x - camera; if (sx < -80 || sx > w + 80) return;
        ctx.fillStyle = "#080a0e"; ctx.fillRect(sx - 4, floor - 166, 8, 166); ctx.fillRect(sx - 23, floor - 172, 46, 9);
        const glow = ctx.createRadialGradient(sx, floor - 169, 2, sx, floor - 169, 70); glow.addColorStop(0, `rgba(255,190,105,${.36 + Math.sin(t * 6 + x) * .05})`); glow.addColorStop(1, "rgba(255,170,70,0)"); ctx.fillStyle = glow; ctx.fillRect(sx - 75, floor - 240, 150, 140);
        ctx.fillStyle = "#e1ad6b"; ctx.fillRect(sx - 9, floor - 181, 18, 20);
      });
      [2780, 3460, 4710].forEach((x, i) => drawTree(x, floor, .8 + i * .1));
      obstacles.forEach((o) => {
        const sx = o.x - camera; if (sx < -100 || sx > w + 100) return;
        if (o.kind === "bin") { ctx.fillStyle = "#151b22"; ctx.fillRect(sx, floor - o.h, o.w, o.h); ctx.fillStyle = "#28303b"; ctx.fillRect(sx - 4, floor - o.h - 7, o.w + 8, 8); }
        else if (o.kind === "crate") { ctx.fillStyle = "#2b211a"; ctx.fillRect(sx, floor - o.h, o.w, o.h); ctx.strokeStyle = "#544133"; ctx.strokeRect(sx + 2, floor - o.h + 2, o.w - 4, o.h - 4); line(sx + 4, floor - o.h + 3, sx + o.w - 4, floor - 3); }
        else { ctx.fillStyle = "#161a21"; ctx.strokeStyle = "#353c48"; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(sx, floor - o.h, o.w, o.h, [18, 18, 2, 2]); ctx.fill(); ctx.stroke(); }
      });
      const branchX = 2070 - camera;
      if (branchX > -250 && branchX < w + 250) { ctx.strokeStyle = "#050609"; ctx.lineCap = "round"; ctx.lineWidth = 22; line(branchX, floor - 72, branchX + 175, floor - 61); ctx.lineWidth = 7; line(branchX + 95, floor - 65, branchX + 134, floor - 110); }
      const gateX = 4910 - camera;
      if (gateX > -220 && gateX < w + 220) {
        ctx.fillStyle = "#07090d"; ctx.fillRect(gateX - 120, floor - 235, 25, 235); ctx.fillRect(gateX + 95, floor - 235, 25, 235);
        ctx.strokeStyle = "#252b35"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(gateX, floor - 135, 110, Math.PI, 0); ctx.stroke();
        for (let x = -90; x <= 90; x += 20) line(gateX + x, floor - 155 - Math.sqrt(10000 - x * x) * .55, gateX + x, floor);
      }
      ctx.fillStyle = "rgba(188,205,229,.08)";
      for (let i = 0; i < 5; i++) { const fx = ((t * (28 + i * 4) + i * 340 - camera * .8) % (w + 700)) - 350; ctx.beginPath(); ctx.ellipse(fx, floor + 12 + i * 13, 260, 22, 0, 0, Math.PI * 2); ctx.fill(); }
    };

    const drawCrow = (c: Crow, floor: number, t: number) => {
      const sx = c.x - camera; let sy = floor + c.y + Math.sin(t * 2.5 + c.phase) * 7 + c.fall;
      if (sx < -80 || sx > w + 80 || sy > floor + 40) return;
      ctx.save(); ctx.translate(sx, sy); if (c.hit) ctx.rotate(Math.min(2.5, c.fall * .015));
      ctx.fillStyle = "#050609"; ctx.beginPath(); ctx.ellipse(0, 0, 15, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(10, -2); ctx.lineTo(26, 2); ctx.lineTo(11, 5); ctx.fill();
      const wing = Math.sin(t * 9 + c.phase) * 11; ctx.beginPath(); ctx.moveTo(-5, 0); ctx.quadraticCurveTo(-24, -18 - wing, -38, -3); ctx.quadraticCurveTo(-18, -7, -3, 4); ctx.fill(); ctx.beginPath(); ctx.moveTo(2, 0); ctx.quadraticCurveTo(20, -18 + wing, 36, -4); ctx.quadraticCurveTo(20, -5, 3, 4); ctx.fill(); ctx.restore();
    };

    const drawRock = (r: Rock, floor: number) => {
      const sx = r.x - camera, sy = floor + r.y; ctx.save(); ctx.translate(sx, sy); ctx.rotate(r.life * 9); ctx.fillStyle = "#8993a3"; ctx.strokeStyle = "#1a1e27"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 7, 5, .4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    };

    const drawPowerOrb = (floor: number, t: number) => {
      if (orbCollected) return;
      const sx = POWER_ORB_X - camera;
      if (sx < -120 || sx > w + 120) return;
      const sy = floor - 96 + Math.sin(t * 2.7) * 11;
      const pulse = 1 + Math.sin(t * 5.2) * .08;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(pulse, pulse);
      ctx.globalCompositeOperation = "lighter";
      const halo = ctx.createRadialGradient(0, 0, 3, 0, 0, 68);
      halo.addColorStop(0, "rgba(255,255,255,.98)");
      halo.addColorStop(.18, "rgba(155,224,255,.9)");
      halo.addColorStop(.48, "rgba(61,144,255,.38)");
      halo.addColorStop(1, "rgba(28,82,255,0)");
      ctx.fillStyle = halo; ctx.fillRect(-72, -72, 144, 144);
      ctx.fillStyle = "rgba(231,249,255,.96)"; ctx.shadowColor = "#6fd5ff"; ctx.shadowBlur = 24;
      ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(153,227,255,.92)"; ctx.lineWidth = 3; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(0, 0, 30, t * 1.9, t * 1.9 + Math.PI * 1.35); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 41, -t * 1.35, -t * 1.35 + Math.PI * 1.1); ctx.stroke();
      for (let i = 0; i < 7; i++) {
        const a = t * (.8 + i * .07) + i * .9; const r = 35 + (i % 3) * 8;
        ctx.fillStyle = `rgba(180,235,255,${.35 + (i % 2) * .2})`;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 1.8 + (i % 2), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    };

    const drawPlayer = (floor: number, t: number) => {
      if (!sprite.complete || !sprite.naturalWidth) return;
      const p = player;
      const sx = p.x - camera;
      const feet = floor + p.y;
      const moving = Math.abs(p.vx) > 20 && p.grounded;

      const drawAtlasFrame = (image: HTMLImageElement, atlasFrame: AtlasFrame, height = CHARACTER_HEIGHT) => {
        const width = height * atlasFrame.w / atlasFrame.h;
        ctx.save();
        ctx.translate(sx, feet);
        ctx.scale(p.facing, 1);
        ctx.shadowColor = "rgba(0,0,0,.92)";
        ctx.shadowBlur = 13;
        ctx.drawImage(
          image,
          atlasFrame.x, atlasFrame.y, atlasFrame.w, atlasFrame.h,
          -width / 2, -height, width, height,
        );
        ctx.restore();
      };

      const drawPowerAura = (strength: number) => {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const aura = ctx.createRadialGradient(sx, feet - 82, 10, sx, feet - 82, 105);
        aura.addColorStop(0, `rgba(200,245,255,${.08 * strength})`);
        aura.addColorStop(.45, `rgba(70,175,255,${.12 * strength})`);
        aura.addColorStop(1, "rgba(45,105,255,0)");
        ctx.fillStyle = aura; ctx.fillRect(sx - 115, feet - 205, 230, 220);
        ctx.restore();
      };

      if (transformTimer > 0 && transformSprite.complete && transformSprite.naturalWidth) {
        const progress = Math.min(.999, Math.max(0, 1 - transformTimer / TRANSFORM_DURATION));
        const index = Math.floor(progress * transformFrames.length);
        drawPowerAura(1.4 + progress * 2.2);
        drawAtlasFrame(transformSprite, transformFrames[index], 136 + index * 5.5);
        return;
      }

      if (orbCollected && poweredSprite.complete && poweredSprite.naturalWidth) {
        drawPowerAura(.75 + Math.sin(t * 6) * .18);
        if (throwAnim > 0) drawAtlasFrame(poweredSprite, poweredThrowFrame, 166);
        else if (p.duck) drawAtlasFrame(poweredSprite, poweredDuckFrame, 122);
        else if (!p.grounded) drawAtlasFrame(poweredSprite, poweredJumpFrame, 169);
        else if (moving) drawAtlasFrame(poweredSprite, poweredRunFrames[Math.floor(stridePhase) % poweredRunFrames.length], 160);
        else drawAtlasFrame(poweredSprite, poweredIdleFrame, POWERED_HEIGHT);
        return;
      }

      if (throwAnim > 0 && throwSprite.complete && throwSprite.naturalWidth) {
        const progress = Math.min(.999, Math.max(0, 1 - throwAnim / THROW_DURATION));
        drawAtlasFrame(throwSprite, throwFrames[Math.floor(progress * throwFrames.length)]);
        return;
      }

      if (p.duck) {
        drawAtlasFrame(sprite, duckFrame, DUCK_HEIGHT);
        return;
      }

      if (!p.grounded) {
        const rising = p.vy < 40;
        drawAtlasFrame(sprite, rising ? jumpRiseFrame : jumpFallFrame, rising ? 135 : 112);
        return;
      }

      if (moving && !p.duck && motionSprite.complete && motionSprite.naturalWidth) {
        const col = Math.floor(stridePhase) % 8;
        const running = Math.abs(p.vx) >= 170 && runSprite.complete && runSprite.naturalWidth;
        drawAtlasFrame(running ? runSprite : motionSprite, running ? runFrames[col] : motionFrames[0][col], MOTION_HEIGHT);
        return;
      }
      let row = 1;
      let col = 0;
      if (moving) { row = 0; col = Math.floor(t * 11) % 6; }
      const cellW = sprite.naturalWidth / 6;
      const cellH = sprite.naturalHeight / 2;
      const drawW = 104;
      const drawH = 208;
      const baseline = row === 0 ? .87 : .735;
      ctx.save();
      ctx.translate(sx, feet);
      ctx.scale(p.facing, 1);
      ctx.shadowColor = "rgba(0,0,0,.92)";
      ctx.shadowBlur = 13;
      ctx.drawImage(sprite, col * cellW, row * cellH, cellW, cellH, -drawW / 2, -drawH * baseline, drawW, drawH);
      ctx.restore();
    };

    const update = (dt: number) => {
      throwAnim = Math.max(0, throwAnim - dt);
      transformTimer = Math.max(0, transformTimer - dt);
      powerMessageTimer = Math.max(0, powerMessageTimer - dt);
      const controlsLocked = transformTimer > 0;
      const k = keysRef.current; const left = !controlsLocked && (k.a || k.arrowleft); const right = !controlsLocked && (k.d || k.arrowright); const jump = !controlsLocked && k[" "]; player.duck = !controlsLocked && !!k.control && player.grounded;
      const target = player.duck ? 105 : 250;
      if (left && !right) { player.vx += (-target - player.vx) * Math.min(1, dt * 11); player.facing = -1; }
      else if (right && !left) { player.vx += (target - player.vx) * Math.min(1, dt * 11); player.facing = 1; }
      else player.vx *= Math.pow(.0007, dt);
      if (player.grounded && !player.duck && Math.abs(player.vx) > 20) stridePhase = (stridePhase + Math.abs(player.vx) * dt / 22) % 8;
      if (jump && player.grounded && !player.duck) { player.vy = -431; player.grounded = false; }
      if (!jump && player.vy < -250) player.vy += 1000 * dt;
      player.vy += 1540 * dt; player.y += player.vy * dt;
      if (player.y >= 0) { player.y = 0; player.vy = 0; player.grounded = true; }
      let nx = Math.max(36, Math.min(WORLD - 40, player.x + player.vx * dt));
      obstacles.forEach((o) => { if (player.y > -o.h + 5 && nx + 18 > o.x && nx - 18 < o.x + o.w) { if (player.x < o.x) nx = o.x - 19; else nx = o.x + o.w + 19; player.vx = 0; } });
      if (!player.duck && player.grounded && nx + 18 > 2070 && nx - 18 < 2245) { if (player.x < 2070) nx = 2051; else nx = 2264; player.vx = 0; }
      player.x = nx;
      if (!orbCollected && transformSprite.complete && transformSprite.naturalWidth && poweredSprite.complete && poweredSprite.naturalWidth && Math.abs(player.x - POWER_ORB_X) < 44 && player.y > -90) {
        orbCollected = true;
        transformTimer = TRANSFORM_DURATION;
        powerMessageTimer = 3.2;
        player.vx = 0; player.vy = 0; player.y = 0;
        flash = 1; shake = 18;
      }
      if (throwRef.current && stones > 0 && throwAnim <= 0 && transformTimer <= 0) {
        stones--;
        throwAnim = THROW_DURATION;
        throwReleasePending = true;
        if (rocksLabel.current) rocksLabel.current.textContent = String(stones);
      }
      throwRef.current = false;
      if (throwReleasePending && throwAnim <= THROW_DURATION * .68) {
        thrown.push({ x: player.x + player.facing * 32, y: player.y - (player.duck ? 34 : 68), vx: player.facing * 580 + player.vx * .4, vy: -230, life: 0 });
        throwReleasePending = false;
      }
      regen += dt; if (regen > 8 && stones < 6) { regen = 0; stones++; if (rocksLabel.current) rocksLabel.current.textContent = String(stones); }
      thrown.forEach((r) => { r.life += dt; r.x += r.vx * dt; r.vy += 880 * dt; r.y += r.vy * dt; if (r.y > -6) { r.y = -6; r.vy *= -.28; r.vx *= .66; } crows.forEach((c) => { if (!c.hit && Math.hypot(r.x - c.x, r.y - c.y) < 35) { c.hit = true; r.life = 4; shake = 8; } }); });
      for (let i = thrown.length - 1; i >= 0; i--) if (thrown[i].life > 4 || thrown[i].x < 0 || thrown[i].x > WORLD) thrown.splice(i, 1);
      crows.forEach((c) => { if (c.hit) c.fall += 190 * dt; });
      camera += (Math.max(0, Math.min(WORLD - w, player.x - w * .34)) - camera) * Math.min(1, dt * 5.5);
      nextFlash -= dt; if (nextFlash < 0) { flash = 1; nextFlash = 4 + Math.random() * 8; shake = 4; } flash *= Math.pow(.012, dt);
      shake *= Math.pow(.02, dt);
      const pct = Math.min(100, Math.round(player.x / 49)); if (distanceLabel.current) distanceLabel.current.textContent = `${pct}%`;
      if (objectiveLabel.current) objectiveLabel.current.textContent = powerMessageTimer > 0 ? "POWER AWAKENED" : player.x < 2350 ? "LEAVE THE CITY" : player.x < 4750 ? "CROSS THE CEMETERY" : "THE NORTH GATE";
      if (player.x > 4950) setComplete(true);
    };

    const loop = (now: number) => {
      const dt = Math.min(.033, (now - last) / 1000); last = now; const t = now / 1000;
      update(dt);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      ctx.save(); if (shake > .2) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
      const floor = h * .78;
      drawSkyLayer(t); drawMidLayer(floor, t); drawWorldLayer(floor, t); drawPowerOrb(floor, t); crows.forEach((c) => drawCrow(c, floor, t)); thrown.forEach((r) => drawRock(r, floor)); drawPlayer(floor, t);
      const vignette = ctx.createRadialGradient(w * .5, h * .47, h * .1, w * .5, h * .47, Math.max(w, h) * .7); vignette.addColorStop(.35, "rgba(0,0,0,0)"); vignette.addColorStop(1, "rgba(0,0,0,.72)"); ctx.fillStyle = vignette; ctx.fillRect(0, 0, w, h);
      ctx.restore();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp); };
  }, [begin]);

  return (
    <main className="game-shell">
      <header className="hud top-hud">
        <div className="identity"><span className="sigil">BBA</span><div><strong>BOBBYS BIG ADVENTURE</strong><small>THE NIGHT REMEMBERS</small></div></div>
        <div className="mission"><small>CURRENT OBJECTIVE</small><span ref={objectiveLabel}>LEAVE THE CITY</span></div>
        <div className="inventory"><div><small>POCKETS</small><span className="rock-icon">●</span><b ref={rocksLabel}>6</b></div><div><small>PROGRESS</small><b ref={distanceLabel}>6%</b></div></div>
      </header>

      <section className="game-stage" aria-label="Bobbys Big Adventure playable side-scrolling game" onPointerDown={(event) => { if (event.button === 0) { throwRef.current = true; begin(); } }}>
        <canvas ref={canvasRef} tabIndex={0} />
        {!started && <button className="start-card" onClick={begin}><span>CHAPTER I</span><strong>THE ROAD TO BLACK HOLLOW</strong><small>Move to begin</small><i>WASD</i></button>}
        {complete && <div className="complete-card"><small>DESTINATION REACHED</small><strong>THE NORTH GATE</strong><p>You found a way through. The road behind you is still open.</p><button onClick={() => setComplete(false)}>KEEP EXPLORING</button></div>}
        <div className="world-label"><span>◈</span><div><small>OUTSKIRTS OF</small><strong>BLACK HOLLOW</strong></div></div>
        <div className="scanlines" />
      </section>

      <footer className="hud control-deck">
        <div className="key-group"><button aria-label="Move left" onPointerDown={() => setKey("a", true)} onPointerUp={() => setKey("a", false)} onPointerLeave={() => setKey("a", false)}>A</button><button aria-label="Move right" onPointerDown={() => setKey("d", true)} onPointerUp={() => setKey("d", false)} onPointerLeave={() => setKey("d", false)}>D</button><span>MOVE</span></div>
        <div className="key-group"><button className="space" aria-label="Jump" onPointerDown={() => setKey(" ", true)} onPointerUp={() => setKey(" ", false)}>SPACE</button><span>JUMP</span></div>
        <div className="key-group"><button className="wide" aria-label="Duck" onPointerDown={() => setKey("control", true)} onPointerUp={() => setKey("control", false)} onPointerLeave={() => setKey("control", false)}>CTRL</button><span>DUCK</span></div>
        <div className="key-group"><button className="wide" aria-label="Throw rock" onPointerDown={() => { throwRef.current = true; begin(); }}>MOUSE 1</button><span>THROW ROCK</span></div>
        <div className="status"><i /> STORM LEVEL: SEVERE</div>
      </footer>
    </main>
  );
}
