/* BeatQuest Suite — theme switcher (shared across every module).
   Applies a theme class to <body>, persists the choice, and builds the picker.
   Purely cosmetic — never touches game logic. */
(function () {
  var THEMES = ['mpc', 'manuscript', 'arcade', 'brutalist'];
  var LABELS = { mpc: 'MPC', manuscript: 'Ink', arcade: 'Arcade', brutalist: 'Print' };
  var KEY = 'beatquest-theme';
  var DEFAULT = 'mpc';

  function apply(name) {
    if (THEMES.indexOf(name) === -1) name = DEFAULT;
    for (var i = 0; i < THEMES.length; i++) document.body.classList.remove('theme-' + THEMES[i]);
    document.body.classList.add('theme-' + name);
    try { localStorage.setItem(KEY, name); } catch (e) {}
    var btns = document.querySelectorAll('#themeSwitcher button');
    for (var j = 0; j < btns.length; j++) btns[j].classList.toggle('active', btns[j].dataset.t === name);
  }

  function mount() {
    if (document.getElementById('themeSwitcher')) return;
    var bar = document.createElement('div');
    bar.id = 'themeSwitcher';
    THEMES.forEach(function (t) {
      var b = document.createElement('button');
      b.dataset.t = t;
      b.innerHTML = '<span class="dot t-dot-' + t + '"></span>' + LABELS[t];
      b.addEventListener('click', function () { apply(t); });
      bar.appendChild(b);
    });
    document.body.appendChild(bar);
  }

  // Inject theme-specific decorative chrome (screws, VU meter, score HUD…).
  // Hidden by default; each theme's CSS reveals what belongs to its world.
  // Purely decorative DOM — game logic and the staff are never touched.
  function mountDecor() {
    ['.rhythm-bank', '.answer-area'].forEach(function (sel) {
      Array.prototype.forEach.call(document.querySelectorAll(sel), function (panel) {
        if (panel.querySelector(':scope > .dq-screws')) return;
        var s = document.createElement('div');
        s.className = 'dq-screws'; s.setAttribute('aria-hidden', 'true');
        s.innerHTML = '<i class="dq-screw s-tl"></i><i class="dq-screw s-tr"></i><i class="dq-screw s-bl"></i><i class="dq-screw s-br"></i>';
        panel.appendChild(s);
      });
    });
    var header = document.querySelector('.header');
    if (header && !header.querySelector('.dq-extra')) {
      var ex = document.createElement('div');
      ex.className = 'dq-extra'; ex.setAttribute('aria-hidden', 'true');
      ex.innerHTML =
        '<div class="dq-vu"><span></span><span></span><span></span><span></span><span></span></div>' +
        '<div class="dq-hud"><div><b>SCORE</b> 028,400</div><div><b>COMBO</b> x4</div></div>';
      header.appendChild(ex);
    }
  }

  function init() {
    mount();
    mountDecor();
    var saved = DEFAULT;
    try { saved = localStorage.getItem(KEY) || DEFAULT; } catch (e) {}
    apply(saved);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.BeatQuestTheme = { apply: apply, themes: THEMES };
})();
