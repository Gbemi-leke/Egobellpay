/* ==========================================================
   EgoBellPay — inner pages (jQuery 3.7). Loads after main.js.
   1. API stub            5. Uploads
   2. Validation          6. PIN boxes
   3. Simple forms        7. Register wizard
   4. Password toggle     8. API docs (tabs + copy)

   Nothing here is saved in the browser. PINs, BVNs and passwords
   must only ever be sent to your server over HTTPS.
   ========================================================== */
(function ($) {
  'use strict';

  /* ---------- 1. API stub ----------
     TODO: replace with a real request to your backend, for example:
       return $.ajax({ url: API_BASE + endpoint, method: 'POST', data: formData,
                       processData: false, contentType: false });
     Until then every form "succeeds" after a short delay so you can see
     the loading and success states. */
  var API_BASE = '/api/v1';
  function send(endpoint, formData) {
    var d = $.Deferred();
    if (window.console) { console.warn('[EgoBellPay template] ' + API_BASE + endpoint + ' is not connected yet.'); }
    setTimeout(function () { d.resolve({ ok: true }); }, 900);
    return d.promise();
  }

  /* ---------- 2. Validation ---------- */
  var RULES = {
    email:    function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || 'Enter a valid email address, like name@example.com.'; },
    phone:    function (v) { return /^(?:\+?234|0)[789][01]\d{8}$/.test(v.replace(/[\s-]/g, '')) || 'Enter a Nigerian mobile number, like 0803 123 4567.'; },
    bvn:      function (v) { return /^\d{11}$/.test(v) || 'Your BVN is 11 digits.'; },
    nin:      function (v) { return /^\d{11}$/.test(v) || 'Your NIN is 11 digits.'; },
    rc:       function (v) { return /^(RC|BN|IT)?[\s-]?\d{4,9}$/i.test(v.trim()) || 'Enter the number on your CAC certificate, like RC 1234567.'; },
    password: function (v) { return (v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v)) || 'Use at least 8 characters with a letter and a number.'; },
    adult:    function (v) {
      var d = new Date(v);
      if (isNaN(d.getTime())) { return 'Enter your date of birth.'; }
      var cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 18);
      return d <= cutoff || 'You need to be 18 or older to open an account.';
    }
  };

  function setError($el, message) {
    var $fb = $el.closest('.field, .form-check').find('.invalid-feedback').first();
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
      var res = RULES[rule](v);
      if (res !== true) { return setError($el, res); }
    }
    var match = $el.data('match');
    if (match && v !== $(match).val()) { return setError($el, 'The two entries do not match.'); }
    return setError($el, '');
  }

  function validateWithin($scope) {
    var ok = true;
    var $first = null;
    $scope.find('input, select, textarea').not('[type=file], [type=radio], .pin input').each(function () {
      if (!validateField(this)) { ok = false; if (!$first) { $first = $(this); } }
    });
    $scope.find('.upload').each(function () {
      if (!validateUpload($(this))) { ok = false; if (!$first) { $first = $(this).find('input'); } }
    });
    $scope.find('.pin').each(function () {
      if (!validatePin($(this))) { ok = false; if (!$first) { $first = $(this).find('input').first(); } }
    });
    if ($first) { $first.trigger('focus'); }
    return ok;
  }

  // Re-check a field once the person leaves it. The short delay matters: showing or hiding
  // an error moves the layout, and doing that mid-click would make the click miss its button.
  $(document).on('blur change', '.field input, .field select, .field textarea, .form-check input', function () {
    var el = this;
    if ($(el).is('[type=file]') || $(el).closest('.pin').length) { return; }
    setTimeout(function () {
      if ($(el).hasClass('is-invalid') || $.trim($(el).val() || '')) { validateField(el); }
    }, 180);
  });

  // Digits only for BVN, NIN and similar
  $(document).on('input', '[data-digits]', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, Number($(this).data('digits')) || 99);
  });

  /* ---------- 3. Simple forms (login, forgot password, contact) ---------- */
  $('form[data-form]').on('submit', function (e) {
    e.preventDefault();
    var $form = $(this);
    var $btn = $form.find('[type=submit]');
    var $status = $form.find('.form-status').removeClass('is-ok is-error').text('');
    if (!validateWithin($form)) { return; }

    $btn.addClass('is-loading').prop('disabled', true);
    send($form.data('endpoint'), new FormData(this)).then(function () {
      $status.addClass('is-ok').text($form.data('success') || 'Done.');
      if ($form.data('form') !== 'login') { $form[0].reset(); }
      var next = $form.data('redirect');
      if (next) { window.location.href = next; }
    }, function () {
      $status.addClass('is-error').text('Something went wrong. Check your connection and try again.');
    }).always(function () {
      $btn.removeClass('is-loading').prop('disabled', false);
    });
  });

  // Forms the server handles itself (sign in): check the fields, then let the browser submit
  $('form[data-native]').on('submit', function (e) {
    var $form = $(this);
    if (!validateWithin($form)) { e.preventDefault(); return; }
    $form.find('[type=submit]').addClass('is-loading');
  });
  // Coming back with the Back button should not leave the spinner running
  $(window).on('pageshow', function () { $('form[data-native] [type=submit]').removeClass('is-loading'); });
  
  /* ---------- 4. Password show / hide ---------- */
  $(document).on('click', '.pw__toggle', function () {
    var $input = $(this).siblings('input');
    var show = $input.attr('type') === 'password';
    $input.attr('type', show ? 'text' : 'password');
    $(this).text(show ? 'Hide' : 'Show').attr('aria-pressed', show ? 'true' : 'false');
  });

  /* ---------- 5. Uploads ---------- */
  var MAX_BYTES = 5 * 1024 * 1024;
  var ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];

  function prettySize(bytes) {
    return bytes < 1024 * 1024 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  function uploadError($zone, message) {
    $zone.toggleClass('is-invalid', !!message);
    $zone.closest('.field').find('.invalid-feedback').text(message || '').toggle(!!message);
    return !message;
  }

  function validateUpload($zone) {
    var input = $zone.find('input[type=file]')[0];
    if (!input || input.disabled) { return true; }
    var file = input.files && input.files[0];
    if (!file) { return uploadError($zone, input.required ? 'Add this document to continue.' : ''); }
    if ($.inArray(file.type, ALLOWED) === -1) { return uploadError($zone, 'Use a PDF, JPG or PNG file.'); }
    if (file.size > MAX_BYTES) { return uploadError($zone, 'That file is ' + prettySize(file.size) + '. The limit is 5 MB.'); }
    return uploadError($zone, '');
  }

  function refreshUpload($zone) {
    var input = $zone.find('input[type=file]')[0];
    var file = input.files && input.files[0];
    var $title = $zone.find('.upload__title');
    var $meta = $zone.find('.upload__meta');
    if (!$title.data('default')) { $title.data('default', $title.text()); $meta.data('default', $meta.text()); }
    if (file) {
      $zone.addClass('has-file'); $title.text(file.name); $meta.text(prettySize(file.size));
    } else {
      $zone.removeClass('has-file'); $title.text($title.data('default')); $meta.text($meta.data('default'));
    }
  }

  $(document).on('change', '.upload input[type=file]', function () {
    var $zone = $(this).closest('.upload');
    refreshUpload($zone);
    if (!validateUpload($zone)) { this.value = ''; refreshUpload($zone); }
  });
  $(document).on('dragover dragenter', '.upload', function () { $(this).addClass('is-drag'); });
  $(document).on('dragleave dragend drop', '.upload', function () { $(this).removeClass('is-drag'); });
  $(document).on('click', '.upload__clear', function (e) {
    e.preventDefault();
    var $zone = $(this).closest('.upload');
    $zone.find('input[type=file]').val('');
    refreshUpload($zone); uploadError($zone, '');
  });

  /* ---------- 6. PIN boxes ---------- */
  function pinValue($pin) {
    return $pin.find('input').map(function () { return this.value; }).get().join('');
  }
  function pinError($pin, message) {
    $pin.toggleClass('is-invalid', !!message);
    $pin.closest('.field').find('.invalid-feedback').text(message || '').toggle(!!message);
    return !message;
  }
  function validatePin($pin) {
    var v = pinValue($pin);
    if (!/^\d{4}$/.test(v)) { return pinError($pin, 'Enter all 4 digits.'); }
    if (/^(\d)\1{3}$/.test(v) || v === '1234' || v === '4321') { return pinError($pin, 'That PIN is too easy to guess. Choose another.'); }
    var match = $pin.data('match');
    if (match && v !== pinValue($(match))) { return pinError($pin, 'The two PINs do not match.'); }
    return pinError($pin, '');
  }

  $(document).on('input', '.pin input', function () {
    this.value = this.value.replace(/\D/g, '').slice(-1);
    if (this.value) { $(this).next('input').trigger('focus'); }
    $(this).closest('.pin').removeClass('is-invalid');
  });
  $(document).on('keydown', '.pin input', function (e) {
    if (e.key === 'Backspace' && !this.value) { $(this).prev('input').trigger('focus'); }
  });
  $(document).on('paste', '.pin input', function (e) {
    var text = ((e.originalEvent.clipboardData || window.clipboardData).getData('text') || '').replace(/\D/g, '').slice(0, 4);
    if (!text) { return; }
    e.preventDefault();
    var $boxes = $(this).closest('.pin').find('input');
    $boxes.each(function (i) { this.value = text.charAt(i) || ''; });
    $boxes.eq(Math.min(text.length, 4) - 1).trigger('focus');
  });

  /* ---------- 7. Register wizard ---------- */
  var $wizard = $('#registerForm');
  if ($wizard.length) {
    var ALL_STEPS = ['type', 'details', 'identity', 'business', 'security', 'review'];
    var LABELS = { type: 'Account type', details: 'Your details', identity: 'Identity', business: 'Business documents', security: 'Security', review: 'Review' };
    var current = 'type';

    var isBusiness = function () { return $wizard.find('[name=account_type]:checked').val() === 'business'; };
    var stepList = function () { return isBusiness() ? ALL_STEPS : $.grep(ALL_STEPS, function (s) { return s !== 'business'; }); };

    // Business-only fields are disabled for personal accounts so they are neither validated nor sent
    var syncAccountType = function () {
      var biz = isBusiness();
      $wizard.find('.only-business').toggle(biz);
      $wizard.find('.only-business, [data-only=business]').find('input, select, textarea').prop('disabled', !biz);
      $wizard.find('.only-personal').toggle(!biz);
    };

    var maskId = function (v) { return v ? '•••• ••• ' + v.slice(-4) : ''; };

    var buildReview = function () {
      var $list = $('#reviewList').empty();
      var row = function (label, value) {
        if (!value) { return; }
        $('<div class="review__row">').append($('<dt>').text(label), $('<dd>').text(value)).appendTo($list);
      };
      row('Account type', isBusiness() ? 'Business' : 'Personal');
      $wizard.find('[data-review]').each(function () {
        var $f = $(this);
        if ($f.is(':disabled')) { return; }
        var v = $.trim($f.val() || '');
        if ($f.is('select')) { v = $f.val() ? $f.find('option:selected').text() : ''; }
        if ($f.data('mask')) { v = maskId(v); }
        row($f.data('review'), v);
      });
      $wizard.find('.upload').each(function () {
        var input = $(this).find('input[type=file]')[0];
        if (input.disabled || !input.files || !input.files[0]) { return; }
        row($(this).data('review'), input.files[0].name);
      });
      row('Transaction PIN', 'Set'); // the PIN itself is never shown
    };

    var show = function (step) {
      var list = stepList();
      var i = $.inArray(step, list);
      current = step;
      $wizard.find('.wizard__step').removeClass('is-active').filter('[data-step="' + step + '"]').addClass('is-active');
      $('#wizardCount').text('Step ' + (i + 1) + ' of ' + list.length);
      $('#wizardLabel').text(LABELS[step]);
      $('#wizardBar').css('width', ((i + 1) / list.length * 100) + '%');
      if (step === 'review') { buildReview(); }
      var top = $('.auth__card').offset().top - 24;
      if ($(window).scrollTop() > top) { window.scrollTo({ top: top, behavior: 'smooth' }); }
    };

    $wizard.on('change', '[name=account_type]', syncAccountType);

    $wizard.on('click', '[data-next]', function () {
      var $step = $wizard.find('.wizard__step.is-active');
      if (current === 'type' && !$wizard.find('[name=account_type]:checked').length) {
        $('#typeError').text('Choose an account type to continue.').show();
        return;
      }
      $('#typeError').hide();
      if (!validateWithin($step)) { return; }
      var list = stepList();
      show(list[$.inArray(current, list) + 1]);
    });

    $wizard.on('click', '[data-back]', function () {
      var list = stepList();
      show(list[Math.max(0, $.inArray(current, list) - 1)]);
    });

    $wizard.on('click', '[data-goto]', function () { show($(this).data('goto')); });

    $wizard.on('submit', function (e) {
      e.preventDefault();
      var $btn = $wizard.find('[type=submit]');
      var $status = $wizard.find('.form-status').removeClass('is-ok is-error').text('');
      if (!validateWithin($wizard.find('.wizard__step.is-active'))) { return; }

      var data = new FormData(this);
      data.set('pin', pinValue($('#pinNew'))); // sent once over HTTPS, never stored

      $btn.addClass('is-loading').prop('disabled', true);
      send('/auth/register', data).then(function () {
        $wizard.hide(); $('.wizard__progress').hide();
        $('#doneEmail').text($wizard.find('[name=email]').val());
        $('#registerDone').addClass('is-active');
        $wizard.find('.pin input').val('');
      }, function () {
        $status.addClass('is-error').text('We could not submit your application. Check your connection and try again.');
      }).always(function () {
        $btn.removeClass('is-loading').prop('disabled', false);
      });
    });

    // Start on the business path when the link says so: register.html?type=business
    if (/[?&]type=business\b/.test(window.location.search)) {
      $wizard.find('[name=account_type][value=business]').prop('checked', true);
    }
    syncAccountType();
    show('type');
  }

  /* ---------- 8. API docs: language tabs and copy ---------- */
  $(document).on('click', '.codebox__tab', function () {
    var lang = $(this).data('lang');
    // Switch every code sample on the page to the chosen language
    $('.codebox').each(function () {
      var $box = $(this);
      if (!$box.find('.codebox__tab[data-lang="' + lang + '"]').length) { return; }
      $box.find('.codebox__tab').removeClass('is-active').attr('aria-selected', 'false')
        .filter('[data-lang="' + lang + '"]').addClass('is-active').attr('aria-selected', 'true');
      $box.find('pre').removeClass('is-active').filter('[data-lang="' + lang + '"]').addClass('is-active');
    });
  });

  $(document).on('click', '.codebox__copy', function () {
    var $btn = $(this);
    var text = $btn.closest('.codebox').find('pre.is-active').text();
    var flash = function (label, ok) {
      $btn.text(label).toggleClass('is-copied', ok);
      setTimeout(function () { $btn.text('Copy').removeClass('is-copied'); }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { flash('Copied', true); }, function () { flash('Not copied', false); });
    } else {
      flash('Not copied', false);
    }
  });

})(jQuery);
