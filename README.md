# Dtronics Web Programmer

Static web app for preparing and flashing **Dtronics DT Drum Expansion / DRUMPROG** sample images in the browser.

Live site (GitHub Pages):  
`https://scorpiopraxis.github.io/DtronicsWebProgrammer/`

Product page: [dtronics.nl/dt-drum-expansion](https://www.dtronics.nl/dt-drum-expansion)

## Features (v0.3.0)

1. **Sample file creator** — up to 16 × 32 KB raw samples → 512 KB image, `0xFF` padding, checksum
2. **Download combined file** — save the 512 KB `.bin` locally
3. **Flash over USB serial** — Web Serial at **38400 8N1** (same as the Windows app)
4. **Data received** — live log of bytes/text from the programmer while connected
5. **Help / About**

## Why a separate site?

The commercial site runs on **Wix**. Scripts there often run inside an **iframe**, which blocks serial/USB access. This tool is hosted as a **standalone HTTPS** page (GitHub Pages) and opened in a **new tab**.

## Requirements for end users

- Desktop **Google Chrome** or **Microsoft Edge**
- HTTPS (GitHub Pages) or `http://localhost` for local preview
- Page opened at **top level** (not inside an iframe)
- A serial/USB programmer that appears as a COM/serial port (same hardware as the Windows Sample Expansion App)

## Local preview

Serve the folder over HTTP (ES modules require a server, not `file://`):

```powershell
cd DtronicsWebProgrammer
npx --yes serve .
```

Then open the URL shown in the terminal (usually `http://localhost:3000`).

## Wix integration (CTA)

See [WIX-INTEGRATION.md](./WIX-INTEGRATION.md) for the button that opens this app with `target="_blank"`.

## Serial settings

Defined in `config.js` as `SERIAL_OPTIONS` — baud **38400**, 8 data bits, 1 stop bit, no parity. Transfer is a raw 512 KB write (chunked in the browser for progress), matching `SerialPort.BaseStream.WriteAsync` in the Windows app.

## Version bump

On each deploy, set `APP_VERSION` in `config.js` and the `?v=` query on CSS/JS links in `index.html` so browsers pick up the new build.

## License

© Engineers@work for Dtronics. All rights reserved.
