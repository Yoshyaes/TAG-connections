#!/usr/bin/env node
/**
 * Connections touch e2e (ARCADE-TOUCH-CONTROLS.md Phase 2). Serves the built
 * dist/ with a mocked REST API and drives it in headless Chromium:
 *   - touch runs at 390x844, 844x390 and 360x740 with the shared Touch Kit
 *     injected (tag-arcade/_shared/touch-kit), plus one touch run with no kit
 *   - one desktop mouse/keyboard run (no kit) to prove desktop is unchanged
 * Usage: npm run build && node tests/e2e-touch.mjs [--shots <dir>]
 * Needs Playwright: resolved from scripts/arcade/node_modules in the main repo
 * (or set PLAYWRIGHT_DIR).
 */
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const DIST = join(ROOT, 'dist');
const KIT = resolve(ROOT, '../../_shared/touch-kit');
const PW_DIR = process.env.PLAYWRIGHT_DIR || resolve(ROOT, '../../../scripts/arcade/node_modules/playwright');
const { chromium } = await import(pathToFileURL(join(PW_DIR, 'index.mjs')).href);

const argShots = process.argv.indexOf('--shots');
const SHOTS = argShots > 0 ? process.argv[argShots + 1] : null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const distIndex = readFileSync(join(DIST, 'index.html'), 'utf8');
const JS = distIndex.match(/\/assets\/(index-[^"']+\.js)/)[1];
const CSS = distIndex.match(/\/assets\/(index-[^"']+\.css)/)[1];

function harness(withKit) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
${withKit ? '<link rel="stylesheet" href="/kit/tag-arcade-touch.css"><script>window.tagArcade={registerPause(){}};</script><script src="/kit/tag-arcade-touch.js"></script>' : '<script>window.tagArcade={registerPause(){}};</script>'}
<link rel="stylesheet" href="/assets/${CSS}">
<style>body{margin:0;background:#0F0F14;font-family:system-ui} .filler{height:1600px;color:#555;padding:16px}</style>
<script>window.tagConnections={apiUrl:'/wp-json/tag-connections/v1',nonce:'x',userId:0,isAdmin:false,mode:'game'};</script>
</head><body><header style="height:120px;color:#aaa;padding:16px">Site header</header>
<div id="tag-connections-root" style="max-width:600px;margin:0 auto"></div>
<div class="filler">Article below the game</div>
<script type="module" src="/assets/${JS}"></script></body></html>`;
}

const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/' || url.pathname === '/nokit') {
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end(harness(url.pathname === '/'));
  }
  let file = null;
  if (url.pathname.startsWith('/assets/')) file = join(DIST, url.pathname);
  if (url.pathname.startsWith('/kit/')) file = join(KIT, url.pathname.slice(5));
  if (file && existsSync(file)) {
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    return res.end(readFileSync(file));
  }
  res.writeHead(404); res.end();
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

// Mock REST: 16 items, groups by id (1-4, 5-8, 9-12, 13-16).
const ITEMS = Array.from({ length: 16 }, (_, i) => ({ id: i + 1, text: ['Mario', 'Link', 'Kirby', 'Samus', 'Elixir', 'Phoenix Down', 'Ether', 'Potion', 'Creeper', 'Enderman', 'Ghast', 'Blaze', 'Pac-Man', 'Galaga', 'Dig Dug', 'Centipede'][i] }));
const groupOf = id => Math.ceil(id / 4);
const COLORS = ['green', 'blue', 'purple', 'gold'];
async function mockApi(page) {
  await page.route('**/wp-json/tag-connections/v1/**', async route => {
    const u = new URL(route.request().url());
    const p = u.pathname.replace(/.*\/v1/, '');
    let body = {};
    if (p === '/puzzle/today') body = { id: 42, puzzle_date: '2026-10-25', title: 'Test', items: ITEMS, group_count: 4 };
    else if (p === '/puzzle/submit') {
      const ids = JSON.parse(route.request().postData()).selected_ids;
      const g = ids.map(groupOf);
      if (new Set(g).size === 1) {
        body = { correct: true, group: { id: 'g' + g[0], name: 'Group ' + g[0], tier: g[0], color: COLORS[g[0] - 1], items: ITEMS.filter(i => groupOf(i.id) === g[0]) } };
      } else {
        const c = {}; g.forEach(x => { c[x] = (c[x] || 0) + 1; });
        body = { correct: false, one_away: Math.max(...Object.values(c)) === 3 };
      }
    } else if (p === '/puzzle/reveal') body = { groups: [1, 2, 3, 4].map(n => ({ id: 'g' + n, name: 'Group ' + n, color: COLORS[n - 1], items: ITEMS.filter(i => groupOf(i.id) === n) })) };
    else if (p.startsWith('/puzzle/leaderboard')) body = { entries: [] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

let pass = 0, fail = 0;
const failures = [];
function check(label, cond, extra = '') {
  if (cond) { pass++; } else { fail++; failures.push(label + (extra ? ` (${extra})` : '')); }
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${extra && !cond ? ' :: ' + extra : ''}`);
}

const tileSel = id => `[data-tile-id="${id}"]`;
async function selectedIds(page) {
  return page.$$eval('[data-tile-id][aria-pressed="true"]', els => els.map(e => +e.getAttribute('data-tile-id')).sort((a, b) => a - b));
}
async function center(page, sel) {
  const b = await page.locator(sel).boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
async function touchStroke(page, cdp, points, stepMs = 16) {
  const [first, ...rest] = points;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: first.x, y: first.y, id: 1 }] });
  let prev = first;
  for (const p of rest) {
    for (let k = 1; k <= 4; k++) {
      const x = prev.x + (p.x - prev.x) * k / 4, y = prev.y + (p.y - prev.y) * k / 4;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] });
      await page.waitForTimeout(stepMs);
    }
    prev = p;
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(80);
}
async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: join(SHOTS, name + '.png') });
}
async function hapticLog(page) {
  return page.evaluate(() => window.__haptics || []);
}

