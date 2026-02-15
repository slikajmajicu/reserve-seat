

# Fix: Privacy Policy Page Not Showing Up

## Root Cause

There is an empty file called `privacy-policy` (no extension) at the project root. When the browser requests `/privacy-policy`, the server serves this empty file instead of `index.html`, so the React SPA never loads and the page is blank.

## Fix

**Delete the `privacy-policy` file** from the project root. Once removed, the `/privacy-policy` URL will correctly fall through to `index.html`, the React app will boot, and React Router will render the `PrivacyPolicy` component as expected.

No other code changes are needed -- the route, component, and footer link are all already correct.

## Technical Details

- File to delete: `privacy-policy` (root directory, 0 bytes)
- The route `/privacy-policy` is already defined in `src/App.tsx` (line 32)
- The component `src/pages/PrivacyPolicy.tsx` exists and is correct
- The footer link in `src/pages/Index.tsx` (line 122) already points to `/privacy-policy`

