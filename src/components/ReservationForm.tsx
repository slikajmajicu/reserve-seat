import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Users, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
const formSchema = z.object({
  workshopId: z.string().min(1, "Please select a workshop date"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address").max(255),
  phoneNumber: z.string().min(1, "Phone number is required").max(50),
  city: z.string().min(1, "City is required").max(100),
  bringOwnTshirt: z.boolean().default(false)
});
type Workshop = {
  id: string;
  date: string;
  title: string;
  start_time: string | null;
  max_capacity: number;
  reserved_count: number;
};
import { User } from "@supabase/supabase-js";
export default function ReservationForm() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workshopId: "",
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      city: "",
      bringOwnTshirt: false
    }
  });
  const selectedWorkshopId = form.watch("workshopId");
  const selectedWorkshop = workshops.find(w => w.id === selectedWorkshopId);
  const availableSeats = selectedWorkshop ? selectedWorkshop.max_capacity - selectedWorkshop.reserved_count : 0;
  const isFull = availableSeats <= 0;
  useEffect(() => {
    // Set up auth state listener
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Check for existing session
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    fetchWorkshops();
    const channel = supabase.channel("workshops-changes").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "workshops"
    }, () => {
      fetchWorkshops();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const fetchWorkshops = async () => {
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from("workshops").select("*").eq("is_active", true).gte("date", new Date().toISOString().split("T")[0]).order("date", {
      ascending: true
    }).order("start_time", {
      ascending: true,
      nullsFirst: false
    });
    if (error) {
      toast.error("Failed to load workshop dates");
      console.error("Error fetching workshops:", error);
    } else {
      // Filter out fully booked workshops - users can only see available ones
      const availableWorkshops = (data || []).filter(workshop => workshop.max_capacity - workshop.reserved_count > 0);
      setWorkshops(availableWorkshops);
    }
    setLoading(false);
  };
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast.error("Authentication required", {
        description: "Please sign in to make a reservation."
      });
      return;
    }
    if (isFull) {
      toast.error("This workshop is full", {
        description: "Please select another date or check back later."
      });
      return;
    }
    setSubmitting(true);
    try {
      const workshop = workshops.find(w => w.id === values.workshopId);
      if (!workshop) {
        throw new Error("Workshop not found");
      }

      // Check for duplicate email in this workshop
      const {
        data: existingReservation,
        error: checkError
      } = await supabase.from("reservations").select("id").eq("workshop_id", values.workshopId).eq("email", values.email).maybeSingle();
      if (checkError) {
        console.error("Error checking for duplicates:", checkError);
        throw checkError;
      }
      if (existingReservation) {
        toast.error("Email already registered", {
          description: "This email is already registered for this workshop."
        });
        setSubmitting(false);
        return;
      }
      const reservedCount = workshop.reserved_count;
      const status = reservedCount < workshop.max_capacity ? "confirmed" : "waitlisted";
      const seatNumber = status === "confirmed" ? reservedCount + 1 : null;

      // Always include user_id - required for RLS
      const reservationData = {
        workshop_id: values.workshopId,
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.email,
        phone_number: values.phoneNumber,
        city: values.city,
        tshirt_option: values.bringOwnTshirt ? "own" : "buy_onsite",
        status,
        seat_number: seatNumber,
        user_id: user.id
      };
      console.log("Creating reservation:", reservationData);
      const {
        error: insertError,
        data: newReservation
      } = await supabase.from("reservations").insert(reservationData).select().single();
      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }
      console.log("Reservation created successfully:", newReservation);

      // Send confirmation email
      const workshopDateTime = workshop.start_time ? `${new Date(workshop.date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      })} at ${new Date(`2000-01-01T${workshop.start_time}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      })}` : new Date(workshop.date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      supabase.functions.invoke("send-confirmation-email", {
        body: {
          email: values.email,
          firstName: values.firstName,
          workshopTitle: workshop.title,
          workshopDate: workshopDateTime,
          status
        }
      }).catch(emailError => {
        console.error("Email sending failed:", emailError);
      });

      // Send admin notification
      supabase.functions.invoke("send-admin-notification", {
        body: {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phoneNumber: values.phoneNumber,
          city: values.city,
          tshirtOption: values.bringOwnTshirt ? "own" : "buy_onsite",
          workshopTitle: workshop.title,
          workshopDate: workshopDateTime,
          status,
          seatNumber
        }
      }).catch(notificationError => {
        console.error("Admin notification failed:", notificationError);
      });

      // Check if workshop is now full and send capacity alert
      if (status === "confirmed" && reservedCount + 1 >= workshop.max_capacity) {
        supabase.functions.invoke("send-capacity-alert", {
          body: {
            workshopId: values.workshopId,
            workshopDate: new Date(workshop.date).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric"
            })
          }
        }).catch(alertError => {
          console.error("Capacity alert failed:", alertError);
        });
      }
      toast.success("Uspešno ste ulogovani i rezervisali ste mesto!", {
        description: `Datum radionice: ${new Date(workshop.date).toLocaleDateString()}. Vidimo se!`
      });
      form.reset();
    } catch (error: any) {
      console.error("Reservation error:", error);

      // Handle specific error messages from database triggers
      let errorTitle = "Reservation failed";
      let errorDescription = error.message || "Please try again or contact support.";
      if (error.message?.includes("Email must be verified")) {
        errorTitle = "Email verification required";
        errorDescription = "Please verify your email address before making a reservation. Check your inbox for the verification link.";
      } else if (error.message?.includes("Rate limit exceeded")) {
        errorTitle = "Too many reservations";
        errorDescription = "You have exceeded the maximum of 5 reservations per hour. Please wait before trying again.";
      } else if (error.message?.includes("row-level security")) {
        errorTitle = "Authorization error";
        errorDescription = "You don't have permission to perform this action. Please sign in again.";
      }
      toast.error(errorTitle, {
        description: errorDescription
      });
    } finally {
      setSubmitting(false);
    }
  };
  if (authLoading) {
    return <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 py-12 px-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  const handleGoogleSignIn = async () => {
    const {
      error
    } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
    if (error) {
      toast.error("Google sign in failed", {
        description: error.message
      });
    }
  };
  if (!user) {
    return <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 font-heading">
                <AlertCircle className="h-5 w-5 text-primary" />
                Sign In Required
              </CardTitle>
              <CardDescription className="font-body">
                Please sign in to make a workshop reservation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 font-body">
              <p className="text-muted-foreground text-center">
                You need to be signed in to reserve your spot for a workshop.
              </p>
              
              {/* Google Sign In Button */}
              <Button variant="outline" className="w-full h-11 gap-3" onClick={handleGoogleSignIn}>
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              
              <Button asChild className="w-full">
                <a href="/auth">Sign In with Email</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="mb-2 font-heading font-extrabold text-center text-8xl text-destructive">Workshop Reservation</h1>
          <p className="text-muted-foreground font-body bg-inherit text-xl">
            Reserve your spot for our upcoming creative workshops
          </p>
        </div>

        <Card className="my-0 py-0 shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading font-extrabold text-2xl text-destructive">
              <Calendar className="border-destructive-foreground bg-primary-foreground w-[15px] h-[15px] text-red-500" />
              Book Your Workshop
            </CardTitle>
            <CardDescription className="font-body">
              Fill in your details to reserve your place
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mx-0">
                <FormField control={form.control} name="workshopId" render={({
                field
              }) => <FormItem>
                      <FormLabel className="text-base font-semibold">Workshop Date *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select a workshop date" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {workshops.map(workshop => {
                      const available = workshop.max_capacity - workshop.reserved_count;
                      const date = new Date(workshop.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      });
                      const time = workshop.start_time ? new Date(`2000-01-01T${workshop.start_time}`).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true
                      }) : null;
                      return <SelectItem key={workshop.id} value={workshop.id}>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">{workshop.title}</span>
                                    <Badge variant={available > 0 ? "default" : "destructive"}>
                                      {available > 0 ? `${available} seats left` : "Full"}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {date} {time && `• ${time}`}
                                  </div>
                                </div>
                              </SelectItem>;
                    })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>} />

                {selectedWorkshop && <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-medium">Seat Availability</span>
                      </div>
                      {isFull ? <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Workshop Full
                        </Badge> : <Badge variant="default" className="gap-1 bg-success">
                          <CheckCircle2 className="h-3 w-3" />
                          {availableSeats} Available
                        </Badge>}
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-300" style={{
                    width: `${selectedWorkshop.reserved_count / selectedWorkshop.max_capacity * 100}%`
                  }} />
                    </div>
                    {isFull && <p className="text-sm text-muted-foreground mt-2">
                        This workshop is full. Please wait for a new date or select another workshop.
                      </p>}
                  </div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="firstName" render={({
                  field
                }) => <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="lastName" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                </div>

                <FormField control={form.control} name="email" render={({
                field
              }) => <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john.doe@example.com" {...field} className="h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="phoneNumber" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 234 567 8900" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="city" render={({
                  field
                }) => <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="New York" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                </div>

                <FormField control={form.control} name="bringOwnTshirt" render={({
                field
              }) => <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer">
                          I'm bringing my own T-shirt
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Leave unchecked if you plan to buy on-site
                        </p>
                      </div>
                    </FormItem>} />

                <Button type="submit" disabled={submitting || !selectedWorkshop || isFull} className="w-full h-12 text-base font-extrabold text-primary-foreground bg-destructive">
                  {submitting ? <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reserving...
                    </> : "Reserve My Spot"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>;
}
