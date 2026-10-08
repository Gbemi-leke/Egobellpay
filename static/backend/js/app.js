/* ==========================================================
   EgoBellPay — signed-in app template (jQuery 3.7 + Bootstrap 5.3)

    1. Demo request stub      8. Password, uploads, PIN boxes
    2. Helpers and toast      9. Pay sheet (review, PIN, done)
    3. Page entrance         10. Simple forms
    4. Balance show / hide   11. Activity filter and receipt
    5. Copy and share        12. Card
    6. Validation            13. Lists and tabs
    7. Amounts, switches, name lookups

   IMPORTANT
   Everything on these pages is sample data. This file never moves
   money, never works out a real balance and never stores a PIN,
   password or card number in the browser. Your Django views do all
   of that. Each place you need to connect is marked "CONNECT".
   ========================================================== */
(function ($) {
  'use strict';

  /* ---------- 1. Demo request stub ----------
     CONNECT: replace with a real request, for example
       return $.ajax({ url: endpoint, method: 'POST', data: data,
                       headers: { 'X-CSRFToken': csrfToken } });
     Until then every request "succeeds" after a short delay so you can
     see the loading and success states. */
  function send(endpoint, data) {
    var d = $.Deferred();
    if (window.console) { console.warn('[EgoBellPay template] "' + (endpoint || 'this form') + '" is not connected yet.'); }
    setTimeout(function () { d.resolve({ ok: true, data: data }); }, 900);
    return d.promise();
  }

  /* ---------- 2. Helpers and toast ---------- */
  var NAIRA = '₦';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function toNumber(v) { return Number(String(v == null ? '' : v).replace(/[^\d.]/g, '')) || 0; }
  function money(n, decimals) {
    var dp = decimals === undefined ? 2 : decimals;
    return NAIRA + Number(n).toLocaleString('en-NG', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }
  function icon(id) { return '<svg class="icon" aria-hidden="true"><use href="#' + id + '"/></svg>'; }

  function toast(message) {
    var $wrap = $('.toasts');
    if (!$wrap.length) { $wrap = $('<div class="toasts" role="status" aria-live="polite"></div>').appendTo('body'); }
    var $t = $('<div class="toast-msg"></div>').append(icon('a-check')).append($('<span></span>').text(message)).appendTo($wrap);
    setTimeout(function () { $t.addClass('is-on'); }, 20);
    setTimeout(function () { $t.removeClass('is-on'); setTimeout(function () { $t.remove(); }, 400); }, 2800);
  }

  /* ---------- 3. Page entrance ----------
     One moment per page: bars, rings and meters grow in, the balance counts up. */
  function countUp($el) {
    var target = Number($el.data('count'));
    var text = money(target);
    if (reduceMotion || !target) { $el.text(text); return; }
    var start = null;
    function step(now) {
      if ($el.data('masked')) { return; }
      if (start === null) { start = now; }
      var p = Math.min((now - start) / 900, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      $el.text(p < 1 ? money(Math.round(target * eased)) : text);
      if (p < 1) { window.requestAnimationFrame(step); }
    }
    window.requestAnimationFrame(step);
  }

  $(function () {
    setTimeout(function () { $('body').addClass('is-in'); }, 60);
    $('[data-count]').each(function () { if (!$(this).data('masked')) { countUp($(this)); } });
  });

  /* ---------- 4. Balance show / hide ----------
     Only the choice (shown or hidden) is remembered, never an amount. */
  var HIDE_KEY = 'ebp-hide-balance';
  function remember(hide) { try { window.localStorage.setItem(HIDE_KEY, hide ? '1' : '0'); } catch (e) { /* private window: ignore */ } }
  function recall() { try { return window.localStorage.getItem(HIDE_KEY) === '1'; } catch (e) { return false; } }

  function setBalanceHidden(hide) {
    $('[data-balance]').each(function () {
      var $el = $(this);
      if ($el.data('shown') === undefined) { $el.data('shown', $el.data('count') !== undefined ? money($el.data('count')) : $el.text()); }
      $el.data('masked', hide).text(hide ? NAIRA + ' ••••••' : $el.data('shown'));
    });
    $('[data-balance-toggle]').attr('aria-pressed', hide ? 'true' : 'false')
      .attr('aria-label', hide ? 'Show balance' : 'Hide balance')
      .find('use').attr('href', hide ? '#a-eye-off' : '#a-eye');
  }
  if (recall()) { $('[data-balance]').data('masked', true); $(function () { setBalanceHidden(true); }); }
  $(document).on('click', '[data-balance-toggle]', function () {
    var hide = $(this).attr('aria-pressed') !== 'true';
    setBalanceHidden(hide); remember(hide);
  });

  /* ---------- 5. Copy and share ---------- */
  function copyText(text, done) {
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done, done); return; }
    var $tmp = $('<textarea readonly></textarea>').val(text).css({ position: 'fixed', opacity: 0 }).appendTo('body');
    $tmp[0].select();
    try { document.execCommand('copy'); } catch (e) { /* nothing else to try */ }
    $tmp.remove(); done();
  }
  $(document).on('click', '[data-copy]', function () {
    var $btn = $(this);
    copyText(String($btn.data('copy')), function () { toast($btn.data('copied') || 'Copied'); });
  });
  $(document).on('click', '[data-share]', function () {
    var text = String($(this).data('share'));
    if (navigator.share) { navigator.share({ text: text }).catch(function () { /* closed by the person */ }); }
    else { copyText(text, function () { toast('Copied. Paste it anywhere to share.'); }); }
  });

  /* ---------- 6. Validation ----------
     Checks in the browser are for speed only. The server must check everything again. */
  var RULES = {
    email:    function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || 'Enter a valid email address, like name@example.com.'; },
    phone:    function (v) { return /^(?:\+?234|0)[789][01]\d{8}$/.test(v.replace(/[\s-]/g, '')) || 'Enter a Nigerian mobile number, like 0803 123 4567.'; },
    account:  function (v) { return /^\d{10}$/.test(v) || 'Account numbers are 10 digits.'; },
    tag:      function (v) { return /^@?[a-z0-9_]{3,20}$/i.test(v) || 'Tags are 3 to 20 letters, numbers or underscores.'; },
    meter:    function (v) { return /^\d{11,13}$/.test(v) || 'Meter numbers are 11 to 13 digits.'; },
    smartcard: function (v) { return /^\d{10,11}$/.test(v) || 'Smartcard and IUC numbers are 10 or 11 digits.'; },
    password: function (v) { return (v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v)) || 'Use at least 8 characters with a letter and a number.'; },
    future:   function (v) { var d = new Date(v); return (!isNaN(d.getTime()) && d > new Date()) || 'Choose a date after today.'; },
    amount:   function (v, $el) {
      var n = toNumber(v), min = Number($el.data('min')) || 1, max = Number($el.data('max')) || 0;
      if (!n) { return 'Enter an amount.'; }
      if (n < min) { return 'Enter ' + money(min, 0) + ' or more.'; }
      if (max && n > max) { return $el.data('max-msg') || 'Enter ' + money(max, 0) + ' or less.'; }
      return true;
    }
  };

  function setError($el, message) {
    var $fb = $el.closest('.field, .form-check, fieldset').find('.invalid-feedback').first();
    $el.toggleClass('is-invalid', !!message).attr('aria-invalid', message ? 'true' : 'false');
    if ($fb.length) { $fb.text(message || '').toggle(!!message); }
    return !message;
  }

  function validateField(el) {
    var $el = $(el);
    if ($el.is(':disabled')) { return true; }
    var v = $.trim($el.val() || '');
    var rule = $el.data('rule');

    if ($el.is(':checkbox')) {
      return setError($el, $el.prop('required') && !$el.is(':checked') ? ($el.data('msg') || 'Tick this box to continue.') : '');
    }
    if ($el.prop('required') && !v) { return setError($el, $el.data('msg') || ($el.is('select') ? 'Choose an option.' : 'This field is required.')); }
    if (!v) { return setError($el, ''); }
    if (rule && RULES[rule]) {
      var res = RULES[rule](v, $el);
      if (res !== true) { return setError($el, res); }
    }
    var match = $el.data('match');
    if (match && v !== $(match).val()) { return setError($el, 'The two entries do not match.'); }
    // A number that needs a name found for it (account, meter, smartcard, tag)
    var look = $el.data('lookup');
    if (look && !$(look).hasClass('is-ok')) { return setError($el, $el.data('lookup-msg') || 'We could not confirm this yet. Check it and try again.'); }
    return setError($el, '');
  }

  function validateTiles($tiles) {
    var ok = !$tiles.is('[data-required]') || $tiles.find('input:checked').length > 0;
    $tiles.toggleClass('is-invalid', !ok);
    $tiles.closest('fieldset').find('.invalid-feedback').first().text(ok ? '' : ($tiles.data('msg') || 'Choose one.')).toggle(!ok);
    return ok;
  }
  function validateUpload($u) {
    var $input = $u.find('input[type=file]');
    if ($input.is(':disabled')) { return true; }
    var file = $input[0].files && $input[0].files[0];
    var msg = '';
    if (!file && $input.prop('required')) { msg = 'Add this file to continue.'; }
    else if (file && file.size > 5 * 1024 * 1024) { msg = 'That file is larger than 5 MB. Choose a smaller one.'; }
    $u.toggleClass('is-invalid', !!msg);
    $u.closest('.field').find('.invalid-feedback').first().text(msg).toggle(!!msg);
    return !msg;
  }
  function pinValue($pin) { return $pin.find('input').map(function () { return this.value; }).get().join(''); }
  function validatePin($pin) {
    if ($pin.find('input').first().is(':disabled')) { return true; }
    var ok = /^\d{4}$/.test(pinValue($pin));
    var same = $pin.data('match');
    var msg = ok ? '' : 'Enter all 4 digits.';
    if (ok && same && pinValue($pin) !== pinValue($(same))) { msg = 'The two PINs do not match.'; }
    $pin.toggleClass('is-invalid', !!msg);
    $pin.closest('.field').find('.invalid-feedback').first().text(msg).toggle(!!msg);
    return !msg;
  }

  function validateWithin($scope) {
    var ok = true, $first = null;
    function fail($focus) { ok = false; if (!$first) { $first = $focus; } }
    $scope.find('input, select, textarea').not('[type=file], [type=radio], .pin input').each(function () {
      if (!validateField(this)) { fail($(this)); }
    });
    $scope.find('.tiles').each(function () { if ($(this).find('input:enabled').length && !validateTiles($(this))) { fail($(this).find('input').first()); } });
    $scope.find('.upload').each(function () { if (!validateUpload($(this))) { fail($(this).find('input')); } });
    $scope.find('.pin').each(function () { if (!validatePin($(this))) { fail($(this).find('input').first()); } });
    if ($first) { $first.trigger('focus'); }
    return ok;
  }

  // Re-check a field once the person leaves it. The short delay matters: an error
  // appearing moves the layout, and doing that mid-click would make the click miss.
  $(document).on('blur change', '.field input, .field select, .field textarea, .form-check input', function () {
    var el = this;
    if ($(el).is('[type=file], [type=radio]') || $(el).closest('.pin').length) { return; }
    setTimeout(function () {
      if ($(el).hasClass('is-invalid') || ($.trim($(el).val() || '') && !$(el).data('lookup'))) { validateField(el); }
    }, 180);
  });
  $(document).on('change', '.tiles input', function () { validateTiles($(this).closest('.tiles')); });
  $(document).on('input', '[data-digits]', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, Number($(this).data('digits')) || 99);
  });

  /* ---------- 7. Amounts, switches, name lookups ---------- */
  // Thousands separators while typing
  $(document).on('input', '[data-amount]', function () {
    var n = this.value.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '').slice(0, 9);
    this.value = n ? Number(n).toLocaleString('en-NG') : '';
    $(this).closest('.field').find('.chip').removeClass('is-on').attr('aria-pressed', 'false');
  });
  // Quick amounts
  $(document).on('click', '[data-amount-set]', function () {
    var $chip = $(this);
    var $input = $chip.closest('.field').find('[data-amount]');
    $input.val(Number($chip.data('amount-set')).toLocaleString('en-NG'));
    $chip.addClass('is-on').attr('aria-pressed', 'true').siblings().removeClass('is-on').attr('aria-pressed', 'false');
    validateField($input[0]);
  });

  // Two-way switch that swaps a block of fields. Fields in the hidden block are
  // disabled so they are not checked and not posted.
  function showPane($btn) {
    $btn.addClass('is-on').attr('aria-pressed', 'true').siblings().removeClass('is-on').attr('aria-pressed', 'false');
    $btn.parent().find('[data-pane]').each(function () {
      var on = this === $btn[0];
      $($(this).data('pane')).prop('hidden', !on).find('input, select, textarea').prop('disabled', !on);
    });
  }
  $(document).on('click', '[data-pane]', function () { showPane($(this)); });
  $(function () { $('[data-pane].is-on').each(function () { showPane($(this)); }); });

  // Name lookups.
  // CONNECT: ask your server to resolve the number (bank account name enquiry, meter
  // or smartcard validation, EgoBellPay tag). The template always "finds" the sample
  // name written in data-name.
  function resetLookup($input) {
    $($input.data('lookup')).removeClass('is-ok is-busy').find('[data-lookup-text]').text('');
  }
  function runLookup($input) {
    var $out = $($input.data('lookup'));
    var need = Number($input.data('lookup-min')) || Number($input.data('digits')) || 3;
    var value = $.trim($input.val()).replace(/^@/, '');
    var $with = $input.data('lookup-with') ? $($input.data('lookup-with')) : null;
    clearTimeout($input.data('timer'));
    resetLookup($input);
    if (value.length < need || ($with && !$with.val())) { return; }
    $out.addClass('is-busy').find('[data-lookup-text]').text('Checking…');
    $input.data('timer', setTimeout(function () {
      $out.removeClass('is-busy').addClass('is-ok').find('[data-lookup-text]').text($input.data('name'));
      setError($input, '');
    }, 700));
  }
  $(document).on('input', '[data-lookup]', function () {
    var $input = $(this);
    clearTimeout($input.data('typing'));
    clearTimeout($input.data('timer'));
    resetLookup($input);
    $input.data('typing', setTimeout(function () { runLookup($input); }, 350));
  });
  $(document).on('change', 'select[data-relookup]', function () { runLookup($($(this).data('relookup'))); });

  /* ---------- 8. Password, uploads, PIN boxes ---------- */
  $(document).on('click', '.pw__toggle', function () {
    var $input = $(this).siblings('input');
    var show = $input.attr('type') === 'password';
    $input.attr('type', show ? 'text' : 'password');
    $(this).text(show ? 'Hide' : 'Show').attr('aria-pressed', show ? 'true' : 'false');
  });

  $(document).on('change', '.upload input[type=file]', function () {
    var $u = $(this).closest('.upload');
    var file = this.files && this.files[0];
    if (!$u.data('title')) { $u.data('title', $u.find('.upload__title').text()); $u.data('meta', $u.find('.upload__meta').text()); }
    $u.toggleClass('has-file', !!file);
    $u.find('.upload__title').text(file ? file.name : $u.data('title'));
    $u.find('.upload__meta').text(file ? (file.size / 1024 / 1024).toFixed(1) + ' MB' : $u.data('meta'));
    validateUpload($u);
  });
  $(document).on('click', '.upload__clear', function (e) {
    e.preventDefault();
    $(this).closest('.upload').find('input[type=file]').val('').trigger('change');
  });
  $(document).on('dragover dragleave drop', '.upload', function (e) { $(this).toggleClass('is-drag', e.type === 'dragover'); });

  $(document).on('input', '.pin input', function () {
    this.value = this.value.replace(/\D/g, '').slice(-1);
    var $pin = $(this).closest('.pin');
    $pin.removeClass('is-invalid');
    if (this.value) { $(this).next('input').trigger('focus'); }
    if (pinValue($pin).length === 4) { $pin.trigger('pin:full'); }
  });
  $(document).on('keydown', '.pin input', function (e) {
    if (e.key === 'Backspace' && !this.value) { $(this).prev('input').val('').trigger('focus'); }
    if (e.key === 'ArrowLeft') { $(this).prev('input').trigger('focus'); }
    if (e.key === 'ArrowRight') { $(this).next('input').trigger('focus'); }
  });
  $(document).on('paste', '.pin input', function (e) {
    var text = ((e.originalEvent.clipboardData || window.clipboardData).getData('text') || '').replace(/\D/g, '').slice(0, 4);
    if (!text) { return; }
    e.preventDefault();
    var $inputs = $(this).closest('.pin').find('input');
    $inputs.each(function (i) { this.value = text.charAt(i) || ''; });
    $inputs.eq(Math.min(text.length, 4) - 1).trigger('focus');
  });

  /* ---------- 9. Pay sheet ----------
     Any form with data-pay opens the same sheet: review, enter PIN, done.
     The figures shown are read from the form for display only.

     CONNECT: on "confirm", post the form fields and the PIN to your Django view.
     The view must (1) check the PIN and its lockout, (2) work out the fee and the
     total itself, (3) post the ledger entry, then return the reference and status.
     Never trust an amount, fee or balance that comes from this page.

     Template behaviour: any 4 digits "work". Enter 0000 to see the wrong-PIN state. */
  var $sheet = $('#paySheet');
  var sheet = $sheet.length && window.bootstrap ? window.bootstrap.Modal.getOrCreateInstance($sheet[0]) : null;
  var payForm = null, payDone = false;

  function payStep(name) {
    $sheet.find('.pay__step').removeClass('is-on').filter('[data-pay-step="' + name + '"]').addClass('is-on');
    $sheet.find('#payTitle').text(name === 'pin' ? 'Enter your PIN' : name === 'done' ? 'Receipt' : (payForm ? payForm.data('pay-title') : 'Review'));
    if (name === 'pin') { $sheet.find('.pin input').first().trigger('focus'); }
  }
  function rowHtml(label, value, total) {
    return $('<div class="rows__row"></div>').toggleClass('rows__row--total', !!total)
      .append($('<dt></dt>').text(label)).append($('<dd></dd>').text(value));
  }
  function fieldText($el) {
    if ($el.is('select')) { return $.trim($el.find('option:selected').text()); }
    if ($el.is(':radio')) { return $el.data('text') || $.trim($el.closest('.tile').text()); }
    if ($el.is('input, textarea')) { return $.trim($el.val()); }
    return $.trim($el.text());
  }

  $(document).on('submit', 'form[data-pay]', function (e) {
    e.preventDefault();
    if (!sheet) { return; }
    var $form = $(this);
    if (!validateWithin($form)) { return; }
    payForm = $form; payDone = false;

    var $priced = $form.find('select[data-priced]:enabled');
    var amount = $priced.length ? Number($priced.find('option:selected').data('price')) || 0 : toNumber($form.find('[data-amount]:enabled').val());
    var $fee = $form.find('[data-fee]').filter(function () { return !$(this).prop('hidden'); }).first();
    var fee = Number($fee.length ? $fee.data('fee') : $form.data('fee')) || 0;
    var total = amount + fee;
    var $to = $form.find($form.data('pay-to')).filter(function () { return !$(this).is(':disabled') && $(this).closest('[hidden]').length === 0; }).first();
    var toText = $to.length ? fieldText($to) : ($form.data('pay-to-text') || '');

    var $rows = $sheet.find('[data-pay-rows]').empty();
    $form.find('[data-row]').each(function () {
      var $el = $(this);
      if ($el.is(':disabled') || $el.closest('[hidden]').length || ($el.is(':radio') && !$el.is(':checked'))) { return; }
      var text = fieldText($el);
      if (text) { $rows.append(rowHtml($el.data('row'), text)); }
    });
    $rows.append(rowHtml('Fee', fee ? money(fee) : 'Free'));
    $rows.append(rowHtml('You pay', money(total), true));

    $sheet.find('[data-pay-label]').text($form.data('pay-label') || 'You are paying');
    $sheet.find('[data-pay-amount]').text(money(amount));
    $sheet.find('[data-pay-to]').text(toText ? 'to ' + toText : '');
    $sheet.find('[data-pay-confirm-text]').text(($form.data('pay-verb') || 'Pay') + ' ' + money(total));
    $sheet.find('[data-pay-done-title]').text($form.data('pay-done') || 'Payment sent');
    $sheet.find('[data-pay-done-text]').text(money(amount) + (toText ? ' to ' + toText : ''));
    $sheet.find('[data-pay-token]').prop('hidden', !$form.is('[data-pay-token]'));
    $sheet.find('.pin input').val('');
    $sheet.find('.pay__error').removeClass('is-on');
    payStep('review');
    // A form that lives in its own dialog (add to a savings target, fund the card):
    // close that dialog first, then open the sheet. Bootstrap shows one dialog at a time.
    var parent = $form.closest('.modal')[0];
    if (parent) {
      $(parent).one('hidden.bs.modal', function () { sheet.show(); });
      window.bootstrap.Modal.getOrCreateInstance(parent).hide();
    } else { sheet.show(); }
  });

  $sheet.on('click', '[data-pay-next]', function () { payStep('pin'); });
  $sheet.on('click', '[data-pay-back]', function () { payStep('review'); });
  $sheet.on('click', '[data-pay-confirm]', function () {
    var $btn = $(this), $pin = $sheet.find('.pin'), $err = $sheet.find('.pay__error').removeClass('is-on');
    var pin = pinValue($pin);
    if (!/^\d{4}$/.test(pin)) { $pin.addClass('is-invalid'); $err.text('Enter all 4 digits.').addClass('is-on'); $pin.find('input').first().trigger('focus'); return; }
    $btn.addClass('is-loading').prop('disabled', true);
    send(payForm.attr('action'), payForm.serialize()).then(function () {
      $btn.removeClass('is-loading').prop('disabled', false);
      $pin.find('input').val('');               // the PIN is cleared as soon as it has been used
      if (pin === '0000') {                     // template only: shows the wrong-PIN state
        $pin.addClass('is-invalid'); $err.text('Wrong PIN. You have 4 tries left.').addClass('is-on');
        $pin.find('input').first().trigger('focus');
        return;
      }
      payDone = true;
      $sheet.find('[data-pay-ref]').text('EBP-' + String(Date.now()).slice(-9));
      payStep('done');
      $sheet.find('.tick--xl').removeClass('is-on');
      setTimeout(function () { $sheet.find('.tick--xl').addClass('is-on'); }, 60);
    });
  });
  $sheet.on('hidden.bs.modal', function () {
    $sheet.find('.pin input').val('');
    if (payDone && payForm) {
      payForm[0].reset();
      payForm.find('.lookup').removeClass('is-ok is-busy');
      payForm.find('.chip').removeClass('is-on').attr('aria-pressed', 'false');
      payForm.find('[data-pane].is-on').each(function () { showPane($(this)); });
    }
  });

  /* ---------- 10. Simple forms ----------
     data-form   = template only: shows loading, then the success message.
     data-native = a real form your Django view handles; fields are checked first. */
  $(document).on('submit', 'form[data-form]', function (e) {
    e.preventDefault();
    var $form = $(this), $btn = $form.find('[type=submit]');
    var $status = $form.find('.form-status').removeClass('is-ok is-error').text('');
    if (!validateWithin($form)) { return; }
    $btn.addClass('is-loading').prop('disabled', true);
    send($form.attr('action'), $form.serialize()).then(function () {
      var done = $form.data('success') || 'Saved.';
      var modal = $form.closest('.modal')[0];
      if (modal || $form.is('[data-toast]')) { toast(done); } else { $status.addClass('is-ok').text(done); }
      if (modal) { window.bootstrap.Modal.getOrCreateInstance(modal).hide(); }
      if (!$form.is('[data-keep]')) { $form[0].reset(); $form.find('.upload input[type=file]').trigger('change'); $form.find('.pin, .upload').removeClass('is-invalid'); }
    }).always(function () { $btn.removeClass('is-loading').prop('disabled', false); });
  });
  $(document).on('submit', 'form[data-native]', function (e) {
    if (!validateWithin($(this))) { e.preventDefault(); return; }
    $(this).find('[type=submit]').addClass('is-loading');
  });
  $(window).on('pageshow', function () { $('form[data-native] [type=submit]').removeClass('is-loading'); });
  // Buttons for things that are not built into the template
  $(document).on('click', '[data-soon]', function () { toast($(this).data('soon')); });

  /* ---------- 11. Activity filter and receipt ----------
     CONNECT: in Django the filter, search and pages are query-string parameters
     handled by the view. This in-page filter only shows how it should feel. */
  var $rows = $('#txTable tbody tr');
  function filterRows() {
    var kind = $('#txFilters .chip.is-on').data('filter') || 'all';
    var q = $.trim($('#txSearch').val() || '').toLowerCase();
    var shown = 0;
    $rows.each(function () {
      var $r = $(this);
      var okKind = kind === 'all' || (kind === 'reversed' ? $r.data('status') === 'Reversed' : kind === 'bill' ? $r.data('kind') === 'bill' : $r.data('dir') === kind);
      var okText = !q || String($r.data('name') + ' ' + $r.data('ref') + ' ' + $r.data('type')).toLowerCase().indexOf(q) !== -1;
      $r.prop('hidden', !(okKind && okText));
      if (okKind && okText) { shown += 1; }
    });
    $('#txCount').text('Showing ' + shown + ' of ' + $rows.length);
    $('#txEmpty').prop('hidden', shown > 0);
    $('#txTable').prop('hidden', shown === 0);
  }
  $('#txFilters').on('click', '.chip', function () {
    $(this).addClass('is-on').attr('aria-pressed', 'true').siblings().removeClass('is-on').attr('aria-pressed', 'false');
    filterRows();
  });
  $('#txSearch').on('input', filterRows);

  $('#receipt').on('show.bs.modal', function (e) {
    var $r = $(e.relatedTarget).closest('tr'), $m = $(this);
    var amount = Number($r.data('amount')), fee = Number($r.data('fee')) || 0;
    var status = String($r.data('status'));
    $m.find('[data-r="amount"]').text((amount > 0 ? '+' : '−') + money(Math.abs(amount)));
    $m.find('[data-r="name"]').text($r.data('name'));
    $m.find('[data-r="status"]').text(status).attr('class', 'pill ' + (status === 'Successful' ? 'pill--ok' : status === 'Pending' ? 'pill--wait' : status === 'Failed' ? 'pill--bad' : ''));
    $m.find('[data-r="type"]').text($r.data('type'));
    $m.find('[data-r="detail"]').text($r.data('detail'));
    $m.find('[data-r="when"]').text($r.data('when'));
    $m.find('[data-r="fee"]').text(fee ? money(fee) : 'Free');
    $m.find('[data-r="ref"]').text($r.data('ref'));
    $m.find('[data-copy]').data('copy', $r.data('ref'));
  });
  $(document).on('click', '[data-print]', function () {
    $('body').addClass('is-printing-receipt');
    window.print();
    setTimeout(function () { $('body').removeClass('is-printing-receipt'); }, 300);
  });

  /* ---------- 12. Card ----------
     CONNECT: card details must come from your card provider after the customer
     enters their PIN. Do not put a real card number in the page source. */
  $(document).on('click', '[data-card-flip]', function () {
    var $card = $($(this).data('card-flip'));
    var flipped = !$card.hasClass('is-flipped');
    $card.toggleClass('is-flipped', flipped);
    $card.find('.vcard__face--back').attr('aria-hidden', flipped ? 'false' : 'true');
    $card.find('.vcard__face--front').attr('aria-hidden', flipped ? 'true' : 'false');
    $(this).attr('aria-pressed', flipped ? 'true' : 'false').find('span').text(flipped ? 'Hide details' : 'Show details');
  });
  $(document).on('change', '[data-card-freeze]', function () {
    var $card = $($(this).data('card-freeze'));
    $card.toggleClass('is-frozen', this.checked);
    $('[data-card-state]').text(this.checked ? 'Frozen' : 'Active').attr('class', 'pill ' + (this.checked ? 'pill--wait' : 'pill--ok'));
    toast(this.checked ? 'Card frozen. No payments will go through.' : 'Card unfrozen.');
  });

  /* ---------- 13. Lists and tabs ---------- */
  $(document).on('click', '[data-read-all]', function () {
    $('.note.is-unread').removeClass('is-unread');
    $('[data-unread]').remove();
    toast('All caught up');
  });

  // Confirm before removing a saved recipient or a signed-in device
  var $removeTarget = null;
  $('#removeModal').on('show.bs.modal', function (e) {
    $removeTarget = $(e.relatedTarget).closest('[data-removable]');
    $(this).find('[data-remove-name]').text($removeTarget.data('removable'));
  });
  $(document).on('click', '[data-remove-confirm]', function () {
    if ($removeTarget) { $removeTarget.slideUp(200, function () { $(this).remove(); }); toast('Removed'); }
    window.bootstrap.Modal.getOrCreateInstance($('#removeModal')[0]).hide();
  });

  $(document).on('input', '[data-people-search]', function () {
    var q = $.trim(this.value).toLowerCase(), shown = 0;
    $($(this).data('people-search')).find('.person').each(function () {
      var hit = $(this).text().toLowerCase().indexOf(q) !== -1;
      $(this).prop('hidden', !hit); if (hit) { shown += 1; }
    });
    $('[data-people-empty]').prop('hidden', shown > 0);
  });

  // bills.html#data or settings.html#security opens that tab
  $(function () {
    if (!window.location.hash || !window.bootstrap) { return; }
    var trigger = document.querySelector('[data-bs-toggle][data-bs-target="' + window.location.hash + '-pane"]');
    if (trigger) { window.bootstrap.Tab.getOrCreateInstance(trigger).show(); }
  });

  // send-money.html?to=chidi fills in a saved recipient (template only)
  $(function () {
    var m = /[?&]to=([^&]+)/.exec(window.location.search);
    var $person = m ? $('[data-recipient="' + m[1].replace(/[^a-z]/gi, '') + '"]') : $();
    if (!$person.length || !$('#sendBank').length) { return; }
    $('#sendBank').val($person.data('bank'));
    $('#sendAccount').val($person.data('account')).data('name', $person.data('name')).trigger('input');
    $('#sendAmount').trigger('focus');
  });
})(jQuery);
