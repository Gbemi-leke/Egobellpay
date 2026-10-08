# EgoBellPay app template (signed-in area)

Static HTML template for everything a customer sees after signing in.
Built on Bootstrap 5.3 and jQuery 3.7, on the same design system as the website template.

## Pages

| File | What it is |
|---|---|
| `dashboard.html` | Home: balance, shortcuts, recent activity, 7-day spending, savings target, send again |
| `send-money.html` | Transfer to a bank account or an EgoBellPay tag |
| `add-money.html` | Account details for bank transfer, card top-up, get paid by tag |
| `bills.html` | Airtime, data, electricity, cable TV |
| `savings.html` | Savings targets: create, add money, withdraw |
| `cards.html` | Virtual card: details, fund, freeze, controls |
| `transactions.html` | Full activity with search, filters and receipts |
| `beneficiaries.html` | Saved recipients: search, add, remove |
| `referrals.html` | Invite code, share buttons, people invited |
| `notifications.html` | Notification list |
| `settings.html` | Profile, password and PIN, identity and limits (with CAC uploads), alerts |
| `support.html` | Contact options, common questions, report a problem |

Assets: `assets/css/app.css`, `assets/js/app.js`, `assets/img/` (logo, favicon, touch icon).
`app.css` is complete on its own. These pages do not load the website's `style.css`.

## Viewing it

Open `dashboard.html` in a browser. "Sign out" links to `login.html`, which lives in the
website template. Copy these files into the same folder as the website template and the
link works (no file names clash).

## Everything is sample data

Names, balances, fees, limits, bundle and package prices, rewards, the card digits and
"Partner Bank" are placeholders. Replace them with real values from your views.

The JavaScript never moves money, never works out a real balance, and never stores a PIN,
password or card number in the browser. Search `app.js` for `CONNECT` to find each place
that needs a real request.

Template behaviours worth knowing:

- Any form with `data-pay` opens the pay sheet: review, PIN, done. Any 4 digits "work".
  Enter `0000` to see the wrong-PIN state.
- Account, tag, meter and smartcard lookups always "find" the name in the field's `data-name`.
- Forms with `data-form` show a loading state and a success message, then reset.
- Forms with `data-native` are checked in the browser and then submitted normally. Use this
  for real Django forms.
- The activity filter and search work on the rows in the page. In Django these become
  query-string parameters handled by the view.
- Only one thing is saved in the browser: whether the balance is hidden.

## Moving it into Django

1. Copy the HTML files to `templates/backend/` and the `assets` folders to
   `static/backend/css`, `static/backend/js`, `static/backend/img`.
2. Put `{% load static %}` at the top of each page and change asset paths, for example
   `assets/css/app.css` becomes `{% static 'backend/css/app.css' %}`.
3. The sidebar, header, bottom tabs, icon sprite and pay sheet are identical on every page.
   Move them into one `base.html` and let each page fill a `{% block content %}`.
4. Change page links such as `send-money.html` to `{% url %}` tags.
5. Make "Sign out" a POST form with `{% csrf_token %}`, so a link alone cannot sign someone out.
6. Every form needs `{% csrf_token %}` and `method="post"`.

## Rules for the real build

- The server decides fees, totals, limits and balances. Never trust a figure sent by the page.
- Check the PIN on the server, with a lockout after repeated wrong tries.
- Card details come from the card provider after a PIN check. Do not print a real card
  number into the page source.
- Every payment needs a unique reference so a double tap cannot pay twice.
