# TailorSend Fill (Chrome extension)

Appears automatically on company apply pages. Fills answers from your TailorSend account, attaches resume/cover PDFs, and leaves **submit** to you.

In-app install: [/extension](https://tailorsend.cc/extension) — includes a **.zip download** for production users.

## Install (production)

1. Download the zip from https://tailorsend.cc/extension (or `/api/extension/download`)
2. Unzip → you get a `tailorsend-fill/` folder
3. Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → select `tailorsend-fill/`
4. Sign in at https://tailorsend.cc (the extension syncs your session automatically)

## Install (local/dev)

Load unpacked the repo’s `extension/` folder the same way.

## Use

1. Tailor a job in TailorSend
2. Open the company apply URL (Greenhouse, Lever, Ashby, career sites, …)
3. The **TailorSend** panel appears bottom-right
4. Click **Fill this form** → review → submit on the employer site

You can also use **Fill with extension** on the Apply step in TailorSend.

## Notes

- Requires being signed in on TailorSend so the extension can call `/api/applications/match` and `/fill-pack`
- Resume/cover PDFs are attached to matching file inputs when labels look like Resume/CV or Cover letter
- Server “preview fill” on Railway cannot control your Chrome tab and often hits ATS HTTP/2 blocks — prefer this extension in production

## Develop

Edit files under `extension/`, then on `chrome://extensions` click **Reload** on TailorSend Fill (v0.3.0+).
