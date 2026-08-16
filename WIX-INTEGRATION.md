# Wix integration — Start Web Programmer

Do **not** embed WebUSB JavaScript inside Wix HTML widgets or Velo. The Wix iframe will block `navigator.usb`.

## What to add on the product / support page

1. Place a button or link, e.g. **“Start Web Programmer”**.
2. Point it to the GitHub Pages URL of this app (replace with your final URL after Pages is enabled):

   `https://scorpiopraxis.github.io/DtronicsWebProgrammer/`

3. Open in a **new tab**:

### Link (simplest)

```html
<a href="https://scorpiopraxis.github.io/DtronicsWebProgrammer/" target="_blank" rel="noopener noreferrer">
  Start Web Programmer
</a>
```

### Wix Button

1. Add a **Button**.
2. Link → **Web address** → paste the GitHub Pages URL.
3. Enable **Open in a new tab** (or equivalent).

## Checklist

- [ ] CTA visible on [dt-drum-expansion](https://www.dtronics.nl/dt-drum-expansion) (or support page)
- [ ] Opens GitHub Pages URL in a new tab
- [ ] No WebUSB code inside Wix embeds
