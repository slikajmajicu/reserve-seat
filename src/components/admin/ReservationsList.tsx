import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2, Mail, Phone, Edit, ArrowRightLeft, AlertTriangle, CheckCircle, MessageSquare } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

type Workshop = {
  id: string;
  date: string;
  title: string | null;
  start_time: string | null;
  max_capacity: number;
  reserved_count: number;
  is_active: boolean;
};

type Reservation = {
  id: string;
  workshop_id: string | null;
  first_name: string;
  last_name: string | null;
  email: string;
  phone_number: string | null;
  city: string | null;
  tshirt_option: string | null;
  status: string;
  seat_number: number | null;
  reservation_timestamp: string;
  requester_name: string | null;
  requester_email: string | null;
  requested_date: string | null;
  message: string | null;
  workshops: { date: string } | null;
};

export default function ReservationsList() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>("all");
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Reassignment state
  const [reassignReservation, setReassignReservation] = useState<Reservation | null>(null);
  const [targetWorkshopId, setTargetWorkshopId] = useState<string>("");
  const [reassigning, setReassigning] = useState(false);

  // Confirm pending state
  const [confirmReservation, setConfirmReservation] = useState<Reservation | null>(null);
  const [confirmWorkshopId, setConfirmWorkshopId] = useState<string>("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetchWorkshops();
    fetchReservations();

    const channel = supabase
      .channel("reservations-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () => {
        fetchReservations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchWorkshops = async () => {
    const { data } = await supabase.from("workshops").select("*").order("date", { ascending: false });
    setWorkshops(data || []);
  };

  const fetchReservations = async () => {
    setLoading(true);
    let query = supabase
      .from("reservations")
      .select("*, workshops!left(date)")
      .order("reservation_timestamp", { ascending: false });

    if (selectedWorkshop !== "all") {
      query = query.eq("workshop_id", selectedWorkshop);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to load reservations");
      console.error(error);
    } else {
      setReservations((data as Reservation[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchReservations(); }, [selectedWorkshop]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("reservations").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete reservation");
    } else {
      toast.success("Reservation deleted successfully");
      fetchReservations();
    }
  };

  const handleStatusChange = async () => {
    if (!editingReservation || !newStatus) return;
    try {
      const workshop = workshops.find(w => w.id === editingReservation.workshop_id);
      if (newStatus === "confirmed" && editingReservation.workshop_id) {
        if (!workshop) throw new Error("Workshop not found");
        const { data: confirmedCount } = await supabase
          .from("reservations")
          .select("id", { count: "exact" })
          .eq("workshop_id", editingReservation.workshop_id)
          .eq("status", "confirmed");

        const currentConfirmed = confirmedCount?.length || 0;
        if (currentConfirmed >= workshop.max_capacity && editingReservation.status !== "confirmed") {
          toast.error("Workshop is full");
          return;
        }

        const { error } = await supabase
          .from("reservations")
          .update({ status: "confirmed", seat_number: currentConfirmed + 1 })
          .eq("id", editingReservation.id);
        if (error) throw error;
      } else {
        const updateData: Record<string, unknown> = { status: newStatus };
        if (newStatus === "waitlisted") updateData.seat_number = null;
        const { error } = await supabase
          .from("reservations")
          .update(updateData)
          .eq("id", editingReservation.id);
        if (error) throw error;
      }

      toast.success("Status updated successfully");
      setEditingReservation(null);
      setNewStatus("");
      fetchReservations();
    } catch (error: any) {
      toast.error("Failed to update status");
      console.error(error);
    }
  };

  const handleConfirmPending = async () => {
    if (!confirmReservation || !confirmWorkshopId) return;
    setConfirming(true);
    try {
      const workshop = workshops.find(w => w.id === confirmWorkshopId);
      if (!workshop) throw new Error("Workshop not found");

      const { data: confirmedCount } = await supabase
        .from("reservations")
        .select("id", { count: "exact" })
        .eq("workshop_id", confirmWorkshopId)
        .eq("status", "confirmed");

      const currentConfirmed = confirmedCount?.length || 0;
      const isFull = currentConfirmed >= workshop.max_capacity;

      const { error } = await supabase
        .from("reservations")
        .update({
          workshop_id: confirmWorkshopId,
          status: isFull ? "waitlisted" : "confirmed",
          seat_number: isFull ? null : currentConfirmed + 1,
        })
        .eq("id", confirmReservation.id);

      if (error) throw error;

      toast.success(isFull ? "Assigned to workshop (waitlisted — full)" : "Confirmed and assigned to workshop");
      setConfirmReservation(null);
      setConfirmWorkshopId("");
      fetchReservations();
    } catch (error: any) {
      toast.error("Failed to confirm reservation");
      console.error(error);
    } finally {
      setConfirming(false);
    }
  };

  const handleReassign = async () => {
    if (!reassignReservation || !targetWorkshopId) return;
    setReassigning(true);
    try {
      const { data, error } = await supabase.functions.invoke("reassign-workshop", {
        body: { reservationId: reassignReservation.id, targetWorkshopId },
      });
      if (error) throw new Error(error.message || "Reassignment failed");
      if (data?.error) throw new Error(data.error);

      const targetWorkshop = workshops.find(w => w.id === targetWorkshopId);
      toast.success("Reservation reassigned", {
        description: `Moved to ${targetWorkshop?.title || "workshop"} on ${new Date(targetWorkshop?.date || "").toLocaleDateString()}. Status: ${data?.data?.newStatus}`,
      });
      setReassignReservation(null);
      setTargetWorkshopId("");
      fetchReservations();
    } catch (error: any) {
      toast.error("Failed to reassign", { description: error.message });
    } finally {
      setReassigning(false);
    }
  };

  const getAvailableWorkshopsForReassign = () => {
    if (!reassignReservation) return [];
    return workshops.filter(w => w.id !== reassignReservation.workshop_id && w.is_active);
  };

  const getTargetWorkshopCapacityInfo = (workshopId: string) => {
    const workshop = workshops.find(w => w.id === workshopId);
    if (!workshop) return null;
    const available = workshop.max_capacity - workshop.reserved_count;
    return { available, isFull: available <= 0, total: workshop.max_capacity, reserved: workshop.reserved_count };
  };

  const getDisplayName = (r: Reservation) => r.requester_name || `${r.first_name} ${r.last_name || ""}`.trim();
  const getDisplayEmail = (r: Reservation) => r.requester_email || r.email;
  const getDisplayDate = (r: Reservation) => {
    if (r.workshops?.date) {
      return new Date(r.workshops.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    }
    if (r.requested_date) {
      return new Date(r.requested_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) + " (requested)";
    }
    return "—";
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "confirmed": return <Badge variant="default" className="bg-success">Confirmed</Badge>;
      case "pending": return <Badge variant="outline" className="border-amber-500 text-amber-600">Pending</Badge>;
      case "cancelled": return <Badge variant="destructive">Cancelled</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filtered = reservations.filter(r => statusFilter === "all" || r.status === statusFilter);

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading reservations...</div>;
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <Select value={selectedWorkshop} onValueChange={setSelectedWorkshop}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Filter by workshop" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workshops</SelectItem>
              {workshops.map((workshop) => (
                <SelectItem key={workshop.id} value={workshop.id}>
                  {new Date(workshop.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="waitlisted">Waitlisted</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "reservation" : "reservations"}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No reservations found for this filter.</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Seat</TableHead>
                  <TableHead>Msg</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell className="font-medium">{getDisplayName(reservation)}</TableCell>
                    <TableCell>{getDisplayDate(reservation)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[150px]">{getDisplayEmail(reservation)}</span>
                        </div>
                        {reservation.phone_number && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {reservation.phone_number}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{statusBadge(reservation.status)}</TableCell>
                    <TableCell>{reservation.seat_number ? `#${reservation.seat_number}` : "—"}</TableCell>
                    <TableCell>
                      {reservation.message ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <MessageSquare className="h-4 w-4 text-muted-foreground cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[300px]">
                            <p className="text-sm">{reservation.message}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Confirm Pending — assign workshop */}
                        {reservation.status === "pending" && (
                          <Dialog open={confirmReservation?.id === reservation.id} onOpenChange={(open) => {
                            if (!open) { setConfirmReservation(null); setConfirmWorkshopId(""); }
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Confirm & assign workshop"
                                onClick={() => { setConfirmReservation(reservation); setConfirmWorkshopId(""); }}>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Confirm Reservation</DialogTitle>
                                <DialogDescription>
                                  Assign {getDisplayName(reservation)} to a workshop to confirm their reservation.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Requested Date</label>
                                  <div className="text-sm text-muted-foreground">
                                    {reservation.requested_date
                                      ? new Date(reservation.requested_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                                      : "No date specified"}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Assign to Workshop</label>
                                  <Select value={confirmWorkshopId} onValueChange={setConfirmWorkshopId}>
                                    <SelectTrigger><SelectValue placeholder="Select a workshop" /></SelectTrigger>
                                    <SelectContent>
                                      {workshops.filter(w => w.is_active).map((workshop) => {
                                        const available = workshop.max_capacity - workshop.reserved_count;
                                        return (
                                          <SelectItem key={workshop.id} value={workshop.id}>
                                            {new Date(workshop.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} — {workshop.title || "Workshop"} ({available} seats)
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {confirmWorkshopId && (() => {
                                  const info = getTargetWorkshopCapacityInfo(confirmWorkshopId);
                                  if (!info) return null;
                                  return (
                                    <div className={`p-3 rounded-md ${info.isFull ? "bg-destructive/10 border border-destructive/20" : "bg-muted"}`}>
                                      <div className="flex items-center gap-2">
                                        {info.isFull && <AlertTriangle className="h-4 w-4 text-destructive" />}
                                        <span className="text-sm font-medium">
                                          {info.isFull ? "Workshop full — will be waitlisted" : `${info.available} seats available`}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => { setConfirmReservation(null); setConfirmWorkshopId(""); }}>Cancel</Button>
                                <Button onClick={handleConfirmPending} disabled={!confirmWorkshopId || confirming}>
                                  {confirming ? "Confirming..." : "Confirm"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}

                        {/* Reassign */}
                        {reservation.workshop_id && (
                          <Dialog open={reassignReservation?.id === reservation.id} onOpenChange={(open) => {
                            if (!open) { setReassignReservation(null); setTargetWorkshopId(""); }
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Reassign to another workshop"
                                onClick={() => { setReassignReservation(reservation); setTargetWorkshopId(""); }}>
                                <ArrowRightLeft className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Reassign Workshop</DialogTitle>
                                <DialogDescription>Move {getDisplayName(reservation)} to a different workshop</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Target Workshop</label>
                                  <Select value={targetWorkshopId} onValueChange={setTargetWorkshopId}>
                                    <SelectTrigger><SelectValue placeholder="Select a workshop" /></SelectTrigger>
                                    <SelectContent>
                                      {getAvailableWorkshopsForReassign().map((workshop) => {
                                        const available = workshop.max_capacity - workshop.reserved_count;
                                        return (
                                          <SelectItem key={workshop.id} value={workshop.id}>
                                            {new Date(workshop.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} — {workshop.title || "Workshop"} ({available} seats)
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {targetWorkshopId && (() => {
                                  const info = getTargetWorkshopCapacityInfo(targetWorkshopId);
                                  if (!info) return null;
                                  return (
                                    <div className={`p-3 rounded-md ${info.isFull ? "bg-destructive/10 border border-destructive/20" : "bg-muted"}`}>
                                      <div className="flex items-center gap-2">
                                        {info.isFull && <AlertTriangle className="h-4 w-4 text-destructive" />}
                                        <span className="text-sm font-medium">
                                          {info.isFull ? "Workshop full — will be waitlisted" : `${info.available} seats available`}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => { setReassignReservation(null); setTargetWorkshopId(""); }}>Cancel</Button>
                                <Button onClick={handleReassign} disabled={!targetWorkshopId || reassigning}>
                                  {reassigning ? "Reassigning..." : "Reassign"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}

                        {/* Edit Status */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => { setEditingReservation(reservation); setNewStatus(reservation.status); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Change Reservation Status</DialogTitle>
                              <DialogDescription>Update the status for {getDisplayName(reservation)}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">New Status</label>
                                <Select value={newStatus} onValueChange={setNewStatus}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                    <SelectItem value="waitlisted">Waitlisted</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setEditingReservation(null)}>Cancel</Button>
                              <Button onClick={handleStatusChange}>Update Status</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {/* Delete */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Reservation</AlertDialogTitle>
                              <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(reservation.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
