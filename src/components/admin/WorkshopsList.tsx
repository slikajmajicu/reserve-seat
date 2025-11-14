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
import { Download, Trash2, Users } from "lucide-react";
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

type Workshop = {
  id: string;
  date: string;
  max_capacity: number;
  reserved_count: number;
  confirmed_count?: number;
  waitlisted_count?: number;
  total_reservations?: number;
};

export default function WorkshopsList() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkshops();

    const channel = supabase
      .channel("workshops-admin")
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
    
    // Fetch workshops with reservation counts
    const { data: workshopsData, error: workshopsError } = await supabase
      .from("workshops")
      .select("*")
      .order("date", { ascending: true });

    if (workshopsError) {
      toast.error("Failed to load workshops");
      console.error(workshopsError);
      setLoading(false);
      return;
    }

    // Fetch reservation counts for each workshop
    const workshopsWithCounts = await Promise.all(
      (workshopsData || []).map(async (workshop) => {
        const { data: reservations } = await supabase
          .from("reservations")
          .select("status")
          .eq("workshop_id", workshop.id);

        const confirmed = reservations?.filter(r => r.status === "confirmed").length || 0;
        const waitlisted = reservations?.filter(r => r.status === "waitlisted").length || 0;
        
        return {
          ...workshop,
          confirmed_count: confirmed,
          waitlisted_count: waitlisted,
          total_reservations: confirmed + waitlisted,
        };
      })
    );

    setWorkshops(workshopsWithCounts);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("workshops").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete workshop");
      console.error(error);
    } else {
      toast.success("Workshop deleted successfully");
      fetchWorkshops();
    }
  };

  const handleExport = async (workshopId: string, date: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("export-workshop", {
        body: { workshopId },
      });

      if (error) throw error;

      const blob = new Blob([data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workshop-${date}-reservations.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Export successful");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading workshops...</div>;
  }

  if (workshops.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No workshops found. Add a new workshop date to get started.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Confirmed</TableHead>
            <TableHead>Waitlisted</TableHead>
            <TableHead>Available</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workshops.map((workshop) => {
            const confirmed = workshop.confirmed_count || 0;
            const waitlisted = workshop.waitlisted_count || 0;
            const total = workshop.total_reservations || 0;
            const available = workshop.max_capacity - confirmed;
            const isFull = available <= 0;
            const isFillingUp = available <= 3 && available > 0;

            return (
              <TableRow key={workshop.id}>
                <TableCell className="font-medium">
                  {new Date(workshop.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </TableCell>
                <TableCell>{workshop.max_capacity}</TableCell>
                <TableCell>{total}</TableCell>
                <TableCell>
                  <Badge variant="default">{confirmed}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{waitlisted}</Badge>
                </TableCell>
                <TableCell>{available}</TableCell>
                <TableCell>
                  <Badge 
                    variant={isFull ? "destructive" : isFillingUp ? "secondary" : "default"}
                    className={isFillingUp ? "bg-orange-500/10 text-orange-700 dark:text-orange-400" : ""}
                  >
                    {isFull ? "Full" : isFillingUp ? "Filling Up" : "Open"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(workshop.id, workshop.date)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Workshop</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this workshop? This will also delete
                            all associated reservations. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(workshop.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
