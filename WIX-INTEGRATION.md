# Wix integration — Start Web Programmer

Do **not** embed WebUSB / Web Serial JavaScript inside Wix HTML widgets or Velo. The Wix iframe will block `navigator.usb` and `navigator.serial`.

The CTA is only a **link** that opens this app in a **new tab**:

`https://scorpiopraxis.github.io/DtronicsWebProgrammer/`

## Designed CTA (recommended)

Orange pill button, matching the web app (`#e85d04`, DT-mark, “Start Web Programmer”).

### Option A — HTML embed (hover, sharp text)

1. In Wix: **Add** → **Embed Code** → **Embed HTML**.
2. Paste the contents of [`wix-cta.html`](./wix-cta.html) (or the snippet below).
3. Set the widget size to about **420 × 88** px.
4. Set the embed background to **transparent** if Wix offers that.

```html
<a href="https://scorpiopraxis.github.io/DtronicsWebProgrammer/" target="_blank" rel="noopener noreferrer"
   style="display:inline-flex;align-items:center;gap:14px;padding:12px 22px 12px 12px;text-decoration:none;color:#fff;background:linear-gradient(180deg,#f06a14,#e85d04);border-radius:999px;font-family:'DM Sans',system-ui,sans-serif;box-shadow:0 10px 28px rgba(232,93,4,.35)">
  <span style="display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:rgba(12,16,20,.22);font-weight:700">DT</span>
  <span>
    <span style="display:block;font-size:16px;font-weight:700">Start Web Programmer</span>
    <span style="display:block;margin-top:3px;font-size:12px;opacity:.88">Chrome or Edge · no install</span>
  </span>
</a>
```

### Option B — image button (simplest in Wix)

1. Upload [`wix-cta.svg`](./wix-cta.svg) (or a PNG export of it).
2. Add it as an **Image**.
3. Link → **Web address** → GitHub Pages URL.
4. Enable **Open in a new tab**.

### Option C — native Wix Button

If you keep the built-in Wix button:

| Setting | Value |
|--------|--------|
| Label | `Start Web Programmer` |
| Fill | `#E85D04` |
| Text | `#FFFFFF` |
| Corners | fully rounded |
| Hover | `#F06A14` |
| Link | GitHub Pages URL, new tab |

## Checklist

- [x] CTA visible on [dt-drum-expansion](https://www.dtronics.nl/dt-drum-expansion) (or support page)
- [x] Opens GitHub Pages URL in a new tab
- [x] No WebUSB / Web Serial code inside Wix embeds
