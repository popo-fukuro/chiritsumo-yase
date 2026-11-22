(function () {
  'use strict';

  var M = window.CHIRI_MISSIONS;
  // 公開先(github.io)は他のアプリと同じ保存場所を共有するので、名前を固有にする
  var STORAGE_KEY = 'chiritsumo-yase-v1';
  var MILESTONES = [3, 7, 14, 30, 60, 100];
  var WINDOW_DAYS = 14;
  var SVG_NS = 'http://www.w3.org/2000/svg';

  // ---------- 日付 ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromKey(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function todayKey() { return toKey(new Date()); }
  function yesterdayKey() { return toKey(addDays(new Date(), -1)); }
  var WEEK = ['日', '月', '火', '水', '木', '金', '土'];
  function md(k) { var d = fromKey(k); return (d.getMonth() + 1) + '/' + d.getDate(); }
  function mdw(k) { var d = fromKey(k); return md(k) + '（' + WEEK[d.getDay()] + '）'; }
  function fmt(n) { return n.toFixed(1); }
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function randomOf(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ---------- ミッション辞書 ----------
  var BY_ID = {};
  M.missions.forEach(function (m) { BY_ID[m.id] = m; });
  M.rescue.forEach(function (m) { BY_ID[m.id] = m; });
  var CAT = {};
  M.categories.forEach(function (c) { CAT[c.id] = c; });
  var RESCUE_ICON = '🌱';

  // ---------- 保存 ----------
  // days: { 'YYYY-MM-DD': { offer: [id,id,id], kind: 'normal'|'rescue', level: 0-3, pick: id|null, done: bool, kg?: number } }
  function defaultState() {
    return { v: 1, days: {}, settings: { cats: { move: true, eat: true, change: true } } };
  }
  function load() {
    var st = defaultState();
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return st;
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return st;
      if (data.days && typeof data.days === 'object') {
        Object.keys(data.days).forEach(function (k) {
          var r = data.days[k];
          if (!DATE_RE.test(k) || !r || typeof r !== 'object') return;
          var clean = {
            offer: Array.isArray(r.offer) ? r.offer.filter(function (x) { return typeof x === 'string'; }).slice(0, 3) : [],
            kind: r.kind === 'rescue' ? 'rescue' : 'normal',
            level: typeof r.level === 'number' ? r.level : 1,
            pick: typeof r.pick === 'string' ? r.pick : null,
            done: r.done === true
          };
          if (typeof r.kg === 'number' && isFinite(r.kg) && r.kg >= 20 && r.kg <= 300) clean.kg = r.kg;
          st.days[k] = clean;
        });
      }
      if (data.settings && data.settings.cats && typeof data.settings.cats === 'object') {
        M.categories.forEach(function (c) {
          if (typeof data.settings.cats[c.id] === 'boolean') st.settings.cats[c.id] = data.settings.cats[c.id];
        });
      }
    } catch (e) { /* 壊れていたら最初から */ }
    return st;
  }
  var saveWarned = false;
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
    catch (e) {
      if (!saveWarned) { saveWarned = true; toast('このブラウザでは保存できませんでした（プライベートモードかも）'); }
      return false;
    }
  }

  var state = load();

  // ---------- 連続・合計 ----------
  function isDone(k) { var d = state.days[k]; return !!(d && d.done); }
  function streakEndingAt(k) {
    var n = 0, d = fromKey(k);
    while (isDone(toKey(d))) { n++; d = addDays(d, -1); }
    return n;
  }
  // 今日まだなら、きのうまでの連続を「生きている」連続として数える
  function currentStreak() {
    var t = todayKey();
    return isDone(t) ? streakEndingAt(t) : streakEndingAt(yesterdayKey());
  }
  function doneKeys() { return Object.keys(state.days).filter(isDone).sort(); }
  function totalDone() { return doneKeys().length; }
  function bestStreak() {
    var keys = doneKeys(), best = 0, run = 0, prev = null;
    keys.forEach(function (k) {
      run = (prev && toKey(addDays(fromKey(prev), 1)) === k) ? run + 1 : 1;
      if (run > best) best = run;
      prev = k;
    });
    return best;
  }

  // ---------- 今日のミッションを決める ----------
  // 連続○日目かで難易度を決める。1〜7日目は一番軽いもの、8日目から少しだけ、15日目からもう一段
  function levelFor(dayNum) { return dayNum <= 7 ? 1 : dayNum <= 14 ? 2 : 3; }

  function enabledCats() {
    var list = M.categories.map(function (c) { return c.id; }).filter(function (id) { return state.settings.cats[id] !== false; });
    return list.length ? list : M.categories.map(function (c) { return c.id; });
  }

  function makeOffer(level, rescue) {
    var cats = enabledCats();
    var order = M.categories.map(function (c) { return c.id; });
    var slots;
    if (cats.length >= 3) slots = cats.slice(0, 3);
    else if (cats.length === 2) slots = cats.concat([randomOf(cats)]);
    else slots = [cats[0], cats[0], cats[0]];
    slots.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });

    var pool = rescue ? M.rescue : M.missions.filter(function (m) { return m.level === level; });
    // きのう出たものは、できるだけ避ける
    var y = state.days[yesterdayKey()];
    var avoid = y && y.offer ? y.offer : [];
    var chosen = [];
    slots.forEach(function (cat) {
      var notChosen = function (m) { return chosen.indexOf(m.id) < 0; };
      var cands = pool.filter(function (m) { return m.cat === cat && notChosen(m); });
      if (!cands.length) cands = pool.filter(notChosen);
      if (!cands.length) cands = M.missions.filter(function (m) { return m.level === 1 && notChosen(m); });
      var fresh = cands.filter(function (m) { return avoid.indexOf(m.id) < 0; });
      chosen.push(randomOf(fresh.length ? fresh : cands).id);
    });
    return chosen;
  }

  function ensureToday() {
    var t = todayKey();
    var rec = state.days[t];
    var valid = rec && rec.offer && rec.offer.length === 3 && rec.offer.every(function (id) { return BY_ID[id]; });
    if (valid) return rec;
    if (rec && (rec.pick || rec.done) && rec.offer && rec.offer.length) return rec; // 選択済みなら触らない

    var before = streakEndingAt(yesterdayKey());
    var anyDoneBefore = Object.keys(state.days).some(function (k) { return k < t && state.days[k].done; });
    // 前の日がお休みだった日は、超かんたんなレスキュー日にする（はじめて使う日はふつうの1日目）
    var rescue = !isDone(yesterdayKey()) && anyDoneBefore;
    var level = rescue ? 0 : levelFor(before + 1);
    rec = rec || {};
    rec.kind = rescue ? 'rescue' : 'normal';
    rec.level = level;
    rec.offer = makeOffer(level, rescue);
    rec.pick = null;
    rec.done = false;
    state.days[t] = rec;
    save();
    return rec;
  }

  function missionOf(id) {
    return BY_ID[id] || { id: id, cat: '', text: '（いまは一覧にないミッション）', tip: '' };
  }
  function iconOf(m, rec) {
    if (rec && rec.kind === 'rescue') return RESCUE_ICON;
    return CAT[m.cat] ? CAT[m.cat].icon : '✨';
  }

  // ---------- 要素 ----------
  var $ = function (id) { return document.getElementById(id); };

  // ---------- ホーム ----------
  var justDone = false;

  function renderHome() {
    var t = todayKey();
    var rec = ensureToday();
    $('homeDate').textContent = mdw(t);
    renderStats(rec);
    renderMission(rec);
    renderWeight(rec);
    justDone = false;
  }

  function nextMilestone(streak) {
    for (var i = 0; i < MILESTONES.length; i++) if (MILESTONES[i] > streak) return { next: MILESTONES[i], prev: i ? MILESTONES[i - 1] : 0 };
    var step = 100, next = Math.floor(streak / step) * step + step;
    return { next: next, prev: next - step };
  }

  function renderStats(rec) {
    var streak = currentStreak(), total = totalDone();
    $('streakNum').textContent = streak;
    $('totalNum').textContent = total;
    $('streakSub').textContent = rec.done ? '今日もできた' : '今日やると' + (streak + 1) + '日目';

    var ms = nextMilestone(streak);
    var left = ms.next - streak;
    var label = ms.next === 3 ? 'まずは3日連続まで'
      : ms.next === 7 ? '3日坊主卒業（7日連続）まで'
      : ms.next + '日連続まで';
    var pct = Math.max(4, Math.round(((streak - ms.prev) / (ms.next - ms.prev)) * 100));
    $('milestone').innerHTML =
      '<span>' + label + ' あと<b>' + left + '</b>日</span>' +
      '<span class="ms-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span>';

    drawMountain(total, rec.done);
  }

  // 合計日数ぶんの「ちり」が山になって積もっていく
  function drawMountain(n, todayDone) {
    var svg = $('mountain');
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var W = 160, H = 72;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('preserveAspectRatio', 'xMaxYMax meet');
    svg.setAttribute('aria-label', '積もったちり ' + n + '粒');
    el('line', { x1: 4, x2: W - 4, y1: H - 1, y2: H - 1, 'class': 'ground' }, svg);
    if (!n) return;

    var B = Math.max(1, Math.ceil((Math.sqrt(8 * n + 1) - 1) / 2)); // 一番下の段の数
    var s = Math.min(16, (W - 10) / B, (H - 6) / (B * 0.866 + 0.6));
    var r = s * 0.42;
    var placed = 0, row = 0;
    while (placed < n) {
      var inRow = Math.min(B - row, n - placed);
      var cy = H - 3 - r - row * s * 0.866;
      for (var i = 0; i < inRow; i++) {
        var cx = W / 2 + (i - (inRow - 1) / 2) * s;
        placed++;
        var isLast = placed === n;
        var c = el('circle', { cx: cx.toFixed(1), cy: cy.toFixed(1), r: r.toFixed(1), 'class': 'grain' + (isLast && todayDone ? ' new' : '') }, svg);
        if (isLast && justDone && !reducedMotion()) c.classList.add('pop');
      }
      row++;
    }
  }

  var DONE_MSGS = [
    'ちりが1つ積もりました',
    '今日のぶん、おしまい。おつかれさま',
    '小さくても、1日は1日',
    'この調子。あしたも1つだけ',
    'ちりつも、順調です'
  ];
  function doneMessage(rec, streak, total) {
    if (total === 1) return 'はじめの1日！ちりが1つ積もりました';
    if (rec.kind === 'rescue') return 'おかえりなさい！また今日から積もっていきます';
    if (streak === 3) return '3日連続！いちばん高い壁をこえました';
    if (streak === 7) return '7日連続！3日坊主、卒業です';
    if (MILESTONES.indexOf(streak) >= 0) return streak + '日連続！';
    return DONE_MSGS[hash(todayKey()) % DONE_MSGS.length];
  }

  function renderMission(rec) {
    var box = $('missionCard');
    var html = '';
    if (rec.done) {
      var m = missionOf(rec.pick);
      var streak = currentStreak(), total = totalDone();
      html =
        '<div class="done-box">' +
          '<div class="done-mark' + (justDone && !reducedMotion() ? ' pop' : '') + '" aria-hidden="true">✓</div>' +
          '<div class="title">できた！</div>' +
          '<div class="msg">' + esc(doneMessage(rec, streak, total)) + '</div>' +
          '<div class="what">' + esc(iconOf(m, rec) + ' ' + m.text) + '</div>' +
          '<button class="btn-link" type="button" data-act="undo">まちがえて押した（取り消す）</button>' +
        '</div>';
    } else if (rec.pick) {
      var p = missionOf(rec.pick);
      html =
        '<div class="mission-head"><h2>今日のミッション</h2></div>' +
        '<div class="picked">' +
          '<div class="ic" aria-hidden="true">' + esc(iconOf(p, rec)) + '</div>' +
          '<div class="main">' + esc(p.text) + '</div>' +
          '<div class="tip">' + esc(p.tip || '') + '</div>' +
        '</div>' +
        '<button class="btn-primary" type="button" data-act="done">できた！</button>' +
        '<div style="text-align:center"><button class="btn-link" type="button" data-act="repick">ほかのにする（えらびなおす）</button></div>';
    } else {
      if (rec.kind === 'rescue') {
        html += '<div class="rescue-note"><b>おかえりなさい 🌱</b>今日は超かんたんな日。どれか1つで、また積もり始めます。</div>';
      }
      html += '<div class="mission-head"><h2>今日のミッション</h2><span class="hint">3つから1つえらぶ</span></div><div class="options">';
      rec.offer.forEach(function (id) {
        var o = missionOf(id);
        var catLabel = rec.kind === 'rescue' ? 'かんたん' : (CAT[o.cat] ? CAT[o.cat].label : '');
        html +=
          '<button class="option" type="button" data-act="pick" data-id="' + esc(id) + '">' +
            '<span class="ic" aria-hidden="true">' + esc(iconOf(o, rec)) + '</span>' +
            '<span class="tx">' +
              '<span class="cat">' + esc(catLabel) + '</span>' +
              '<span class="main">' + esc(o.text) + '</span>' +
              (o.tip ? '<span class="tip">' + esc(o.tip) + '</span>' : '') +
            '</span>' +
            '<span class="go" aria-hidden="true">›</span>' +
          '</button>';
      });
      html += '</div>';
    }
    box.innerHTML = html;
  }

  $('missionCard').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]');
    if (!b) return;
    var rec = ensureToday();
    var act = b.getAttribute('data-act');
    if (act === 'pick') {
      rec.pick = b.getAttribute('data-id');
      save(); renderHome();
      var btn = $('missionCard').querySelector('[data-act="done"]');
      if (btn) btn.focus({ preventScroll: true });
    } else if (act === 'repick') {
      rec.pick = null;
      save(); renderHome();
    } else if (act === 'done') {
      rec.done = true;
      save();
      justDone = true;
      renderHome();
      var streak = currentStreak();
      if (MILESTONES.indexOf(streak) >= 0 || (streak > 100 && streak % 100 === 0)) celebrate(streak);
    } else if (act === 'undo') {
      rec.done = false;
      save(); renderHome();
      toast('取り消しました。できたら、また押してね');
    }
  });

  // ---------- 体重 ----------
  function parseWeight(s) {
    s = String(s).trim()
      .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[．。，,]/g, '.')
      .replace(/kg$/i, '').trim();
    if (!/^\d{1,3}(\.\d+)?$/.test(s)) return NaN;
    return Math.round(parseFloat(s) * 10) / 10;
  }

  function lastWeight() {
    var keys = Object.keys(state.days).filter(function (k) { return typeof state.days[k].kg === 'number'; }).sort();
    return keys.length ? state.days[keys[keys.length - 1]].kg : null;
  }

  function renderWeight(rec) {
    var card = $('weightCard');
    var after = rec.done && typeof rec.kg !== 'number';
    card.classList.toggle('after', after);
    $('weightLabel').textContent = after ? 'ついでに体重も記録する？（スキップOK）' : '体重（任意・スキップOK）';
    var lw = lastWeight();
    $('weight').placeholder = lw != null ? fmt(lw) : '00.0';
    var hint = $('weightHint');
    if (typeof rec.kg === 'number') {
      hint.innerHTML = '今日は <b>' + fmt(rec.kg) + 'kg</b> で記録済み。入れ直すと上書きします' +
        '<button class="btn-link" type="button" id="weightClear">消す</button>';
    } else {
      hint.textContent = '';
    }
  }

  function saveWeight() {
    var err = $('weightErr'), input = $('weight');
    err.textContent = '';
    if (input.value.trim() === '') { err.textContent = '体重を入れてね（例：62.4）。記録しなくても大丈夫です'; input.focus(); return; }
    var kg = parseWeight(input.value);
    if (isNaN(kg) || kg < 20 || kg > 300) { err.textContent = '20〜300 の数字で入れてね（例：62.4）'; input.focus(); return; }
    var rec = ensureToday();
    var updated = typeof rec.kg === 'number';
    rec.kg = kg;
    save();
    input.value = '';
    input.blur();
    renderWeight(rec);
    toast(updated ? '今日の体重を ' + fmt(kg) + 'kg に更新しました' : fmt(kg) + 'kg を記録しました');
  }
  $('weightForm').addEventListener('submit', function (e) { e.preventDefault(); saveWeight(); });
  $('weightSave').addEventListener('click', saveWeight);
  $('weight').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); saveWeight(); }
  });
  $('weightHint').addEventListener('click', function (e) {
    if (e.target.id !== 'weightClear') return;
    var rec = ensureToday();
    delete rec.kg;
    save(); renderWeight(rec);
    toast('今日の体重を消しました');
  });

  // ---------- お祝い ----------
  var CELEB = {
    3: { title: 'いちばん高い壁をこえました！', text: '3日坊主の「3日」に、いま追いつきました。\nあしたも1つだけ、ちりを積もう。', big: true },
    7: { title: '3日坊主、卒業です！', text: '最初のゴール「7日続ける」を達成。\nここからは、少しずつ習慣になっていきます。' },
    14: { title: '2週間つづきました！', text: '体重を記録していたら、「きろく」で2週間の変化も見てみてね。' },
    30: { title: '1か月つづきました！', text: '小さなちりが、ちゃんと山になってきました。' }
  };
  var lastFocus = null;
  function celebrate(n) {
    var c = CELEB[n] || { title: n + '日連続！', text: 'ここまで積もったちりは、ぜんぶあなたの分です。' };
    var box = $('celebrate');
    $('celebBig').innerHTML = n + '<small>日連続</small>';
    $('celebTitle').textContent = c.title;
    $('celebText').textContent = c.text;
    box.classList.toggle('big', !!c.big);
    var conf = $('confetti');
    conf.innerHTML = '';
    if (!reducedMotion()) {
      var colors = ['var(--accent)', 'var(--grain)', 'var(--series)', '#e8a33d', '#e06c8c'];
      var count = c.big ? 70 : 40;
      for (var i = 0; i < count; i++) {
        var p = document.createElement('i');
        var size = 5 + Math.random() * 7;
        p.style.left = (Math.random() * 100) + '%';
        p.style.width = p.style.height = size.toFixed(1) + 'px';
        p.style.background = colors[i % colors.length];
        p.style.animationDuration = (2.2 + Math.random() * 1.8).toFixed(2) + 's';
        p.style.animationDelay = (Math.random() * 0.7).toFixed(2) + 's';
        if (i % 3 === 0) p.style.borderRadius = '2px';
        conf.appendChild(p);
      }
    }
    lastFocus = document.activeElement;
    box.hidden = false;
    $('celebClose').focus();
  }
  function closeCelebrate() {
    $('celebrate').hidden = true;
    $('confetti').innerHTML = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  $('celebClose').addEventListener('click', closeCelebrate);
  $('celebrate').addEventListener('click', function (e) { if (e.target === this) closeCelebrate(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('celebrate').hidden) closeCelebrate(); });

  // ---------- 履歴：カレンダー ----------
  var calMonth = null;   // その月の1日
  var calSel = null;

  function firstMonth() {
    var keys = Object.keys(state.days).sort();
    var k = keys.length ? keys[0] : todayKey();
    var d = fromKey(k);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  function thisMonth() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); }

  function renderHistory() {
    $('hStreak').textContent = currentStreak();
    $('hTotal').textContent = totalDone();
    $('hBest').textContent = bestStreak();
    if (!calMonth) calMonth = thisMonth();
    renderCalendar();
    renderTrend();
    renderChart();
  }

  function renderCalendar() {
    var y = calMonth.getFullYear(), mo = calMonth.getMonth();
    $('calTitle').textContent = y + '年' + (mo + 1) + '月';
    $('calPrev').disabled = calMonth <= firstMonth();
    $('calNext').disabled = calMonth >= thisMonth();

    var t = todayKey();
    var html = '';
    WEEK.forEach(function (w, i) { html += '<div class="wd' + (i === 0 ? ' sun' : i === 6 ? ' sat' : '') + '" role="columnheader">' + w + '</div>'; });
    var lead = new Date(y, mo, 1).getDay();
    for (var i = 0; i < lead; i++) html += '<div class="day empty" aria-hidden="true"></div>';
    var days = new Date(y, mo + 1, 0).getDate();
    for (var d = 1; d <= days; d++) {
      var k = y + '-' + pad(mo + 1) + '-' + pad(d);
      var rec = state.days[k];
      var cls = 'day';
      var label = (mo + 1) + '月' + d + '日';
      if (k > t) cls += ' future';
      if (rec && rec.done) { cls += ' done'; label += ' できた'; }
      if (k === t) { cls += ' today'; label += '（今日）'; }
      if (k === calSel) cls += ' sel';
      var w = rec && typeof rec.kg === 'number' ? '<span class="wdot" aria-hidden="true"></span>' : '';
      html += '<button type="button" class="' + cls + '" data-key="' + k + '" aria-label="' + label + '"' + (k > t ? ' disabled' : '') + '>' + d + w + '</button>';
    }
    $('cal').innerHTML = html;
    renderCalDetail();
  }

  function renderCalDetail() {
    var box = $('calDetail');
    if (!calSel) { box.innerHTML = '日付をタップすると、その日のミッションが見られます'; return; }
    var rec = state.days[calSel];
    var parts = ['<b>' + mdw(calSel) + '</b>'];
    if (rec && rec.done) {
      var m = missionOf(rec.pick);
      parts.push('✓ ' + esc(m.text) + (rec.kind === 'rescue' ? '（かんたんな日）' : ''));
    } else if (calSel === todayKey()) {
      parts.push('今日はこれから');
    } else {
      parts.push('お休みの日');
    }
    if (rec && typeof rec.kg === 'number') parts.push('体重 ' + fmt(rec.kg) + 'kg');
    box.innerHTML = parts.join('　');
  }

  $('cal').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-key]');
    if (!b || b.disabled) return;
    calSel = b.getAttribute('data-key');
    renderCalendar();
  });
  $('calPrev').addEventListener('click', function () { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1); renderCalendar(); });
  $('calNext').addEventListener('click', function () { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1); renderCalendar(); });

  // ---------- 履歴：体重グラフ ----------
  function windowDays() {
    var end = new Date(), days = [];
    for (var i = WINDOW_DAYS - 1; i >= 0; i--) days.push(toKey(addDays(end, -i)));
    return days;
  }
  function weightPoints() {
    return windowDays().filter(function (k) { return state.days[k] && typeof state.days[k].kg === 'number'; })
      .map(function (k) { return { date: k, kg: state.days[k].kg }; });
  }

  // 期間の最初と最後をくらべる（前日比は出さない）
  function renderTrend() {
    var pts = weightPoints(), trend = $('trend');
    trend.className = 'trend';
    if (pts.length < 2) { trend.hidden = true; return; }
    trend.hidden = false;
    var first = pts[0], last = pts[pts.length - 1];
    var diff = Math.round((last.kg - first.kg) * 10) / 10;
    if (diff < 0) {
      trend.classList.add('down');
      trend.textContent = md(first.date) + 'から ' + Math.abs(diff).toFixed(1) + 'kg 減';
    } else if (diff > 0) {
      trend.textContent = md(first.date) + 'から ' + diff.toFixed(1) + 'kg 増';
    } else {
      trend.textContent = md(first.date) + 'から 変わらず';
    }
  }

  function el(name, attrs, parent) {
    var n = document.createElementNS(SVG_NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function niceStep(span) {
    var steps = [0.2, 0.5, 1, 2, 5, 10, 20];
    for (var i = 0; i < steps.length; i++) if (span / steps[i] <= 5) return steps[i];
    return 50;
  }
  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  var chartState = null;
  function renderChart() {
    var chartEl = $('chart'), svg = $('svg'), tooltip = $('tooltip');
    var days = windowDays();
    var pts = weightPoints();

    var oldEmpty = chartEl.querySelector('.empty');
    if (oldEmpty) oldEmpty.remove();
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    tooltip.classList.remove('show');
    chartState = null;

    if (pts.length < 2) {
      svg.style.display = 'none';
      var empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = pts.length === 1
        ? 'あと1回記録するとグラフが出るよ'
        : '体重を記録すると、ここにグラフが出ます（あと2回）。記録はしてもしなくても大丈夫です';
      chartEl.insertBefore(empty, tooltip);
      return;
    }
    svg.style.display = '';

    var W = Math.max(280, chartEl.clientWidth || 320);
    var H = 230;
    var narrow = W < 420;
    var m = { top: 20, right: narrow ? 46 : 54, bottom: 28, left: 36 };
    var iw = W - m.left - m.right, ih = H - m.top - m.bottom;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    // Y軸：最低でも2kg幅をとって、日々の小さな上下が大きく見えないようにする
    var vals = pts.map(function (p) { return p.kg; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var mid = (lo + hi) / 2;
    var span = Math.max(2, (hi - lo) * 1.3);
    lo = mid - span / 2; hi = mid + span / 2;
    var step = niceStep(hi - lo);
    lo = Math.floor(lo / step) * step;
    hi = Math.ceil(hi / step) * step;

    var dayIndex = {};
    days.forEach(function (d, i) { dayIndex[d] = i; });
    function x(i) { return m.left + (iw * i) / (WINDOW_DAYS - 1); }
    function y(v) { return m.top + ih - ((v - lo) / (hi - lo)) * ih; }

    for (var v = lo; v <= hi + 1e-9; v += step) {
      var yy = Math.round(y(v)) + 0.5;
      el('line', { x1: m.left, x2: W - m.right + 8, y1: yy, y2: yy, 'class': 'gridline' }, svg);
      var tk = el('text', { x: m.left - 6, y: yy + 4, 'text-anchor': 'end', 'class': 'tick' }, svg);
      tk.textContent = step < 1 ? v.toFixed(1) : String(Math.round(v));
    }

    var every = narrow ? 3 : 2;
    days.forEach(function (d, i) {
      if ((WINDOW_DAYS - 1 - i) % every !== 0) return;
      var isToday = i === WINDOW_DAYS - 1;
      var t = el('text', { x: x(i), y: H - 8, 'text-anchor': 'middle', 'class': 'tick' + (isToday ? ' today-tick' : '') }, svg);
      t.textContent = isToday ? '今日' : md(d);
    });

    var coords = pts.map(function (p) { return { x: x(dayIndex[p.date]), y: y(p.kg), i: dayIndex[p.date], p: p }; });

    // スタート地点の基準線
    var by = Math.round(coords[0].y) + 0.5;
    el('line', { x1: coords[0].x, x2: W - m.right + 8, y1: by, y2: by, 'class': 'baseline-ref' }, svg);
    var labelAbove = !coords.some(function (c) { return c.x >= coords[0].x && c.x <= coords[0].x + 90 && c.y < by - 2; });
    var lastC = coords[coords.length - 1];
    var refLabel = null;
    if (!(Math.abs(lastC.y - by) < 16 && lastC.x - coords[0].x < 110)) {
      refLabel = el('text', { x: coords[0].x + 4, y: labelAbove ? by - 5 : by + 14, 'class': 'ref-label' }, svg);
      refLabel.textContent = 'スタート ' + fmt(coords[0].p.kg);
    }

    // 線：続いている日は実線、記録のない日をはさむところは点線（欠けとして見せる）
    var solid = '', gap = '';
    for (var j = 1; j < coords.length; j++) {
      var a = coords[j - 1], b = coords[j];
      var seg = 'M' + a.x.toFixed(1) + ',' + a.y.toFixed(1) + ' L' + b.x.toFixed(1) + ',' + b.y.toFixed(1) + ' ';
      if (b.i - a.i === 1) solid += seg; else gap += seg;
    }
    if (gap) el('path', { d: gap, 'class': 'line gap' }, svg);
    if (solid) el('path', { d: solid, 'class': 'line' }, svg);
    if (refLabel) svg.appendChild(refLabel);

    coords.forEach(function (c, i) {
      el('circle', { cx: c.x, cy: c.y, r: i === coords.length - 1 ? 5.5 : 4, 'class': 'dot' }, svg);
    });
    var lab = el('text', { x: lastC.x + 9, y: lastC.y + 4, 'class': 'end-label' }, svg);
    lab.textContent = fmt(lastC.p.kg);

    var cross = el('line', { x1: 0, x2: 0, y1: m.top, y2: m.top + ih, 'class': 'crosshair', visibility: 'hidden' }, svg);
    chartState = { coords: coords, W: W, cross: cross };
  }

  function showTip(clientX) {
    if (!chartState) return;
    var svg = $('svg'), tooltip = $('tooltip');
    var rect = svg.getBoundingClientRect();
    var scale = chartState.W / rect.width;
    var px = (clientX - rect.left) * scale;
    var best = null, bd = Infinity;
    chartState.coords.forEach(function (c) { var dd = Math.abs(c.x - px); if (dd < bd) { bd = dd; best = c; } });
    if (!best) return;
    chartState.cross.setAttribute('x1', best.x); chartState.cross.setAttribute('x2', best.x);
    chartState.cross.setAttribute('visibility', 'visible');
    tooltip.innerHTML = mdw(best.p.date) + '<br><b>' + fmt(best.p.kg) + ' kg</b>';
    var left = best.x / scale, top = best.y / scale;
    var tw = tooltip.offsetWidth || 100;
    left = Math.min(Math.max(left, tw / 2 + 2), rect.width - tw / 2 - 2);
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.classList.add('show');
  }
  function hideTip() {
    $('tooltip').classList.remove('show');
    if (chartState) chartState.cross.setAttribute('visibility', 'hidden');
  }
  $('svg').addEventListener('pointermove', function (e) { showTip(e.clientX); });
  $('svg').addEventListener('pointerdown', function (e) { showTip(e.clientX); });
  $('svg').addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') hideTip(); });
  document.addEventListener('pointerdown', function (e) { if (!$('svg').contains(e.target)) hideTip(); });

  var lastChartW = 0;
  function onResize() {
    var w = $('chart').clientWidth;
    if (w && Math.abs(w - lastChartW) > 2) { lastChartW = w; if (current === 'history') renderChart(); }
  }
  if (window.ResizeObserver) new ResizeObserver(onResize).observe($('chart'));
  else window.addEventListener('resize', onResize);

  // ---------- 設定 ----------
  function renderSettings() {
    var html = '';
    M.categories.forEach(function (c) {
      var on = state.settings.cats[c.id] !== false;
      html +=
        '<label class="toggle"><span class="lb"><span aria-hidden="true">' + esc(c.icon) + '</span>' + esc(c.label) + '</span>' +
        '<span class="switch"><input type="checkbox" data-cat="' + c.id + '"' + (on ? ' checked' : '') + ' role="switch"><i></i></span></label>';
    });
    $('catToggles').innerHTML = html;
    $('catErr').textContent = '';
  }
  $('catToggles').addEventListener('change', function (e) {
    var input = e.target;
    if (!input.matches('input[data-cat]')) return;
    var id = input.getAttribute('data-cat');
    var others = M.categories.filter(function (c) { return c.id !== id && state.settings.cats[c.id] !== false; });
    if (!input.checked && !others.length) {
      input.checked = true;
      $('catErr').textContent = '1つはオンのままにしてください';
      return;
    }
    $('catErr').textContent = '';
    state.settings.cats[id] = input.checked;
    var rec = state.days[todayKey()];
    var changedToday = false;
    if (rec && !rec.pick && !rec.done && rec.offer && rec.offer.length) {
      rec.offer = makeOffer(rec.level, rec.kind === 'rescue');
      changedToday = true;
    }
    save();
    toast(changedToday ? '保存しました。今日のミッションも入れかえました' : '保存しました。あしたのミッションから変わります');
  });

  $('deleteAll').addEventListener('click', function () {
    if (!window.confirm('すべての記録（ミッションと体重）を削除します。元には戻せません。よろしいですか？')) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
    state = defaultState();
    calMonth = null; calSel = null;
    toast('すべての記録を削除しました');
    location.hash = '#home';
    route();
  });

  // ---------- トースト ----------
  var toastTimer;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  // ---------- 画面の切りかえ ----------
  var VIEWS = { home: renderHome, history: renderHistory, settings: renderSettings };
  var current = null;
  function route() {
    var v = (location.hash || '#home').slice(1);
    if (!VIEWS[v]) v = 'home';
    current = v;
    Object.keys(VIEWS).forEach(function (k) { $('view-' + k).hidden = k !== v; });
    document.querySelectorAll('.tabs a').forEach(function (a) {
      if (a.getAttribute('data-view') === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    VIEWS[v]();
  }
  window.addEventListener('hashchange', function () { route(); window.scrollTo(0, 0); });

  // 開きっぱなしで日付をまたいだら描き直す
  var shownDay = todayKey();
  function checkDay() {
    if (todayKey() !== shownDay) { shownDay = todayKey(); calMonth = null; route(); }
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') checkDay(); });
  setInterval(checkDay, 60 * 1000);

  route();

  // オフラインでも開けるように（https か localhost のときだけ）
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
