"use strict";
/* Interaktiver Motion-Beweis "Auto-Battler-Choreografie" — 0.4.0 "Kampfgefühl"
   Reines Wegwerf-Mockup, kein Produktivcode. Alles transform/opacity/filter-only (WAAPI), exakt das
   Trennungsprinzip aus dem echten Fighter (CombatPage.tsx): figureRef≈.actor-lunge (Windup/Dash/Return),
   artRef≈.actor-art (Recoil/Knockback), punchRef≈.actor-punch (Scale-Punch/Dying), flashRef≈.hit-flash
   (reiner Opacity-Layer). Idle-Atmen liegt auf einer eigenen Ebene (.actor-idle), die es im echten Spiel
   heute NICHT gibt (s. README) — extra Ebene, damit sie nie mit Windup/Dash kollidiert.

   Jeder Angriff baut seine EIGENE lokale Animations-Gruppe (statt eines geteilten globalen Arrays) —
   Spieler und Gegner greifen unabhängig voneinander an (eigene Takte), ihre Zyklen überlappen sich
   also routinemäßig zeitlich. Ein geteiltes Cleanup hätte das jeweils andere, noch laufende Timing
   weggerissen. Nur die zuletzt eingefrorene Gruppe (state.frozenGroup) ist global, weil immer nur
   EIN Zyklus gleichzeitig eingefroren wird (Freeze-Buttons pausieren das Auto-Battle explizit). */

const ASSET = "../../../apps/client/src/renderer/assets/";

const PLAYER = {
  id: "player", name: "Held", img: ASSET + "portraits/char_1.webp",
  height: 340, footPad: 3.0, weight: 1.0, hpMax: 150, baseIntervalMs: 2400, jitterMs: 300,
};
const MONSTERS = {
  chicken: { id: "chicken", name: "Wildes Huhn", img: ASSET + "monsters/chicken.webp", height: 150, footPad: 9.6, weight: 1.6, hpMax: 34, baseIntervalMs: 1900, jitterMs: 250 },
  goblin:  { id: "goblin",  name: "Goblin-Späher", img: ASSET + "monsters/goblin.webp", height: 262, footPad: 9.9, weight: 1.0, hpMax: 92, baseIntervalMs: 2700, jitterMs: 350 },
  bull:    { id: "bull",    name: "Rasender Bulle", img: ASSET + "monsters/bull_boss.webp", height: 372, footPad: 16.8, weight: 0.5, hpMax: 260, baseIntervalMs: 3300, jitterMs: 400 },
};
const ZONE_BG = ASSET + "battlescreens/pastures.webp";

// ── Timeline-Konstanten (ms bei Speed=1×) ──────────────────────────────────────────────────────
const MELEE = {
  normal: { windup: 350, dash: 120, hold: 70, ret: 260, windupAmp: 16, rotAmp: 4, knockAmp: 18 },
  crit:   { windup: 350, dash: 100, hold: 90, ret: 300, windupAmp: 22, rotAmp: 6, knockAmp: 30 },
};
const RANGED = {
  normal: { lean: 380, snap: 20, transit: 180, ret: 150, leanAmp: 12, knockAmp: 16 },
  crit:   { lean: 340, snap: 20, transit: 140, ret: 190, leanAmp: 16, knockAmp: 26 },
};

// ── DOM ─────────────────────────────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const stage = $("stage");
const floaters = $("floaters");
const projectileEl = $("projectile");
const meta = $("meta");
const freezeStateEl = $("freezeState");
const playerFreezeRow = $("playerFreezeButtons");
const monsterFreezeRow = $("monsterFreezeButtons");

const SIDES = {
  player: {
    lunge: $("playerLunge"), art: $("playerArt"), punch: $("playerPunch"), flash: $("playerFlash"),
    img: $("playerImg"), name: $("playerName"), hpFill: $("playerHpFill"), hpLabel: $("playerHpLabel"),
    timerFill: $("playerTimerFill"), timerLabel: $("playerTimerLabel"), dir: 1,
  },
  monster: {
    lunge: $("monsterLunge"), art: $("monsterArt"), punch: $("monsterPunch"), flash: $("monsterFlash"),
    img: $("monsterImg"), name: $("monsterName"), hpFill: $("monsterHpFill"), hpLabel: $("monsterHpLabel"),
    timerFill: $("monsterTimerFill"), timerLabel: $("monsterTimerLabel"), dir: -1,
  },
};

