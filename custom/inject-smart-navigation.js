/* ============================================================
   inject-smart-navigation.js  (v29 - بازنویسی و بهینه‌سازی)
   مسیریابی هوشمند برای تور مجازی بیمارستان (3DVista)


   تغییرات نسبت به v28:
   - چرخش دوربین خیلی نرم: مدت زمان بر اساس زاویه (درجه/ثانیه) + easing خیلی آرام (smootherstep)
   - سه استراتژی چرخش با تشخیص خودکار: setPosition → set('yaw'/'pitch') → hash رسمی 3DVista
   - رفع باگ: بعد از «توقف»، حلقهٔ انیمیشن و تایمرهای زنجیره‌ای دیگه ادامه پیدا نمی‌کنن (token نسل)
   - رفع باگ: اگه کاربر همون‌جا (مبدأ) بود، دیگه صحنهٔ فعلی بی‌دلیل reload نمی‌شه
   - تشخیص صحنهٔ فعلی + دکمهٔ «موقعیت فعلی» + انتظار واقعی برای لود صحنه (به‌جای delay ثابت)
   - هشدار خودکار در کنسول برای یال‌هایی که yaw ندارن (تا گراف رو کامل کنی)
   - Dijkstra با وزن اختیاری (weight) برای مسیر واقعی‌تر
   - دسترس‌پذیری: دکمه واقعی، کیبورد، escape برای بستن پنل، جلوگیری از XSS در لیبل‌ها
   ============================================================ */
