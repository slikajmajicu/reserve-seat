

## Global Theme Overhaul + Booking Form Updates

### Summary
Replace the current dark-primary theme with the new blue-based color palette extracted from the SVG, and update the booking form button text and add a no-commitment info banner.

### 1. Update CSS Variables (`src/index.css`)

Replace all `:root` CSS custom properties with values derived from the new palette:

| Variable | New HSL Value | Hex Equivalent |
|---|---|---|
| `--primary` | `214 100% 58%` | #277EFF |
| `--primary-foreground` | `0 0% 100%` | white |
| `--foreground` | `215 28% 27%` | #334155 |
| `--card-foreground` | `215 28% 27%` | #334155 |
| `--popover-foreground` | `215 28% 27%` | #334155 |
| `--muted-foreground` | `0 0% 46%` | #757575 |
| `--secondary` | `220 20% 97%` | #F8F9FB |
| `--muted` | `220 20% 97%` | #F8F9FB |
| `--accent` | `220 20% 97%` | #F8F9FB |
| `--border` | `0 0% 91%` | #E8E8E8 |
| `--input` | `0 0% 91%` | #E8E8E8 |
| `--ring` | `214 100% 58%` | #277EFF |
| `--destructive` | `0 100% 50%` | #FF0004 |

Also remove `class="dark"` from `<html>` in `index.html` if present.

### 2. Update Button Styles (`src/components/ui/button.tsx`)

Change the default variant hover to a slightly darker blue:
- `default`: `bg-primary text-primary-foreground hover:bg-[#1a6fe0]`
- `outline`: `border border-primary text-primary bg-background hover:bg-primary/5`
- Add `rounded-lg` to base styles for rounded corners

### 3. Update Homepage (`src/pages/Index.tsx`)

- **Hero section**: Apply indigo gradient background `bg-gradient-to-r from-[#4F46E5] to-[#818CF8]` with white text
- **Footer**: Dark slate background `bg-[#334155]` with white text
- **Nav header**: White background, `text-[#334155]` for text, primary blue for active/hover
- **Section alternation**: Use `bg-[#F8F9FB]` for alternating sections

### 4. Update Booking Form (`src/components/WorkshopCalendar.tsx`)

- **Button text**: Change "Submit Request" to "Request Details & Spot"
- **No-commitment note**: Add info banner below the button with `border-l-4 border-[#277EFF] bg-[#EEF5FF]` containing italic text: *"No payment required now. We'll email you the price and location details for your selected date."*
- **Input focus styles**: Change amber focus ring to `focus-visible:ring-[#277EFF]/30 focus-visible:border-[#277EFF]`

### 5. Update All Other Pages

Apply consistent theme across:
- **Auth.tsx**: Update gradient, keep card white with new border color
- **AdminLogin.tsx**: Same treatment
- **AdminResetPassword.tsx**: Same treatment
- **Admin.tsx**: Header white bg, dark slate text, primary blue accents
- **PrivacyPolicy.tsx / TermsOfService.tsx**: Updated gradients and heading colors
- **NotFound.tsx**: Consistent with new palette

### 6. Fix `index.html`

Remove `class="dark"` from `<html>` tag (line 2) -- this forces dark mode and overrides the light theme.

---

### Files to modify
- `index.html` -- remove `class="dark"`
- `src/index.css` -- new CSS variable values
- `src/components/ui/button.tsx` -- updated variant styles
- `src/pages/Index.tsx` -- hero gradient, footer dark bg, nav styling
- `src/components/WorkshopCalendar.tsx` -- button text, info banner, focus colors
- `src/pages/Auth.tsx` -- consistent gradients/colors
- `src/pages/Admin.tsx` -- header/accent colors
- `src/pages/AdminLogin.tsx` -- consistent theme
- `src/pages/AdminResetPassword.tsx` -- consistent theme
- `src/pages/PrivacyPolicy.tsx` -- consistent theme
- `src/pages/TermsOfService.tsx` -- consistent theme
- `src/pages/NotFound.tsx` -- consistent theme

