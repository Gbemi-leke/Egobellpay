/* ==========================================================
   EgoBellPay website template — main.js (jQuery 3.7)
   1. Preloader             5. 3D tilt (phone + cards)
   2. Nav / scroll UI       6. Product card demos
   3. Scroll reveal         7. Business headline words
   4. Hero phone demo
   ========================================================== */
(function ($) {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var $win = $(window);
  var $body = $('body');

  function naira(n) {
    return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* ---------- 1. Preloader ---------- */
  var loaded = false;
  function pageReady() {
    if (loaded) { return; }
    loaded = true;
    $('.preloader').addClass('is-done');
    $body.addClass('is-loaded');
    runPhoneDemo();
  }
  $win.on('load', function () { setTimeout(pageReady, 400); });
  setTimeout(pageReady, 2500); // never trap the page behind the loader

  /* ---------- 2. Nav, scroll progress, back to top ---------- */
  var $nav = $('#mainNav');
  var $progress = $('.scroll-progress span');
  var $toTop = $('#toTop');
  var $toTopRing = $('.to-top__progress');
  var RING = 138.23; // circumference of the r=22 circle
  var ticking = false;

  function onScroll() {
    var top = $win.scrollTop();
    var max = $(document).height() - $win.height();
    var p = max > 0 ? Math.min(top / max, 1) : 0;

    $nav.toggleClass('is-stuck', top > 24);
    $progress.css('transform', 'scaleX(' + p + ')');
    $toTop.toggleClass('is-visible', top > 600);
    $toTopRing.css('stroke-dashoffset', RING * (1 - p));
    ticking = false;
  }
  $win.on('scroll resize', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  });
  onScroll();

  $toTop.on('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  // Close the mobile menu after picking a link
  $('#navMenu a').on('click', function () {
    var menu = document.getElementById('navMenu');
    if ($(menu).hasClass('show')) {
      bootstrap.Collapse.getOrCreateInstance(menu, { toggle: false }).hide();
    }
  });

  $('#year').text(new Date().getFullYear());

  /* ---------- 3. Scroll reveal ----------
     .reveal            fades and rises into view
     .reveal-group      staggers the .reveal items inside it
     [data-inview]      gets .in-view and fires a jQuery "inview" event */
  $('.reveal-group').each(function () {
    $(this).find('.reveal').each(function (i) {
      this.style.setProperty('--d', (i * 90) + 'ms');
    });
  });

  var $watch = $('.reveal, [data-inview]');
  if (hasIO) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        $(entry.target).addClass('in-view').triggerHandler('inview');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    $watch.each(function () { io.observe(this); });
  } else {
    $watch.addClass('in-view');
  }

  /* ---------- 4. Hero phone demo ----------
     After the page loads: a deposit slides in, the balance counts up,
     then the "name confirmed" tick pops. Edit the numbers here. */
  var BALANCE_BEFORE = 168500;
  var DEPOSIT = 80000;

  function runPhoneDemo() {
    var $balance = $('#heroBalance');
    var $deposit = $('#heroDeposit');
    var $confirmTick = $('#heroConfirm .tick');
    var after = BALANCE_BEFORE + DEPOSIT;

    if (reduceMotion) {
      $deposit.addClass('is-in');
      $balance.text(naira(after));
      $confirmTick.addClass('is-on');
      return;
    }

    setTimeout(function () {
      $deposit.addClass('is-in');
      $balance.addClass('is-up');
      $({ v: BALANCE_BEFORE }).animate({ v: after }, {
        duration: 1400,
        step: function (v) { $balance.text(naira(Math.round(v))); },
        complete: function () {
          $balance.text(naira(after));
          setTimeout(function () { $balance.removeClass('is-up'); }, 600);
        }
      });
    }, 1900);

    setTimeout(function () { $confirmTick.addClass('is-on'); }, 3900);
  }

  /* ---------- 5. 3D tilt (phone follows the cursor, cards lean) ---------- */
  if (canHover && !reduceMotion) {
    var phone = document.getElementById('phone');
    $('.hero').on('mousemove', function (e) {
      var r = this.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      phone.style.setProperty('--ry', (x * 14).toFixed(2) + 'deg');
      phone.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
    }).on('mouseleave', function () {
      phone.style.setProperty('--ry', '0deg');
      phone.style.setProperty('--rx', '0deg');
    });

    $('[data-tilt]').on('mousemove', function (e) {
      var r = this.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      this.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg');
      this.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg');
    }).on('mouseleave', function () {
      this.style.setProperty('--ry', '0deg');
      this.style.setProperty('--rx', '0deg');
    });
  }

  /* ---------- 6. Product card demos ---------- */

  // Send money: the "sent" tick pops when the card scrolls into view
  $('[data-inview="sent"]').one('inview', function () {
    var $tick = $(this).find('.tick');
    setTimeout(function () { $tick.addClass('is-on'); }, 500);
  });

  // Airtime: pick an amount
  $('.amount-chip').on('click', function () {
    $(this).addClass('is-active').attr('aria-pressed', 'true')
      .siblings().removeClass('is-active').attr('aria-pressed', 'false');
  });

  // Target savings: count the percentage up with the bar
  $('[data-inview="savings"]').one('inview', function () {
    var $n = $('#savingsPct');
    if (reduceMotion) { $n.text(62); return; }
    $({ v: 0 }).delay(200).animate({ v: 62 }, {
      duration: 1600,
      step: function (v) { $n.text(Math.round(v)); },
      complete: function () { $n.text(62); }
    });
  });

  // Virtual card: tap or Enter flips it (hover flips it too)
  $('.flip-card').on('click', function () { $(this).toggleClass('is-flipped'); });

  // Add money: copy the account number
  $('#copyAcct').on('click', function () {
    var $btn = $(this);
    var $label = $btn.find('span');
    var show = function (text, ok) {
      $btn.toggleClass('is-copied', ok);
      $label.text(text);
      setTimeout(function () { $btn.removeClass('is-copied'); $label.text('Copy'); }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(String($btn.data('copy'))).then(
        function () { show('Copied', true); },
        function () { show('Not copied', false); }
      );
    } else {
      show('Not copied', false);
    }
  });

  // Without IntersectionObserver nothing fires "inview", so show the end states
  if (!hasIO) {
    $('.tick').addClass('is-on');
    $('#savingsPct').text(62);
  }

  /* ---------- 7. Business headline: wrap each word so it can rise in ---------- */
  (function () {
    var title = document.getElementById('bandTitle');
    if (!title || reduceMotion || !hasIO) { return; }
    var n = 0;
    var frag = document.createDocumentFragment();
    title.textContent.split(/([ \t\n]+)/).forEach(function (part) {
      if (!part) { return; }
      if (/^[ \t\n]+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
      var outer = document.createElement('span');
      var inner = document.createElement('span');
      outer.className = 'w';
      inner.textContent = part;
      inner.style.setProperty('--w', n++);
      outer.appendChild(inner);
      frag.appendChild(outer);
    });
    title.textContent = '';
    title.appendChild(frag);
  })();

})(jQuery);
