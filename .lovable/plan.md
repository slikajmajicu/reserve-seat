## Enhance Reservation Form: T-Shirt Radio Group, Phone Validation, and Cancellation Policy

### 1. Update Form Schema and T-Shirt Field (ReservationForm.tsx)

**Replace the `bringOwnTshirt` boolean checkbox with a `tshirtOption` radio group:**

- Change the Zod schema: remove `bringOwnTshirt: z.boolean()`, add `tshirtOption: z.enum(["own", "buy_onsite"], { required_error: "Please select a T-shirt option" })`
- Update `defaultValues`: remove `bringOwnTshirt`, add `tshirtOption: undefined` (forces user to pick one)
- Replace the Checkbox field with a `RadioGroup` using two `RadioGroupItem` entries:
  - `"own"` -- "I am bringing my own T-shirt"
  - `"buy_onsite"` -- "I will buy a T-shirt onsite"
- Update the `onSubmit` data mapping: change `tshirt_option: values.bringOwnTshirt ? "own" : "buy_onsite"` to `tshirt_option: values.tshirtOption`
- Update the admin notification body similarly

**Add phone number format validation:**

- Update the `phoneNumber` Zod rule to: `z.string().min(1, "Phone number is required").regex(/^[+]?[\d\s\-().]{7,20}$/, "Please enter a valid phone number").max(50)`

**Add cancellation policy text:**

- Below the submit button, add a small muted paragraph with a Lucide `Info` icon:
`"Note: Reservations can be cancelled up to 24 hours before the event. Cancellations on the day of the event may incur a participation fee."`

### 2. Update Edge Function (submit-reservation-request/index.ts)

- Add `phone_number` and `tshirt_option` to the destructured body fields
- Validate `phone_number`: must be a non-empty string matching a basic phone regex
- Validate `tshirt_option`: must be exactly `"own"` or `"buy_onsite"`; reject anything else with a 400 error
- Pass validated `phone_number` and `tshirt_option` into the reservation insert (replacing the current hardcoded `null`/empty string values)
- In the catch block, detect `reservations_tshirt_option_check` constraint errors and return a user-friendly 400 message

### 3. Import Updates

- Add `RadioGroup, RadioGroupItem` import from `@/components/ui/radio-group`
- Add `Info` to the lucide-react import  
  
**Add-on Instructions for absolute reliability:**
  1. **Strict DB Sync:** Ensure the `tshirt_option` value sent to the database is strictly either `'own'` or `'buy_onsite'`. If the frontend sends an empty string, the Edge Function must catch it and return a 400 error before hitting the database.
  2. **CORS Header Persistence:** In `supabase/functions/submit-reservation-request/index.ts`, ensure that **all** `return new Response()` calls (including the new 400 error for phone/t-shirt validation) include the `corsHeaders` object. Without this, the browser will show a 'CORS error' instead of the validation message.
  3. **Constraint Handling:** Specifically handle the PostgreSQL error code `23514`. If the catch block sees this code, return a specific message: *'Invalid T-shirt option selected. Please refresh and try again.'*
  4. **No Type 'any':** Maintain strict TypeScript types in the Edge Function when destructuring the request body.
  5. **Clean UI:** In the `ReservationForm.tsx`, make sure the Lucide `Info` icon is vertically aligned with the cancellation text and has a size of `16px` for a clean, professional look."

---

### Technical Details

**Zod schema change:**

```typescript
const formSchema = z.object({
  workshopId: z.string().min(1, "Please select a workshop date"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address").max(255),
  phoneNumber: z.string().min(1, "Phone number is required")
    .regex(/^[+]?[\d\s\-().]{7,20}$/, "Please enter a valid phone number").max(50),
  city: z.string().min(1, "City is required").max(100),
  tshirtOption: z.enum(["own", "buy_onsite"], { required_error: "Please select a T-shirt option" }),
});
```

**RadioGroup JSX (replacing checkbox):**

```tsx
<FormField control={form.control} name="tshirtOption" render={({ field }) => (
  <FormItem className="space-y-3">
    <FormLabel>T-Shirt Option *</FormLabel>
    <FormControl>
      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-2">
        <FormItem className="flex items-center space-x-3 space-y-0">
          <FormControl><RadioGroupItem value="own" /></FormControl>
          <FormLabel className="font-normal cursor-pointer">I am bringing my own T-shirt</FormLabel>
        </FormItem>
        <FormItem className="flex items-center space-x-3 space-y-0">
          <FormControl><RadioGroupItem value="buy_onsite" /></FormControl>
          <FormLabel className="font-normal cursor-pointer">I will buy a T-shirt onsite</FormLabel>
        </FormItem>
      </RadioGroup>
    </FormControl>
    <FormMessage />
  </FormItem>
)} />
```

**Edge function validation additions:**

```typescript
if (!phone_number || !/^[+]?[\d\s\-().]{7,20}$/.test(phone_number.trim())) {
  return jsonResponse({ success: false, error: "Please enter a valid phone number." }, 400);
}
if (!tshirt_option || !["own", "buy_onsite"].includes(tshirt_option)) {
  return jsonResponse({ success: false, error: "Please select a valid T-shirt option." }, 400);
}
```

**Files to modify:**

- `src/components/ReservationForm.tsx` (schema, form field, submit mapping, cancellation text)
- `supabase/functions/submit-reservation-request/index.ts` (validate and pass phone_number + tshirt_option)