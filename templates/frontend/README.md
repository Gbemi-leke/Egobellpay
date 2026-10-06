# EgoBellPay website template

Bootstrap 5.3 + jQuery 3.7, no build step. Open `index.html` in a browser.

## Pages

| File | What it is |
|---|---|
| `index.html` | Home page |
| `login.html` | Sign in |
| `register.html` | Account opening wizard (personal and business) |
| `forgot-password.html` | Password reset request |
| `about.html` | About |
| `contact.html` | Contact form and support channels |
| `api-docs.html` | API documentation |
| `privacy.html`, `terms.html` | Legal pages (text carried over from v1) |
| `404.html` | Not-found page |

## Files

```
assets/css/style.css   tokens, home page, shared nav and footer, animations
assets/css/pages.css   inner pages: forms, wizard, uploads, docs, legal
assets/js/main.js      nav, scroll effects, reveals, home page demos
assets/js/pages.js     validation, register wizard, uploads, PIN boxes, docs tabs
```

Bootstrap, jQuery and the fonts load from CDNs.

## Connecting the forms

No form talks to a server yet. Every submit goes through one function,
`send(endpoint, formData)`, at the top of `assets/js/pages.js`. It currently
waits 0.9 seconds and reports success so you can see the loading and success
states. Replace it with a real request to your backend.

| Form | Endpoint passed to `send` |
|---|---|
| Sign in | `/auth/login` |
| Forgot password | `/auth/forgot-password` |
| Register | `/auth/register` (multipart, includes the uploaded files and the PIN) |
| Contact | `/contact` |

The browser checks in `pages.js` are for convenience only. Validate everything
again on the server, hash the PIN and password there, and never store a PIN,
BVN or NIN in the browser.

## Register wizard

Steps: account type, your details, identity, business documents (business
accounts only), security, review. `register.html?type=business` preselects the
business path. Uploads accept PDF, JPG or PNG up to 5 MB (`MAX_BYTES` and
`ALLOWED` in `pages.js`).

## Before launch

- `api-docs.html` describes a planned v2 API. The base URL, paths and fields
  are placeholders until the backend exists.
- `privacy.html` and `terms.html` show `Last updated: [DATE]`. Set the real
  date and have the text reviewed.
- Confirm the email addresses, WhatsApp number and RC number in the footer,
  About and Contact pages.
