/**
 * Reliable client-side download that works from file:// and http(s)://.
 * Serializes the current page into a self-contained HTML blob with CSS inlined,
 * avoiding the `download` attribute quirks browsers apply to local files.
 *
 * CSS is embedded below so downloads are styled even when browsers block
 * reading cssRules of file:// stylesheets. Keep in sync with styles.css.
 */
(function () {
  const CSS_TEXT = `
:root{--bg:#0f1419;--bg-card:#1a2332;--bg-elevated:#243044;--text:#e8edf4;--text-muted:#94a3b8;--accent:#10b981;--accent-dim:#059669;--accent-glow:rgba(16,185,129,0.15);--border:rgba(148,163,184,0.12);--danger:#f87171;--font:"Inter",system-ui,-apple-system,sans-serif;--font-display:"Inter",system-ui,sans-serif;--radius:12px;--shadow:0 24px 48px rgba(0,0,0,0.35)}
*,*::before,*::after{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;font-family:var(--font);font-size:16px;line-height:1.6;color:var(--text);background:var(--bg);-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.site-header{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:0.85rem 1.5rem;background:rgba(15,20,25,0.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--border)}
.site-logo{display:flex;align-items:center;gap:0.6rem;font-weight:700;font-size:1.05rem;color:var(--text);text-decoration:none}.site-logo:hover{text-decoration:none}.site-logo span{font-size:1.35rem}
.site-nav{display:flex;flex-wrap:wrap;gap:0.35rem 1rem}.site-nav a{font-size:0.875rem;font-weight:500;color:var(--text-muted);text-decoration:none;padding:0.35rem 0}.site-nav a:hover,.site-nav a.active{color:var(--accent);text-decoration:none}
.container{max-width:960px;margin:0 auto;padding:2.5rem 1.5rem 4rem}.container-wide{max-width:1200px;margin:0 auto;padding:2rem 1.5rem 4rem}
h1,h2,h3,h4{font-family:var(--font-display);line-height:1.2;font-weight:700;letter-spacing:-0.02em}
h1{font-size:clamp(2rem,5vw,2.75rem);margin:0 0 0.5rem}h2{font-size:clamp(1.5rem,3vw,2rem);margin:2.5rem 0 1rem;color:var(--text)}h3{font-size:1.15rem;margin:1.75rem 0 0.75rem;color:var(--accent)}
.lead{font-size:1.15rem;color:var(--text-muted);max-width:42rem}
.eyebrow{display:inline-block;font-size:0.75rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--accent);margin-bottom:0.75rem}
.card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem;margin:1rem 0}
.card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem;margin:1.5rem 0}
.stat-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem 1.5rem}
.stat-card .label{font-size:0.8rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em}
.stat-card .value{font-size:1.75rem;font-weight:700;color:var(--accent);margin-top:0.25rem}
.stat-card .sub{font-size:0.85rem;color:var(--text-muted);margin-top:0.25rem}
.table-wrap{overflow-x:auto;margin:1.25rem 0;border-radius:var(--radius);border:1px solid var(--border)}
table{width:100%;border-collapse:collapse;font-size:0.9rem}
th,td{padding:0.65rem 1rem;text-align:left;border-bottom:1px solid var(--border)}
th{background:var(--bg-elevated);font-weight:600;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.04em;color:var(--text-muted)}
tr:last-child td{border-bottom:none}tr:hover td{background:rgba(16,185,129,0.04)}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
.negative{color:var(--danger)}.positive{color:var(--accent)}
ul,ol{padding-left:1.25rem}li{margin:0.4rem 0}
blockquote{margin:1.5rem 0;padding:1rem 1.25rem;border-left:3px solid var(--accent);background:var(--accent-glow);border-radius:0 var(--radius) var(--radius) 0;font-style:italic;color:var(--text-muted)}
.hero{text-align:center;padding:3rem 1.5rem 2rem}
.hero h1{background:linear-gradient(135deg,#fff 0%,var(--accent) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero-actions{display:flex;flex-wrap:wrap;gap:0.75rem;justify-content:center;margin-top:2rem}
.btn{display:inline-flex;align-items:center;gap:0.5rem;padding:0.75rem 1.35rem;font-size:0.9rem;font-weight:600;border-radius:8px;border:none;cursor:pointer;text-decoration:none;transition:transform 0.15s,box-shadow 0.15s}
.btn:hover{text-decoration:none;transform:translateY(-1px)}
.btn-primary{background:var(--accent);color:#0f1419}.btn-primary:hover{box-shadow:0 8px 24px var(--accent-glow)}
.btn-secondary{background:var(--bg-elevated);color:var(--text);border:1px solid var(--border)}
.doc-card{display:block;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.75rem;text-decoration:none;color:inherit;transition:border-color 0.2s,transform 0.15s}
.doc-card:hover{border-color:var(--accent);transform:translateY(-2px);text-decoration:none}
.doc-card h3{margin:0 0 0.5rem;color:var(--text)}.doc-card p{margin:0;font-size:0.9rem;color:var(--text-muted)}
.doc-card .tag{display:inline-block;margin-top:1rem;font-size:0.75rem;font-weight:600;color:var(--accent)}
.deck-body{overflow:hidden;height:100vh}
.deck-controls{position:fixed;bottom:1.25rem;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:1rem;padding:0.5rem 1rem;background:rgba(26,35,50,0.95);border:1px solid var(--border);border-radius:999px;z-index:200;font-size:0.85rem;color:var(--text-muted)}
.deck-controls button{background:var(--bg-elevated);border:1px solid var(--border);color:var(--text);width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:1rem}
.deck-controls button:hover{border-color:var(--accent);color:var(--accent)}
.slides{height:100vh;overflow:hidden;position:relative}
.slide{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:3rem 4rem 5rem;opacity:0;pointer-events:none;transition:opacity 0.35s ease}
.slide.active{opacity:1;pointer-events:auto}
.slide-inner{max-width:900px;margin:0 auto;width:100%}
.slide-num{position:absolute;top:1.5rem;right:2rem;font-size:0.8rem;color:var(--text-muted)}
.slide h2{font-size:clamp(1.75rem,4vw,2.5rem);margin:0 0 1.25rem}
.slide ul{font-size:1.1rem;line-height:1.7}
.slide .subtitle{font-size:1.35rem;color:var(--accent);font-weight:500;margin-bottom:2rem}
.slide-title h1{font-size:clamp(2.5rem,6vw,4rem);margin-bottom:0.5rem}
.slide-title .domain{font-size:1.25rem;color:var(--accent);margin:1rem 0 2rem}
.slide-title .ask{display:inline-block;margin-top:2rem;padding:0.5rem 1rem;background:var(--accent-glow);border:1px solid var(--accent);border-radius:8px;font-weight:600}
.slide table{font-size:0.95rem}
.slide .principle{margin-top:1.5rem;padding:0.75rem 1rem;background:var(--accent-glow);border-radius:8px;font-weight:600;color:var(--accent)}
.slide .product-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin:1.5rem 0}
.slide .product-placeholder{aspect-ratio:16/10;background:var(--bg-elevated);border:1px dashed var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:0.8rem;color:var(--text-muted);text-align:center;padding:1rem}
.slide .use-of-funds{display:grid;grid-template-columns:repeat(5,1fr);gap:0.75rem;margin-top:1.5rem}
.slide .fund-bar{text-align:center}.slide .fund-bar .pct{font-size:1.5rem;font-weight:700;color:var(--accent)}
.slide .fund-bar .bar{height:80px;background:var(--bg-elevated);border-radius:6px 6px 0 0;margin:0.5rem 0;position:relative;overflow:hidden}
.slide .fund-bar .bar-fill{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(180deg,var(--accent) 0%,var(--accent-dim) 100%);border-radius:6px 6px 0 0}
.chart-row{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin:2rem 0}
@media(max-width:768px){.chart-row{grid-template-columns:1fr}.slide{padding:2rem 1.5rem 5rem}.slide .product-grid{grid-template-columns:1fr}.slide .use-of-funds{grid-template-columns:repeat(2,1fr)}}
.chart-box{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem}
.chart-box h4{margin:0 0 1rem;font-size:0.9rem;color:var(--text-muted)}
.chart-canvas{width:100%;height:220px}
.section-divider{height:1px;background:var(--border);margin:2.5rem 0}
.badge{display:inline-block;padding:0.2rem 0.6rem;font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;background:var(--accent-glow);color:var(--accent);border-radius:4px}
.competition-table td:first-child{font-weight:600}.competition-table .yes{color:var(--accent)}.competition-table .no{color:var(--text-muted)}
.download-bar{display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem;margin-left:auto}
.btn-download{display:inline-flex;align-items:center;gap:0.35rem;padding:0.45rem 0.85rem;font-size:0.8rem;font-weight:600;border-radius:6px;background:var(--bg-elevated);color:var(--text);border:1px solid var(--border);text-decoration:none;cursor:pointer;white-space:nowrap}
.btn-download:hover{border-color:var(--accent);color:var(--accent);text-decoration:none}
.doc-card-actions{display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:1rem}.doc-card-actions .btn-download{font-size:0.75rem;padding:0.4rem 0.75rem}
@media print{.site-header,.deck-controls,.hero-actions,.no-print,.download-bar{display:none !important}body{background:#fff;color:#111}.slide{position:relative;opacity:1 !important;page-break-after:always;height:auto;min-height:100vh}.deck-body{height:auto;overflow:visible}.slides{height:auto;overflow:visible}.card,.stat-card{border:1px solid #ddd;background:#f9f9f9}}
`;

  function serialize() {
    const clone = document.documentElement.cloneNode(true);

    // Remove local stylesheet <link>s (keep font links).
    clone.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
      const href = l.getAttribute("href") || "";
      if (!/fonts\.googleapis|fonts\.gstatic/.test(href)) l.remove();
    });

    // Remove download UI and helper scripts from the saved copy.
    clone.querySelectorAll(".download-bar").forEach((el) => el.remove());
    clone.querySelectorAll("script").forEach((s) => {
      const src = s.getAttribute("src") || "";
      if (/download\.js|charts\.js/.test(src)) s.remove();
    });

    const head = clone.querySelector("head");
    if (head) {
      const style = document.createElement("style");
      style.textContent = CSS_TEXT;
      head.appendChild(style);
    }

    return "<!DOCTYPE html>\n" + clone.outerHTML;
  }

  function triggerBlob(content, filename, mime) {
    const blob = new Blob([content], { type: mime + ";charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function download(filename) {
    triggerBlob(serialize(), filename, "text/html");
  }

  function downloadText(text, filename, mime) {
    triggerBlob(text, filename, mime || "text/plain");
  }

  window.TailorSendDownload = { download, downloadText };

  // Static investor pages do not receive Next.js Fast Refresh. During local
  // development, watch the sync marker and reload after a source file changes.
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    let reloadVersion;

    async function checkForDocChanges() {
      try {
        const response = await fetch(`/docs/__reload.txt?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!response.ok) return;

        const nextVersion = (await response.text()).trim();
        if (reloadVersion && nextVersion !== reloadVersion) {
          window.location.reload();
          return;
        }

        reloadVersion = nextVersion;
      } catch {
        // The dev server may be restarting; retry on the next interval.
      }
    }

    void checkForDocChanges();
    window.setInterval(checkForDocChanges, 750);
  }
})();
