# Dtronics Web Programmer

Static web app for connecting to **Dtronics DT Drum Expansion / DRUMPROG** hardware via **WebUSB**.

Live site (GitHub Pages): after the first deploy, typically  
`https://scorpiopraxis.github.io/DtronicsWebProgrammer/`

Product page: [dtronics.nl/dt-drum-expansion](https://www.dtronics.nl/dt-drum-expansion)

## Why a separate site?

The commercial site runs on **Wix**. Scripts there often run inside an **iframe**, which blocks `navigator.usb` (missing Feature Policy `allow="usb"`). This tool is therefore hosted as a **standalone HTTPS** page (GitHub Pages) and opened in a **new tab**.

## Requirements for end users

- Desktop **Google Chrome** or **Microsoft Edge**
- HTTPS (GitHub Pages provides this)
- Page opened at **top level** (not inside an iframe)

## Local preview

Serve the folder over HTTP (modules require a server, not `file://`):

```powershell
cd DtronicsWebProgrammer
npx --yes serve .
```

Then open the URL shown in the terminal (usually `http://localhost:3000`).

## Wix integration (CTA)

See [WIX-INTEGRATION.md](./WIX-INTEGRATION.md) for the button that opens this app with `target="_blank"`.

## USB filters

Edit `config.js` and set `usbDeviceFilters` to your programmer’s Vendor/Product ID once known, for example:

```js
export const usbDeviceFilters = [{ vendorId: 0x1234, productId: 0x5678 }];
```

An empty array lets the user choose any USB device (useful while identifying IDs). After Connect, the UI shows the selected VID/PID.

## Roadmap

Related stories live in the private Windows-app repo (`DtronicsSampleExpansionApp`):

1. Hosting + WebUSB connect (this project)
2. Sample File Creator (16 × 32 KB → 512 KB)
3. Download combined file
4. Flash 512 KB via WebUSB
5. Device feedback log
6. Help / About

## License

© Engineers@work for Dtronics. All rights reserved.
