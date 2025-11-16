import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Calendar, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  workshopId: z.string().min(1, "Please select a workshop date"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address").max(255),
  phoneNumber: z.string().min(1, "Phone number is required").max(50),
  city: z.string().min(1, "City is required").max(100),
  bringOwnTshirt: z.boolean().default(false),
});

type Workshop = {
  id: string;
  date: string;
  max_capacity: number;
  reserved_count: number;
};

export default function ReservationForm() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workshopId: "",
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      city: "",
      bringOwnTshirt: false,
    },
  });

  const selectedWorkshopId = form.watch("workshopId");
  const selectedWorkshop = workshops.find((w) => w.id === selectedWorkshopId);
  const availableSeats = selectedWorkshop
    ? selectedWorkshop.max_capacity - selectedWorkshop.reserved_count
    : 0;
  const isFull = availableSeats <= 0;

  useEffect(() => {
    fetchWorkshops();

    const channel = supabase
      .channel("workshops-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workshops",
        },
        () => {
          fetchWorkshops();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchWorkshops = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("workshops")
      .select("*")
      .gte("date", new Date().toISOString().split("T")[0])
      .order("date", { ascending: true });

    if (error) {
      toast.error("Failed to load workshop dates");
      console.error("Error fetching workshops:", error);
    } else {
      setWorkshops(data || []);
    }
    setLoading(false);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (isFull) {
      toast.error("This workshop is full", {
        description: "Please select another date or check back later.",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Authentication required", {
          description: "Please log in to make a reservation.",
        });
        setSubmitting(false);
        return;
      }

      const workshop = workshops.find((w) => w.id === values.workshopId);
      if (!workshop) {
        throw new Error("Workshop not found");
      }

      const reservedCount = workshop.reserved_count;
      const status = reservedCount < workshop.max_capacity ? "confirmed" : "waitlisted";
      const seatNumber = status === "confirmed" ? reservedCount + 1 : null;

      const { error: insertError } = await supabase.from("reservations").insert({
        workshop_id: values.workshopId,
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.email,
        phone_number: values.phoneNumber,
        city: values.city,
        tshirt_option: values.bringOwnTshirt ? "own" : "buy_onsite",
        status,
        seat_number: seatNumber,
        user_id: user.id,
      });

      if (insertError) throw insertError;

      const { error: emailError } = await supabase.functions.invoke("send-confirmation-email", {
        body: {
          email: values.email,
          firstName: values.firstName,
          workshopDate: new Date(workshop.date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          status,
        },
      });

      if (emailError) {
        console.error("Email sending failed:", emailError);
      }

      toast.success("You have successfully reserved your place!", {
        description: `Workshop date: ${new Date(workshop.date).toLocaleDateString()}. We look forward to seeing you!`,
      });

      form.reset();
    } catch (error) {
      console.error("Reservation error:", error);
      toast.error("Reservation failed", {
        description: "Please try again or contact support.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-foreground">Workshop Reservation</h1>
          <p className="text-muted-foreground text-lg">
            Reserve your spot for our upcoming creative workshops
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Book Your Workshop
            </CardTitle>
            <CardDescription>
              Fill in your details to reserve your place
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="workshopId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Workshop Date *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={loading}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select a workshop date" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {workshops.map((workshop) => {
                            const available = workshop.max_capacity - workshop.reserved_count;
                            const date = new Date(workshop.date).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            });
                            return (
                              <SelectItem key={workshop.id} value={workshop.id}>
                                <div className="flex items-center justify-between w-full gap-4">
                                  <span>{date}</span>
                                  <Badge
                                    variant={available > 0 ? "default" : "destructive"}
                                    className="ml-2"
                                  >
                                    {available > 0 ? `${available} seats left` : "Full"}
                                  </Badge>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedWorkshop && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-medium">Seat Availability</span>
                      </div>
                      {isFull ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Workshop Full
                        </Badge>
                      ) : (
                        <Badge variant="default" className="gap-1 bg-success">
                          <CheckCircle2 className="h-3 w-3" />
                          {availableSeats} Available
                        </Badge>
                      )}
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{
                          width: `${(selectedWorkshop.reserved_count / selectedWorkshop.max_capacity) * 100}%`,
                        }}
                      />
                    </div>
                    {isFull && (
                      <p className="text-sm text-muted-foreground mt-2">
                        This workshop is full. Please wait for a new date or select another workshop.
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john.doe@example.com"
                          {...field}
                          className="h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 234 567 8900" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="New York" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="bringOwnTshirt"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
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
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={submitting || !selectedWorkshop || isFull}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reserving...
                    </>
                  ) : (
                    "Reserve My Spot"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