// ── State ───────────────────────────────────────────────────────────────────────────────────────
const state = {
  mode: "A", monsterId: "bull", style: "melee", speed: 1, reduced: false,
  running: true, frozen: false, frozenGroup: null,
  playerHp: 100, monsterHp: 100,
  timers: { player: null, monster: null },
  timerRemainMs: { player: 0, monster: 0 }, timerTotalMs: { player: 0, monster: 0 },
};

function data(side) { return side === "player" ? PLAYER : MONSTERS[state.monsterId]; }
function fxAllowed() { return !state.reduced; } // reduced ⇒ nur Flash/Floater, wie fxLevel!=="off" im echten Spiel

// ── Setup / Auswahl ────────────────────────────────────────────────────────────────────────────
function applyFootInset(side) {
  const d = data(side);
  const s = SIDES[side];
  s.img.style.height = d.height + "px";
  const insetPx = (d.height * d.footPad) / 100;
  s.img.style.transform = `translateY(${insetPx.toFixed(1)}px)`;
}

function resetSideAnims(side) {
  const s = SIDES[side];
  [s.lunge, s.art, s.punch, s.flash].forEach((el) => {
    if (el.getAnimations) el.getAnimations().forEach((a) => { try { a.cancel(); } catch (e) {} });
  });
}

function setupMonster(id) {
  state.monsterId = id;
  resetSideAnims("monster");
  const d = MONSTERS[id];
  SIDES.monster.img.src = d.img;
  SIDES.monster.name.textContent = d.name;
  applyFootInset("monster");
  setHp("monster", 100);
  document.querySelectorAll(".monster-tab").forEach((b) => b.classList.toggle("active", b.dataset.monster === id));
  updateMeta();
}

function setupPlayer() {
  SIDES.player.img.src = PLAYER.img;
  SIDES.player.name.textContent = PLAYER.name;
  applyFootInset("player");
}

// ── HP / Timer-Leisten (rein kosmetisch, spiegeln timerPct/timerRemainingSec-Anbindung) ──────────
function setHp(side, pct) {
  state[side + "Hp"] = Math.max(0, Math.min(100, pct));
  const s = SIDES[side];
  s.hpFill.style.transform = `scaleX(${state[side + "Hp"] / 100})`;
  s.hpLabel.textContent = `${Math.round(state[side + "Hp"])}%`;
}

function tickTimerBars(dtMs) {
  for (const side of ["player", "monster"]) {
    if (state.timerTotalMs[side] <= 0) continue;
    state.timerRemainMs[side] = Math.max(0, state.timerRemainMs[side] - dtMs);
    const pct = 100 * (1 - state.timerRemainMs[side] / state.timerTotalMs[side]);
    SIDES[side].timerFill.style.transform = `scaleX(${pct / 100})`;
    SIDES[side].timerLabel.textContent = `${(state.timerRemainMs[side] / 1000).toFixed(1)}s`;
  }
}

// ── Geometrie: Lücke zwischen Angreifer und Verteidiger, live gemessen (nicht hart codiert — die
//   drei Monster haben stark unterschiedliche Breiten, ein fixer Dash-Wert würde bei Huhn/Goblin
//   weit vor dem Kontakt stehen bleiben oder beim Bullen durchrutschen). ──────────────────────────
function measureGapPx(attackerSide) {
  const defenderSide = attackerSide === "player" ? "monster" : "player";
  const a = SIDES[attackerSide].img.getBoundingClientRect();
  const d = SIDES[defenderSide].img.getBoundingClientRect();
  if (attackerSide === "player") return Math.max(40, d.left - a.right);
  return Math.max(40, a.left - d.right);
}

function anchorPoint(side) {
  const r = SIDES[side].img.getBoundingClientRect();
  const stageR = stage.getBoundingClientRect();
  return { x: r.left + r.width / 2 - stageR.left, y: r.top + r.height * 0.38 - stageR.top };
}

// ── Gruppen-Helfer: jede Angriffs-/Kill-Sequenz sammelt ihre WAAPI-Animationen + gespawnten FX-DOM-
//   Elemente in einem eigenen lokalen Array — Freeze/Cleanup arbeiten NUR auf dieser einen Gruppe. ─
function animate(group, el, keyframes, options) {
  const anim = el.animate(keyframes, { fill: "both", ...options });
  group.push({ anim, el: null });
  return anim;
}

