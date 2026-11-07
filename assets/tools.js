/* ===========================================================
   顺手工具箱 — 工具逻辑（原生 JS，零依赖）
   每个工具在 <body data-tool="slug"> 时按需初始化
   =========================================================== */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var on = function (el, ev, fn) { if (el) el.addEventListener(ev, fn); };
  function msg(el, text, kind) {
    if (!el) return;
    el.textContent = text || "";
    el.className = kind === "bad" ? "err" : kind === "ok" ? "ok" : "hint";
  }
  function out(el, text) { if (el) el.textContent = text; }
  function copyBtn(btn, getText) {
    on(btn, "click", function () {
      var t = typeof getText === "function" ? getText() : getText;
      if (!t) { alert("还没有内容可复制"); return; }
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject())
        .then(function () { flash(btn, "已复制"); })
        .catch(function () {
          var ta = document.createElement("textarea");
          ta.value = t; document.body.appendChild(ta); ta.select();
          try { document.execCommand("copy"); flash(btn, "已复制"); } catch (e) { flash(btn, "复制失败"); }
          document.body.removeChild(ta);
        });
    });
  }
  function flash(btn, t) {
    var old = btn.textContent;
    btn.textContent = t;
    setTimeout(function () { btn.textContent = old; }, 1200);
  }

  var TOOLS = {};

  /* ---------------- 1. JSON 格式化 ---------------- */
  TOOLS.json = function () {
    var input = $("json-in"), outEl = $("json-out"), m = $("json-msg");
    function run(mode) {
      var t = input.value.trim();
      if (!t) { out(outEl, ""); msg(m, "", "hint"); return; }
      try {
        var v = JSON.parse(t);
        var s = mode === "min" ? JSON.stringify(v)
              : mode === "sort" ? JSON.stringify(sortKeys(v), null, 2)
              : JSON.stringify(v, null, 2);
        out(outEl, s);
        var kb = (new Blob([s]).size / 1024).toFixed(1);
        msg(m, "✅ 合法 JSON ｜ " + countNodes(v) + " 个节点 ｜ 输出 " + kb + " KB", "ok");
      } catch (e) {
        out(outEl, "");
        var pos = /position (\d+)/.exec(e.message);
        var extra = "";
        if (pos) {
          var idx = +pos[1], before = t.slice(0, idx);
          var line = before.split("\n").length, col = idx - before.lastIndexOf("\n");
          extra = "（第 " + line + " 行第 " + col + " 列）";
        }
        msg(m, "❌ " + e.message.replace(/^JSON\.parse: /, "") + extra, "bad");
      }
    }
    function sortKeys(v) {
      if (Array.isArray(v)) return v.map(sortKeys);
      if (v && typeof v === "object") {
        var o = {};
        Object.keys(v).sort().forEach(function (k) { o[k] = sortKeys(v[k]); });
        return o;
      }
      return v;
    }
    function countNodes(v) {
      if (v && typeof v === "object") {
        return 1 + Object.keys(v).reduce(function (a, k) { return a + countNodes(v[k]); }, 0);
      }
      return 1;
    }
    on($("json-fmt"), "click", function () { run("pretty"); });
    on($("json-min"), "click", function () { run("min"); });
    on($("json-sort"), "click", function () { run("sort"); });
    on($("json-check"), "click", function () { run("pretty"); });
    copyBtn($("json-copy"), function () { return outEl.textContent; });
    on(input, "keydown", function (e) {
      if (e.key === "Tab") { e.preventDefault(); var s = this.selectionStart; this.value = this.value.slice(0, s) + "  " + this.value.slice(this.selectionEnd); this.selectionStart = this.selectionEnd = s + 2; }
    });
  };

  /* ---------------- 2. 时间戳转换 ---------------- */
  TOOLS.timestamp = function () {
    var input = $("ts-in"), unit = $("ts-unit"), res = $("ts-out"), m = $("ts-msg"), nowEl = $("ts-now");
    function pad(n) { return n < 10 ? "0" + n : "" + n; }
    function fmt(d) {
      var off = -d.getTimezoneOffset() / 60;
      return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " +
        pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()) +
        " (UTC" + (off >= 0 ? "+" : "") + off + " " + (Intl.DateTimeFormat().resolvedOptions().timeZone || "本地") + ")";
    }
    function tick() {
      var ms = Date.now();
      if (nowEl) nowEl.textContent = Math.floor(ms / 1000) + " / " + ms;
    }
    tick(); setInterval(tick, 1000);

    function run() {
      var raw = input.value.trim();
      if (!raw) { out(res, ""); msg(m, "输入一个时间戳或日期时间", "hint"); return; }
      var d = null, note = "";
      if (/^\d{9,13}$/.test(raw)) {
        var n = +raw;
        var isMs = unit.value === "ms" || raw.length === 13;
        d = new Date(isMs ? n : n * 1000);
        note = isMs ? "按毫秒解析" : "按秒解析";
      } else {
        var s = raw.replace(/\//g, "-").replace("T", " ");
        d = new Date(s);
        note = "按日期字符串解析";
      }
      if (!d || isNaN(d.getTime())) { out(res, ""); msg(m, "❌ 无法识别，支持：1712345678 / 1712345678000 / 2026-11-07 15:30:00", "bad"); return; }
      var sec = Math.floor(d.getTime() / 1000);
      out(res, [
        "本地时间：" + fmt(d),
        "ISO 8601：" + d.toISOString(),
        "秒级时间戳：" + sec,
        "毫秒时间戳：" + d.getTime(),
        "UTC 时间：" + d.toUTCString(),
        "距现在：" + humanize(sec * 1000 - Date.now())
      ].join("\n"));
      msg(m, "✅ " + note, "ok");
    }
    function humanize(diff) {
      var abs = Math.abs(diff), unit2 = diff < 0 ? "前" : "后";
      var d1 = Math.floor(abs / 86400000), h = Math.floor(abs % 86400000 / 3600000), mi = Math.floor(abs % 3600000 / 60000);
      if (d1 > 0) return d1 + " 天" + h + " 小时" + unit2;
      if (h > 0) return h + " 小时" + mi + " 分钟" + unit2;
      return mi + " 分钟" + unit2;
    }
    on($("ts-run"), "click", run);
    on($("ts-nowfill"), "click", function () { input.value = Math.floor(Date.now() / 1000) + ""; unit.value = "s"; run(); });
    copyBtn($("ts-copy"), function () { return res.textContent; });
    on(input, "keydown", function (e) { if (e.key === "Enter") run(); });
  };

  /* ---------------- 3. Base64 / URL 编解码 ---------------- */
  TOOLS.base64 = function () {
    var input = $("b64-in"), mode = $("b64-mode"), res = $("b64-out"), m = $("b64-msg");
    function run() {
      var t = input.value;
      if (!t) { out(res, ""); msg(m, "", "hint"); return; }
      try {
        var r;
        switch (mode.value) {
          case "enc":
            r = btoa(String.fromCharCode.apply(null, new TextEncoder().encode(t)));
            msg(m, "✅ UTF-8 → Base64（含中文安全）", "ok"); break;
          case "dec":
            var bin = atob(t.replace(/\s+/g, ""));
            var bytes = new Uint8Array(bin.length);
            for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            r = new TextDecoder().decode(bytes);
            msg(m, "✅ Base64 → UTF-8", "ok"); break;
          case "url":
            r = encodeURIComponent(t); msg(m, "✅ URL 编码完成", "ok"); break;
          default:
            r = decodeURIComponent(t); msg(m, "✅ URL 解码完成", "ok");
        }
        out(res, r);
      } catch (e) {
        out(res, "");
        msg(m, "❌ 解码失败：" + (mode.value === "dec" ? "不是合法的 Base64（检查是否缺字符或掺了非 Base64 字符）" : "URL 编码串不完整，例如出现孤立的 %"), "bad");
      }
    }
    on($("b64-run"), "click", run);
    on($("b64-swap"), "click", function () { input.value = res.textContent; mode.value = mode.value === "enc" ? "dec" : mode.value === "dec" ? "enc" : mode.value === "url" ? "urldec" : "url"; run(); });
    copyBtn($("b64-copy"), function () { return res.textContent; });
    on(mode, "change", function () { if (input.value) run(); });
  };

  /* ---------------- 4. 命名/大小写转换 ---------------- */
  TOOLS.case = function () {
    var input = $("case-in"), mode = $("case-mode"), res = $("case-out"), m = $("case-msg");
    function words(s) {
      return s
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
        .split(/[\s_\-\.\/]+/)
        .filter(Boolean);
    }
    function run() {
      var t = input.value;
      if (!t.trim()) { out(res, ""); msg(m, "", "hint"); return; }
      var w = words(t), r;
      switch (mode.value) {
        case "camel": r = w.map(function (x, i) { return i ? cap(x) : x.toLowerCase(); }).join(""); break;
        case "pascal": r = w.map(cap).join(""); break;
        case "snake": r = w.map(function (x) { return x.toLowerCase(); }).join("_"); break;
        case "kebab": r = w.map(function (x) { return x.toLowerCase(); }).join("-"); break;
        case "const": r = w.map(function (x) { return x.toUpperCase(); }).join("_"); break;
        case "upper": r = t.toUpperCase(); break;
        case "lower": r = t.toLowerCase(); break;
        case "title": r = w.map(cap).join(" "); break;
        case "sentence": r = t.toLowerCase().replace(/(^\s*\w|[\.\!\?]\s*\w)/g, function (c) { return c.toUpperCase(); }); break;
        default: r = t;
      }
      out(res, r);
      msg(m, "✅ 识别到 " + w.length + " 个词", "ok");
    }
    function cap(x) { return x.charAt(0).toUpperCase() + x.slice(1).toLowerCase(); }
    on($("case-run"), "click", run);
    on(mode, "change", function () { if (input.value) run(); });
    on(input, "input", run);
    copyBtn($("case-copy"), function () { return res.textContent; });
  };

  /* ---------------- 5. 颜色转换 ---------------- */
  TOOLS.color = function () {
    var input = $("color-in"), picker = $("color-pick"), res = $("color-out"), prev = $("color-preview"), m = $("color-msg");
    function parse(s) {
      s = s.trim().toLowerCase();
      var m1;
      if ((m1 = /^#?([0-9a-f]{3})$/.exec(s))) {
        return [0, 1, 2].map(function (i) { return parseInt(m1[1][i] + m1[1][i], 16); });
      }
      if ((m1 = /^#?([0-9a-f]{6})$/.exec(s))) {
        return [0, 2, 4].map(function (i) { return parseInt(m1[1].substr(i, 2), 16); });
      }
      if ((m1 = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(s))) {
        return [+m1[1], +m1[2], +m1[3]];
      }
      if ((m1 = /^hsl\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%/.exec(s))) {
        return hsl2rgb(+m1[1], +m1[2] / 100, +m1[3] / 100);
      }
      return null;
    }
    function hsl2rgb(h, s, l) {
      h = ((h % 360) + 360) % 360 / 360;
      var r, g, b;
      if (s === 0) { r = g = b = l; }
      else {
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3);
      }
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    function rgb2hsl(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      var max = Math.max(r, g, b), min = Math.min(r, g, b), h = 0, s = 0, l = (max + min) / 2;
      var d = max - min;
      if (d) {
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
      }
      return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
    }
    function hex(rgb) {
      return "#" + rgb.map(function (x) { var s = x.toString(16); return s.length === 1 ? "0" + s : s; }).join("");
    }
    function luminance(rgb) {
      var a = rgb.map(function (v) {
        v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }
    function contrast(rgb) {
      var l = luminance(rgb);
      var white = 1.05 / (l + 0.05), black = (l + 0.05) / 0.05;
      return { onWhite: white, onBlack: black };
    }
    function run(fromPicker) {
      var s = fromPicker ? picker.value : input.value;
      var rgb = parse(s);
      if (!rgb) { out(res, ""); msg(m, "❌ 无法识别，支持 #1a6ef5 / 1a6ef5 / rgb(26,110,245) / hsl(220,90%,53%)", "bad"); return; }
      input.value = hex(rgb);
      picker.value = hex(rgb);
      var hsl = rgb2hsl.apply(null, rgb), c = contrast(rgb);
      out(res, [
        "HEX：" + hex(rgb),
        "HEX（短）：" + (function (h) { return /^#(.)\1(.)\2(.)\3$/.test(h) ? "#" + h[1] + h[3] + h[5] : "不可缩短"; })(hex(rgb)),
        "RGB：rgb(" + rgb.join(", ") + ")",
        "RGBA：rgba(" + rgb.join(", ") + ", 1)",
        "HSL：hsl(" + hsl[0] + ", " + hsl[1] + "%, " + hsl[2] + "%)",
        "",
        "对白色文字对比度：" + c.onWhite.toFixed(2) + " : 1 " + grade(c.onWhite),
        "对黑色文字对比度：" + c.onBlack.toFixed(2) + " : 1 " + grade(c.onBlack),
        "",
        "建议：" + (c.onWhite >= 4.5 ? "这个底色上直接放白字即可（达到 WCAG AA）"
                  : c.onBlack >= 4.5 ? "这个底色上放白字对比不足，改用深色文字"
                  : "和黑白文字都达不到 AA，建议加深或提亮底色")
      ].join("\n"));
      prev.style.background = hex(rgb);
      prev.querySelector("span").style.color = c.onWhite >= c.onBlack ? "#fff" : "#111";
      msg(m, "✅ 已解析", "ok");
    }
    function grade(v) { return v >= 7 ? "（AAA）" : v >= 4.5 ? "（AA）" : v >= 3 ? "（AA 大字）" : "（不达标）"; }
    on($("color-run"), "click", function () { run(false); });
    on(picker, "input", function () { run(true); });
    on(input, "keydown", function (e) { if (e.key === "Enter") run(false); });
    copyBtn($("color-copy"), function () { return res.textContent; });
  };

  /* ---------------- 6. CSV ↔ JSON ---------------- */
  TOOLS.csvjson = function () {
    var input = $("csv-in"), mode = $("csv-mode"), res = $("csv-out"), m = $("csv-msg");
    function parseCsv(text) {
      var rows = [], row = [], cur = "", q = false, i = 0, delim = (text.indexOf("\t") > -1 && text.indexOf(",") === -1) ? "\t" : ",";
      while (i < text.length) {
        var ch = text[i];
        if (q) {
          if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i += 2; continue; } q = false; i++; continue; }
          cur += ch; i++; continue;
        }
        if (ch === '"') { q = true; i++; continue; }
        if (ch === delim) { row.push(cur); cur = ""; i++; continue; }
        if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; i++; continue; }
        if (ch === "\r") { i++; continue; }
        cur += ch; i++;
      }
      if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
      return rows.filter(function (r) { return !(r.length === 1 && r[0].trim() === ""); });
    }
    function toJson() {
      var rows = parseCsv(input.value.replace(/^\uFEFF/, ""));
      if (!rows.length) throw new Error("没有解析到任何行");
      var head = rows[0].map(function (h) { return h.trim(); });
      var data = rows.slice(1).map(function (r) {
        var o = {};
        head.forEach(function (h, i) { o[h] = (r[i] || "").trim(); });
        return o;
      });
      return "共 " + data.length + " 行\n" + JSON.stringify(data, null, 2);
    }
    function toCsv() {
      var v = JSON.parse(input.value);
      if (!Array.isArray(v) || !v.length) throw new Error("需要非空的 JSON 数组，例如 [{&quot;a&quot;:1}]");
      var keys = [];
      v.forEach(function (o) { Object.keys(o).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); }); });
      var esc = function (x) {
        var s = x == null ? "" : String(x);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      var lines = [keys.join(",")].concat(v.map(function (o) { return keys.map(function (k) { return esc(o[k]); }).join(","); }));
      return "共 " + v.length + " 行\n" + lines.join("\n");
    }
    function run() {
      if (!input.value.trim()) { out(res, ""); msg(m, "", "hint"); return; }
      try {
        var r = mode.value === "c2j" ? toJson() : toCsv();
        out(res, r);
        msg(m, "✅ 转换成功", "ok");
      } catch (e) {
        out(res, "");
        msg(m, "❌ " + e.message, "bad");
      }
    }
    on($("csv-run"), "click", run);
    on(mode, "change", run);
    copyBtn($("csv-copy"), function () { return res.textContent; });
  };

  /* ---------------- 7. 正则测试 ---------------- */
  TOOLS.regex = function () {
    var pat = $("re-pattern"), flags = $("re-flags"), text = $("re-text"), res = $("re-out"), m = $("re-msg"), hi = $("re-highlight");
    function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
    function run() {
      var p = pat.value, f = flags.value.replace(/[^gimsuy]/g, "");
      if (!p) { out(res, ""); if (hi) hi.textContent = ""; msg(m, "", "hint"); return; }
      var re;
      try { re = new RegExp(p, f); }
      catch (e) { out(res, ""); msg(m, "❌ 正则语法错误：" + e.message, "bad"); return; }
      var t = text.value;
      var all = [];
      if (re.global) {
        var mm; var guard = 0;
        while ((mm = re.exec(t)) !== null && guard++ < 5000) {
          all.push(mm);
          if (mm[0] === "") re.lastIndex++;
        }
      } else {
        var one = re.exec(t);
        if (one) all.push(one);
      }
      var lines = ["匹配数：" + all.length];
      all.slice(0, 50).forEach(function (mmx, i) {
        lines.push("");
        lines.push("#" + (i + 1) + " 位置 " + mmx.index + "：「" + mmx[0] + "」");
        if (mmx.length > 1) {
          mmx.slice(1).forEach(function (g, gi) { lines.push("    分组 $" + (gi + 1) + " = " + (g === undefined ? "(未参与)" : g)); });
        }
        if (mmx.groups) {
          Object.keys(mmx.groups).forEach(function (k) { lines.push("    命名组 " + k + " = " + mmx.groups[k]); });
        }
      });
      if (all.length > 50) lines.push("\n（只显示前 50 条）");
      out(res, lines.join("\n"));
      msg(m, all.length ? "✅ 语法合法，共 " + all.length + " 处匹配" : "✅ 语法合法，但没有匹配", all.length ? "ok" : "hint");

      if (hi) {
        var html = "", last = 0;
        all.slice(0, 500).forEach(function (mmx) {
          if (mmx.index < last) return;
          html += esc(t.slice(last, mmx.index)) + '<mark style="background:#ffe08a">' + esc(mmx[0] || "​") + "</mark>";
          last = mmx.index + mmx[0].length;
        });
        html += esc(t.slice(last));
        hi.innerHTML = html;
      }
    }
    on($("re-run"), "click", run);
    on(pat, "input", run); on(flags, "change", run); on(text, "input", run);
    [["re-t1", "\\d{4}-\\d{2}-\\d{2}"], ["re-t2", "^[\\w.+-]+@[\\w-]+\\.[\\w.]+$"], ["re-t3", "(?<user>[a-z0-9_]+)@(?<host>[a-z0-9.]+)"]].forEach(function (p2) {
      on($(p2[0]), "click", function () { pat.value = p2[1]; flags.value = "g"; run(); });
    });
  };

  /* ---------------- 8. 文本统计 ---------------- */
  TOOLS.textcount = function () {
    var input = $("tc-in");
    function run() {
      var t = input.value;
      var cjk = (t.match(/[\u4e00-\u9fa5]/g) || []).length;
      var en = (t.match(/[A-Za-z]+(?:['-][A-Za-z]+)*/g) || []).length;
      var num = (t.match(/\d+(?:\.\d+)?/g) || []).length;
      var chars = t.length;
      var noSpace = t.replace(/\s/g, "").length;
      var lines = t ? t.split(/\n/).length : 0;
      var paras = t.split(/\n\s*\n/).filter(function (p) { return p.trim(); }).length;
      var words = cjk + en;
      var minutes = Math.max(1, Math.round(words / 400));
      $("tc-words").textContent = words;
      $("tc-chars").textContent = chars;
      $("tc-nochars").textContent = noSpace;
      $("tc-cjk").textContent = cjk;
      $("tc-en").textContent = en;
      $("tc-num").textContent = num;
      $("tc-lines").textContent = lines;
      $("tc-paras").textContent = paras;
      $("tc-time").textContent = words ? "约 " + minutes + " 分钟" : "—";
    }
    on(input, "input", run);
    run();
  };

  /* ---------------- 9. 密码生成 ---------------- */
  TOOLS.password = function () {
    var len = $("pw-len"), res = $("pw-out"), m = $("pw-strength");
    var sets = { upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", lower: "abcdefghijklmnopqrstuvwxyz", digit: "0123456789", sym: "!@#$%^&*()-_=+[]{};:,.?/~" };
    function generate() {
      var pool = "", must = [];
      Object.keys(sets).forEach(function (k) {
        var cb = $("pw-" + k);
        if (cb && cb.checked) { pool += sets[k]; must.push(sets[k]); }
      });
      if (!pool) { out(res, ""); m.textContent = "至少选一类字符"; return; }
      var n = Math.max(6, Math.min(64, +len.value || 16));
      var chars = must.map(function (s) { return s[Math.floor(Math.random() * s.length)]; });
      var arr = new Uint32Array(n);
      (window.crypto || {}).getRandomValues ? crypto.getRandomValues(arr) : arr.forEach(function (_, i) { arr[i] = Math.random() * 1e9; });
      for (var i = chars.length; i < n; i++) chars.push(pool[arr[i] % pool.length]);
      for (var j = chars.length - 1; j > 0; j--) {
        var k = arr[j] % (j + 1), tmp = chars[j]; chars[j] = chars[k]; chars[k] = tmp;
      }
      var pw = chars.join("");
      out(res, pw);
      var entropy = Math.round(n * Math.log2(pool.length));
      m.textContent = "熵 ≈ " + entropy + " bit" + (entropy >= 80 ? "（很强）" : entropy >= 60 ? "（够用）" : "（偏弱，建议加长）");
      m.className = entropy >= 80 ? "ok" : entropy >= 60 ? "hint" : "err";
      $("pw-lenval").textContent = n;
    }
    on($("pw-gen"), "click", generate);
    on(len, "input", function () { $("pw-lenval").textContent = len.value; });
    copyBtn($("pw-copy"), function () { return res.textContent; });
    generate();
  };

  /* ---------------- 10. 图片压缩 ---------------- */
  TOOLS.image = function () {
    var file = $("img-file"), quality = $("img-q"), fmt = $("img-fmt"), res = $("img-out"), m = $("img-msg"), prev = $("img-preview"), dl = $("img-dl");
    var img = null, lastBlob = null, lastName = "";
    function human(b) { return b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(1) + " KB" : (b / 1048576).toFixed(2) + " MB"; }
    on(file, "change", function () {
      var f = this.files && this.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) { msg(m, "❌ 请选择图片文件", "bad"); return; }
      var url = URL.createObjectURL(f);
      var im = new Image();
      im.onload = function () {
        img = im;
        prev.src = url; prev.style.display = "block";
        msg(m, "✅ 已载入：" + im.naturalWidth + "×" + im.naturalHeight + "，原始 " + human(f.size), "ok");
      };
      im.onerror = function () { msg(m, "❌ 图片无法解码（可能是 HEIC 或损坏文件）", "bad"); };
      im.src = url;
    });
    on($("img-run"), "click", function () {
      if (!img) { msg(m, "先选一张图片", "bad"); return; }
      var type = fmt.value === "auto" ? (img.src.indexOf("data:") === 0 ? "image/jpeg" : "image/jpeg") : fmt.value;
      var canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      var ctx = canvas.getContext("2d");
      if (type === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(img, 0, 0);
      var q = (+quality.value || 80) / 100;
      canvas.toBlob(function (blob) {
        if (!blob) { msg(m, "❌ 浏览器不支持该格式导出", "bad"); return; }
        lastBlob = blob;
        var ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
        lastName = "compressed." + ext;
        prev.src = URL.createObjectURL(blob);
        dl.href = URL.createObjectURL(blob); dl.download = lastName; dl.style.display = "inline-block";
        out(res, [
          "输出格式：" + type,
          "质量参数：" + (type === "image/png" ? "不适用（PNG 无损，靠减少尺寸）" : Math.round(q * 100) + "%"),
          "输出大小：" + human(blob.size),
          "尺寸：" + canvas.width + " × " + canvas.height
        ].join("\n"));
        msg(m, "✅ 处理完成，点「下载」保存", "ok");
      }, type, q);
    });
  };

  /* ---------------- 11. 哈希计算 ---------------- */
  TOOLS.hash = function () {
    var input = $("hash-in"), algo = $("hash-algo"), res = $("hash-out"), m = $("hash-msg"), file = $("hash-file");
    function toHex(buf) { return [].map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, "0"); }).join(""); }
    function digest(buf) {
      if (!(window.crypto && crypto.subtle)) { msg(m, "❌ 当前环境不支持 WebCrypto（需要 https 或 localhost）", "bad"); return; }
      crypto.subtle.digest(algo.value, buf).then(function (d) { out(res, toHex(d)); msg(m, "✅ 算法：" + algo.value, "ok"); })
        .catch(function (e) { msg(m, "❌ " + e.message, "bad"); });
    }
    on($("hash-run"), "click", function () { digest(new TextEncoder().encode(input.value).buffer); });
    on(algo, "change", function () { if (input.value) digest(new TextEncoder().encode(input.value).buffer); });
    on(input, "input", function () { if (input.value) digest(new TextEncoder().encode(input.value).buffer); });
    on(file, "change", function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () { digest(r.result); msg(m, "文件：" + f.name + "（" + (f.size / 1024).toFixed(1) + " KB），算法 " + algo.value, "ok"); };
      r.readAsArrayBuffer(f);
    });
    copyBtn($("hash-copy"), function () { return res.textContent; });
  };

  /* ---------------- 引导 ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    var slug = document.body.getAttribute("data-tool");
    if (slug && TOOLS[slug]) { try { TOOLS[slug](); } catch (e) { console.error(e); } }
    var y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
    copyBtn(document.getElementById("ts-nowcopy"), function () {
      var el = document.getElementById("ts-now");
      return el ? el.textContent.split(" / ")[0] : "";
    });
  });
})();
