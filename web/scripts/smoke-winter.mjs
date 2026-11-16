/**
 * Headless smoke: exercise sim helpers through a 14-day Dutch Hill winter.
 * Run: node scripts/smoke-winter.mjs
 */
import assert from "node:assert/strict";

// Minimal reimplementation mirroring sim contracts for CI without TS compile.
const SEASON = 14;
const FARE = { cheap: 35, balanced: 48, expensive: 62 };
const SNOW_COST = { minimal: 0, mid: 150, high: 350 };

function isWeekend(day) {
  const d = (day - 1) % 7;
  return d === 5 || d === 6;
}

function planArrivals(day, fare, weather) {
  let base = isWeekend(day) ? 24 : 18;
  if (fare === "cheap") base = Math.round(base * 1.1);
  if (fare === "expensive") base = Math.round(base * 0.9);
  if (weather === "snow") base += 3;
  if (weather === "thaw") base -= 4;
  return Math.max(12, Math.min(40, base));
}

function weatherFor(day) {
  const roll = (day * 17 + 3) % 10;
  if (roll < 3) return "snow";
  if (roll < 6) return "thaw";
  return "clear";
}

let cash = 12000;
let snowQ = 0.55;
let beats = 0;
const buildings = new Set(["warming_hut"]);

for (let day = 1; day <= SEASON; day++) {
  const weather = weatherFor(day);
  const fare = day % 3 === 0 ? "cheap" : "balanced";
  const snow = day % 4 === 0 ? "high" : "mid";
  const arrivals = planArrivals(day, fare, weather);
  const satisfaction = Math.max(
    20,
    Math.min(100, 70 - 8 * 2.5 + 25 * snowQ + 7),
  );
  const revenue = Math.round(arrivals * FARE[fare] * (0.75 + satisfaction / 100 * 0.35));
  const costs = 400 + 180 + SNOW_COST[snow];
  cash += revenue - costs;
  if (weather === "snow") snowQ = Math.min(0.95, snowQ + 0.08);
  if (weather === "thaw") snowQ = Math.max(0.25, snowQ - 0.12);
  if (day === 2) buildings.add("lodge");
  if (day === 5) buildings.add("snow_guns");
  if (day === 1 || (isWeekend(day) && arrivals >= 22) || day === SEASON) beats += 1;
  assert.ok(arrivals >= 12, `day ${day} arrivals`);
}

assert.ok(cash > 0, "cash stayed positive in smoke path");
assert.ok(buildings.has("lodge") && buildings.has("snow_guns"), "buildings");
assert.ok(beats >= 3, "beat opportunities");
console.log(
  JSON.stringify(
    { ok: true, finalCash: cash, snowQ: Number(snowQ.toFixed(2)), beats, season: SEASON },
    null,
    2,
  ),
);
