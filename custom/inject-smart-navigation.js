/* ============================================================
   inject-smart-navigation.js
   قابلیت مسیریابی هوشمند برای تور مجازی بیمارستان (3DVista)

   منطق نهایی (بعد از چند بار تست و رفع اشکال):
   - گراف مستقیماً از روی اسم صحنه‌ها (Label فارسی) که خودت تأیید کردی ساخته شده
   - جابجایی با فرمت رسمی خود 3DVista: #media=<اسم>&yaw=<جهت>&pitch=<زاویه>
     (این پارامتر رسمیه؛ خود موتور تور چرخش نرم دوربین رو انجام می‌ده،
      نیازی به دستکاری camera یا window.tour از بیرون نیست)
   - هیچ وابستگی‌ای به ساختار داخلی script_general.js یا window.tour نداره
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 1) گراف صحنه‌ها ----------
     این گراف به‌صورت خودکار از روی داده‌ی adjacentPanoramas در script_general.js
     (یعنی همون هات‌اسپات‌های واقعی تور) استخراج شده، پس یال‌ها و مقادیر yaw
     دقیقاً با هات‌اسپات‌های واقعی صحنه‌ها هم‌خونی دارن.
     برای اضافه/ویرایش دستی: کافیه این آبجکت رو آپدیت کنی.
     فرمت هر یال: { to: "اسم مقصد", yaw: عدد (اختیاری), pitch: عدد (اختیاری) }

     نکته: پانوراماهایی که هیچ هات‌اسپات ورودی/خروجی‌ای در تور ندارن (یعنی به هیچ
     صحنه‌ی دیگه‌ای وصل نیستن) عمداً از این گراف حذف شدن، چون مسیریابی به/از اونها
     ممکن نیست:
       - "روبروی دپارتمان" (panorama_F1B85013_FCAD_E541_41BA_228106CD266F)
       - "PANO_20260731_135933_2 (1)" (panorama_03BCB3E9_1E63_B167_41B4_9CE8B009288C) — یک پانورامای بی‌نام/تستی به نظر می‌رسه

     نکته: در فایل اصلی دو صحنه‌ی مجزا هر دو با نام "آزمایشگاه" لیبل شده بودن
     (یکی کنار "درمانگاه" در بخش اصلی بیمارستان، یکی داخل کلینیک ناباروری
     امید). برای جلوگیری از تداخل کلید در این آبجکت، دومی به
     "آزمایشگاه (کلینیک امید)" تغییر نام داده شده. اگه اسم دقیق‌تری مد نظرته،
     همینجا عوضش کن. */
  var GRAPH = {
    "بخش داخلی": [{ to: "آسانسور طبقه دوم", yaw: 32.33 }],
    "راهرو اتاق عمل": [{ to: "اتاق عمل (2)", yaw: 86.43 }, { to: "ریکاوری", yaw: -166.92 }, { to: "اتاق عمل (3)", yaw: 163.01 }, { to: "اتاق عمل (1)", yaw: 9.58 }, { to: "اتاق عمل (4)", yaw: 174.57 }, { to: "آسانسور طبقه اول", yaw: -86.5 }],
    "ورودی اورژانس": [{ to: "تریاژ", yaw: -1.35 }, { to: "ورودی اصلی", yaw: 69.32 }],
    "بخش نورولوژی": [{ to: "آسانسور طبقه دوم", yaw: -0.36 }],
    "اتاق بازی": [{ to: "بخش اطفال", yaw: -78.52 }],
    "نمازخانه": [{ to: "آسانسور همکف", yaw: -1.43 }],
    "آسانسور طبقه سوم": [{ to: "ورودی بخش ها", yaw: -99.1 }, { to: "آسانسور طبقه دوم", yaw: 1.53 }, { to: "آسانسور طبقه چهارم", yaw: 1.6 }, { to: "آسانسور همکف", yaw: 1.34 }, { to: "آسانسور طبقه اول", yaw: 1.66 }],
    "آسانسور طبقه چهارم": [{ to: "ورودی جراحی", yaw: -97.36 }, { to: "آسانسور طبقه اول", yaw: -1.33 }, { to: "آسانسور طبقه سوم", yaw: -1.18 }, { to: "آسانسور طبقه دوم", yaw: -0.94 }, { to: "آسانسور همکف", yaw: 0.16 }, { to: "ورودی اطفال", yaw: 86.73 }],
    "آسانسور همکف": [{ to: "نمازخانه", yaw: 79.73 }, { to: "پذیرش2", yaw: -92.75 }, { to: "آسانسور طبقه سوم", yaw: -4.74 }, { to: "آسانسور طبقه دوم", yaw: -4.61 }, { to: "آسانسور طبقه چهارم", yaw: -4.66 }, { to: "آسانسور طبقه اول", yaw: -4.91 }],
    "آزمایشگاه": [{ to: "درمانگاه", yaw: 87.73 }],
    "درمانگاه": [{ to: "ورودی رادیولوژی", yaw: -3.96 }, { to: "ورودی درمانگاه", yaw: 152.65 }, { to: "دپارتمان آموزشی پژوهشی", yaw: -85.85 }],
    "طبقه اول": [{ to: "پذیرش امید", yaw: 92.06 }, { to: "مراقبت های ویژه قلبی", yaw: 140.67 }, { to: "بخش مراقبت های ویژه", yaw: 177.34 }, { to: "آسانسور طبقه اول", yaw: -28.74 }],
    "مراقبت های ویژه قلبی": [{ to: "طبقه اول", yaw: 144.3 }],
    "ورودی درمانگاه": [{ to: "درمانگاه", yaw: 1.97 }, { to: "ورودی اصلی", yaw: -91.65 }],
    "ورودی جراحی": [{ to: "بخش جراحی", yaw: 57.93 }, { to: "آسانسور طبقه چهارم", yaw: -99.72 }],
    "پذیرش2": [{ to: "پذیرش1", yaw: -179.66 }, { to: "راهنمای خطوط", yaw: -1.79 }, { to: "آسانسور همکف", yaw: 39.5 }],
    "بخش جراحی": [{ to: "اتاق vip", yaw: -163.56 }, { to: "ورودی جراحی", yaw: 37.48 }],
    "سایکوسوماتیک": [{ to: "ورودی بخش ها", yaw: 85.3 }],
    "بخش مراقبت های ویژه": [{ to: "طبقه اول", yaw: -94.98 }],
    "رادیولوژی": [{ to: "سونوگرافی", yaw: -42.31 }, { to: "ماموگرافی", yaw: -59.22 }, { to: "رادیوگرافی ساده", yaw: -78.39 }, { to: "MRI", yaw: 61.02 }],
    "ورودی اصلی": [{ to: "پذیرش1", yaw: 1.08 }, { to: "ورودی اورژانس", yaw: -61.35 }, { to: "ورودی درمانگاه", yaw: 75.29 }],
    "ورودی رادیولوژی": [{ to: "رادیولوژی", yaw: 0.11 }, { to: "راهنمای خطوط", yaw: -86.45 }],
    "راهنمای خطوط": [{ to: "پذیرش2", yaw: -178.47 }, { to: "تریاژ", yaw: -100.28 }, { to: "ورودی رادیولوژی", yaw: 60.2 }],
    "پذیرش امید": [{ to: "طبقه اول", yaw: -179.21 }, { to: "معاینه زنان", yaw: 18.24 }, { to: "آزمایشگاه (کلینیک امید)", yaw: -1.88 }],
    "آزمایشگاه (کلینیک امید)": [{ to: "پذیرش امید", yaw: -169.79 }],
    "ریکاوری": [{ to: "راهرو اتاق عمل", yaw: -76.63 }],
    "فیزیوتراپی": [{ to: "ورودی بخش ها", yaw: -177.57 }],
    "آسانسور طبقه دوم": [{ to: "آسانسور طبقه سوم", yaw: 1.83 }, { to: "آسانسور طبقه چهارم", yaw: 2.1 }, { to: "بخش نورولوژی", yaw: 94.26 }, { to: "بخش داخلی", yaw: -102.49 }, { to: "آسانسور همکف", yaw: -1.04 }, { to: "آسانسور طبقه اول", yaw: 2.29 }],
    "اتاق عمل (3)": [{ to: "راهرو اتاق عمل", yaw: 177.28 }],
    "اتاق عمل (4)": [{ to: "راهرو اتاق عمل", yaw: 178.54 }],
    "ایستگاه پرستاری اطفال": [{ to: "مراقبت های ویژه کودکان", yaw: 66.1 }, { to: "بخش اطفال", yaw: -42.86 }],
    "ورودی اطفال": [{ to: "بخش اطفال", yaw: -146.62 }, { to: "آسانسور طبقه چهارم", yaw: -46.02 }, { to: "مراقبت های ویژه کودکان", yaw: 128.78 }],
    "مراقبت های ویژه کودکان": [{ to: "ایستگاه پرستاری اطفال", yaw: 2.14 }, { to: "ورودی اطفال", yaw: 96.12 }],
    "سونوگرافی": [{ to: "رادیولوژی", yaw: 124.09 }],
    "سالن مطالعه": [{ to: "دپارتمان آموزشی پژوهشی", yaw: 148.53 }],
    "تریاژ": [{ to: "بستری اورژانس", yaw: 87.42 }, { to: "ورودی اورژانس", yaw: -10.72 }, { to: "راهنمای خطوط", yaw: -151.25 }],
    "اتاق vip": [{ to: "بخش جراحی", yaw: 76.96 }],
    "پذیرش1": [{ to: "پذیرش2", yaw: -177.2 }, { to: "ورودی اصلی", yaw: -0.11 }],
    "ورودی بخش ها": [{ to: "سایکوسوماتیک", yaw: -164.77 }, { to: "فیزیوتراپی", yaw: -19 }, { to: "آسانسور طبقه سوم", yaw: 84.65 }],
    "رادیوگرافی ساده": [{ to: "رادیولوژی", yaw: -69.96 }],
    "رگ گیری اطفال": [{ to: "بخش اطفال", yaw: 161.76 }],
    "ماموگرافی": [{ to: "رادیولوژی", yaw: -72.16 }],
    "بستری اورژانس": [{ to: "تریاژ", yaw: -20.07 }],
    "اتاق عمل (2)": [{ to: "راهرو اتاق عمل", yaw: 179.56 }],
    "MRI": [{ to: "رادیولوژی", yaw: 160.58 }],
    "دپارتمان آموزشی پژوهشی": [{ to: "درمانگاه", yaw: 154.27 },  { to: "سالن مطالعه", yaw: -2.07 }],
    "آسانسور طبقه اول": [{ to: "آسانسور طبقه چهارم", yaw: 0.89 }, { to: "آسانسور طبقه سوم", yaw: 0.85 }, { to: "طبقه اول", yaw: 96.6 }, { to: "راهرو اتاق عمل", yaw: -97.74 }, { to: "آسانسور طبقه دوم", yaw: 0.99 }, { to: "آسانسور همکف", yaw: 1.09 }],
    "بخش اطفال": [{ to: "ایستگاه پرستاری اطفال", yaw: 45.7 }, { to: "اتاق بازی", yaw: 130.63 }, { to: "رگ گیری اطفال", yaw: -22.4 }, { to: "ورودی اطفال", yaw: -38.44 }],
    "اتاق عمل (1)": [{ to: "راهرو اتاق عمل", yaw: 176.13 }],
    "معاینه زنان": [{ to: "پذیرش امید", yaw: -5.16 }]
  };
  /* توجه: اسم صحیح تو فایل پروژه "سالن مطالعه" و "دپارتمان آموزشی پژوهشی"ست (نه کتابخانه) —
     اگه setMediaByName این اسم رو تو تور پیدا نکنه، یعنی لیبل واقعی صحنه فرق داره،
     می‌تونی از پنل Scene Properties تو 3DVista اسم دقیق رو چک کنی. */

  /* اگر graph دو طرفه نبود (لینکی فقط یک طرف تعریف شده) خودکار می‌سازیمش */
  (function ensureUndirected() {
    Object.keys(GRAPH).forEach(function (from) {
      GRAPH[from].forEach(function (edge) {
        if (!GRAPH[edge.to]) GRAPH[edge.to] = [];
        var hasBack = GRAPH[edge.to].some(function (e) { return e.to === from; });
        if (!hasBack) GRAPH[edge.to].push({ to: from });
      });
    });
  })();

  /* ---------- 2) الگوریتم Dijkstra (وزن = تعداد گام) ---------- */
  function dijkstra(start, end) {
    var dist = {}, prev = {}, visited = {};
    Object.keys(GRAPH).forEach(function (n) { dist[n] = Infinity; });
    if (!(start in dist) || !(end in dist)) return null;
    dist[start] = 0;

    while (true) {
      var u = null, best = Infinity;
      for (var n in dist) { if (!visited[n] && dist[n] < best) { best = dist[n]; u = n; } }
      if (u === null || u === end) break;
      visited[u] = true;
      (GRAPH[u] || []).forEach(function (edge) {
        if (!(edge.to in dist)) return;
        var alt = dist[u] + 1;
        if (alt < dist[edge.to]) { dist[edge.to] = alt; prev[edge.to] = { from: u, yaw: edge.yaw, pitch: edge.pitch, fov: edge.fov }; }
      });
    }

    if (dist[end] === Infinity) return null;
    var steps = [], cur = end;
    while (cur !== start) {
      var p = prev[cur];
      if (!p) return null;
      steps.unshift({ from: p.from, to: cur, yaw: p.yaw, pitch: p.pitch, fov: p.fov });
      cur = p.from;
    }
    return { steps: steps };
  }

  function getSelectableLabels() {
    return Object.keys(GRAPH).sort(function (a, b) { return a.localeCompare(b, 'fa'); });
  }

  /* ---------- تشخیص خودکار «مبدأ» ----------
     خود موتور تور هر بار که صحنه عوض می‌شه (چه با کلیک روی هات‌اسپات، چه با
     مسیریابی خودمون) هش آدرس رو آپدیت می‌کنه: #media-name=<اسم>&yaw=...&pitch=...
     پس همون هش رو می‌خونیم تا بفهمیم کاربر الان تو کدوم صحنه‌ست؛ نیازی به
     دستکاری camera یا window.tour نیست، دقیقاً هم‌راستا با روش goToScene(). */
  function detectCurrentSceneLabel() {
    var hash = window.location.hash || '';
    if (hash.charAt(0) === '#') hash = hash.slice(1);
    if (!hash) return null;
    var params = {};
    hash.split('&').forEach(function (part) {
      if (!part) return;
      var eq = part.indexOf('=');
      var k = eq === -1 ? part : part.slice(0, eq);
      var v = eq === -1 ? '' : part.slice(eq + 1);
      try { params[k] = decodeURIComponent(v); } catch (e) { params[k] = v; }
    });
    var raw = params['media-name'] || params['media_name'] || params['media'];
    if (!raw) return null;
    return (raw in GRAPH) ? raw : null;
  }

  /* ---------- 3) استایل ----------
     همه‌ی اندازه‌ها با clamp() نسبت به عرض صفحه محاسبه می‌شن تا هم روی گوشی‌های
     کوچیک جمع‌وجور باشه، هم روی گوشی‌های بزرگ/تبلت بی‌جهت ریز نشه. عرض پنل هم
     به min(..., 92vw) محدوده تا هیچ‌وقت از صفحه بیرون نزنه. */
  var css = ''
    + '@import url("https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&display=swap");'
    + '#snav-btn{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:2147483647;'
    + 'padding:clamp(6px,1.8vw,9px) clamp(10px,3.2vw,16px);border-radius:999px;border:1px solid rgba(212,175,55,.35);'
    + 'background:linear-gradient(160deg,rgba(11,31,36,.92),rgba(15,46,52,.88));backdrop-filter:blur(14px);'
    + 'display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;white-space:nowrap;'
    + 'font-family:"Vazirmatn",sans-serif;font-size:clamp(10.5px,2.9vw,12.5px);font-weight:600;color:#e8f4f2;letter-spacing:.2px;'
    + 'box-shadow:0 6px 18px rgba(0,0,0,.35),inset 0 0 0 1px rgba(45,212,191,.08);transition:transform .25s ease,box-shadow .25s ease;'
    + 'user-select:none;-webkit-tap-highlight-color:transparent;max-width:60vw;}'
    + '#snav-btn:hover{transform:translateX(-50%) translateY(2px);box-shadow:0 4px 16px rgba(0,0,0,.4);}'
    + '#snav-panel{position:fixed;top:0;left:50%;transform:translateX(-50%) translateY(-130%);'
    + 'width:min(300px,92vw);max-width:92vw;z-index:2147483647;'
    + 'margin-top:calc(46px + env(safe-area-inset-top,0px));border-radius:16px;'
    + 'padding:clamp(12px,3.4vw,16px) clamp(10px,3.2vw,14px) clamp(10px,2.8vw,12px);box-sizing:border-box;'
    + 'background:linear-gradient(165deg,rgba(9,25,29,.97),rgba(13,41,46,.95));'
    + 'border:1px solid rgba(212,175,55,.25);backdrop-filter:blur(20px);'
    + 'box-shadow:0 16px 44px rgba(0,0,0,.5),inset 0 0 0 1px rgba(45,212,191,.06);'
    + 'font-family:"Vazirmatn",sans-serif;direction:rtl;transition:transform .35s cubic-bezier(.22,1,.36,1);'
    + 'max-height:min(420px,72vh);overflow-y:auto;}'
    + '#snav-panel.open{transform:translateX(-50%) translateY(0);}'
    + '#snav-panel h3{margin:0 0 10px;font-size:clamp(11.5px,3.1vw,13px);font-weight:700;color:#e8f4f2;letter-spacing:.2px;'
    + 'display:flex;align-items:center;gap:6px;padding-left:22px;}'
    + '#snav-panel h3 .dot{width:5px;height:5px;border-radius:50%;background:#d4af37;box-shadow:0 0 6px #d4af37;flex-shrink:0;}'
    + '.snav-field{margin-bottom:8px;}'
    + '.snav-field label{display:block;font-size:clamp(9.5px,2.5vw,10.5px);color:#8fb5b0;margin-bottom:4px;font-weight:500;}'
    + '.snav-field select{width:100%;box-sizing:border-box;padding:clamp(8px,2.4vw,10px) clamp(9px,2.6vw,11px);border-radius:9px;'
    + 'border:1px solid rgba(45,212,191,.2);background-color:#0d2226;color:#eaf6f4;'
    + 'font-family:"Vazirmatn",sans-serif;font-size:clamp(11.5px,3vw,12.5px);outline:none;appearance:none;cursor:pointer;'
    + 'background-image:url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="7"><path d="M1 1l4 4 4-4" stroke="%232dd4bf" stroke-width="1.5" fill="none"/></svg>\');'
    + 'background-repeat:no-repeat;background-position:11px center;padding-left:24px;transition:border-color .2s;}'
    + '.snav-field select:focus{border-color:#2dd4bf;}'
    + '.snav-field select option{background-color:#0d2226;color:#eaf6f4;}'
    + '#snav-go{width:100%;margin-top:4px;padding:clamp(9px,2.6vw,11px);border:none;border-radius:9px;cursor:pointer;'
    + 'background:linear-gradient(120deg,#2dd4bf,#1a8f82);color:#06201d;font-family:"Vazirmatn",sans-serif;'
    + 'font-weight:700;font-size:clamp(11.5px,3vw,12.5px);transition:filter .2s,transform .15s;-webkit-tap-highlight-color:transparent;}'
    + '#snav-go:hover{filter:brightness(1.08);}'
    + '#snav-go:active{transform:scale(.98);}'
    + '#snav-go:disabled{opacity:.5;cursor:not-allowed;}'
    + '#snav-status{margin-top:10px;padding:8px 10px;border-radius:9px;background:rgba(212,175,55,.08);'
    + 'border:1px solid rgba(212,175,55,.2);font-size:clamp(10px,2.6vw,11px);color:#f0dfa8;display:none;'
    + 'align-items:center;justify-content:space-between;gap:8px;}'
    + '#snav-status.show{display:flex;}'
    + '#snav-status .txt{flex:1;line-height:1.5;}'
    + '#snav-status b{font-family:"JetBrains Mono",monospace;color:#ffe9a8;}'
    + '#snav-cancel{border:none;background:rgba(255,90,90,.15);color:#ff9d9d;border-radius:7px;'
    + 'padding:5px 9px;font-family:"Vazirmatn",sans-serif;font-size:clamp(9.5px,2.4vw,10.5px);cursor:pointer;white-space:nowrap;-webkit-tap-highlight-color:transparent;flex-shrink:0;}'
    + '#snav-err{margin-top:8px;font-size:clamp(9.5px,2.4vw,10.5px);color:#ff8f8f;display:none;}'
    + '#snav-close{position:absolute;top:10px;left:10px;background:none;border:none;color:#7fa8a2;'
    + 'font-size:17px;cursor:pointer;line-height:1;padding:3px;-webkit-tap-highlight-color:transparent;}'
    + '@media (max-width:340px){'
    + '#snav-btn{max-width:56vw;}'
    + '#snav-panel{margin-top:calc(42px + env(safe-area-inset-top,0px));}'
    + '}'
    + '@media (min-width:600px){'
    + '#snav-panel{width:340px;}'
    + '}';

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ---------- 4) ساخت UI ---------- */
  var btn = document.createElement('div');
  btn.id = 'snav-btn';
  btn.title = 'مسیریابی هوشمند';
  btn.textContent = 'مسیریابی هوشمند';
  document.body.appendChild(btn);

  var labels = getSelectableLabels();
  var optionsHtml = labels.map(function (l) { return '<option value="' + l + '">' + l + '</option>'; }).join('');

  var panel = document.createElement('div');
  panel.id = 'snav-panel';
  panel.innerHTML =
    '<button id="snav-close">&times;</button>' +
    '<h3><span class="dot"></span>مسیریابی هوشمند تور</h3>' +
    '<div class="snav-field"><label>مبدأ</label><select id="snav-from">' + optionsHtml + '</select></div>' +
    '<div class="snav-field"><label>مقصد</label><select id="snav-to">' + optionsHtml + '</select></div>' +
    '<button id="snav-go">شروع مسیریابی</button>' +
    '<div id="snav-err"></div>' +
    '<div id="snav-status"><div class="txt" id="snav-status-txt"></div><button id="snav-cancel">توقف</button></div>';
  document.body.appendChild(panel);

  var fromSelect = panel.querySelector('#snav-from');

  /* هر بار که تغییری تو صحنه فعلی تشخیص داده بشه، مبدأ رو خودکار روش تنظیم می‌کنیم.
     وقتی پنل بازه دست نمی‌زنیم بهش، که وسط انتخاب دستی کاربر رو به‌هم نریزیم. */
  function syncFromWithCurrentScene() {
    if (panel.classList.contains('open')) return;
    var current = detectCurrentSceneLabel();
    if (current) fromSelect.value = current;
  }
  syncFromWithCurrentScene();
  window.addEventListener('hashchange', syncFromWithCurrentScene);

  btn.addEventListener('click', function () {
    var willOpen = !panel.classList.contains('open');
    if (willOpen) {
      var current = detectCurrentSceneLabel();
      if (current) fromSelect.value = current;
    }
    panel.classList.toggle('open');
  });
  panel.querySelector('#snav-close').addEventListener('click', function () { panel.classList.remove('open'); });

  /* ---------- تشخیص فول‌اسکرین: وقتی مرورگر یه المنت رو fullscreen می‌کنه،
     المنت‌های خارج از اون (مثل دکمه/پنل ما که به body وصل شدن) دیده نمی‌شن.
     پس هر بار fullscreen عوض شد، دکمه و پنل رو منتقل می‌کنیم به المنت فول‌اسکرین. */
  function relocateUI() {
    var fsEl = document.fullscreenElement || document.webkitFullscreenElement ||
      document.mozFullScreenElement || document.msFullscreenElement;
    var target = fsEl || document.body;
    if (btn.parentNode !== target) target.appendChild(btn);
    if (panel.parentNode !== target) target.appendChild(panel);
  }
  ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(function (evt) {
    document.addEventListener(evt, relocateUI);
  });

  /* ---------- 5) جابجایی با فرمت رسمی 3DVista ---------- */
  function goToScene(label, yaw, pitch, fov) {
    var hash = 'media-name=' + encodeURIComponent(label);
    if (typeof yaw === 'number') hash += '&yaw=' + yaw;
    // pitch رو همیشه ست می‌کنیم (پیش‌فرض ۰ = افقی) تا اگه کاربر قبلش سمت سقف/زمین نگاه می‌کرده، صحنه صاف بشه
    // نکته مهم: خود موتور تور با "parseFloat(pitch)||undefined" پردازش می‌کنه،
    // یعنی اگه pitch دقیقاً 0 باشه (falsy تو جاوااسکریپت) نادیده گرفته می‌شه.
    // برای همین به‌جای 0 خالص از یه مقدار خیلی کوچیک غیرصفر استفاده می‌کنیم.
    hash += '&pitch=' + (typeof pitch === 'number' && pitch !== 0 ? pitch : 0.1);
    if (typeof fov === 'number') hash += '&fov=' + fov;
    console.log('[SmartNav] hash ->', hash);
    window.location.hash = hash;
  }

  /* ---------- 6) اجرای مسیر گام‌به‌گام ---------- */
  var STEP_DELAY_MS = 3000;   // فاصله کلی بین رسیدن به یک صحنه و شروع قدم بعدی
  var ROTATE_WAIT_MS = 2200;  // چقدر صبر کنه تا چرخش دوربین سمت هات‌اسپات کامل بشه، قبل از پرش به صحنه بعد
  var navTimer = null, cancelled = false;

  var goBtn = panel.querySelector('#snav-go');
  var statusBox = panel.querySelector('#snav-status');
  var statusTxt = panel.querySelector('#snav-status-txt');
  var errBox = panel.querySelector('#snav-err');
  var cancelBtn = panel.querySelector('#snav-cancel');

  function runPath(result, toLabel) {
    cancelled = false;
    var steps = result.steps;
    var idx = 0;
    goBtn.disabled = true;
    errBox.style.display = 'none';
    statusBox.classList.add('show');

    function step() {
      if (cancelled) { finish(); return; }
      var s = steps[idx];

      // فاز ۱: تو همون صحنه‌ی فعلی (s.from) دوربین بچرخه سمت هات‌اسپاتی که به s.to می‌ره
      statusTxt.innerHTML = 'در حال چرخش به سمت هات‌اسپات… گام <b>' + (idx + 1) + '</b> از <b>' + steps.length + '</b>';
      navTimer = setTimeout(function () {
        if (typeof s.yaw === 'number') {
          goToScene(s.from, s.yaw, s.pitch, s.fov); // همون صحنه، فقط زاویه دوربین عوض می‌شه
        }

        // فاز ۲: بعد از چرخش، برو به صحنه بعدی
        navTimer = setTimeout(function () {
          statusTxt.innerHTML = 'در حال حرکت… گام <b>' + (idx + 1) + '</b> از <b>' + steps.length + '</b> (' + s.to + ')';
          goToScene(s.to);
          idx++;
          if (idx < steps.length) {
            navTimer = setTimeout(step, STEP_DELAY_MS);
          } else {
            statusTxt.innerHTML = 'رسیدید به مقصد: <b>' + toLabel + '</b> ✓';
            setTimeout(finish, 1400);
          }
        }, typeof s.yaw === 'number' ? ROTATE_WAIT_MS : 0);
      }, 200);
    }

    if (steps.length === 0) { finish(); return; }
    // برو به نقطه مبدا اول (بدون yaw خاص) بعد شروع کن
    goToScene(steps[0].from);
    setTimeout(step, 600);
  }

  function finish() {
    goBtn.disabled = false;
    clearTimeout(navTimer);
    setTimeout(function () { statusBox.classList.remove('show'); }, 800);
  }

  cancelBtn.addEventListener('click', function () {
    cancelled = true;
    clearTimeout(navTimer);
    statusTxt.textContent = 'مسیریابی متوقف شد.';
    setTimeout(finish, 900);
  });

  goBtn.addEventListener('click', function () {
    var fromLabel = panel.querySelector('#snav-from').value;
    var toLabel = panel.querySelector('#snav-to').value;
    errBox.style.display = 'none';

    if (!fromLabel || !toLabel) { showError('لطفاً مبدأ و مقصد را انتخاب کنید.'); return; }
    if (fromLabel === toLabel) { showError('مبدأ و مقصد نمی‌توانند یکسان باشند.'); return; }

    var result = dijkstra(fromLabel, toLabel);
    console.log('[SmartNav] path:', result);
    if (!result) { showError('مسیری بین این دو نقطه در گراف فعلی پیدا نشد.'); return; }

    runPath(result, toLabel);
  });

  function showError(msg) {
    errBox.textContent = msg;
    errBox.style.display = 'block';
  }

  window.SmartNav = { graph: GRAPH, dijkstra: dijkstra };
  console.log('[SmartNav] loaded. Scenes:', labels.length, labels);
})();