function cleanupGroup(group) {
  group.forEach((item) => {
    if (item.anim) { try { item.anim.cancel(); } catch (e) {} }
    if (item.el && item.el.parentNode) item.el.parentNode.removeChild(item.el);
  });
}

function scheduleGroupCleanup(group, totalMs) {
  setTimeout(() => { if (!state.frozen || state.frozenGroup !== group) cleanupGroup(group); }, totalMs + 120);
}

function clearFrozenGroup() {
  if (!state.frozenGroup) return;
  cleanupGroup(state.frozenGroup);
  state.frozenGroup = null;
}

function freezeGroupAt(group, ms) {
  clearFrozenGroup();
  state.frozen = true;
  state.frozenGroup = group;
  group.forEach(({ anim }) => { if (anim) { anim.pause(); anim.currentTime = ms; } });
  freezeStateEl.textContent = `⏸ eingefroren bei t=${Math.round(ms)}ms — "Weiter" zum Auflösen`;
  if (state.running) { state.running = false; $("runToggle").textContent = "▶ Auto-Battle fortsetzen"; $("runToggle").classList.add("active"); }
}

function releaseFreeze() {
  state.frozen = false;
  clearFrozenGroup();
  freezeStateEl.textContent = "";
}

// ── FX: Floater + Funken ──────────────────────────────────────────────────────────────────────
function spawnFloater(group, defenderSide, text, kind, delayMs, riseMs) {
  const el = document.createElement("div");
  el.className = "dmg-number" + (kind ? " " + kind : "");
  el.textContent = text;
  const p = anchorPoint(defenderSide);
  const jitterX = (Math.random() - 0.5) * 30;
  el.style.left = p.x + jitterX + "px";
  el.style.top = p.y - 40 + "px";
  floaters.appendChild(el);
  const anim = el.animate(
    [
      { opacity: 0, transform: "translate(-50%, 0px)" },
      { opacity: 1, transform: "translate(-50%, -14px)", offset: 0.18 },
      { opacity: 1, transform: "translate(-50%, -34px)", offset: 0.7 },
      { opacity: 0, transform: "translate(-50%, -54px)" },
    ],
    { duration: riseMs, delay: delayMs, easing: "ease-out", fill: "both" },
  );
  group.push({ anim, el });
}

