

# Fix Google Sign-In

## Problem
The "Continue with Google" button uses `supabase.auth.signInWithOAuth()` directly, which doesn't work with Lovable Cloud's managed Google OAuth. Lovable Cloud provides its own OAuth handler that must be used instead.

## Solution
1. **Run the Configure Social Auth tool** to generate the Lovable Cloud auth integration module (`src/integrations/lovable/`).
2. **Update `src/pages/Auth.tsx`** to import and use `lovable.auth.signInWithOAuth("google", ...)` instead of `supabase.auth.signInWithOAuth(...)`.

## Changes

### `src/pages/Auth.tsx`
- Add import: `import { lovable } from "@/integrations/lovable/index";`
- Replace the `handleGoogleSignIn` function body:
  - **Before**: `supabase.auth.signInWithOAuth({ provider: "google", ... })`
  - **After**: `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`

No other files or logic need to change. The button, loading states, and error handling remain the same.

