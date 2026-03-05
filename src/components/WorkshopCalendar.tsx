import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Clock, Users, CalendarDays, Send, Loader2, AlertCircle, User as UserIcon, Mail, Phone as PhoneIcon, Shirt } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

type Workshop = {
  id: string;
  date: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  max_capacity: number;
  reserved_count: number;
  is_active: boolean;
};

const fieldVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

export default function WorkshopCalendar() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tshirtOption, setTshirtOption] = useState<"own" | "buy_onsite" | "">("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchWorkshops = async () => {
      const { data, error } = await supabase
        .from("workshops")
        .select("*")
        .eq("is_active", true)
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true })
        .order("start_time", { ascending: true, nullsFirst: false });

      if (!error && data) {
        setWorkshops(data);
        if (data.length > 0) {
          setSelectedDate(new Date(data[0].date + "T00:00:00"));
        }
      }
    };

    fetchWorkshops();
  }, []);

  const workshopDates = workshops.map((w) => new Date(w.date + "T00:00:00"));

  const workshopsForDate = selectedDate
    ? workshops.filter(
        (w) =>
          new Date(w.date + "T00:00:00").toDateString() ===
          selectedDate.toDateString()
      )
    : [];

  const formatTime = (time: string | null) => {
    if (!time) return null;
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !name.trim() || !email.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in your name, email, and select a date.",
        variant: "destructive",
      });
      return;
    }

    if (!phone.trim() || !/^[+]?[\d\s\-().]{7,20}$/.test(phone.trim())) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number.",
        variant: "destructive",
      });
      return;
    }

    if (!tshirtOption) {
      toast({
        title: "T-shirt option required",
        description: "Please select a T-shirt option.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const requestedDate = selectedDate.toISOString().split("T")[0];

      const { data, error } = await supabase.functions.invoke(
        "submit-reservation-request",
        {
          body: {
            requester_name: name.trim(),
            requester_email: email.trim(),
            requested_date: requestedDate,
            message: message.trim() || null,
            phone_number: phone.trim(),
            tshirt_option: tshirtOption,
            honeypot,
            user_id: null,
          },
        }
      );

      if (error) throw error;

      if (data?.success) {
        setSubmitted(true);
        setName("");
        setEmail("");
        setPhone("");
        setTshirtOption("");
        setMessage("");
        toast({
          title: "Request submitted!",
          description:
            "We'll review your reservation request and get back to you soon.",
        });
      } else {
        toast({
          title: "Could not submit",
          description: data?.error || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Reservation submit error:", err);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      {/* Calendar */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className={cn("p-3 pointer-events-auto")}
          modifiers={{
            workshop: workshopDates,
          }}
          modifiersClassNames={{
            workshop: "bg-primary/15 text-primary font-bold rounded-full",
          }}
          disabled={(date) =>
            date < new Date(new Date().setHours(0, 0, 0, 0))
          }
        />
      </div>

      {/* Details + Form */}
      <div className="space-y-6">
        {selectedDate ? (
          <>
            <h3 className="text-xl font-bold text-[#1a1a1a] font-heading">
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h3>

            {workshopsForDate.length > 0 &&
              workshopsForDate.map((workshop) => {
                const available =
                  workshop.max_capacity - workshop.reserved_count;
                const startFormatted = formatTime(workshop.start_time);
                const endFormatted = formatTime(workshop.end_time);

                return (
                  <div
                    key={workshop.id}
                    className="flex items-center justify-between bg-white border border-[#e5e7eb] rounded-xl px-5 py-4"
                  >
                    <div className="space-y-1">
                      <h4 className="text-[15px] font-semibold text-[#1a1a1a]">
                        {workshop.title || "Workshop Session"}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[13px] text-[#9ca3af]">
                        <Users className="h-[13px] w-[13px]" />
                        <span>
                          {workshop.reserved_count} / {workshop.max_capacity} booked
                        </span>
                      </div>
                      {(startFormatted || endFormatted) && (
                        <div className="flex items-center gap-1.5 text-[13px] text-[#9ca3af]">
                          <Clock className="h-[13px] w-[13px]" />
                          <span>
                            {startFormatted}
                            {endFormatted && ` – ${endFormatted}`}
                          </span>
                        </div>
                      )}
                    </div>
                    <Badge
                      className={cn(
                        "rounded-full px-3.5 py-1.5 text-xs font-semibold",
                        available > 0
                          ? "bg-primary text-white"
                          : "bg-destructive text-white"
                      )}
                    >
                      {available > 0
                        ? `${available} seats left !`
                        : "Full"}
                    </Badge>
                  </div>
                );
              })}

            {/* Inline Reservation Form */}
            {submitted ? (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center space-y-2">
                <h4 className="font-bold text-lg text-[#1a1a1a]">
                  ✅ Request Submitted!
                </h4>
                <p className="text-sm text-[#9ca3af]">
                  Check your email for confirmation. We'll review your request and get back to you shortly.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setSubmitted(false)}
                >
                  Submit another request
                </Button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h4 className="text-lg font-bold text-[#1a1a1a] font-heading">
                    Request a Reservation
                  </h4>

                  {/* Honeypot — invisible to real users */}
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: "-9999px",
                      top: "-9999px",
                      opacity: 0,
                      height: 0,
                      overflow: "hidden",
                    }}
                  >
                    <label htmlFor="website">Website</label>
                    <input
                      type="text"
                      id="website"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>

                  {/* Name */}
                  <motion.div custom={0} initial="hidden" whileInView="visible" variants={fieldVariants} viewport={{ once: true }} className="space-y-1.5">
                    <Label htmlFor="res-name" className="text-[13px] font-medium text-primary">
                      Your Name
                    </Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
                      <Input
                        id="res-name"
                        placeholder="Full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        maxLength={100}
                        className="pl-10 h-11 bg-white border-[#e5e7eb] rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary"
                      />
                    </div>
                  </motion.div>

                  {/* Email */}
                  <motion.div custom={1} initial="hidden" whileInView="visible" variants={fieldVariants} viewport={{ once: true }} className="space-y-1.5">
                    <Label htmlFor="res-email" className="text-[13px] font-medium text-primary">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
                      <Input
                        id="res-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        maxLength={255}
                        className="pl-10 h-11 bg-white border-[#e5e7eb] rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary"
                      />
                    </div>
                  </motion.div>

                  {/* Phone */}
                  <motion.div custom={2} initial="hidden" whileInView="visible" variants={fieldVariants} viewport={{ once: true }} className="space-y-1.5">
                    <Label htmlFor="res-phone" className="text-[13px] font-medium text-primary">
                      Phone Number
                    </Label>
                    <div className="relative">
                      <PhoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
                      <Input
                        id="res-phone"
                        type="tel"
                        placeholder="+381 63 123 4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        maxLength={20}
                        className="pl-10 h-11 bg-white border-[#e5e7eb] rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary"
                      />
                    </div>
                  </motion.div>

                  {/* T-Shirt Option */}
                  <motion.div custom={3} initial="hidden" whileInView="visible" variants={fieldVariants} viewport={{ once: true }} className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-[13px] font-medium text-primary">
                      <Shirt className="h-3.5 w-3.5" />
                      T-Shirt Option
                    </Label>
                    <RadioGroup
                      value={tshirtOption}
                      onValueChange={(val) => setTshirtOption(val as "own" | "buy_onsite")}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="own" id="tshirt-own" />
                        <Label htmlFor="tshirt-own" className="font-normal cursor-pointer text-sm text-[#374151]">
                          I am bringing my own T-shirt
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="buy_onsite" id="tshirt-buy" />
                        <Label htmlFor="tshirt-buy" className="font-normal cursor-pointer text-sm text-[#374151]">
                          I will buy a T-shirt onsite
                        </Label>
                      </div>
                    </RadioGroup>
                  </motion.div>

                  {/* Message */}
                  <motion.div custom={4} initial="hidden" whileInView="visible" variants={fieldVariants} viewport={{ once: true }} className="space-y-1.5">
                    <Label htmlFor="res-message" className="text-[13px] font-medium text-primary">
                      Message{" "}
                      <span className="text-[#9ca3af] font-normal">(optional)</span>
                    </Label>
                    <Textarea
                      id="res-message"
                      placeholder="Any notes or questions..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={500}
                      rows={4}
                      className="bg-white border-[#e5e7eb] rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary resize-y"
                    />
                  </motion.div>

                  <motion.div custom={5} initial="hidden" whileInView="visible" variants={fieldVariants} viewport={{ once: true }} className="space-y-3">
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-white rounded-[10px] py-3.5 text-[15px] font-semibold"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting…
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Request
                        </>
                      )}
                    </Button>

                    {/* Cancellation notice — red */}
                    <div className="flex items-start gap-2 text-xs text-destructive">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <p className="leading-relaxed">
                        Note: Reservations can be cancelled up to 24 hours before the event. Cancellations on the day of the event may incur a participation fee.
                      </p>
                    </div>
                  </motion.div>
                </form>
              </motion.div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-[#9ca3af]">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-[#1a1a1a]">Select a date to view workshops</p>
            <p className="text-sm mt-1">
              Highlighted dates have available workshops.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
