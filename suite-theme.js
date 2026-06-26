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

  function init() {
    mount();
    var saved = DEFAULT;
    try { saved = localStorage.getItem(KEY) || DEFAULT; } catch (e) {}
    apply(saved);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.BeatQuestTheme = { apply: apply, themes: THEMES };
})();
