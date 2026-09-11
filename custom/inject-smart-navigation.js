/* ============================================================
   inject-smart-navigation.js  (v31)
   مسیریابی هوشمند برای تور مجازی بیمارستان (3DVista)
   ============================================================ */
(function () {
  'use strict';

  if (window.SmartNav && window.SmartNav.__loaded) {
    console.warn('[SmartNav] already loaded, skipping second injection');
    return;
  }

  /* ============================================================
     0) تنظیمات
     ============================================================ */
  var CFG = {
    ROTATE_DEG_PER_SEC: 30,
    ROTATE_MIN_MS: 1800,
    ROTATE_MAX_MS: 6000,
    EASING: 'smootherstep',

    SETTLE_AFTER_LOAD_MS: 900,
    HOLD_BEFORE_JUMP_MS: 550,
    SCENE_LOAD_TIMEOUT_MS: 6000,
    SCENE_LOAD_FALLBACK_MS: 2200,
    HASH_ROTATE_WAIT_MS: 1600,

    AUTO_SELECT_CURRENT_SCENE: true,
    DEBUG: true
  };

  function log() { if (CFG.DEBUG && window.console) console.log.apply(console, ['[SmartNav]'].concat([].slice.call(arguments))); }
  function warn() { if (window.console) console.warn.apply(console, ['[SmartNav]'].concat([].slice.call(arguments))); }

  /* ============================================================
     1) گراف صحنه‌ها (گراف کامل بیمارستان)
     ============================================================ */
  var GRAPH = {
    "\u0628\u062e\u0634 \u062f\u0627\u062e\u0644\u06cc": [{ to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u062f\u0648\u0645", yaw: 32.33 }],
    "\u0631\u0627\u0647\u0631\u0648 \u0627\u062a\u0627\u0642 \u0639\u0645\u0644": [{ to: "\u0627\u062a\u0627\u0642 \u0639\u0645\u0644 (2)", yaw: 86.43 }, { to: "\u0631\u06cc\u06a9\u0627\u0648\u0631\u06cc", yaw: -166.92 }, { to: "\u0627\u062a\u0627\u0642 \u0639\u0645\u0644 (3)", yaw: 163.01 }, { to: "\u0627\u062a\u0627\u0642 \u0639\u0645\u0644 (1)", yaw: 9.58 }, { to: "\u0627\u062a\u0627\u0642 \u0639\u0645\u0644 (4)", yaw: 174.57 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u0627\u0648\u0644", yaw: -86.5 }],
    "\u0648\u0631\u0648\u062f\u06cc \u0627\u0648\u0631\u0698\u0627\u0646\u0633": [{ to: "\u062a\u0631\u06cc\u0627\u0698", yaw: -1.35 }, { to: "\u0648\u0631\u0648\u062f\u06cc \u0627\u0635\u0644\u06cc", yaw: 69.32 }],
    "\u0628\u062e\u0634 \u0646\u0648\u0631\u0648\u0644\u0648\u0698\u06cc": [{ to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u062f\u0648\u0645", yaw: -0.36 }],
    "\u0627\u062a\u0627\u0642 \u0628\u0627\u0632\u06cc": [{ to: "\u0628\u062e\u0634 \u0627\u0637\u0641\u0627\u0644", yaw: -78.52 }],
    "\u0646\u0645\u0627\u0632\u062e\u0627\u0646\u0647": [{ to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0647\u0645\u06a9\u0641", yaw: -1.43 }],
    "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u0633\u0648\u0645": [{ to: "\u0648\u0631\u0648\u062f\u06cc \u0628\u062e\u0634 \u0647\u0627", yaw: -99.1 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u062f\u0648\u0645", yaw: 1.53 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u0686\u0647\u0627\u0631\u0645", yaw: 1.6 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0647\u0645\u06a9\u0641", yaw: 1.34 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u0627\u0648\u0644", yaw: 1.66 }],
    "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u0686\u0647\u0627\u0631\u0645": [{ to: "\u0648\u0631\u0648\u062f\u06cc \u062c\u0631\u0627\u062d\u06cc", yaw: -97.36 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u0627\u0648\u0644", yaw: -1.33 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u0633\u0648\u0645", yaw: -1.18 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u062f\u0648\u0645", yaw: -0.94 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0647\u0645\u06a9\u0641", yaw: 0.16 }, { to: "\u0648\u0631\u0648\u062f\u06cc \u0627\u0637\u0641\u0627\u0644", yaw: 86.73 }],
    "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0647\u0645\u06a9\u0641": [{ to: "\u0646\u0645\u0627\u0632\u062e\u0627\u0646\u0647", yaw: 79.73 }, { to: "\u067e\u0630\u06cc\u0631\u06342", yaw: -92.75 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u0633\u0648\u0645", yaw: -4.74 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u062f\u0648\u0645", yaw: -4.61 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u0686\u0647\u0627\u0631\u0645", yaw: -4.66 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u0627\u0648\u0644", yaw: -4.91 }],
    "\u0622\u0632\u0645\u0627\u06cc\u0634\u06af\u0627\u0647": [{ to: "\u062f\u0631\u0645\u0627\u0646\u06af\u0627\u0647", yaw: 87.73 }],
    "\u062f\u0631\u0645\u0627\u0646\u06af\u0627\u0647": [{ to: "\u0648\u0631\u0648\u062f\u06cc \u0631\u0627\u062f\u06cc\u0648\u0644\u0648\u0698\u06cc", yaw: -3.96 }, { to: "\u0648\u0631\u0648\u062f\u06cc \u062f\u0631\u0645\u0627\u0646\u06af\u0627\u0647", yaw: 152.65 }, { to: "\u062f\u067e\u0627\u0631\u062a\u0645\u0627\u0646 \u0622\u0645\u0648\u0632\u0634\u06cc \u067e\u0698\u0648\u0647\u0634\u06cc", yaw: -85.85 }],
    "\u0637\u0628\u0642\u0647 \u0627\u0648\u0644": [{ to: "\u067e\u0630\u06cc\u0631\u0634 \u0627\u0645\u06cc\u062f", yaw: 92.06 }, { to: "\u0645\u0631\u0627\u0642\u0628\u062a \u0647\u0627\u06cc \u0648\u06cc\u0698\u0647 \u0642\u0644\u0628\u06cc", yaw: 140.67 }, { to: "\u0628\u062e\u0634 \u0645\u0631\u0627\u0642\u0628\u062a \u0647\u0627\u06cc \u0648\u06cc\u0698\u0647", yaw: 177.34 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u0627\u0648\u0644", yaw: -28.74 }],
    "\u0645\u0631\u0627\u0642\u0628\u062a \u0647\u0627\u06cc \u0648\u06cc\u0698\u0647 \u0642\u0644\u0628\u06cc": [{ to: "\u0637\u0628\u0642\u0647 \u0627\u0648\u0644", yaw: 144.3 }],
    "\u0648\u0631\u0648\u062f\u06cc \u062f\u0631\u0645\u0627\u0646\u06af\u0627\u0647": [{ to: "\u062f\u0631\u0645\u0627\u0646\u06af\u0627\u0647", yaw: 1.97 }, { to: "\u0648\u0631\u0648\u062f\u06cc \u0627\u0635\u0644\u06cc", yaw: -91.65 }],
    "\u0648\u0631\u0648\u062f\u06cc \u062c\u0631\u0627\u062d\u06cc": [{ to: "\u0628\u062e\u0634 \u062c\u0631\u0627\u062d\u06cc", yaw: 57.93 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u0686\u0647\u0627\u0631\u0645", yaw: -99.72 }],
    "\u067e\u0630\u06cc\u0631\u06342": [{ to: "\u067e\u0630\u06cc\u0631\u06341", yaw: -179.66 }, { to: "\u0631\u0627\u0647\u0646\u0645\u0627\u06cc \u062e\u0637\u0648\u0637", yaw: -1.79 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0647\u0645\u06a9\u0641", yaw: 39.5 }],
    "\u0628\u062e\u0634 \u062c\u0631\u0627\u062d\u06cc": [{ to: "\u0627\u062a\u0627\u0642 vip", yaw: -163.56 }, { to: "\u0648\u0631\u0648\u062f\u06cc \u062c\u0631\u0627\u062d\u06cc", yaw: 37.48 }],
    "\u0633\u0627\u06cc\u06a9\u0648\u0633\u0648\u0645\u0627\u062a\u06cc\u06a9": [{ to: "\u0648\u0631\u0648\u062f\u06cc \u0628\u062e\u0634 \u0647\u0627", yaw: 85.3 }],
    "\u0628\u062e\u0634 \u0645\u0631\u0627\u0642\u0628\u062a \u0647\u0627\u06cc \u0648\u06cc\u0698\u0647": [{ to: "\u0637\u0628\u0642\u0647 \u0627\u0648\u0644", yaw: -94.98 }],
    "\u0631\u0627\u062f\u06cc\u0648\u0644\u0648\u0698\u06cc": [{ to: "\u0633\u0648\u0646\u0648\u06af\u0631\u0627\u0641\u06cc", yaw: -42.31 }, { to: "\u0645\u0627\u0645\u0648\u06af\u0631\u0627\u0641\u06cc", yaw: -59.22 }, { to: "\u0631\u0627\u062f\u06cc\u0648\u06af\u0631\u0627\u0641\u06cc \u0633\u0627\u062f\u0647", yaw: -78.39 }, { to: "MRI", yaw: 61.02 }],
    "\u0648\u0631\u0648\u062f\u06cc \u0627\u0635\u0644\u06cc": [{ to: "\u067e\u0630\u06cc\u0631\u06341", yaw: 1.08 }, { to: "\u0648\u0631\u0648\u062f\u06cc \u0627\u0648\u0631\u0698\u0627\u0646\u0633", yaw: -61.35 }, { to: "\u0648\u0631\u0648\u062f\u06cc \u062f\u0631\u0645\u0627\u0646\u06af\u0627\u0647", yaw: 75.29 }],
    "\u0648\u0631\u0648\u062f\u06cc \u0631\u0627\u062f\u06cc\u0648\u0644\u0648\u0698\u06cc": [{ to: "\u0631\u0627\u062f\u06cc\u0648\u0644\u0648\u0698\u06cc", yaw: 0.11 }, { to: "\u0631\u0627\u0647\u0646\u0645\u0627\u06cc \u062e\u0637\u0648\u0637", yaw: -86.45 }],
    "\u0631\u0627\u0647\u0646\u0645\u0627\u06cc \u062e\u0637\u0648\u0637": [{ to: "\u067e\u0630\u06cc\u0631\u06342", yaw: -178.47 }, { to: "\u062a\u0631\u06cc\u0627\u0698", yaw: -100.28 }, { to: "\u0648\u0631\u0648\u062f\u06cc \u0631\u0627\u062f\u06cc\u0648\u0644\u0648\u0698\u06cc", yaw: 60.2 }],
    "\u067e\u0630\u06cc\u0631\u0634 \u0627\u0645\u06cc\u062f": [{ to: "\u0637\u0628\u0642\u0647 \u0627\u0648\u0644", yaw: -179.21 }, { to: "\u0645\u0639\u0627\u06cc\u0646\u0647 \u0632\u0646\u0627\u0646", yaw: 18.24 }, { to: "\u0622\u0632\u0645\u0627\u06cc\u0634\u06af\u0627\u0647 (\u06a9\u0644\u06cc\u0646\u06cc\u06a9 \u0627\u0645\u06cc\u062f)", yaw: -1.88 }],
    "\u0622\u0632\u0645\u0627\u06cc\u0634\u06af\u0627\u0647 (\u06a9\u0644\u06cc\u0646\u06cc\u06a9 \u0627\u0645\u06cc\u062f)": [{ to: "\u067e\u0630\u06cc\u0631\u0634 \u0627\u0645\u06cc\u062f", yaw: -169.79 }],
    "\u0631\u06cc\u06a9\u0627\u0648\u0631\u06cc": [{ to: "\u0631\u0627\u0647\u0631\u0648 \u0627\u062a\u0627\u0642 \u0639\u0645\u0644", yaw: -76.63 }],
    "\u0641\u06cc\u0632\u06cc\u0648\u062a\u0631\u0627\u067e\u06cc": [{ to: "\u0648\u0631\u0648\u062f\u06cc \u0628\u062e\u0634 \u0647\u0627", yaw: -177.57 }],
    "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u062f\u0648\u0645": [{ to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u0633\u0648\u0645", yaw: 1.83 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u0686\u0647\u0627\u0631\u0645", yaw: 2.1 }, { to: "\u0628\u062e\u0634 \u0646\u0648\u0631\u0648\u0644\u0648\u0698\u06cc", yaw: 94.26 }, { to: "\u0628\u062e\u0634 \u062f\u0627\u062e\u0644\u06cc", yaw: -102.49 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0647\u0645\u06a9\u0641", yaw: -1.04 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u0627\u0648\u0644", yaw: 2.29 }],
    "\u0627\u062a\u0627\u0642 \u0639\u0645\u0644 (3)": [{ to: "\u0631\u0627\u0647\u0631\u0648 \u0627\u062a\u0627\u0642 \u0639\u0645\u0644", yaw: 177.28 }],
    "\u0627\u062a\u0627\u0642 \u0639\u0645\u0644 (4)": [{ to: "\u0631\u0627\u0647\u0631\u0648 \u0627\u062a\u0627\u0642 \u0639\u0645\u0644", yaw: 178.54 }],
    "\u0627\u06cc\u0633\u062a\u06af\u0627\u0647 \u067e\u0631\u0633\u062a\u0627\u0631\u06cc \u0627\u0637\u0641\u0627\u0644": [{ to: "\u0645\u0631\u0627\u0642\u0628\u062a \u0647\u0627\u06cc \u0648\u06cc\u0698\u0647 \u06a9\u0648\u062f\u06a9\u0627\u0646", yaw: 66.1 }, { to: "\u0628\u062e\u0634 \u0627\u0637\u0641\u0627\u0644", yaw: -42.86 }],
    "\u0648\u0631\u0648\u062f\u06cc \u0627\u0637\u0641\u0627\u0644": [{ to: "\u0628\u062e\u0634 \u0627\u0637\u0641\u0627\u0644", yaw: -146.62 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u0686\u0647\u0627\u0631\u0645", yaw: -46.02 }, { to: "\u0645\u0631\u0627\u0642\u0628\u062a \u0647\u0627\u06cc \u0648\u06cc\u0698\u0647 \u06a9\u0648\u062f\u06a9\u0627\u0646", yaw: 128.78 }],
    "\u0645\u0631\u0627\u0642\u0628\u062a \u0647\u0627\u06cc \u0648\u06cc\u0698\u0647 \u06a9\u0648\u062f\u06a9\u0627\u0646": [{ to: "\u0627\u06cc\u0633\u062a\u06af\u0627\u0647 \u067e\u0631\u0633\u062a\u0627\u0631\u06cc \u0627\u0637\u0641\u0627\u0644", yaw: 2.14 }, { to: "\u0648\u0631\u0648\u062f\u06cc \u0627\u0637\u0641\u0627\u0644", yaw: 96.12 }],
    "\u0633\u0648\u0646\u0648\u06af\u0631\u0627\u0641\u06cc": [{ to: "\u0631\u0627\u062f\u06cc\u0648\u0644\u0648\u0698\u06cc", yaw: 124.09 }],
    "\u0633\u0627\u0644\u0646 \u0645\u0637\u0627\u0644\u0639\u0647": [{ to: "\u062f\u067e\u0627\u0631\u062a\u0645\u0627\u0646 \u0622\u0645\u0648\u0632\u0634\u06cc \u067e\u0698\u0648\u0647\u0634\u06cc", yaw: 148.53 }],
    "\u062a\u0631\u06cc\u0627\u0698": [{ to: "\u0628\u0633\u062a\u0631\u06cc \u0627\u0648\u0631\u0698\u0627\u0646\u0633", yaw: 87.42 }, { to: "\u0648\u0631\u0648\u062f\u06cc \u0627\u0648\u0631\u0698\u0627\u0646\u0633", yaw: -10.72 }, { to: "\u0631\u0627\u0647\u0646\u0645\u0627\u06cc \u062e\u0637\u0648\u0637", yaw: -151.25 }],
    "\u0627\u062a\u0627\u0642 vip": [{ to: "\u0628\u062e\u0634 \u062c\u0631\u0627\u062d\u06cc", yaw: 76.96 }],
    "\u067e\u0630\u06cc\u0631\u06341": [{ to: "\u067e\u0630\u06cc\u0631\u06342", yaw: -177.2 }, { to: "\u0648\u0631\u0648\u062f\u06cc \u0627\u0635\u0644\u06cc", yaw: -0.11 }],
    "\u0648\u0631\u0648\u062f\u06cc \u0628\u062e\u0634 \u0647\u0627": [{ to: "\u0633\u0627\u06cc\u06a9\u0648\u0633\u0648\u0645\u0627\u062a\u06cc\u06a9", yaw: -164.77 }, { to: "\u0641\u06cc\u0632\u06cc\u0648\u062a\u0631\u0627\u067e\u06cc", yaw: -19 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u0633\u0648\u0645", yaw: 84.65 }],
    "\u0631\u0627\u062f\u06cc\u0648\u06af\u0631\u0627\u0641\u06cc \u0633\u0627\u062f\u0647": [{ to: "\u0631\u0627\u062f\u06cc\u0648\u0644\u0648\u0698\u06cc", yaw: -69.96 }],
    "\u0631\u06af \u06af\u06cc\u0631\u06cc \u0627\u0637\u0641\u0627\u0644": [{ to: "\u0628\u062e\u0634 \u0627\u0637\u0641\u0627\u0644", yaw: 161.76 }],
    "\u0645\u0627\u0645\u0648\u06af\u0631\u0627\u0641\u06cc": [{ to: "\u0631\u0627\u062f\u06cc\u0648\u0644\u0648\u0698\u06cc", yaw: -72.16 }],
    "\u0628\u0633\u062a\u0631\u06cc \u0627\u0648\u0631\u0698\u0627\u0646\u0633": [{ to: "\u062a\u0631\u06cc\u0627\u0698", yaw: -20.07 }],
    "\u0627\u062a\u0627\u0642 \u0639\u0645\u0644 (2)": [{ to: "\u0631\u0627\u0647\u0631\u0648 \u0627\u062a\u0627\u0642 \u0639\u0645\u0644", yaw: 179.56 }],
    "MRI": [{ to: "\u0631\u0627\u062f\u06cc\u0648\u0644\u0648\u0698\u06cc", yaw: 160.58 }],
    "\u062f\u067e\u0627\u0631\u062a\u0645\u0627\u0646 \u0622\u0645\u0648\u0632\u0634\u06cc \u067e\u0698\u0648\u0647\u0634\u06cc": [{ to: "\u062f\u0631\u0645\u0627\u0646\u06af\u0627\u0647", yaw: 154.27 }, { to: "\u0633\u0627\u0644\u0646 \u0645\u0637\u0627\u0644\u0639\u0647", yaw: -2.07 }],
    "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u0627\u0648\u0644": [{ to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u0686\u0647\u0627\u0631\u0645", yaw: 0.89 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u0633\u0648\u0645", yaw: 0.85 }, { to: "\u0637\u0628\u0642\u0647 \u0627\u0648\u0644", yaw: 96.6 }, { to: "\u0631\u0627\u0647\u0631\u0648 \u0627\u062a\u0627\u0642 \u0639\u0645\u0644", yaw: -97.74 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0637\u0628\u0642\u0647 \u062f\u0648\u0645", yaw: 0.99 }, { to: "\u0622\u0633\u0627\u0646\u0633\u0648\u0631 \u0647\u0645\u06a9\u0641", yaw: 1.09 }],
    "\u0628\u062e\u0634 \u0627\u0637\u0641\u0627\u0644": [{ to: "\u0627\u06cc\u0633\u062a\u06af\u0627\u0647 \u067e\u0631\u0633\u062a\u0627\u0631\u06cc \u0627\u0637\u0641\u0627\u0644", yaw: 45.7 }, { to: "\u0627\u062a\u0627\u0642 \u0628\u0627\u0632\u06cc", yaw: 130.63 }, { to: "\u0631\u06af \u06af\u06cc\u0631\u06cc \u0627\u0637\u0641\u0627\u0644", yaw: -22.4 }, { to: "\u0648\u0631\u0648\u062f\u06cc \u0627\u0637\u0641\u0627\u0644", yaw: -38.44 }],
    "\u0627\u062a\u0627\u0642 \u0639\u0645\u0644 (1)": [{ to: "\u0631\u0627\u0647\u0631\u0648 \u0627\u062a\u0627\u0642 \u0639\u0645\u0644", yaw: 176.13 }],
    "\u0645\u0639\u0627\u06cc\u0646\u0647 \u0632\u0646\u0627\u0646": [{ to: "\u067e\u0630\u06cc\u0631\u0634 \u0627\u0645\u06cc\u062f", yaw: -5.16 }]
  };

  /* دوطرفه‌کردن گراف + گزارش یال‌های بدون yaw */
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
        if (typeof edge.yaw !== 'number') missing.push(from + ' \u2192 ' + edge.to + (edge._auto ? ' (\u062e\u0648\u062f\u06a9\u0627\u0631)' : ''));
      });
    });
    if (missing.length) warn('yaw \u0646\u062f\u0627\u0631\u0646\u062f:\n  ' + missing.join('\n  '));
  })();

  /* ============================================================
     2) Dijkstra
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
     3) دسترسی به موتور 3DVista
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
    try {
      var m2 = window.location.hash.match(/media-name=([^&]+)/);
      if (m2) return decodeURIComponent(m2[1]);
    } catch (e) {}
    return null;
  }

  /* ============================================================
     4) جابجایی با hash
     ============================================================ */
  function goToScene(label, yaw, pitch, fov) {
    var hash = 'media-name=' + encodeURIComponent(label);
    if (typeof yaw === 'number') {
      hash += '&yaw=' + yaw.toFixed(2);
      hash += '&pitch=' + ((typeof pitch === 'number' && pitch !== 0) ? pitch.toFixed(2) : '0.1');
      if (typeof fov === 'number') hash += '&fov=' + fov.toFixed(2);
    }
    log('hash ->', hash);
    if (window.location.hash === '#' + hash) {
      try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) { window.location.hash = ''; }
    }
    window.location.hash = hash;
  }

  /* ============================================================
     5) چرخش نرم دوربین
     ============================================================ */
  var EASINGS = {
    smootherstep:  function (t) { return t * t * t * (t * (t * 6 - 15) + 10); },
    easeInOutSine: function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; },
    easeInOutCubic:function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  };
  function ease(t) { return (EASINGS[CFG.EASING] || EASINGS.smootherstep)(Math.max(0, Math.min(1, t))); }
  function shortestYawDelta(from, to) { return ((to - from + 540) % 360) - 180; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function rotationDuration(deltaYaw, deltaPitch) {
    var ang = Math.max(Math.abs(deltaYaw), Math.abs(deltaPitch));
    return clamp((ang / CFG.ROTATE_DEG_PER_SEC) * 1000, CFG.ROTATE_MIN_MS, CFG.ROTATE_MAX_MS);
  }

  function readCam(player) {
    var yaw = player.get('yaw');
    var pitch = player.get('pitch');
    if (typeof yaw !== 'number' || typeof pitch !== 'number') throw new Error('non-number yaw/pitch');
    var roll = player.get('roll');
    var hfov = player.get('hfov');
    return {
      yaw: yaw,
      pitch: pitch,
      roll: typeof roll === 'number' ? roll : 0,
      hfov: typeof hfov === 'number' ? hfov : 90
    };
  }

  function applyCam(ctx, yaw, pitch, st) {
    ctx.player.setPosition(yaw, pitch, st.roll || 0, st.hfov || 90);
  }

  function getCamCtx() {
    return { player: getActivePanoramaPlayer() };
  }

  var cameraStrategy = undefined;

  function smoothRotate(targetYaw, targetPitch, token, callback) {
    var ctx = getCamCtx();
    if (!ctx.player || typeof ctx.player.get !== 'function') {
      warn('no player accessible'); cameraStrategy = null; callback(false); return;
    }

    var st;
    try { st = readCam(ctx.player); }
    catch (e) { warn('read player failed:', e); cameraStrategy = null; callback(false); return; }

    var toPitch = typeof targetPitch === 'number' ? targetPitch : st.pitch;
    var dYaw = shortestYawDelta(st.yaw, targetYaw);
    var dPitch = toPitch - st.pitch;
    var duration = rotationDuration(dYaw, dPitch);

    if (Math.abs(dYaw) < 0.5 && Math.abs(dPitch) < 0.5) { callback(true); return; }

    var startTs = null;
    cameraStrategy = 'player.setPosition';
    log('rotate', st.yaw.toFixed(1) + '\u00b0 \u2192 ' + targetYaw.toFixed(1) + '\u00b0', '(' + Math.round(duration) + 'ms)');

    function frame(ts) {
      if (!token.alive) { callback(true); return; }
      if (startTs === null) startTs = ts;
      var t = Math.min(1, (ts - startTs) / duration);
      var k = ease(t);
      try { applyCam(ctx, st.yaw + dYaw * k, st.pitch + dPitch * k, st); }
      catch (e) { warn('setPosition threw:', e); callback(false); return; }
      if (t < 1) requestAnimationFrame(frame); else callback(true);
    }
    requestAnimationFrame(frame);
  }

  function waitForScene(label, token, callback) {
    if (getCurrentSceneLabel() === null) { schedule(token, callback, CFG.SCENE_LOAD_FALLBACK_MS); return; }
    var started = Date.now();
    (function poll() {
      if (!token.alive) return;
      var cur = getCurrentSceneLabel();
      if (cur === label) { schedule(token, callback, 250); return; }
      if (Date.now() - started > CFG.SCENE_LOAD_TIMEOUT_MS) { warn('scene load timeout:', label, '(current:', cur + ')'); callback(); return; }
      schedule(token, poll, 120);
    })();
  }

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
    + '#snav-btn{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:2147483647;'
    + 'padding:8px 14px;border-radius:999px;border:1px solid rgba(212,175,55,.35);'
    + 'background:linear-gradient(160deg,rgba(11,31,36,.92),rgba(15,46,52,.88));backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);'
    + 'display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;white-space:nowrap;'
    + 'font-family:"Vazirmatn",sans-serif;font-size:12px;font-weight:600;color:#e8f4f2;letter-spacing:.2px;'
    + 'box-shadow:0 8px 24px rgba(0,0,0,.35),inset 0 0 0 1px rgba(45,212,191,.08);transition:transform .25s ease,box-shadow .25s ease;'
    + 'user-select:none;-webkit-tap-highlight-color:transparent;}'
    + '#snav-btn:hover{transform:translateX(-50%) translateY(2px);box-shadow:0 4px 16px rgba(0,0,0,.4);}'
    + '#snav-btn:focus-visible{outline:2px solid #2dd4bf;outline-offset:2px;}'
    + '#snav-btn .ico{width:13px;height:13px;flex-shrink:0;}'
    + '#snav-panel{position:fixed;top:0;left:50%;transform:translateX(-50%) translateY(-130%);'
    + 'width:min(360px,calc(100vw - 24px));max-width:calc(100vw - 24px);z-index:2147483647;'
    + 'margin-top:calc(62px + env(safe-area-inset-top,0px));border-radius:18px;'
    + 'padding:16px 14px 14px;box-sizing:border-box;'
    + 'background:linear-gradient(165deg,rgba(9,25,29,.96),rgba(13,41,46,.94));'
    + 'border:1px solid rgba(212,175,55,.25);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);'
    + 'box-shadow:0 20px 60px rgba(0,0,0,.5),inset 0 0 0 1px rgba(45,212,191,.06);'
    + 'font-family:"Vazirmatn",sans-serif;direction:rtl;transition:transform .4s cubic-bezier(.22,1,.36,1);'
    + 'max-height:calc(100vh - 90px);overflow-y:auto;visibility:hidden;}'
    + '#snav-panel.open{transform:translateX(-50%) translateY(0);visibility:visible;}'
    + '#snav-panel h3{margin:0 0 12px;font-size:13px;font-weight:700;color:#e8f4f2;letter-spacing:.2px;display:flex;align-items:center;gap:6px;}'
    + '#snav-panel h3 .dot{width:5px;height:5px;border-radius:50%;background:#d4af37;box-shadow:0 0 8px #d4af37;flex-shrink:0;}'
    + '.snav-field{margin-bottom:10px;}'
    + '.snav-field .lbl{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}'
    + '.snav-field label{font-size:10.5px;color:#8fb5b0;font-weight:500;}'
    + '.snav-link{background:none;border:none;color:#2dd4bf;font-family:"Vazirmatn",sans-serif;font-size:10px;cursor:pointer;padding:0;-webkit-tap-highlight-color:transparent;}'
    + '.snav-link:hover{text-decoration:underline;}'
    + '.snav-field select{width:100%;box-sizing:border-box;padding:9px 12px;border-radius:10px;'
    + 'border:1px solid rgba(45,212,191,.2);background-color:#0d2226;color:#eaf6f4;'
    + 'font-family:"Vazirmatn",sans-serif;font-size:12.5px;outline:none;appearance:none;-webkit-appearance:none;cursor:pointer;'
    + 'background-image:url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8"><path d="M1 1l5 5 5-5" stroke="%232dd4bf" stroke-width="1.6" fill="none"/></svg>\');'
    + 'background-repeat:no-repeat;background-position:12px center;padding-left:28px;transition:border-color .2s;}'
    + '.snav-field select:focus{border-color:#2dd4bf;}'
    + '.snav-field select option{background-color:#0d2226;color:#eaf6f4;}'
    + '#snav-go{width:100%;margin-top:4px;padding:11px;border:none;border-radius:10px;cursor:pointer;'
    + 'background:linear-gradient(120deg,#2dd4bf,#1a8f82);color:#06201d;font-family:"Vazirmatn",sans-serif;'
    + 'font-weight:700;font-size:13px;transition:filter .2s,transform .15s;-webkit-tap-highlight-color:transparent;}'
    + '#snav-go:hover{filter:brightness(1.08);}'
    + '#snav-go:active{transform:scale(.98);}'
    + '#snav-go:disabled{opacity:.5;cursor:not-allowed;}'
    + '#snav-status{margin-top:10px;padding:9px 11px;border-radius:10px;background:rgba(212,175,55,.08);'
    + 'border:1px solid rgba(212,175,55,.2);font-size:11px;color:#f0dfa8;display:none;align-items:center;justify-content:space-between;gap:8px;}'
    + '#snav-status.show{display:flex;}'
    + '#snav-status .txt{flex:1;line-height:1.6;}'
    + '#snav-status b{font-family:"JetBrains Mono",monospace;color:#ffe9a8;}'
    + '#snav-progress{height:3px;border-radius:2px;background:rgba(212,175,55,.15);margin-top:6px;overflow:hidden;}'
    + '#snav-progress i{display:block;height:100%;width:0;background:linear-gradient(90deg,#d4af37,#2dd4bf);transition:width .6s ease;}'
    + '#snav-cancel{border:none;background:rgba(255,90,90,.15);color:#ff9d9d;border-radius:8px;'
    + 'padding:6px 10px;font-family:"Vazirmatn",sans-serif;font-size:10.5px;cursor:pointer;white-space:nowrap;-webkit-tap-highlight-color:transparent;}'
    + '#snav-err{margin-top:8px;font-size:11px;color:#ff8f8f;display:none;}'
    + '#snav-close{position:absolute;top:12px;left:14px;background:none;border:none;color:#7fa8a2;font-size:18px;cursor:pointer;line-height:1;padding:4px;-webkit-tap-highlight-color:transparent;}'
    + '@media (max-width:480px){'
    + '#snav-btn{font-size:11.5px;padding:7px 12px;}'
    + '#snav-btn .ico{width:12px;height:12px;}'
    + '#snav-panel{padding:14px 12px 12px;border-radius:16px;width:calc(100vw - 20px);max-width:calc(100vw - 20px);}'
    + '#snav-panel h3{font-size:12.5px;margin-bottom:10px;}'
    + '.snav-field select{font-size:13px;padding:9px 11px;padding-left:26px;}'
    + '#snav-go{font-size:13px;padding:11px;}'
    + '#snav-status{font-size:10.5px;padding:8px 10px;}'
    + '}'
    + '@media (max-height:600px){'
    + '#snav-panel{max-height:calc(100vh - 70px);padding:12px 10px 10px;margin-top:calc(56px + env(safe-area-inset-top,0px));}'
    + '.snav-field{margin-bottom:8px;}'
    + '#snav-panel h3{margin-bottom:8px;font-size:12px;}'
    + '.snav-field select{padding:7px 10px;padding-left:24px;font-size:12px;}'
    + '#snav-go{padding:9px;font-size:12.5px;}'
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
  btn.title = '\u0645\u0633\u06cc\u0631\u06cc\u0627\u0628\u06cc \u0647\u0648\u0634\u0645\u0646\u062f';
  btn.innerHTML = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg><span>\u0645\u0633\u06cc\u0631\u06cc\u0627\u0628\u06cc \u0647\u0648\u0634\u0645\u0646\u062f</span>';
  document.body.appendChild(btn);

  var panel = document.createElement('div');
  panel.id = 'snav-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', '\u0645\u0633\u06cc\u0631\u06cc\u0627\u0628\u06cc \u0647\u0648\u0634\u0645\u0646\u062f \u062a\u0648\u0631');
  panel.innerHTML =
    '<button id="snav-close" type="button" aria-label="\u0628\u0633\u062a\u0646">&times;</button>' +
    '<h3><span class="dot"></span>\u0645\u0633\u06cc\u0631\u06cc\u0627\u0628\u06cc \u0647\u0648\u0634\u0645\u0646\u062f \u062a\u0648\u0631</h3>' +
    '<div class="snav-field"><div class="lbl"><label for="snav-from">\u0645\u0628\u062f\u0623</label>' +
      '<button type="button" class="snav-link" id="snav-here">\u0645\u0648\u0642\u0639\u06cc\u062a \u0641\u0639\u0644\u06cc \u0645\u0646</button></div>' +
      '<select id="snav-from">' + optionsHtml + '</select></div>' +
    '<div class="snav-field"><div class="lbl"><label for="snav-to">\u0645\u0642\u0635\u062f</label></div><select id="snav-to">' + optionsHtml + '</select></div>' +
    '<button id="snav-go" type="button">\u0634\u0631\u0648\u0639 \u0645\u0633\u06cc\u0631\u06cc\u0627\u0628\u06cc</button>' +
    '<div id="snav-err" role="alert"></div>' +
    '<div id="snav-status" aria-live="polite"><div class="txt"><div id="snav-status-txt"></div><div id="snav-progress"><i></i></div></div>' +
      '<button id="snav-cancel" type="button">\u062a\u0648\u0642\u0641</button></div>';
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
    if (!silent) showError(cur ? ('\u0635\u062d\u0646\u0647\u0654 \u0641\u0639\u0644\u06cc \u00ab' + cur + '\u00bb \u062f\u0631 \u06af\u0631\u0627\u0641 \u0646\u06cc\u0633\u062a.') : '\u062a\u0634\u062e\u06cc\u0635 \u0635\u062d\u0646\u0647 \u0645\u0645\u06a9\u0646 \u0646\u0628\u0648\u062f.');
    return false;
  }

  btn.addEventListener('click', function () { setPanelOpen(!panel.classList.contains('open')); });
  panel.querySelector('#snav-close').addEventListener('click', function () { setPanelOpen(false); });
  hereBtn.addEventListener('click', function () { selectCurrentScene(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('open')) setPanelOpen(false); });

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
     8) اجرای مسیر
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
    setStatus('\u062f\u0631 \u062d\u0627\u0644 \u0622\u0645\u0627\u062f\u0647\u200c\u0633\u0627\u0632\u06cc \u0645\u0633\u06cc\u0631\u2026', 0);

    function finish(msg) {
      if (msg) setStatus(msg, 1);
      killToken(token);
      if (activeToken === token) activeToken = null;
      goBtn.disabled = false;
      setTimeout(function () { if (activeToken === null) statusBox.classList.remove('show'); }, msg ? 1600 : 400);
    }

    function stepAt(idx) {
      if (!token.alive) return;
      if (idx >= total) { finish('\u0631\u0633\u06cc\u062f\u06cc\u062f \u0628\u0647 \u0645\u0642\u0635\u062f: <b>' + escapeHtml(toLabel) + '</b> \u2713'); return; }
      var s = steps[idx];
      var frac = idx / total;

      schedule(token, function () {
        if (typeof s.yaw !== 'number') { jump(); return; }
        setStatus('\u06af\u0627\u0645 <b>' + (idx + 1) + '</b> \u0627\u0632 <b>' + total + '</b> \u2014 \u0686\u0631\u062e\u0634 \u0628\u0647 \u0633\u0645\u062a \u00ab' + escapeHtml(s.to) + '\u00bb', frac + 0.3 / total);
        smoothRotate(s.yaw, s.pitch, token, function (ok) {
          if (!token.alive) return;
          if (ok) { schedule(token, jump, CFG.HOLD_BEFORE_JUMP_MS); return; }
          goToScene(s.from, s.yaw, s.pitch, s.fov);
          schedule(token, jump, CFG.HASH_ROTATE_WAIT_MS);
        });
      }, CFG.SETTLE_AFTER_LOAD_MS);

      function jump() {
        if (!token.alive) return;
        setStatus('\u06af\u0627\u0645 <b>' + (idx + 1) + '</b> \u0627\u0632 <b>' + total + '</b> \u2014 \u062d\u0631\u06a9\u062a \u0628\u0647 \u00ab' + escapeHtml(s.to) + '\u00bb', frac + 0.8 / total);
        goToScene(s.to);
        waitForScene(s.to, token, function () { stepAt(idx + 1); });
      }
    }

    var first = steps[0].from;
    if (getCurrentSceneLabel() === first) { stepAt(0); }
    else { goToScene(first); waitForScene(first, token, function () { stepAt(0); }); }
  }

  cancelBtn.addEventListener('click', function () {
    if (!activeToken) return;
    var t = activeToken;
    killToken(t); activeToken = null;
    setStatus('\u0645\u0633\u06cc\u0631\u06cc\u0627\u0628\u06cc \u0645\u062a\u0648\u0642\u0641 \u0634\u062f.');
    goBtn.disabled = false;
    setTimeout(function () { if (activeToken === null) statusBox.classList.remove('show'); }, 1200);
  });

  goBtn.addEventListener('click', function () {
    var fromLabel = fromSel.value, toLabel = toSel.value;
    errBox.style.display = 'none';
    if (!fromLabel || !toLabel) { showError('\u0644\u0637\u0641\u0627\u064b \u0645\u0628\u062f\u0623 \u0648 \u0645\u0642\u0635\u062f \u0631\u0627 \u0627\u0646\u062a\u062e\u0627\u0628 \u06a9\u0646\u06cc\u062f.'); return; }
    if (fromLabel === toLabel) { showError('\u0645\u0628\u062f\u0623 \u0648 \u0645\u0642\u0635\u062f \u0646\u0645\u06cc\u200c\u062a\u0648\u0627\u0646\u0646\u062f \u06cc\u06a9\u0633\u0627\u0646 \u0628\u0627\u0634\u0646\u062f.'); return; }
    var result = dijkstra(fromLabel, toLabel);
    log('path:', result);
    if (!result) { showError('\u0645\u0633\u06cc\u0631\u06cc \u067e\u06cc\u062f\u0627 \u0646\u0634\u062f.'); return; }
    runPath(result, toLabel);
  });

  /* ============================================================
     9) API عمومی
     ============================================================ */
  window.SmartNav = {
    __loaded: true,
    config: CFG,
    graph: GRAPH,
    dijkstra: dijkstra,
    navigate: function (from, to) {
      var r = dijkstra(from, to);
      if (!r) { warn('no path', from, '\u2192', to); return false; }
      fromSel.value = from; toSel.value = to; setPanelOpen(true); runPath(r, to); return true;
    },
    stop: function () { cancelBtn.click(); },
    currentScene: getCurrentSceneLabel,
    player: getActivePanoramaPlayer,
    rotateTo: function (yaw, pitch) {
      smoothRotate(yaw, pitch, newToken(), function (ok) { log('rotateTo done, ok =', ok); });
    },
    resetStrategy: function () { cameraStrategy = undefined; },
    get strategy() { return cameraStrategy; },
    diag: function () {
      var root = getRootPlayer(), ctx = getCamCtx(), cam = {};
      if (ctx.player) { try { cam = readCam(ctx.player); } catch (e) { cam = { error: String(e) }; } }
      var d = {
        version: 'v31',
        tourFound: !!window.tour,
        rootPlayer: !!root,
        panoramaPlayer: !!ctx.player,
        playerHas: ctx.player ? ['setPosition', 'moveTo', 'get', 'set'].filter(function (m) { return typeof ctx.player[m] === 'function'; }) : [],
        cameraState: cam,
        currentScene: getCurrentSceneLabel(),
        strategy: cameraStrategy === undefined ? '(not tested yet)' : cameraStrategy,
        scenesCount: Object.keys(GRAPH).length
      };
      console.log('[SmartNav] diag:', JSON.stringify(d, null, 2));
      return d;
    }
  };
  log('loaded v31. scenes:', labels.length, '| current scene:', getCurrentSceneLabel());
})();