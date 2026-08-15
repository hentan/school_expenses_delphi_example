(function () {
  'use strict';

  var FILES = window.LEARN_FILES || {};
  // Желаемый порядок в меню (снизу вверх по слоям: БД → репозитории →
  // сервисы → данные → UI-хелперы → формы редактирования → главная форма → фреймы).
  var ORDER = [
    'uDb',
    'uMigrations',
    'uRepositories',
    'uServices',
    'uMainData',
    'uUiHelpers',
    'uBaseEditForm',
    'uUpdatePupilForm',
    'uUpdatePaymentForm',
    'uUpdateExenseForm',
    'uMainForm',
    'uPupilsFrame',
    'uPaymentsFrame',
    'uExpensesFrame',
    'uArchiveFrame'
  ];

  var menu = document.getElementById('file-menu');
  var titleEl = document.getElementById('file-title');
  var codePanel = document.getElementById('code-panel');
  var tooltip = document.getElementById('tooltip');
  var currentAnnos = [];

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function highlightLine(text) {
    if (text === '') return '';
    if (window.Prism && Prism.languages.pascal) {
      return Prism.highlight(text, Prism.languages.pascal, 'pascal');
    }
    return esc(text);
  }

  function buildMenu() {
    var keys = ORDER.filter(function (k) { return !!FILES[k]; });
    // файлы, зарегистрированные вне ORDER — на всякий случай добавим в конец
    Object.keys(FILES).forEach(function (k) {
      if (ORDER.indexOf(k) === -1) keys.push(k);
    });
    keys.forEach(function (k) {
      var a = document.createElement('a');
      a.className = 'file-item';
      a.href = '#';
      a.textContent = k + '.pas';
      a.addEventListener('click', function (e) {
        e.preventDefault();
        renderFile(k);
        var actives = menu.querySelectorAll('.file-item.active');
        for (var i = 0; i < actives.length; i++) actives[i].classList.remove('active');
        a.classList.add('active');
      });
      menu.appendChild(a);
    });
    if (keys.length) renderFile(keys[0]);
    if (menu.firstChild) menu.firstChild.classList.add('active');
  }

  function renderFile(key) {
    var f = FILES[key];
    if (!f) return;
    var code = (f.code || '').replace(/^\uFEFF/, '');
    var lines = code.split('\n');
    var annos = (f.annotations || []).slice().sort(function (a, b) {
      return a.startLine - b.startLine;
    });
    currentAnnos = annos;

    // Карта: номер строки -> индекс аннотации
    var lineAnno = {};
    annos.forEach(function (a, i) {
      for (var n = a.startLine; n <= a.endLine; n++) lineAnno[n] = i;
    });

    var html = '';
    var cur = -1;
    for (var i = 0; i < lines.length; i++) {
      var lineNo = i + 1;
      var a = lineAnno.hasOwnProperty(lineNo) ? lineAnno[lineNo] : -1;
      if (a !== cur) {
        if (cur !== -1) html += '</div>';
        if (a !== -1) html += '<div class="anno" data-idx="' + a + '">';
        cur = a;
      }
      html += '<div class="line"><span class="ln">' + lineNo +
              '</span><span class="lc">' + highlightLine(lines[i]) + '</span></div>';
    }
    if (cur !== -1) html += '</div>';

    titleEl.textContent = key + '.pas';
    codePanel.innerHTML = html;
    attachHandlers();
    codePanel.scrollTop = 0;
  }

  function attachHandlers() {
    var nodes = codePanel.querySelectorAll('.anno');
    for (var i = 0; i < nodes.length; i++) {
      (function (node) {
        node.addEventListener('mouseenter', function (e) {
          node.classList.add('active');
          var idx = parseInt(node.getAttribute('data-idx'), 10);
          var a = currentAnnos[idx];
          if (!a) return;
          tooltip.innerHTML =
            '<div class="t-title">' + esc(a.title) + '</div>' +
            '<div class="t-body">' + esc(a.explanation) + '</div>';
          tooltip.style.display = 'block';
          position(e);
        });
        node.addEventListener('mousemove', position);
        node.addEventListener('mouseleave', function () {
          node.classList.remove('active');
          tooltip.style.display = 'none';
        });
      })(nodes[i]);
    }
  }

  function position(e) {
    var pad = 16;
    var x = e.clientX + pad;
    var y = e.clientY + pad;
    var w = tooltip.offsetWidth;
    var h = tooltip.offsetHeight;
    if (x + w > window.innerWidth - 8) x = e.clientX - w - pad;
    if (x < 8) x = 8;
    if (y + h > window.innerHeight - 8) y = window.innerHeight - h - 8;
    if (y < 8) y = 8;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildMenu);
  } else {
    buildMenu();
  }
})();