function spawnSparks(group, atSide, delayMs, count, crit) {
  const p = anchorPoint(atSide);
  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    el.className = "spark";
    if (crit) el.style.background = "radial-gradient(circle, #fff 0%, #ffe9b0 55%, rgba(255,220,120,0) 80%)";
    el.style.left = p.x + "px";
    el.style.top = p.y + "px";
    stage.appendChild(el);
    const ang = Math.random() * Math.PI * 2;
    const dist = 18 + Math.random() * (crit ? 46 : 30);
    const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist * 0.6 - 6;
    const anim = el.animate(
      [
        { opacity: 0, transform: "translate(0,0) scale(1)" },
        { opacity: 1, transform: "translate(0,0) scale(1.3)", offset: 0.12 },
        { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(0.4)` },
      ],
      { duration: 360 + Math.random() * 140, delay: delayMs, easing: "ease-out", fill: "both" },
    );
    group.push({ anim, el });
  }
}

// ── Melee-Angriffszyklus, Modus B/C: Windup → Dash → Clash (kausal am Verteidiger) → Return ──────
function meleeAttackModeBC(group, side, crit) {
  const other = side === "player" ? "monster" : "player";
  const cfg = crit ? MELEE.crit : MELEE.normal;
  const dW = data(side), dOther = data(other);
  const dir = SIDES[side].dir;
  const gap = measureGapPx(side);
  const dashDx = dir * gap * (crit ? 1.06 : 0.82) * (0.9 + 0.2 * Math.min(1, dW.weight));
  const windupAmp = cfg.windupAmp * dW.weight;
  const rotAmp = cfg.rotAmp * dW.weight;

  const t1 = cfg.windup, t2 = t1 + cfg.dash, t3 = t2 + cfg.hold, total = t3 + cfg.ret;
  const spd = state.speed;
  const ms = (v) => v / spd;

  // Wichtig: das äußere `easing` der Animation bleibt "linear" — die Bewegungs-Charakteristik steckt
  // in den PER-KEYFRAME-Easings unten. Ein globales "ease-out" würde die Zeit-zu-Fortschritt-Kurve
  // verzerren und die exakten Offset-Grenzen (Windup/Dash/Hold/Return) gegenüber den ms-genauen
  // Freeze-Phasen (phaseMsFor) verschieben (realer Bug hier: Clash-Freeze landete ~40% zu früh).
  const lungeKf = [
    { transform: "translateX(0) rotate(0deg) scale(1)", offset: 0, easing: "ease-in" },
    { transform: `translateX(${(-dir * windupAmp).toFixed(1)}px) rotate(${(-dir * 2).toFixed(1)}deg) scale(0.97)`, offset: t1 / total, easing: "cubic-bezier(.55,0,.85,.35)" },
    { transform: `translateX(${dashDx.toFixed(1)}px) rotate(${(dir * rotAmp).toFixed(1)}deg) scale(1.07)`, offset: t2 / total, easing: "ease-out" },
    { transform: `translateX(${dashDx.toFixed(1)}px) rotate(${(dir * rotAmp * 0.7).toFixed(1)}deg) scale(1.04)`, offset: t3 / total, easing: "cubic-bezier(.34,1.56,.64,1)" },
    { transform: "translateX(0) rotate(0deg) scale(1)", offset: 1 },
  ];
  if (fxAllowed()) animate(group, SIDES[side].lunge, lungeKf, { duration: ms(total), easing: "linear" });

  // Verteidiger-Reaktion wird ERST beim Kontakt-Frame (t2) ausgelöst — genau DAS ist der Wucht-
  // Unterschied zu Modus A (dort feuern Angreifer- und Treffer-Animation zeitgleich, s. README).
  triggerDefenderReaction(group, other, side, crit, ms(t2), ms(total - t2));
  return { totalMs: ms(total) };
}

function triggerDefenderReaction(group, defSide, atkSide, crit, delayMs, remainMs) {
  const dDef = data(defSide);
  const knockAmp = (crit ? MELEE.crit.knockAmp : MELEE.normal.knockAmp) * dDef.weight;
  const dir = SIDES[atkSide].dir; // Schlagrichtung des Angreifers = Rückstoßrichtung des Verteidigers
  const dur = delayMs + remainMs;
  const off = delayMs / dur;

  if (fxAllowed()) {
    animate(group, SIDES[defSide].art, [
      { transform: "translateX(0)", offset: 0 },
      { transform: "translateX(0)", offset: off, easing: "cubic-bezier(.1,.8,.2,1)" },
      { transform: `translateX(${(dir * knockAmp).toFixed(1)}px)`, offset: Math.min(1, off + 0.28 * (1 - off)), easing: "ease-out" },
      { transform: "translateX(0)", offset: 1 },
    ], { duration: dur, easing: "linear" });
    animate(group, SIDES[defSide].punch, [
      { transform: "scale(1)", offset: 0 },
      { transform: "scale(1)", offset: off, easing: "cubic-bezier(.1,.8,.2,1)" },
      { transform: `scale(${crit ? 1.1 : 1.06})`, offset: Math.min(1, off + 0.22 * (1 - off)), easing: "ease-out" },
      { transform: "scale(1)", offset: 1 },
    ], { duration: dur, easing: "linear" });
  }
  const flashEl = SIDES[defSide].flash;
  flashEl.classList.toggle("crit", crit);
  animate(group, flashEl, [
    { opacity: 0, offset: 0 },
    { opacity: 0, offset: Math.max(0, off - 0.02) },
    { opacity: crit ? 0.9 : 0.55, offset: Math.min(1, off + 0.06) },
    { opacity: 0, offset: 1 },
  ], { duration: dur, easing: "linear" });

  spawnSparks(group, defSide, delayMs, crit ? 10 : 6, crit);
  const dmg = crit ? 18 + Math.floor(Math.random() * 10) : 6 + Math.floor(Math.random() * 9);
  spawnFloater(group, defSide, crit ? `${dmg}!` : String(dmg), crit ? "crit" : "", delayMs, 780);
  applyDamage(defSide, dmg);
}

// ── Melee-Angriffszyklus, Modus A (Ist-Zustand, 1:1 aus CombatPage.tsx LUNGE_RIGHT/LEFT +
//   hitPunchKeyframes/hit-flash-overlay portiert — Angreifer + Treffer-Reaktion feuern ZEITGLEICH,
//   es gibt keinen simulierten "Ankunfts"-Zeitpunkt). ─────────────────────────────────────────────
function meleeAttackModeA(group, side, crit) {
  const other = side === "player" ? "monster" : "player";
  const dir = SIDES[side].dir;
  const spd = state.speed;
  const lungeKf = [
    { transform: "translateX(0) rotate(0)" },
    { transform: `translateX(${dir * 55}px) scale(1.1) rotate(${dir * 4}deg)`, offset: 0.45 },
    { transform: `translateX(${dir * 55}px) scale(1.1) rotate(${dir * 4}deg)`, offset: 0.6 },
    { transform: "translateX(0) rotate(0)" },
  ];
  if (fxAllowed()) animate(group, SIDES[side].lunge, lungeKf, { duration: 400 / spd, easing: "ease-out" });
  hitReactionModeA(group, other, side, crit);
  return { totalMs: 400 / spd };
}

function magicAttackModeA(group, side, crit) {
  const other = side === "player" ? "monster" : "player";
  const dir = SIDES[side].dir;
  const spd = state.speed;
  const castKf = [
    { transform: "translateX(0) scale(1)", filter: "brightness(1)" },
    { transform: "translateX(0) scale(1.08)", filter: "brightness(1.6) hue-rotate(200deg)", offset: 0.3 },
    { transform: `translateX(${dir * 22}px) scale(1.06)`, filter: "brightness(1.8) hue-rotate(220deg)", offset: 0.55 },
    { transform: `translateX(${dir * 22}px) scale(1.06)`, filter: "brightness(1.8) hue-rotate(220deg)", offset: 0.65 },
    { transform: "translateX(0) scale(1)", filter: "brightness(1)" },
  ];
  if (fxAllowed()) animate(group, SIDES[side].lunge, castKf, { duration: 480 / spd, easing: "ease-in-out" });
  hitReactionModeA(group, other, side, crit, true);
  return { totalMs: 480 / spd };
}

function hitReactionModeA(group, defSide, atkSide, crit, magic) {
  const dDef = data(defSide);
  const knockAmp = (crit ? 16 : 10) * dDef.weight;
  const dir = SIDES[atkSide].dir;
  const spd = state.speed;
  if (fxAllowed()) {
    animate(group, SIDES[defSide].art, [
      { transform: "translateX(0)" },
      { transform: `translateX(${(dir * knockAmp).toFixed(1)}px)`, offset: 0.3 },
      { transform: "translateX(0)" },
    ], { duration: (crit ? 220 : 160) / spd, easing: "ease-out" });
    animate(group, SIDES[defSide].punch, [
      { transform: "scale(1)" },
      { transform: `scale(${crit ? 1.06 : 1.04})`, offset: 0.15 },
      { transform: "scale(1.02)", offset: 0.58 },
      { transform: "scale(1)" },
    ], { duration: (crit ? 180 : 150) / spd, easing: "ease-out" });
  }
  const flashEl = SIDES[defSide].flash;
  flashEl.classList.toggle("crit", crit);
  animate(group, flashEl, crit
    ? [{ opacity: 0 }, { opacity: 0.85, offset: 0.3 }, { opacity: 0 }]
    : [{ opacity: 0 }, { opacity: 0.5, offset: 0.3 }, { opacity: 0 }],
    { duration: (crit ? 200 : 130) / spd, easing: "ease-out" });
  const dmg = crit ? 18 + Math.floor(Math.random() * 10) : 6 + Math.floor(Math.random() * 9);
  spawnFloater(group, defSide, crit ? `${dmg}!` : String(dmg), (crit ? "crit" : "") + (magic ? " magic" : ""), 0, 780);
  applyDamage(defSide, dmg);
}

// ── Ranged/Magie-Zyklus Modus B/C: Angreifer bleibt stehen (Lehne + Glow), Projektil fliegt ──────
function rangedAttackModeBC(group, side, crit, style) {
  const other = side === "player" ? "monster" : "player";
  const cfg = crit ? RANGED.crit : RANGED.normal;
  const dir = SIDES[side].dir;
  const spd = state.speed;
  const t1 = cfg.lean, t2 = t1 + cfg.snap, t3 = t2 + cfg.transit, total = t3 + cfg.ret;
  const ms = (v) => v / spd;

  if (fxAllowed()) {
    const leanKf = [
      { transform: "translateX(0) scale(1)", filter: "brightness(1)", offset: 0, easing: "ease-in" },
      { transform: `translateX(${(dir * cfg.leanAmp).toFixed(1)}px) scale(1.03)`, filter: style === "magic" ? "brightness(1.7) hue-rotate(200deg) saturate(1.3)" : "brightness(1.25)", offset: t1 / total, easing: "ease-out" },
      { transform: `translateX(${(dir * cfg.leanAmp * 0.5).toFixed(1)}px) scale(1.0)`, filter: "brightness(1)", offset: t2 / total, easing: "ease-out" },
      { transform: "translateX(0) scale(1)", filter: "brightness(1)", offset: 1 },
    ];
    animate(group, SIDES[side].lunge, leanKf, { duration: ms(total), easing: "linear" });
  }

  // Projektil: startet bei Release (t2), fliegt bis t3. Anker werden bei Trigger einmalig gemessen —
  // für die kurze Flugdauer (<250ms) reicht das, ohne laufendes getBoundingClientRect() pro Frame.
  const from = anchorPoint(side);
  const to = anchorPoint(other);
  const projDelay = ms(t2), projDur = ms(t3 - t2);
  const el = projectileEl;
  el.classList.toggle("magic", style === "magic");
  const anim = el.animate(
    [
      { transform: `translate(${from.x - 8}px, ${from.y - 8}px) scale(${crit ? 1.3 : 1})`, opacity: 0, offset: 0 },
      { transform: `translate(${from.x - 8}px, ${from.y - 8}px) scale(${crit ? 1.3 : 1})`, opacity: 1, offset: Math.max(0.001, projDelay / (projDelay + projDur)), easing: "ease-in" },
      { transform: `translate(${to.x - 8}px, ${to.y - 8}px) scale(${crit ? 1.5 : 1.1})`, opacity: 1, offset: 0.999 },
      { transform: `translate(${to.x - 8}px, ${to.y - 8}px) scale(${crit ? 1.5 : 1.1})`, opacity: 0, offset: 1 },
    ],
    { duration: projDelay + projDur, easing: "linear", fill: "both" },
  );
  group.push({ anim, el: null });

  triggerDefenderReaction(group, other, side, crit, ms(t3), ms(total - t3));
  return { totalMs: ms(total) };
}

// ── Kill-/Sieger-Sequenz (Dissolve 1:1 an kill-dying-sink aus combat.css angelehnt) ──────────────
function playDying(group, side) {
  animate(group, SIDES[side].punch, [
    { filter: "grayscale(0) brightness(1) blur(0px)", transform: "translateY(0)", opacity: 1, offset: 0 },
    { filter: "grayscale(0.3) brightness(1.55) blur(0px)", transform: "translateY(2px)", opacity: 1, offset: 0.2 },
    { filter: "grayscale(0.9) brightness(0.7) blur(3px)", transform: "translateY(16px)", opacity: 0.55, offset: 0.6 },
    { filter: "grayscale(1) brightness(0.45) blur(6px)", transform: "translateY(26px)", opacity: 0.22, offset: 1 },
  ], { duration: 650 / state.speed, easing: "ease-in" });
}
function playVictory(group, side) {
  if (!fxAllowed()) return;
  animate(group, SIDES[side].punch, [
    { transform: "scale(1) translateY(0)" },
    { transform: "scale(1.1) translateY(-12px)", offset: 0.35 },
    { transform: "scale(1.03) translateY(-4px)", offset: 0.7 },
    { transform: "scale(1) translateY(0)" },
  ], { duration: 620 / state.speed, easing: "ease-out" });
}

function applyDamage(side, dmg) {
  const next = Math.max(0, state[side + "Hp"] - dmg);
  setHp(side, next);
  if (next <= 0 && !state.frozen) {
    setTimeout(() => { if (!state.frozen) handleKill(side); }, 10 / state.speed);
  }
}

function handleKill(loserSide) {
  const winnerSide = loserSide === "player" ? "monster" : "player";
  const group = [];
  playDying(group, loserSide);
  playVictory(group, winnerSide);
  setTimeout(() => {
    if (state.frozen) return;
    cleanupGroup(group); // löst den Dissolve-Filter, Figur erscheint wieder normal — zeitgleich mit dem Respawn
    setHp("player", 100);
    setHp("monster", 100);
  }, 1300 / state.speed);
}

// ── Zentrale Angriffs-Dispatch ────────────────────────────────────────────────────────────────
function performAttack(side, opts) {
  opts = opts || {};
  const crit = opts.crit !== undefined ? opts.crit : Math.random() < 0.2;
  const group = [];
  let result;
  if (state.mode === "A") {
    result = state.style === "magic" ? magicAttackModeA(group, side, crit) : meleeAttackModeA(group, side, crit);
  } else if (state.style === "melee") {
    result = meleeAttackModeBC(group, side, crit);
  } else {
    result = rangedAttackModeBC(group, side, crit, state.style);
  }
  if (opts.freezePhase !== undefined) {
    freezeGroupAt(group, opts.freezePhase);
  } else {
    scheduleGroupCleanup(group, result.totalMs);
  }
  return result;
}

// ── Freeze-Phasen je Modus/Stil (für Buttons + Playwright) ──────────────────────────────────────
function phaseMsFor(phaseKey) {
  const spd = state.speed;
  if (state.mode === "A") {
    const total = (state.style === "magic" ? 480 : 400) / spd;
    return phaseKey === "peak" ? total * 0.5 : total * 0.85;
  }
  if (state.style === "melee") {
    const cfg = phaseKey === "clash-crit" ? MELEE.crit : MELEE.normal;
    const t1 = cfg.windup, t2 = t1 + cfg.dash, t3 = t2 + cfg.hold, total = t3 + cfg.ret;
    const map = { windup: t1 * 0.9, clash: t2 + cfg.hold * 0.4, "clash-crit": t2 + cfg.hold * 0.4, ret: t3 + cfg.ret * 0.55 };
    return (map[phaseKey] ?? total * 0.5) / spd;
  }
  const cfg = phaseKey === "clash-crit" ? RANGED.crit : RANGED.normal;
  const t1 = cfg.lean, t2 = t1 + cfg.snap, t3 = t2 + cfg.transit, total = t3 + cfg.ret;
  const map = { windup: t1 * 0.85, transit: t2 + cfg.transit * 0.5, clash: t3 + 10, "clash-crit": t3 + 10, ret: t3 + cfg.ret * 0.55 };
  return (map[phaseKey] ?? total * 0.5) / spd;
}

function freezeTrigger(side, phaseKey) {
  const forceCrit = phaseKey === "clash-crit";
  const ms = phaseMsFor(phaseKey);
  performAttack(side, { crit: forceCrit, freezePhase: ms });
}

function freezeKill(loserSide) {
  const winnerSide = loserSide === "player" ? "monster" : "player";
  clearFrozenGroup();
  setHp(loserSide, 0);
  const group = [];
  playDying(group, loserSide);
  playVictory(group, winnerSide);
  // t≈480ms trifft den sichtbar entsättigten/eingesunkenen Teil der 650ms-Dissolve (die kill-dying-sink-
  // Keyframes brauchen bis ~60% Fortschritt, bevor der Effekt klar lesbar wird — früher eingefroren
  // zeigt nur den kurzen Aufloder-Moment am Anfang, kaum vom Normalzustand zu unterscheiden).
  freezeGroupAt(group, 480 / state.speed);
  freezeStateEl.textContent = `⏸ Kill-Sequenz eingefroren (t≈480ms) — "Weiter" zum Auflösen`;
}

// ── Auto-Battle-Loop: zwei unabhängige Takte, wie playerTimerRemainingSec/enemyTimerRemainingSec ─
function scheduleNext(side) {
  if (state.timers[side]) clearTimeout(state.timers[side]);
  const d = data(side);
  const interval = (d.baseIntervalMs + (Math.random() - 0.5) * 2 * d.jitterMs) / state.speed;
  state.timerTotalMs[side] = interval;
  state.timerRemainMs[side] = interval;
  state.timers[side] = setTimeout(() => {
    if (state.running && !state.frozen) performAttack(side, {});
    scheduleNext(side);
  }, interval);
}

let lastTick = performance.now();
function rafLoop(now) {
  const dt = now - lastTick;
  lastTick = now;
  if (state.running && !state.frozen) tickTimerBars(dt);
  requestAnimationFrame(rafLoop);
}
requestAnimationFrame(rafLoop);

// ── UI-Wiring ─────────────────────────────────────────────────────────────────────────────────
function updateMeta() {
  meta.textContent =
    `Modus: ${state.mode} | Monster: ${state.monsterId} (Gewicht ${data("monster").weight}×) | Stil: ${state.style}\n` +
    `Speed: ${state.speed}× | Reduced-Motion: ${state.reduced ? "an" : "aus"} | Auto-Battle: ${state.running ? "läuft" : "pausiert"}`;
}

function applyStageClasses() {
  stage.classList.toggle("mode-a", state.mode === "A");
  stage.classList.toggle("depth", state.mode === "C");
}

function renderFreezeButtons() {
  const melee = state.style === "melee";
  const isA = state.mode === "A";
  const defs = isA
    ? [["peak", "Peak (Kontakt)"], ["settle", "Recoil-Settle"]]
    : melee
      ? [["windup", "Windup"], ["clash", "Clash"], ["clash-crit", "Crit-Clash"], ["ret", "Return"]]
      : [["windup", state.style === "magic" ? "Cast-Lehne" : "Spann-Lehne"], ["transit", "Projektil"], ["clash", "Einschlag"], ["clash-crit", "Crit-Einschlag"], ["ret", "Return"]];
  for (const [row, side] of [[playerFreezeRow, "player"], [monsterFreezeRow, "monster"]]) {
    row.innerHTML = "";
    defs.forEach(([key, label]) => {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.addEventListener("click", () => freezeTrigger(side, key));
      row.appendChild(btn);
    });
  }
}

document.querySelectorAll(".mode-tab").forEach((b) => b.addEventListener("click", () => {
  state.mode = b.dataset.mode;
  document.querySelectorAll(".mode-tab").forEach((x) => x.classList.toggle("active", x === b));
  applyStageClasses();
  renderFreezeButtons();
  updateMeta();
}));
document.querySelectorAll(".monster-tab").forEach((b) => b.addEventListener("click", () => setupMonster(b.dataset.monster)));
document.querySelectorAll(".style-tab").forEach((b) => b.addEventListener("click", () => {
  state.style = b.dataset.style;
  document.querySelectorAll(".style-tab").forEach((x) => x.classList.toggle("active", x === b));
  renderFreezeButtons();
  updateMeta();
}));
document.querySelectorAll(".speed-tab").forEach((b) => b.addEventListener("click", () => {
  state.speed = parseFloat(b.dataset.speed);
  document.querySelectorAll(".speed-tab").forEach((x) => x.classList.toggle("active", x === b));
  updateMeta();
}));
$("reducedToggle").addEventListener("click", () => {
  state.reduced = !state.reduced;
  $("reducedToggle").classList.toggle("active", state.reduced);
  updateMeta();
});
$("runToggle").addEventListener("click", () => {
  state.running = !state.running;
  $("runToggle").textContent = state.running ? "⏸ Auto-Battle pausieren" : "▶ Auto-Battle fortsetzen";
  $("runToggle").classList.toggle("active", !state.running);
  updateMeta();
});
$("resumeBtn").addEventListener("click", releaseFreeze);
$("killPlayerBtn").addEventListener("click", () => freezeKill("player"));
$("killMonsterBtn").addEventListener("click", () => freezeKill("monster"));

// ── Playwright-/Debug-Hook ───────────────────────────────────────────────────────────────────
window.__mockup = {
  state,
  setMode(m) { document.querySelector(`.mode-tab[data-mode="${m}"]`).click(); },
  setMonster(id) { document.querySelector(`.monster-tab[data-monster="${id}"]`).click(); },
  setStyle(s) { document.querySelector(`.style-tab[data-style="${s}"]`).click(); },
  setSpeed(v) { document.querySelector(`.speed-tab[data-speed="${v}"]`).click(); },
  setReduced(v) { if (state.reduced !== v) $("reducedToggle").click(); },
  setRunning(v) { if (state.running !== v) $("runToggle").click(); },
  freeze(side, phaseKey) { freezeTrigger(side, phaseKey); },
  freezeKill(side) { freezeKill(side); },
  release: releaseFreeze,
};

// ── Init ─────────────────────────────────────────────────────────────────────────────────────
stage.style.backgroundImage = `url("${ZONE_BG}")`;
setupPlayer();
setupMonster(state.monsterId);
applyStageClasses();
renderFreezeButtons();
updateMeta();
scheduleNext("player");
scheduleNext("monster");
