import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Reservation = {
  id: string;
  workshop_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  city: string;
  tshirt_option: string;
  status: string;
  seat_number: number | null;
  reservation_timestamp: string;
  workshops: {
    date: string;
  };
};

export default function ReservationsList() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>("all");
  const [workshops, setWorkshops] = useState<any[]>([]);

  useEffect(() => {
    fetchWorkshops();
    fetchReservations();

    const channel = supabase
      .channel("reservations-admin")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
        },
        () => {
          fetchReservations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchWorkshops = async () => {
    const { data } = await supabase.from("workshops").select("*").order("date", { ascending: false });
    setWorkshops(data || []);
  };

  const fetchReservations = async () => {
    setLoading(true);
    let query = supabase
      .from("reservations")
      .select("*, workshops(date)")
      .order("reservation_timestamp", { ascending: false });

    if (selectedWorkshop !== "all") {
      query = query.eq("workshop_id", selectedWorkshop);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to load reservations");
      console.error(error);
    } else {
      setReservations(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReservations();
  }, [selectedWorkshop]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("reservations").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete reservation");
      console.error(error);
    } else {
      toast.success("Reservation deleted successfully");
      fetchReservations();
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading reservations...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select value={selectedWorkshop} onValueChange={setSelectedWorkshop}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Filter by workshop" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Workshops</SelectItem>
            {workshops.map((workshop) => (
              <SelectItem key={workshop.id} value={workshop.id}>
                {new Date(workshop.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          {reservations.length} {reservations.length === 1 ? "reservation" : "reservations"}
        </div>
      </div>

      {reservations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No reservations found for this filter.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Workshop Date</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>City</TableHead>
                <TableHead>T-shirt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Seat</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell className="font-medium">
                    {reservation.first_name} {reservation.last_name}
                  </TableCell>
                  <TableCell>
                    {new Date(reservation.workshops.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-[150px]">{reservation.email}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {reservation.phone_number}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{reservation.city}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {reservation.tshirt_option === "own" ? "Own" : "Buy on-site"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {reservation.status === "confirmed" ? (
                      <Badge variant="default" className="bg-success">
                        Confirmed
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Waitlist</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {reservation.seat_number ? `#${reservation.seat_number}` : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Reservation</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this reservation? This action cannot be
                            undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(reservation.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