async function touchRun(browser, { w, h, kit, tag }) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
  });
  await ctx.addInitScript((items) => {
    try {
      localStorage.setItem('tag_connections_seen_rules', '1');
      // A saved in-progress game in id order, so tile positions are known:
      // row 1 = 1-4, row 2 = 5-8 (the game resumes saved order as-is).
      localStorage.setItem('tag_connections_2026-10-25', JSON.stringify({ items, selectedIds: [], solvedGroups: [], mistakes: 0, guessHistory: [], gameState: 'PLAYING' }));
    } catch (e) { /* */ }
    window.__haptics = [];
    // Record what the kit is asked to play (vibrate itself is a no-op headless).
    const hook = () => {
      const ta = window.tagArcade;
      if (ta && typeof ta.haptic === 'function' && !ta.haptic.__wrapped) {
        const orig = ta.haptic;
        const wrapped = function (k) { window.__haptics.push(k); return orig.apply(this, arguments); };
        Object.assign(wrapped, orig, { __wrapped: true });
        ta.haptic = wrapped;
      }
    };
    document.addEventListener('DOMContentLoaded', hook);
  }, ITEMS);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await mockApi(page);
  await page.goto(BASE + (kit ? '/' : '/nokit'));
  await page.waitForSelector(tileSel(1));
  const cdp = await ctx.newCDPSession(page);
  const T = s => `[${tag}] ${s}`;

  check(T('kit detected as expected'), (await page.evaluate(() => typeof (window.tagArcade && window.tagArcade.haptic) === 'function')) === kit);

  // Scroll the board into view the way a player would.
  await page.locator('#tag-connections-root').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, document.querySelector('.tag-grid').getBoundingClientRect().top + window.scrollY - 140));
  await page.waitForTimeout(100);

  // Targets.
  const btns = await page.$$eval('.tag-action-btn', els => els.map(e => ({ t: e.textContent.trim(), h: e.getBoundingClientRect().height, w: e.getBoundingClientRect().width })));
  check(T('Shuffle, Deselect All, Submit present'), btns.map(b => b.t).join('|') === 'Shuffle|Deselect All|Submit', JSON.stringify(btns));
  check(T('action buttons >= 44px tall and wide'), btns.every(b => b.h >= 44 && b.w >= 44), JSON.stringify(btns));
  const tileH = await page.$eval(tileSel(1), e => e.getBoundingClientRect().height);
  check(T('tiles >= 44px tall'), tileH >= 44, String(tileH));
  const pageW = await page.evaluate(() => document.documentElement.scrollWidth);
  check(T('no horizontal overflow'), pageW <= w, `${pageW} > ${w}`);
  await shot(page, `${tag}-01-board`);

  // Tap to toggle on and off.
  await page.tap(tileSel(1));
  check(T('tap selects'), JSON.stringify(await selectedIds(page)) === '[1]');
  await page.tap(tileSel(1));
  check(T('tap again deselects'), JSON.stringify(await selectedIds(page)) === '[]');
  // Sticky hover: the deselected tile must be back to the base color.
  await page.waitForTimeout(200);
  const bgs = await page.evaluate(() => {
    const t = document.querySelector('[data-tile-id="1"]'), u = document.querySelector('[data-tile-id="2"]');
    return [getComputedStyle(t).backgroundColor, getComputedStyle(u).backgroundColor];
  });
  check(T('no sticky hover after tap'), bgs[0] === bgs[1], bgs.join(' vs '));

  // Drag across four tiles in one stroke: 1 -> 2 -> 3 along the top row,
  // then straight down to 7.
  const order = await page.$$eval('[data-tile-id]', els => els.map(e => +e.getAttribute('data-tile-id')));
  check(T('saved order resumed'), order.slice(0, 8).join() === '1,2,3,4,5,6,7,8', order.join());
  const g1 = [1, 2, 3, 4];
  const off = 7;
  const pts = [];
  for (const id of [1, 2, 3, 7]) pts.push(await center(page, tileSel(id)));
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await touchStroke(page, cdp, pts);
  const dragSel = await selectedIds(page);
  check(T('drag selects every tile it crosses'), JSON.stringify(dragSel) === JSON.stringify([g1[0], g1[1], g1[2], off].sort((a, b) => a - b)), JSON.stringify(dragSel));
  check(T('drag on the grid does not scroll the page'), Math.abs((await page.evaluate(() => window.scrollY)) - scrollBefore) < 2);
  await shot(page, `${tag}-02-drag-selected`);

  if (process.env.DEBUG) await page.evaluate(() => { window.__ev = []; ['pointerdown','pointerup','pointercancel','click','touchend'].forEach(t => document.addEventListener(t, e => window.__ev.push(t + ':' + (e.pointerId ?? '') + ':' + Math.round(performance.now()) + ':' + (e.target.closest && e.target.closest('[data-tile-id]') ? e.target.closest('[data-tile-id]').getAttribute('data-tile-id') : e.target.tagName)), true)); });
  // Drag from a selected tile deselects along the stroke.
  await touchStroke(page, cdp, [await center(page, tileSel(g1[0])), await center(page, tileSel(g1[1]))]);
  check(T('drag starting on a selected tile deselects'), JSON.stringify(await selectedIds(page)) === JSON.stringify([g1[2], off].sort((a, b) => a - b)), JSON.stringify(await selectedIds(page)));
  // Re-add them by tapping.
  await page.tap(tileSel(g1[0]));
  await page.tap(tileSel(g1[1]));
  if (process.env.DEBUG) console.log(await page.evaluate(() => window.__ev));
  check(T('re-tap right after a drag is not swallowed'), (await selectedIds(page)).length === 4, JSON.stringify(await selectedIds(page)));

  // One-away wrong guess: grid must not move, selection kept, mistake spent.
  const gridY = await page.$eval('.tag-grid', e => e.getBoundingClientRect().top + window.scrollY);
  await page.tap('.tag-action-primary');
  await page.waitForSelector('.tag-toast');
  const toastText = await page.textContent('.tag-toast');
  check(T('One away! toast shown'), toastText.trim() === 'One away!', toastText);
  const gridY2 = await page.$eval('.tag-grid', e => e.getBoundingClientRect().top + window.scrollY);
  check(T('toast is an overlay: grid does not jump'), Math.abs(gridY2 - gridY) < 1, `${gridY} -> ${gridY2}`);
  check(T('action row stays (disabled) while the guess resolves'), (await page.$$eval('.tag-action-btn', els => els.length)) === 3 && (await page.$eval('.tag-action-btn', e => e.disabled)));
  await shot(page, `${tag}-03-one-away`);
  await page.waitForTimeout(650);
  check(T('selection kept after the wrong guess'), (await selectedIds(page)).length === 4);
  const dots = () => page.$$eval('#tag-connections-root .w-3.h-3', els => els.filter(e => e.style.border).length);
  check(T('one mistake spent'), (await dots()) === 1);
  if (kit) check(T('mistake haptic (fail)'), (await hapticLog(page)).includes('fail'), JSON.stringify(await hapticLog(page)));

  // Same set again: "Already guessed!", free.
  await page.waitForTimeout(1200);
  await page.tap('.tag-action-primary');
  await page.waitForSelector('.tag-toast-repeat');
  check(T('Already guessed! toast'), (await page.textContent('.tag-toast')).trim() === 'Already guessed!');
  check(T('repeat costs no mistake'), (await dots()) === 1);
  await shot(page, `${tag}-04-already-guessed`);

  // Swap the odd tile for the fourth group member and solve.
  await page.tap(tileSel(off));
  await page.tap(tileSel(g1[3]));
  if (kit) await page.evaluate(() => { window.__haptics.length = 0; });
  await page.tap('.tag-action-primary');
  await page.waitForSelector('.tag-tile-solving');
  const collapsing = await page.$$eval('.tag-tile-solving', els => els.length);
  check(T('solve: four tiles collapse'), collapsing === 4, String(collapsing));
  await page.waitForTimeout(150);
  await shot(page, `${tag}-05-collapse`);
  await page.waitForSelector('.animate-flip-in');
  await page.waitForTimeout(600);
  check(T('solve: group bar shown, 12 tiles left'), (await page.$$eval('[data-tile-id]', e => e.length)) === 12);
  if (kit) check(T('solve haptic (success)'), (await hapticLog(page)).includes('success'), JSON.stringify(await hapticLog(page)));
  await shot(page, `${tag}-06-solved`);

  // Shuffle keeps the selection.
  await page.tap(tileSel(order.find(id => id >= 9 && id <= 12)));
  const before = await page.$$eval('[data-tile-id]', els => els.map(e => e.getAttribute('data-tile-id')).join());
  let shuffled = false;
  for (let i = 0; i < 4 && !shuffled; i++) {
    await page.tap('.tag-action-btn >> text=Shuffle');
    shuffled = (await page.$$eval('[data-tile-id]', els => els.map(e => e.getAttribute('data-tile-id')).join())) !== before;
  }
  check(T('Shuffle reorders'), shuffled);
  check(T('Shuffle keeps the selection'), (await selectedIds(page)).length === 1);

  // Page scroll still works from outside the grid (header area).
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  const s0 = await page.evaluate(() => window.scrollY);
  await touchStroke(page, cdp, [{ x: Math.round(w / 2), y: 110 }, { x: Math.round(w / 2), y: 10 }], 30);
  await page.waitForTimeout(300);
  const s1 = await page.evaluate(() => window.scrollY);
  check(T('page still scrolls when the swipe starts outside the grid'), s1 > s0 + 50, `${s0} -> ${s1}`);

  check(T('no page errors'), errors.length === 0, errors.join(' | '));
  await ctx.close();
}