(function () {
  'use strict';


  if (window.SmartNav && window.SmartNav.__loaded) {
    console.warn('[SmartNav] already loaded, skipping second injection');
    return;
  }


  /* ============================================================
     0) تنظیمات (همه‌ی اعدادی که ممکنه بخوای تغییر بدی همین‌جاست)
     ============================================================ */
  var CFG = {
    // --- چرخش دوربین به سمت هات‌اسپات ---
    ROTATE_DEG_PER_SEC: 40,     // سرعت چرخش (درجه بر ثانیه) — کمتر = آرام‌تر
    ROTATE_MIN_MS: 1400,        // حداقل زمان چرخش حتی برای زاویه‌های کوچک
    ROTATE_MAX_MS: 4500,        // حداکثر زمان چرخش برای زاویه‌های بزرگ (مثلاً ۱۸۰ درجه)
    EASING: 'smootherstep',     // 'smootherstep' | 'easeInOutSine' | 'easeInOutCubic'


    // --- زمان‌بندی مراحل ---
    SETTLE_AFTER_LOAD_MS: 900,  // بعد از لود صحنه، چقدر مکث کنه تا کاربر صحنه رو ببینه، بعد بچرخه
    HOLD_BEFORE_JUMP_MS: 550,   // بعد از اینکه دوربین روی هات‌اسپات قفل شد، چقدر بمونه بعد بره صحنه بعد
    SCENE_LOAD_TIMEOUT_MS: 6000,// حداکثر انتظار برای لود صحنه (اگه تشخیص صحنه ممکن نبود از FALLBACK استفاده می‌شه)
    SCENE_LOAD_FALLBACK_MS: 2200,
    HASH_ROTATE_WAIT_MS: 1600,  // وقتی چرخش از طریق hash انجام می‌شه (استراتژی سوم)، چقدر منتظر بمونه


    // --- رفتار ---
    AUTO_SELECT_CURRENT_SCENE: true, // وقتی پنل باز می‌شه، مبدأ رو خودکار روی صحنهٔ فعلی بگذاره
    DEBUG: true
  };


  function log() { if (CFG.DEBUG && window.console) console.log.apply(console, ['[SmartNav]'].concat([].slice.call(arguments))); }
  function warn() { if (window.console) console.warn.apply(console, ['[SmartNav]'].concat([].slice.call(arguments))); }


  /* ============================================================
     1) گراف صحنه‌ها
     فرمت هر یال: { to: "اسم مقصد", yaw: عدد, pitch: عدد (اختیاری), fov: عدد (اختیاری), weight: عدد (اختیاری، پیش‌فرض 1) }
     yaw = جهت هات‌اسپاتی که تو صحنهٔ «مبدأ» به صحنهٔ «مقصد» می‌ره.
     ============================================================ */
  var GRAPH = {
    "ورودی اصلی":      [{ to: "ورودی کلینیک", yaw: 75.29 }, { to: "پذیرش1", yaw: 1.08 }, { to: "ورودی اورژانس", yaw: -61.35 }],
    "ورودی کلینیک":     [{ to: "روبروی آزمایشگاه", yaw: 1.97 }, { to: "ورودی اصلی", yaw: -91.65 }],
    "ورودی اورژانس":    [{ to: "ورودی اصلی", yaw: 69.32 }, { to: "تریاژ", yaw: -1.35 }],
    "تریاژ":            [{ to: "بستری اورژانس", yaw: 87.42 }, { to: "ورودی اورژانس", yaw: -10.72 }, { to: "راهنمای خطوط", yaw: -151.25 }],
    "بستری اورژانس":    [{ to: "تریاژ", yaw: -20.07 }],
    "پذیرش1":           [{ to: "ورودی اصلی", yaw: -0.11 }, { to: "پذیرش2", yaw: -177.2 }],
    "پذیرش2":           [{ to: "پذیرش1", yaw: -179.66 }, { to: "راهنمای خطوط", yaw: -1.79 }, { to: "آسانسور همکف", yaw: 39.5 }],
    "آسانسور همکف":     [{ to: "پذیرش2", yaw: -92.75 }, { to: "نمازخانه", yaw: 79.73 }],
    "نمازخانه":         [{ to: "آسانسور همکف", yaw: -1.43 }],
    "راهنمای خطوط":     [{ to: "تریاژ", yaw: -100.28 }, { to: "پذیرش2", yaw: -178.47 }, { to: "ورودی رادیولوژی" /* yaw؟ */ }],
    "روبروی آزمایشگاه": [{ to: "آزمایشگاه" /* yaw؟ */ }, { to: "ورودی کلینیک", yaw: 152.65 }, { to: "روبروی کتابخونه", yaw: -85.85 }],
    "آزمایشگاه":        [{ to: "روبروی آزمایشگاه", yaw: 87.73 }],
    "روبروی کتابخونه":  [{ to: "کتابخونه" /* yaw؟ */ }, { to: "روبروی آزمایشگاه", yaw: 154.27 }],
    "کتابخونه":         [{ to: "روبروی کتابخونه", yaw: 148.53 }],
    "ورودی رادیولوژی":  [{ to: "راهنمای خطوط" /* yaw؟ */ }]
  };


  /* دوطرفه‌کردن گراف + گزارش یال‌های بدون yaw (این یال‌ها چرخش دوربین ندارن و مستقیم پرش می‌کنن) */
  (function normalizeGraph() {
    var missing = [];
    Object.keys(GRAPH).forEach(function (from) {
      GRAPH[from].forEach(function (edge) {
        if (!GRAPH[edge.to]) GRAPH[edge.to] = [];
        if (!GRAPH[edge.to].some(function (e) { return e.to === from; })) {
          GRAPH[edge.to].push({ to: from, _auto: true });
        }
      });
    });
    Object.keys(GRAPH).forEach(function (from) {
      GRAPH[from].forEach(function (edge) {
        if (typeof edge.yaw !== 'number') missing.push(from + ' → ' + edge.to + (edge._auto ? ' (خودکار ساخته شد)' : ''));
      });
    });
    if (missing.length) warn('این یال‌ها yaw ندارن؛ برای چرخش نرم مقدارشون رو در GRAPH اضافه کن:\n  ' + missing.join('\n  '));
  })();


  /* ============================================================
     2) Dijkstra (وزن یال = edge.weight یا 1)
     ============================================================ */
  function dijkstra(start, end) {
    if (!(start in GRAPH) || !(end in GRAPH)) return null;
    var dist = {}, prev = {}, visited = {};
    Object.keys(GRAPH).forEach(function (n) { dist[n] = Infinity; });
    dist[start] = 0;


    for (;;) {
      var u = null, best = Infinity;
      for (var n in dist) if (!visited[n] && dist[n] < best) { best = dist[n]; u = n; }
      if (u === null || u === end) break;
      visited[u] = true;
      GRAPH[u].forEach(function (edge) {
        if (!(edge.to in dist)) return;
        var w = typeof edge.weight === 'number' && edge.weight > 0 ? edge.weight : 1;
        var alt = dist[u] + w;
        if (alt < dist[edge.to]) { dist[edge.to] = alt; prev[edge.to] = { from: u, edge: edge }; }
      });
    }
    if (dist[end] === Infinity) return null;


    var steps = [], cur = end;
    while (cur !== start) {
      var p = prev[cur];
      if (!p) return null;
      steps.unshift({ from: p.from, to: cur, yaw: p.edge.yaw, pitch: p.edge.pitch, fov: p.edge.fov });
      cur = p.from;
    }
    return { steps: steps, cost: dist[end] };
  }


  /* ============================================================
     3) دسترسی به موتور 3DVista (همه با try/catch و تشخیص قابلیت)
     ============================================================ */
  function getRootPlayer() {
    var tour = window.tour;
    if (!tour) return null;
    try { if (tour.player) return tour.player; } catch (e) {}
    try { if (typeof tour._getRootPlayer === 'function') return tour._getRootPlayer(); } catch (e) {}
    return null;
  }


  function getMainViewer(root) {
    var tour = window.tour;
    try { if (root && typeof root.getMainViewer === 'function') return root.getMainViewer(); } catch (e) {}
    try { if (tour && typeof tour.getMainViewer === 'function') return tour.getMainViewer(); } catch (e) {}
    return null;
  }


  function getActivePanoramaPlayer() {
    var root = getRootPlayer();
    if (!root) return null;
    try {
      var viewer = getMainViewer(root);
      if (viewer && typeof root.getActivePlayerWithViewer === 'function') {
        var p = root.getActivePlayerWithViewer(viewer);
        if (p && p.get && p.get('class') === 'PanoramaPlayer') return p;
      }
    } catch (e) {}
    try {
      if (typeof root.getByClassName === 'function') {
        var list = root.getByClassName('PanoramaPlayer');
        for (var i = 0; i < list.length; i++) { if (list[i].get && list[i].get('panorama')) return list[i]; }
      }
    } catch (e) {}
    return null;
  }


  function getActiveCamera() {
    try {
      var p = getActivePanoramaPlayer();
      return p ? p.get('camera') : null;
    } catch (e) { return null; }
  }


  /* اسم (label) صحنه‌ای که همین الان نمایش داده می‌شه؛ اگه نشد null */
  function getCurrentSceneLabel() {
    try {
      var root = getRootPlayer();
      var viewer = getMainViewer(root);
      if (root && viewer && typeof root.getActiveMediaWithViewer === 'function') {
        var m = root.getActiveMediaWithViewer(viewer);
        if (m && m.get) return m.get('label') || null;
      }
    } catch (e) {}
    try {
      var p = getActivePanoramaPlayer();
      var pano = p && p.get('panorama');
      if (pano && pano.get) return pano.get('label') || null;
    } catch (e) {}
    return null;
  }


  /* ============================================================
     4) جابجایی با فرمت رسمی 3DVista  (#media-name=...&yaw=...&pitch=...&fov=...)
     ============================================================ */
  function goToScene(label, yaw, pitch, fov) {
    var hash = 'media-name=' + encodeURIComponent(label);
    if (typeof yaw === 'number') {
      hash += '&yaw=' + yaw.toFixed(2);
      // موتور تور pitch رو با "parseFloat(pitch)||undefined" می‌خونه؛ 0 خالص نادیده گرفته می‌شه → 0.1
      hash += '&pitch=' + ((typeof pitch === 'number' && pitch !== 0) ? pitch.toFixed(2) : '0.1');
      if (typeof fov === 'number') hash += '&fov=' + fov.toFixed(2);
    }
    log('hash ->', hash);
    // اگه hash عیناً همون قبلی باشه، hashchange اجرا نمی‌شه؛ اول خالی می‌کنیم
    if (window.location.hash === '#' + hash) {
      try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) { window.location.hash = ''; }
    }
    window.location.hash = hash;
  }


  /* ============================================================
     5) چرخش نرم دوربین
     ============================================================ */
  var EASINGS = {
    smootherstep:  function (t) { return t * t * t * (t * (t * 6 - 15) + 10); },          // خیلی نرم: شتاب و ترمز صفر
    easeInOutSine: function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; },
    easeInOutCubic:function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  };
  function ease(t) { return (EASINGS[CFG.EASING] || EASINGS.smootherstep)(Math.max(0, Math.min(1, t))); }
  function shortestYawDelta(from, to) { return ((to - from + 540) % 360) - 180; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }


  /* مدت چرخش بر اساس بزرگی زاویه: کوچک‌ها سریع‌تر تمام نمی‌شن، بزرگ‌ها هم بی‌نهایت طول نمی‌کشن */
  function rotationDuration(deltaYaw, deltaPitch) {
    var ang = Math.max(Math.abs(deltaYaw), Math.abs(deltaPitch));
    return clamp((ang / CFG.ROTATE_DEG_PER_SEC) * 1000, CFG.ROTATE_MIN_MS, CFG.ROTATE_MAX_MS);
  }


  /* استراتژی اعمال زاویه به دوربین: 'setPosition' | 'set' | null (=هیچ‌کدوم کار نکرد) */
  var cameraStrategy = undefined; // undefined = هنوز تست نشده


  function readCam(camera) {
    var yaw = camera.get('yaw'), pitch = camera.get('pitch');
    if (typeof yaw !== 'number' || typeof pitch !== 'number') throw new Error('non-number yaw/pitch');
    var roll, hfov;
    try { roll = camera.get('roll'); } catch (e) {}
    try { hfov = camera.get('hfov'); } catch (e) {}
    return { yaw: yaw, pitch: pitch, roll: typeof roll === 'number' ? roll : 0, hfov: typeof hfov === 'number' ? hfov : undefined };
  }


  function applyCam(camera, strategy, yaw, pitch, state) {
    if (strategy === 'setPosition') {
      if (typeof state.hfov === 'number') camera.setPosition(yaw, pitch, state.roll, state.hfov);
      else camera.setPosition(yaw, pitch);
    } else {
      camera.set('yaw', yaw);
      camera.set('pitch', pitch);
    }
  }


  /* یک استراتژی رو با یه تغییر ریز تست می‌کنیم و می‌بینیم واقعاً روی دوربین اثر گذاشت یا نه */
  function detectStrategy(camera, state) {
    var candidates = [];
    if (typeof camera.setPosition === 'function') candidates.push('setPosition');
    if (typeof camera.set === 'function') candidates.push('set');
    for (var i = 0; i < candidates.length; i++) {
      try {
        var probe = state.yaw + 0.01;
        applyCam(camera, candidates[i], probe, state.pitch, state);
        var after = camera.get('yaw');
        applyCam(camera, candidates[i], state.yaw, state.pitch, state); // برگردون
        if (typeof after === 'number' && Math.abs(after - probe) < 0.5) { log('camera strategy =', candidates[i]); return candidates[i]; }
      } catch (e) { warn('strategy', candidates[i], 'failed:', e); }
    }
    return null;
  }


  /* چرخش نرم؛ callback(ok) — ok=false یعنی باید با hash بچرخیم */
  function smoothRotate(targetYaw, targetPitch, token, callback) {
    var camera = getActiveCamera();
    if (!camera || typeof camera.get !== 'function') { cameraStrategy = null; callback(false); return; }


    var st;
    try { st = readCam(camera); } catch (e) { warn('read camera failed:', e); cameraStrategy = null; callback(false); return; }


    if (cameraStrategy === undefined) cameraStrategy = detectStrategy(camera, st);
    if (!cameraStrategy) { callback(false); return; }


    var toPitch = typeof targetPitch === 'number' ? targetPitch : st.pitch;
    var dYaw = shortestYawDelta(st.yaw, targetYaw);
    var dPitch = toPitch - st.pitch;
    var duration = rotationDuration(dYaw, dPitch);
    var startTs = null;


    log('rotate', st.yaw.toFixed(1) + '°', '→', targetYaw.toFixed(1) + '°', '(' + Math.round(duration) + 'ms)');


    function frame(ts) {
      if (!token.alive) { callback(true); return; }        // توقف شد
      if (startTs === null) startTs = ts;
      var t = Math.min(1, (ts - startTs) / duration);
      var k = ease(t);
      try {
        applyCam(camera, cameraStrategy, st.yaw + dYaw * k, st.pitch + dPitch * k, st);
      } catch (e) {
        warn('applyCam failed mid-animation:', e);
        cameraStrategy = null;
        callback(false);
        return;
      }
      if (t < 1) requestAnimationFrame(frame); else callback(true);
    }
    requestAnimationFrame(frame);
  }


  /* منتظر می‌مونه تا صحنهٔ label واقعاً لود بشه؛ اگه تشخیص صحنه ممکن نبود، delay ثابت */
  function waitForScene(label, token, callback) {
    if (getCurrentSceneLabel() === null) { schedule(token, callback, CFG.SCENE_LOAD_FALLBACK_MS); return; }
    var started = Date.now();
    (function poll() {
      if (!token.alive) return;
      var cur = getCurrentSceneLabel();
      if (cur === label) { schedule(token, callback, 250); return; }        // 250ms برای اتمام fade
      if (Date.now() - started > CFG.SCENE_LOAD_TIMEOUT_MS) { warn('scene load timeout:', label, '(current:', cur + ')'); callback(); return; }
      schedule(token, poll, 120);
    })();
  }


  /* setTimeout امن: فقط اگه token هنوز زنده باشه اجرا می‌شه */
  function schedule(token, fn, ms) {
    var id = setTimeout(function () { if (token.alive) fn(); }, ms);
    token.timers.push(id);
    return id;
  }


  /* ============================================================
     6) استایل
     ============================================================ */
  var css = ''
    + '@import url("https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&display=swap");'
    + '#snav-btn{position:fixed;top:calc(14px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:2147483647;'
    + 'padding:11px 20px;border-radius:999px;border:1px solid rgba(212,175,55,.35);'
    + 'background:linear-gradient(160deg,rgba(11,31,36,.92),rgba(15,46,52,.88));backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);'
    + 'display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;white-space:nowrap;'
    + 'font-family:"Vazirmatn",sans-serif;font-size:13px;font-weight:600;color:#e8f4f2;letter-spacing:.2px;'
    + 'box-shadow:0 8px 24px rgba(0,0,0,.35),inset 0 0 0 1px rgba(45,212,191,.08);transition:transform .25s ease,box-shadow .25s ease;'
    + 'user-select:none;-webkit-tap-highlight-color:transparent;}'
    + '#snav-btn:hover{transform:translateX(-50%) translateY(2px);box-shadow:0 4px 16px rgba(0,0,0,.4);}'
    + '#snav-btn:focus-visible{outline:2px solid #2dd4bf;outline-offset:2px;}'
    + '#snav-btn .ico{width:14px;height:14px;flex-shrink:0;}'
    + '#snav-panel{position:fixed;top:0;left:50%;transform:translateX(-50%) translateY(-130%);'
    + 'width:min(380px,94vw);max-width:94vw;z-index:2147483647;'
    + 'margin-top:calc(72px + env(safe-area-inset-top,0px));border-radius:22px;'
    + 'padding:20px 18px 16px;box-sizing:border-box;'
    + 'background:linear-gradient(165deg,rgba(9,25,29,.96),rgba(13,41,46,.94));'
    + 'border:1px solid rgba(212,175,55,.25);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);'
    + 'box-shadow:0 20px 60px rgba(0,0,0,.5),inset 0 0 0 1px rgba(45,212,191,.06);'
    + 'font-family:"Vazirmatn",sans-serif;direction:rtl;transition:transform .4s cubic-bezier(.22,1,.36,1);'
    + 'max-height:calc(100vh - 100px);overflow-y:auto;visibility:hidden;}'
    + '#snav-panel.open{transform:translateX(-50%) translateY(0);visibility:visible;}'
    + '#snav-panel h3{margin:0 0 16px;font-size:14.5px;font-weight:700;color:#e8f4f2;letter-spacing:.2px;display:flex;align-items:center;gap:8px;}'
    + '#snav-panel h3 .dot{width:6px;height:6px;border-radius:50%;background:#d4af37;box-shadow:0 0 8px #d4af37;flex-shrink:0;}'
    + '.snav-field{margin-bottom:12px;}'
    + '.snav-field .lbl{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}'
    + '.snav-field label{font-size:11.5px;color:#8fb5b0;font-weight:500;}'
    + '.snav-link{background:none;border:none;color:#2dd4bf;font-family:"Vazirmatn",sans-serif;font-size:11px;cursor:pointer;padding:0;-webkit-tap-highlight-color:transparent;}'
    + '.snav-link:hover{text-decoration:underline;}'
    + '.snav-field select{width:100%;box-sizing:border-box;padding:12px 14px;border-radius:12px;'
    + 'border:1px solid rgba(45,212,191,.2);background-color:#0d2226;color:#eaf6f4;'
    + 'font-family:"Vazirmatn",sans-serif;font-size:14px;outline:none;appearance:none;-webkit-appearance:none;cursor:pointer;'
    + 'background-image:url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8"><path d="M1 1l5 5 5-5" stroke="%232dd4bf" stroke-width="1.6" fill="none"/></svg>\');'
    + 'background-repeat:no-repeat;background-position:14px center;padding-left:32px;transition:border-color .2s;}'
    + '.snav-field select:focus{border-color:#2dd4bf;}'
    + '.snav-field select option{background-color:#0d2226;color:#eaf6f4;}'
    + '#snav-go{width:100%;margin-top:6px;padding:13px;border:none;border-radius:12px;cursor:pointer;'
    + 'background:linear-gradient(120deg,#2dd4bf,#1a8f82);color:#06201d;font-family:"Vazirmatn",sans-serif;'
    + 'font-weight:700;font-size:14px;transition:filter .2s,transform .15s;-webkit-tap-highlight-color:transparent;}'
    + '#snav-go:hover{filter:brightness(1.08);}'
    + '#snav-go:active{transform:scale(.98);}'
    + '#snav-go:disabled{opacity:.5;cursor:not-allowed;}'
    + '#snav-status{margin-top:14px;padding:12px 14px;border-radius:12px;background:rgba(212,175,55,.08);'
    + 'border:1px solid rgba(212,175,55,.2);font-size:12.5px;color:#f0dfa8;display:none;align-items:center;justify-content:space-between;gap:10px;}'
    + '#snav-status.show{display:flex;}'
    + '#snav-status .txt{flex:1;line-height:1.6;}'
    + '#snav-status b{font-family:"JetBrains Mono",monospace;color:#ffe9a8;}'
    + '#snav-progress{height:3px;border-radius:2px;background:rgba(212,175,55,.15);margin-top:8px;overflow:hidden;}'
    + '#snav-progress i{display:block;height:100%;width:0;background:linear-gradient(90deg,#d4af37,#2dd4bf);transition:width .6s ease;}'
    + '#snav-cancel{border:none;background:rgba(255,90,90,.15);color:#ff9d9d;border-radius:8px;'
    + 'padding:7px 12px;font-family:"Vazirmatn",sans-serif;font-size:11.5px;cursor:pointer;white-space:nowrap;-webkit-tap-highlight-color:transparent;}'
    + '#snav-err{margin-top:10px;font-size:12px;color:#ff8f8f;display:none;}'
    + '#snav-close{position:absolute;top:14px;left:16px;background:none;border:none;color:#7fa8a2;font-size:20px;cursor:pointer;line-height:1;padding:4px;-webkit-tap-highlight-color:transparent;}'
    + '@media (max-width:420px){'
    + '#snav-btn{font-size:12px;padding:10px 16px;}'
    + '#snav-panel{padding:18px 14px 14px;border-radius:18px;}'
    + '#snav-panel h3{font-size:13.5px;}'
    + '.snav-field select{font-size:15px;padding:13px 14px;padding-left:30px;}'
    + '#snav-go{font-size:14.5px;padding:14px;}'
    + '}'
    + '@media (prefers-reduced-motion:reduce){#snav-panel{transition:none;}}';


  var styleEl = document.createElement('style');
  styleEl.id = 'snav-style';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);


  /* ============================================================
     7) ساخت UI
     ============================================================ */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  var labels = Object.keys(GRAPH).sort(function (a, b) { return a.localeCompare(b, 'fa'); });
  var optionsHtml = labels.map(function (l) { return '<option value="' + escapeHtml(l) + '">' + escapeHtml(l) + '</option>'; }).join('');


  var btn = document.createElement('button');
  btn.id = 'snav-btn';
  btn.type = 'button';
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-expanded', 'false');
  btn.title = 'مسیریابی هوشمند';
  btn.innerHTML = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg><span>مسیریابی هوشمند</span>';
  document.body.appendChild(btn);


  var panel = document.createElement('div');
  panel.id = 'snav-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'مسیریابی هوشمند تور');
  panel.innerHTML =
    '<button id="snav-close" type="button" aria-label="بستن">&times;</button>' +
    '<h3><span class="dot"></span>مسیریابی هوشمند تور</h3>' +
    '<div class="snav-field"><div class="lbl"><label for="snav-from">مبدأ</label>' +
      '<button type="button" class="snav-link" id="snav-here">موقعیت فعلی من</button></div>' +
      '<select id="snav-from">' + optionsHtml + '</select></div>' +
    '<div class="snav-field"><div class="lbl"><label for="snav-to">مقصد</label></div><select id="snav-to">' + optionsHtml + '</select></div>' +
    '<button id="snav-go" type="button">شروع مسیریابی</button>' +
    '<div id="snav-err" role="alert"></div>' +
    '<div id="snav-status" aria-live="polite"><div class="txt"><div id="snav-status-txt"></div><div id="snav-progress"><i></i></div></div>' +
      '<button id="snav-cancel" type="button">توقف</button></div>';
  document.body.appendChild(panel);


  var fromSel = panel.querySelector('#snav-from');
  var toSel = panel.querySelector('#snav-to');
  var goBtn = panel.querySelector('#snav-go');
  var hereBtn = panel.querySelector('#snav-here');
  var statusBox = panel.querySelector('#snav-status');
  var statusTxt = panel.querySelector('#snav-status-txt');
  var progressBar = panel.querySelector('#snav-progress i');
  var errBox = panel.querySelector('#snav-err');
  var cancelBtn = panel.querySelector('#snav-cancel');


  function setPanelOpen(open) {
    panel.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    if (open && CFG.AUTO_SELECT_CURRENT_SCENE) selectCurrentScene(true);
  }
  function selectCurrentScene(silent) {
    var cur = getCurrentSceneLabel();
    if (cur && cur in GRAPH) { fromSel.value = cur; if (!silent) errBox.style.display = 'none'; return true; }
    if (!silent) showError(cur ? ('صحنهٔ فعلی («' + cur + '») در گراف تعریف نشده.') : 'تشخیص صحنهٔ فعلی ممکن نبود.');
    return false;
  }


  btn.addEventListener('click', function () { setPanelOpen(!panel.classList.contains('open')); });
  panel.querySelector('#snav-close').addEventListener('click', function () { setPanelOpen(false); });
  hereBtn.addEventListener('click', function () { selectCurrentScene(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('open')) setPanelOpen(false); });


  /* فول‌اسکرین: المنت‌های خارج از عنصر فول‌اسکرین دیده نمی‌شن → دکمه/پنل رو منتقل می‌کنیم */
  function relocateUI() {
    var fsEl = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    var target = fsEl || document.body;
    if (btn.parentNode !== target) target.appendChild(btn);
    if (panel.parentNode !== target) target.appendChild(panel);
  }
  ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(function (evt) {
    document.addEventListener(evt, relocateUI);
  });


  function showError(msg) { errBox.textContent = msg; errBox.style.display = 'block'; }
  function setStatus(html, frac) {
    statusTxt.innerHTML = html;
    if (typeof frac === 'number') progressBar.style.width = Math.round(clamp(frac, 0, 1) * 100) + '%';
  }


  /* ============================================================
     8) اجرای مسیر گام‌به‌گام
     هر گام:  [اگه لازم بود: پرش به s.from و انتظار لود] → مکث کوتاه →
              چرخش نرم به سمت هات‌اسپات → مکث کوتاه → پرش به s.to → انتظار لود
     ============================================================ */
  var activeToken = null;


  function newToken() { return { alive: true, timers: [] }; }
  function killToken(token) {
    if (!token) return;
    token.alive = false;
    token.timers.forEach(clearTimeout);
    token.timers.length = 0;
  }


  function runPath(result, toLabel) {
    killToken(activeToken);
    var token = activeToken = newToken();
    var steps = result.steps, total = steps.length;


    goBtn.disabled = true;
    errBox.style.display = 'none';
    statusBox.classList.add('show');
    setStatus('در حال آماده‌سازی مسیر…', 0);


    function finish(msg) {
      if (msg) setStatus(msg, 1);
      killToken(token);
      if (activeToken === token) activeToken = null;
      goBtn.disabled = false;
      setTimeout(function () { if (activeToken === null) statusBox.classList.remove('show'); }, msg ? 1600 : 400);
    }


    function stepAt(idx) {
      if (!token.alive) return;
      if (idx >= total) { finish('رسیدید به مقصد: <b>' + escapeHtml(toLabel) + '</b> ✓'); return; }
      var s = steps[idx];
      var frac = idx / total;


      // مکث کوتاه تا کاربر صحنه رو ببینه، بعد چرخش
      schedule(token, function () {
        if (typeof s.yaw !== 'number') { jump(); return; }   // این یال yaw نداره → مستقیم پرش
        setStatus('گام <b>' + (idx + 1) + '</b> از <b>' + total + '</b> — چرخش به سمت «' + escapeHtml(s.to) + '»', frac + 0.3 / total);
        smoothRotate(s.yaw, s.pitch, token, function (ok) {
          if (!token.alive) return;
          if (ok) { schedule(token, jump, CFG.HOLD_BEFORE_JUMP_MS); return; }
          // استراتژی سوم: چرخش با hash رسمی (موتور تور خودش انیمیت می‌کنه)
          goToScene(s.from, s.yaw, s.pitch, s.fov);
          schedule(token, jump, CFG.HASH_ROTATE_WAIT_MS);
        });
      }, CFG.SETTLE_AFTER_LOAD_MS);


      function jump() {
        if (!token.alive) return;
        setStatus('گام <b>' + (idx + 1) + '</b> از <b>' + total + '</b> — حرکت به «' + escapeHtml(s.to) + '»', frac + 0.8 / total);
        goToScene(s.to);
        waitForScene(s.to, token, function () { stepAt(idx + 1); });
      }
    }


    // شروع: اگه همین الان تو مبدأ نیستیم، اول بریم مبدأ
    var first = steps[0].from;
    if (getCurrentSceneLabel() === first) { stepAt(0); }
    else { goToScene(first); waitForScene(first, token, function () { stepAt(0); }); }
  }


  cancelBtn.addEventListener('click', function () {
    if (!activeToken) return;
    var t = activeToken;
    killToken(t); activeToken = null;
    setStatus('مسیریابی متوقف شد.');
    goBtn.disabled = false;
    setTimeout(function () { if (activeToken === null) statusBox.classList.remove('show'); }, 1200);
  });


  goBtn.addEventListener('click', function () {
    var fromLabel = fromSel.value, toLabel = toSel.value;
    errBox.style.display = 'none';
    if (!fromLabel || !toLabel) { showError('لطفاً مبدأ و مقصد را انتخاب کنید.'); return; }
    if (fromLabel === toLabel) { showError('مبدأ و مقصد نمی‌توانند یکسان باشند.'); return; }
    var result = dijkstra(fromLabel, toLabel);
    log('path:', result);
    if (!result) { showError('مسیری بین این دو نقطه در گراف فعلی پیدا نشد.'); return; }
    runPath(result, toLabel);
  });


  /* ============================================================
     9) API عمومی برای دیباگ / استفادهٔ بیرونی
     ============================================================ */
  window.SmartNav = {
    __loaded: true,
    config: CFG,
    graph: GRAPH,
    dijkstra: dijkstra,
    navigate: function (from, to) {           // SmartNav.navigate('پذیرش1', 'کتابخونه')
      var r = dijkstra(from, to);
      if (!r) { warn('no path', from, '→', to); return false; }
      fromSel.value = from; toSel.value = to; setPanelOpen(true); runPath(r, to); return true;
    },
    stop: function () { cancelBtn.click(); },
    currentScene: getCurrentSceneLabel,
    camera: getActiveCamera,
    rotateTo: function (yaw, pitch) { smoothRotate(yaw, pitch, newToken(), function (ok) { log('rotateTo done, ok =', ok); }); },
    get strategy() { return cameraStrategy; }
  };
  log('loaded v29. scenes:', labels.length, '| current scene:', getCurrentSceneLabel());
})();