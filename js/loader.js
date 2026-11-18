(function () {
  var el = document.getElementById('ldr');
  if (!el) return;
  /* The published page is a few hundred KB of markup and the photographs
     arrive separately, so progress is the share of images that have actually
     downloaded, not how far the parser has got, which is now instant. */
  var FLOOR = 61, p = 0, done = false;
  function set(v) {
    p = Math.max(p, Math.min(v, done ? 100 : 99));
    el.style.setProperty('--p', p.toFixed(1));
  }
  function measure() {
    var imgs = document.images, loaded = 0;
    for (var i = 0; i < imgs.length; i++) if (imgs[i].complete) loaded++;
    var total = Math.max(imgs.length, FLOOR);
    var markup = document.readyState === 'loading' ? 0 : 14;
    set(markup + (loaded / total) * 86);
  }
  var tick = setInterval(measure, 90);
  measure();
  function finish() {
    if (done) return;
    done = true;
    clearInterval(tick);
    set(100);
    setTimeout(function () {
      el.classList.add('gone');
      setTimeout(function () { el.hidden = true; }, 800);
    }, 280);
  }
  if (document.readyState === 'complete') finish();
  else addEventListener('load', finish);
  /* never hold the page hostage: if something stalls, the loader leaves anyway */
  setTimeout(finish, 12000);
})();
