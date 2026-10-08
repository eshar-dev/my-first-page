# Poof ✦

A tiny, whimsical stress-release ritual that takes about a minute:

1. **Share** what's weighing on you (or skip)
2. **Breathe** with a glowing orb: three rounds of 4s in, 4s hold, 6s out
3. **Affirmation**: one of 45 warm affirmations, never the same one twice in a row
4. **Release**: press and hold, and your words break into stardust and drift up into the sky
5. **Check in**: pick a mood and get a kind reply, then go again

Your daily streak and mood history are kept in `localStorage`. Nothing leaves the device.

## Stack

Plain HTML, CSS and vanilla JavaScript: no frameworks, no build step.

```
index.html          markup, SEO and Open Graph tags
styles.css          all styles (mobile-first, honours prefers-reduced-motion)
app.js              flow, breathing timer, particles, starry sky, storage
favicon.svg         icon
apple-touch-icon.png
og-image.png        1200×630 social preview
```

## Run locally

Any static server works:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy (Cloudflare Pages)

Connect the repo and use **no build command**, with the output directory set to `/` (repo root).

The Open Graph URLs in `index.html` assume `https://my-first-page.pages.dev/`. If your Pages project uses a different domain, update `og:url`, `og:image` and `twitter:image`.
