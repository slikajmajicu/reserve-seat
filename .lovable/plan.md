## Fix: Apply Missing Fields and Visual Upgrades to the Active Form

### Root Cause

The homepage (`/`) renders `WorkshopCalendar.tsx`, which contains its own inline reservation form. The fully upgraded `ReservationForm.tsx` (with phone number, T-shirt radio group, Framer Motion animations, Lucide icons) exists but is **not used anywhere in the app** -- it was commented out in `Index.tsx`.

### Solution

Update `WorkshopCalendar.tsx` to include the missing fields, validation, cancellation text, and visual enhancements -- matching all the requirements that were previously only applied to the unused `ReservationForm.tsx`.

### Changes to `src/components/WorkshopCalendar.tsx`

**1. Add missing form fields to the inline reservation form:**

- **Phone Number** (required): `<Input>` with phone validation, `Phone` Lucide icon
- **T-Shirt Option** (required): `RadioGroup` with two options:
  - `"own"` -- "I am bringing my own T-shirt"
  - `"buy_onsite"` -- "I will buy a T-shirt onsite"

**2. Add cancellation policy text:**

- Below the submit button, add muted text with `Info` icon: "Note: Reservations can be cancelled up to 24 hours before the event..."

**3. Pass new fields to the Edge Function:**

- Add `phone_number` and `tshirt_option` to the `submit-reservation-request` invocation body
- The Edge Function already validates these fields

**4. Add Lucide icons inside existing inputs:**

- Name field: `User` icon
- Email field: `Mail` icon
- Phone field: `Phone` icon
- Wrap inputs in relative containers with `pl-10` padding

**5. Apply Framer Motion animations:**

- Import `motion` from `framer-motion`
- Wrap the form card with fade+slide-up animation
- Stagger field entrances with 0.1s delays

**6. Apply Playfair Display serif font:**

- Use `font-serif` class on "Request a Reservation" heading (font is already loaded in `index.html` and configured in `tailwind.config.ts`)

### Changes to `supabase/functions/submit-reservation-request/index.ts`

- Verify that `phone_number` and `tshirt_option` from the request body are correctly handled (they should already be validated from previous work -- just confirm the guest-request code path uses them in the DB insert)

### No changes needed

- `ReservationForm.tsx` -- remains as a secondary form for authenticated users (accessed via `/auth` flow). No changes needed.
- `index.html`, `tailwind.config.ts` -- Playfair Display font and Framer Motion are already configured.

---

### Technical Details

**New state variables in WorkshopCalendar:**

```typescript
const [phone, setPhone] = useState("");
const [tshirtOption, setTshirtOption] = useState<"own" | "buy_onsite" | "">("");
```

**Validation before submit:**

```typescript
if (!phone.trim() || !/^[+]?[\d\s\-().]{7,20}$/.test(phone.trim())) {
  toast({ title: "Invalid phone", description: "Please enter a valid phone number.", variant: "destructive" });
  return;
}
if (!tshirtOption) {
  toast({ title: "T-shirt option required", description: "Please select a T-shirt option.", variant: "destructive" });
  return;
}
```

**Edge function body update:**

```typescript
body: {
  requester_name: name.trim(),
  requester_email: email.trim(),
  requested_date: requestedDate,
  message: message.trim() || null,
  phone_number: phone.trim(),
  tshirt_option: tshirtOption,
  honeypot,
  user_id: null,
}
```

**New imports:**

```typescript
import { motion } from "framer-motion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Info, User as UserIcon, Mail, Phone as PhoneIcon, Shirt } from "lucide-react";
```

**Files to modify:**

- `src/components/WorkshopCalendar.tsx` (add fields, icons, animations, cancellation text)
- `supabase/functions/submit-reservation-request/index.ts` (verify guest path handles phone_number and tshirt_option in insert)  
{
    "priority": "IMMEDIATE_UI_REPLACEMENT",
    "status": "CRITICAL",
    "observation": "The upgraded ReservationForm.tsx is NOT being used. The homepage is currently rendering an old, dull form inside WorkshopCalendar.tsx.",
    "task": "Migrate all 'Vibe' upgrades into WorkshopCalendar.tsx immediately.",
    "requirements": [
      {
        "id": "field_sync",
        "instruction": "Add the mandatory 'Phone Number' (Input) and 'T-Shirt Option' (RadioGroup: 'own'/'buy_onsite') directly into the reservation form inside WorkshopCalendar.tsx. These must be required before the 'Request Reservation' button becomes active."
      },
      {
        "id": "visual_sync",
        "instruction": "Apply the Framer Motion 'whileInView' scroll animations and the 'Playfair Display' serif font to the headings inside WorkshopCalendar.tsx.",
        "icons": "Add Lucide icons (User, Mail, Phone, Shirt) as absolute-positioned decorators inside the inputs with 'pl-10' padding."
      },
      {
        "id": "submission_logic",
        "instruction": "Update the 'handleGuestRequest' function in WorkshopCalendar.tsx to include the 'phone' and 'tshirtOption' state variables in the fetch body sent to the Edge Function."
      }
    ],
    "technical_warning": "Do not create a new file. Modify the existing WorkshopCalendar.tsx so the changes are visible on the homepage (/). Ensure the 'Info' icon and cancellation text are added below the submit button."
  }