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
    const { data, error } = await supabase
      .from("workshops")
      .select("*")
      .order("date", { ascending: true });

    if (error) {
      toast.error("Failed to load workshops");
      console.error(error);
    } else {
      setWorkshops(data || []);
    }
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
            <TableHead>Reserved</TableHead>
            <TableHead>Available</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workshops.map((workshop) => {
            const available = workshop.max_capacity - workshop.reserved_count;
            const isFull = available <= 0;
            const date = new Date(workshop.date).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            });

            return (
              <TableRow key={workshop.id}>
                <TableCell className="font-medium">{date}</TableCell>
                <TableCell>{workshop.max_capacity}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {workshop.reserved_count}
                  </div>
                </TableCell>
                <TableCell>{available}</TableCell>
                <TableCell>
                  {isFull ? (
                    <Badge variant="destructive">Full</Badge>
                  ) : (
                    <Badge variant="default" className="bg-success">
                      Open
                    </Badge>
                  )}
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
