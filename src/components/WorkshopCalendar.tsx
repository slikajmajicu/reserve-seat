import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Clock, Users, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function WorkshopCalendar() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const navigate = useNavigate();

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      <Card>
        <CardContent className="p-4 flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className={cn("p-3 pointer-events-auto")}
            modifiers={{
              workshop: workshopDates,
            }}
            modifiersClassNames={{
              workshop:
                "bg-primary/15 text-primary font-bold rounded-md",
            }}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {selectedDate ? (
          workshopsForDate.length > 0 ? (
            <>
              <h3 className="text-lg font-semibold font-heading">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              {workshopsForDate.map((workshop) => {
                const available =
                  workshop.max_capacity - workshop.reserved_count;
                const startFormatted = formatTime(workshop.start_time);
                const endFormatted = formatTime(workshop.end_time);

                return (
                  <Card key={workshop.id} className="border">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold font-heading">
                          {workshop.title}
                        </h4>
                        <Badge
                          variant={available > 0 ? "default" : "destructive"}
                        >
                          {available > 0
                            ? `${available} seats left`
                            : "Full"}
                        </Badge>
                      </div>
                      {(startFormatted || endFormatted) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {startFormatted}
                            {endFormatted && ` – ${endFormatted}`}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>
                          {workshop.reserved_count} / {workshop.max_capacity}{" "}
                          booked
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              <Button className="w-full" onClick={() => navigate("/auth")}>
                Sign up to reserve your spot
              </Button>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No workshops on this date.</p>
              <p className="text-sm mt-1">
                Try selecting a highlighted date.
              </p>
            </div>
          )
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Select a date to view workshops</p>
            <p className="text-sm mt-1">
              Highlighted dates have available workshops.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