async function desktopRun(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('tag_connections_seen_rules', '1'); } catch (e) { /* */ } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await mockApi(page);
  await page.goto(BASE + '/nokit');
  await page.waitForSelector(tileSel(1));
  const T = s => `[desktop] ${s}`;

  await page.click(tileSel(1));
  check(T('click selects'), JSON.stringify(await selectedIds(page)) === '[1]');
  // A mouse drag across tiles does NOT select (desktop unchanged).
  const a = await center(page, tileSel(2)), b = await center(page, tileSel(3));
  const order = await page.$$eval('[data-tile-id]', els => els.map(e => +e.getAttribute('data-tile-id')));
  const pa = await center(page, tileSel(order[1])), pb = await center(page, tileSel(order[2]));
  void a; void b;
  await page.mouse.move(pa.x, pa.y); await page.mouse.down();
  await page.mouse.move(pb.x, pb.y, { steps: 8 }); await page.mouse.up();
  const sel = await selectedIds(page);
  check(T('mouse drag does not drag-select'), !sel.includes(order[2]), JSON.stringify(sel));
  // Hover still lights an unselected tile on a real hover device.
  await page.mouse.move(0, 0);
  const free = order.find(id => !sel.includes(id));
  const base = await page.$eval(tileSel(free), e => getComputedStyle(e).backgroundColor);
  await page.hover(tileSel(free));
  await page.waitForTimeout(150);
  const hov = await page.$eval(tileSel(free), e => getComputedStyle(e).backgroundColor);
  check(T('hover still works with a mouse'), base !== hov, `${base} vs ${hov}`);
  // Keyboard focus ring.
  await page.focus(tileSel(free));
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  const ring = await page.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return { w: cs.outlineWidth, s: cs.outlineStyle, id: e.getAttribute('data-tile-id') }; });
  check(T('visible :focus-visible ring on tiles'), ring.s === 'solid' && parseFloat(ring.w) >= 2, JSON.stringify(ring));
  await page.keyboard.press('Enter');
  check(T('Enter toggles the focused tile'), (await selectedIds(page)).includes(+ring.id));
  const btns = await page.$$eval('.tag-action-btn', els => els.map(e => e.getBoundingClientRect().height));
  check(T('buttons >= 44px on desktop too'), btns.every(h => h >= 44), JSON.stringify(btns));
  await shot(page, 'desktop-01');
  check(T('no page errors'), errors.length === 0, errors.join(' | '));
  await ctx.close();
}

const browser = await chromium.launch();
try {
  await touchRun(browser, { w: 390, h: 844, kit: true, tag: 'kit-390x844' });
  await touchRun(browser, { w: 844, h: 390, kit: true, tag: 'kit-844x390' });
  await touchRun(browser, { w: 360, h: 740, kit: true, tag: 'kit-360x740' });
  await touchRun(browser, { w: 390, h: 844, kit: false, tag: 'nokit-390x844' });
  await desktopRun(browser);
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) { console.log(failures.join('\n')); process.exit(1); }
