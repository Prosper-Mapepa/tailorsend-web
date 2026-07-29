# TailorSend Fill (Chrome extension)

Fills the **real** company apply page from answers generated in TailorSend. You still **review and submit** yourself on the employer’s site.

In-app guide: [/extension](https://tailorsend.cc/extension) (also `http://localhost:3000/extension`).

## Install (unpacked)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this folder: `extension/` (the one that contains `manifest.json`)
5. Pin **TailorSend Fill** if you like
6. Refresh TailorSend (`localhost:3000` or `https://tailorsend.cc`)

## Use

1. Open an application in TailorSend → **Apply** step
2. Generate / edit **Form answers**
3. Click **Fill with extension** (primary button on Apply)
4. Chrome opens the company apply URL and fills matching fields
5. If you’re still on a listing page, click **Apply** on that site, then use the green **Fill form** banner or the extension popup → **Re-fill active tab**
6. Review everything and **submit on the company site**

## Notes

- Resume and cover letter PDFs are generated in TailorSend and **auto-attached** to matching file inputs when possible (label heuristics: Resume/CV vs Cover letter). Always review the attach preview on the company site.
- Matching for text fields is by **label** text; unusual ATS layouts may need a second pass or copy-paste
- The extension must stay **enabled** while you use Fill
- Server “preview fill” remains available as a backup; it cannot control your Chrome tab in production

## Develop

Edit files under `extension/`, then on `chrome://extensions` click **Reload** on TailorSend Fill.
