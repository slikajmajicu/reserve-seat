

## Visual Upgrade and Email Template Enhancement

### 1. Add Playfair Display Serif Font

- Add Google Font import for "Playfair Display" in `index.html` (preload + stylesheet)
- Add `font-serif` mapping in `tailwind.config.ts` pointing to `'Playfair Display', serif`
- Apply serif font to section headings ("Workshop Reservation", "Book Your Workshop") and keep Montserrat for form labels/body text

### 2. Add Framer Motion Animations (ReservationForm.tsx)

- Install `framer-motion` package
- Wrap the main form card in a `motion.div` with `whileInView` fade+slide-up animation (`initial={{ opacity: 0, y: 40 }}`, `whileInView={{ opacity: 1, y: 0 }}`)
- Wrap each form field in a `motion.div` with staggered entrance (0.1s delay increments using `transition={{ delay: index * 0.1 }}`)
- Add focus glow styles to inputs: a subtle amber-600 border-color and soft box-shadow on focus via Tailwind classes (`focus-within:ring-amber-500/30 focus-within:border-amber-600`)

### 3. Add Lucide Icons Inside Inputs (ReservationForm.tsx)

- Wrap each input in a relative container with an icon positioned at the start:
  - First Name / Last Name: `User` icon
  - Email: `Mail` icon
  - Phone Number: `Phone` icon
  - City: `MapPin` icon
- T-Shirt section: add `Shirt` icon next to the label
- Increase left padding on inputs (`pl-10`) to make room for icons
- Icons styled as `absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4`

### 4. Increase Vertical Spacing

- Change form `space-y-6` to `space-y-8` for more breathing room between fields

### 5. Update Email Template in Edge Function

Update the confirmation email HTML in `submit-reservation-request/index.ts` to include:
- Updated body text: "You confirmed your spot and it is secured."
- Cancellation policy paragraph: "If you need to cancel, please do so at least 24 hours in advance. For late cancellations or no-shows, a participation fee will be charged via a payment link sent to your email."
- Include the guest's message if provided

### 6. Update Success Toast

- Already says "Check your email for confirmation" -- will verify and keep consistent with the new email content

---

### Technical Details

**New dependency:** `framer-motion`

**Files to modify:**
- `index.html` -- add Playfair Display font link
- `tailwind.config.ts` -- add `serif` font family
- `src/components/ReservationForm.tsx` -- animations, icons, focus styles, spacing
- `supabase/functions/submit-reservation-request/index.ts` -- email template text update

**Input icon pattern:**
```tsx
<div className="relative">
  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input placeholder="John" {...field} className="h-11 pl-10" />
</div>
```

**Framer Motion stagger pattern:**
```tsx
import { motion } from "framer-motion";

const fieldVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: "easeOut" }
  })
};

// Per field:
<motion.div custom={index} initial="hidden" whileInView="visible" variants={fieldVariants} viewport={{ once: true }}>
  {/* form field */}
</motion.div>
```

**Focus glow CSS (added to input wrapper or via Tailwind):**
```css
focus-within:ring-2 focus-within:ring-amber-500/30 focus-within:border-amber-600
```

**Email template update (key paragraph change):**
```html
<p>Thank you for your reservation request for <strong>${formattedDate}</strong>.</p>
<p>You confirmed your spot and it is secured.</p>
<p style="...">CANCELLATION POLICY: If you need to cancel, please do so at least 24 hours in advance. For late cancellations or no-shows, a participation fee will be charged via a payment link sent to your email.</p>
```
