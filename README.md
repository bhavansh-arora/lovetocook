# Love to Cook: website redesign (Code Bunny)

A premium, multi-page website for **Love to Cook**, the cook school, bakery and pâtisserie of Sam Heeney-Governo at 16 King Street, Crieff. It has online booking, a live class calendar, gift vouchers, private-class enquiries and bakery pre-orders built in.

> Content (bio, credentials, address, phone, class sizes, photos and logo) comes from lovetocook.uk.
> **Class dates, prices, seat counts, bakery prices and testimonials are sample content** for the proposal and must be replaced with Sam's real data before launch (see checklist below).

## Pages

| File | Page |
|---|---|
| `index.html` | Home: hero, intro, three ways in, live upcoming classes, pinned bake gallery, booking steps, reviews, gift teaser, Instagram, FAQ |
| `classes.html` | Classes & Events: filterable grid and month calendar with live seats |
| `class.html?c=<id>` | Class detail: gallery, what you'll make/learn, the day, booking card, Event schema |
| `private.html` | Private lessons: formats and an interactive planner with an instant estimate |
| `bakery.html` | Bakery pre-orders with add-to-bag and collection |
| `gift.html` | Gift voucher builder with a live preview |
| `about.html` | Sam's story, a 7-chapter timeline, values and credentials |
| `contact.html` | Contact cards, form, map, policies |
| `for-sam.html` | Private pitch page for Sam (`noindex`, not linked in the navigation) |

## Features

- Booking bag and 3-step checkout (details, payment, confirmation) with a booking reference and a downloadable `.ics` calendar file
- Live seat counts ("2 of 8 seats left"), "almost full" flags, sold-out dates and an auto-waitlist
- Grid and calendar views, plus category filters
- Gift vouchers, bakery pre-orders and class seats all go through one bag
- Private-class planner that shows an estimate as guests choose options
- SEO: per-page titles and descriptions, LocalBusiness/Bakery JSON-LD, and Event JSON-LD for every class date
- Design: a bold, modern brand system. Condensed Bricolage Grotesque headlines, flat colour blocks in butter yellow, crust orange and dark chocolate, chunky pill buttons and rounded photo cards
- Motion, kept subtle: content fades up as it arrives, a slow ticker of bakes, a short "Love to Cook" loader on the first visit and a quick coloured wipe carrying the next page's name between pages. No animation libraries
- Accessibility: skip link, focus styles, ARIA on controls, `prefers-reduced-motion` support, and content that stays visible if JavaScript fails
- Responsive at every width (checked at 390, 834 and 1440px), with a sticky mobile booking bar

## Structure

```
src/partials/   head, header (+ SVG icon sprite), footer (+ drawer, modal)
src/pages/      page bodies with a <!--meta {...}--> header
assets/css/     main.css (layouts and components), brand.css (the visual design: type, colour, buttons, sections)
assets/js/      data.js (ALL editable content), site.js (UI), motion.js (animation)
assets/fonts/   Bricolage Grotesque and Inter Tight (self-hosted)
assets/img/     Sam's real photos (bakes upscaled 4x with EDSR from the site collage), logo variants, favicon, OG image
build.py        stitches partials and pages into the root *.html files
```

## Editing

- **Classes, dates, seats, prices, bakery menu, reviews, FAQs:** edit `assets/js/data.js`. No build step is needed.
- **Page copy and layout:** edit `src/pages/*.html` or `src/partials/*.html`, then run:

```bash
python3 build.py
```

- **Local preview:**

```bash
python3 -m http.server 8000
```

## Going live checklist

1. Replace the sample dates, prices, seats and bakery items in `data.js` with real ones, or generate them from the Square Catalog/Bookings API.
2. Switch `CONFIG.DEMO_MODE` to `false` in `site.js` and connect the Square Web Payments SDK in the payment step.
3. Set `CONFIG.FORM_ENDPOINT` (Formspree, Netlify Forms or your own API) for the contact, enquiry, waitlist and newsletter forms.
4. Ask Sam for her original, full-resolution bake photos. The current ones are upscaled crops of a single 1536px collage.
5. Replace the sample testimonials with real Google or Instagram reviews.
6. Confirm the bakery collection days and times, and the cancellation policy wording.
7. Deploy as a static site (Netlify, Vercel, Cloudflare Pages or GitHub Pages) and point lovetocook.uk at it, with redirects from the old Square URLs.

Site by [Code Bunny](https://web.codebunny.net/).
