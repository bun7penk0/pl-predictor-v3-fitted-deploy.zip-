/* bootstrap-fitted.js — Auto-patch fitted params เข้า React predictor
 *
 * ทำอะไร:
 *   1. โหลด pl-fitted-params.json (หรือ window.FITTED_PARAMS / localStorage)
 *   2. รอ React mount เสร็จ
 *   3. แพทช์ตาราง Ef/Cf + rho + homeAdv ในหน่วยความจำอัตโนมัติ
 *   4. บังคับ re-render ผ่าน React DevTools hook (ถ้ามี) หรือ location.reload() (fallback)
 *
 * ไม่ต้องแตะ index.html — เพิ่ม <script src="./bootstrap-fitted.js"></script> ก่อน <script type="module"> แค่นั้น
 */
(function () {
  'use strict';

  var FALLBACK = { rho: -0.10, homeAdvantage: 1.10, attack: null, defense: null, _source: 'heuristic' };
  var FITTED = null;
  var PATCHED = false;

  function isValid(p) {
    return p && typeof p.rho === 'number'
      && typeof p.homeAdvantage === 'number'
      && p.teams && typeof p.teams === 'object'
      && Object.keys(p.teams).length > 0;
  }

  var CODE_TO_NAME = {
    ARS: 'Arsenal', AVL: 'Aston Villa', BOU: 'Bournemouth', BRE: 'Brentford',
    BHA: 'Brighton', CHE: 'Chelsea', CRY: 'Crystal Palace', EVE: 'Everton',
    FUL: 'Fulham', IPS: 'Ipswich Town', LEI: 'Leicester City', LIV: 'Liverpool',
    MCI: 'Man City', MUN: 'Man United', NEW: 'Newcastle', NFO: 'Nottm Forest',
    SOU: 'Southampton', TOT: 'Tottenham', WHU: 'West Ham', WOL: 'Wolves',
    COV: 'Coventry', HUL: 'Hull City'
  };

  function normalize(p) {
    var attack = {}, defense = {};
    Object.keys(p.teams).forEach(function (code) {
      var t = p.teams[code];
      var name = t.fullName || CODE_TO_NAME[code] || code;
      if (typeof t.attack === 'number') attack[name] = t.attack;
      if (typeof t.defense === 'number') defense[name] = t.defense;
    });
    return {
      rho: p.rho,
      homeAdvantage: p.homeAdvantage,
      attack: attack,
      defense: defense,
      teams: p.teams,
      brier: p.brier,
      generated: p.generated,
      _source: p._source || 'json'
    };
  }

  function tryPatch() {
    if (PATCHED) return;
    PATCHED = true;
    if (!FITTED || FITTED._source === 'heuristic') {
      console.info('[fitted] ใช้ heuristic (ไม่มีไฟล์หรือไฟล์ผิด schema)');
      return;
    }
    var KEY = 'pl_fitted_reloaded_v1';
    if (sessionStorage.getItem(KEY) === '1') {
      console.info('[fitted] patch applied (already reloaded once) | ρ=' +
        FITTED.rho.toFixed(3) + ' | homeAdv=' + FITTED.homeAdvantage.toFixed(3) +
        ' | teams=' + Object.keys(FITTED.attack).length);
      setTimeout(function () { sessionStorage.removeItem(KEY); }, 5000);
      return;
    }
    sessionStorage.setItem(KEY, '1');
    console.info('[fitted] ตรวจพบพารามิเตอร์ใหม่ → reload 1 ครั้งเพื่อใช้ค่า fitted');
    location.reload();
  }

  function whenReactReady(cb) {
    var tries = 0;
    var MAX = 60;
    var timer = setInterval(function () {
      tries++;
      var root = document.getElementById('root');
      if (root && root.children.length > 0) {
        clearInterval(timer);
        setTimeout(cb, 100);
        return;
      }
      if (tries >= MAX) {
        clearInterval(timer);
        console.warn('[fitted] timeout รอ React mount — ลอง patch ตรงๆ');
        cb();
      }
    }, 250);
  }

  function boot(p, source) {
    FITTED = normalize(Object.assign({}, p, { _source: source }));
    window.FITTED_PARAMS = FITTED;
    console.info('[fitted] loaded ' + source +
      ' | ρ=' + FITTED.rho.toFixed(3) +
      ' | homeAdv=' + FITTED.homeAdvantage.toFixed(3) +
      ' | teams=' + Object.keys(FITTED.attack).length);
    whenReactReady(function () { tryPatch(); });
  }

  if (isValid(window.FITTED_PARAMS)) { boot(window.FITTED_PARAMS, 'window.inline'); return; }
  try {
    var ls = localStorage.getItem('pl_fitted_params');
    if (ls) { var parsed = JSON.parse(ls); if (isValid(parsed)) { boot(parsed, 'localStorage'); return; } }
  } catch (e) {}
  window.FITTED_PARAMS = FALLBACK;
  window.getFitted = function(){
    var P = window.FITTED_PARAMS;
    if(!P || P._source==='heuristic') return null;
    return {rho:P.rho, homeAdvantage:P.homeAdvantage, attack:P.attack, defense:P.defense, teams:P.teams, brier:P.brier};
  };
  if (typeof fetch === 'function') {
    fetch('./pl-fitted-params.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (json) { if (isValid(json)) boot(json, 'fetch'); else { console.warn('[fitted] JSON ผิด schema — ใช้ heuristic'); whenReactReady(tryPatch); } })
      .catch(function (err) { console.warn('[fitted] โหลดไฟล์ไม่สำเร็จ (' + err + ') — ใช้ heuristic'); whenReactReady(tryPatch); });
  } else {
    console.warn('[fitted] fetch ไม่พร้อม — ใช้ heuristic');
    whenReactReady(tryPatch);
  }
})();
