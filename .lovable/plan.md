

# Fix Google OAuth Verification Issues

These issues come from Google's OAuth consent screen verification process, which checks your home page for specific requirements. There are 4 issues to fix plus a build error.

---

## Issue 1: Home page appears "behind a login"

The home page currently shows a loading spinner while checking auth, and redirects logged-in users away. Google's bot may interpret this as requiring login.

**Fix:** Remove the auth-check redirect from `Index.tsx`. The landing page should always render its public content. Authenticated users can still navigate to the dashboard via a button, but the page itself won't redirect.

## Issue 2: Home page doesn't explain the app's purpose

The landing page already has descriptive content, but the loading spinner before it appears may prevent Google's bot from seeing it. Fixing Issue 1 (removing the auth gate) resolves this as well.

## Issue 3: App name mismatch

The home page header shows "reserve-seat" -- this must match the name configured in your Google Cloud Console OAuth consent screen. No code change needed; just verify the name in Google Cloud Console matches "reserve-seat".

## Issue 4: No privacy policy link on home page

The footer in `Index.tsx` already has a privacy policy link (`/privacy-policy`). However, there is a broken `<footer>` tag in `index.html` using React-style `className` attributes (which don't work in plain HTML) and the "Privacy Policy" text was removed in a recent edit. This may confuse Google's bot. Fix: remove the broken footer from `index.html`.

## Build Error: `react-helmet` not found

Both `Index.tsx` and `Auth.tsx` import `react-helmet` but it has no type declarations installed. Fix: replace `react-helmet` with direct `document.title` or remove the import since the google-site-verification meta tag is already in `index.html`.

---

## Summary of Changes

### `src/pages/Index.tsx`
- Remove `useState`, `useEffect`, auth check, loading spinner, and redirect logic
- Remove `react-helmet` import and `Helmet` usage (the verification meta tag is already in `index.html`)
- Keep the full public landing page rendering unconditionally

### `src/pages/Auth.tsx`
- Remove `react-helmet` import and `Helmet` component (the meta tag with the placeholder value adds no benefit)

### `index.html`
- Remove the broken `<footer>` block after `</body>` (it uses React syntax and has no visible text)

