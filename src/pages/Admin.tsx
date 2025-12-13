import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Calendar, Users, Plus } from "lucide-react";
import { toast } from "sonner";
import WorkshopsList from "@/components/admin/WorkshopsList";
import ReservationsList from "@/components/admin/ReservationsList";
import AddWorkshopDialog from "@/components/admin/AddWorkshopDialog";

export default function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminRole = async (userId: string) => {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      toast.error('Access denied: Admin privileges required');
      navigate('/');
      return false;
    }
    setIsAdmin(true);
    return true;
  };

  useEffect(() => {
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Defer admin check to avoid Supabase deadlock
        setTimeout(() => {
          checkAdminRole(session.user.id).then((isAdminUser) => {
            if (isAdminUser) {
              setLoading(false);
            }
          });
        }, 0);
      } else {
        navigate("/admin/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    if (session?.user) {
      setUser(session.user);
      const isAdminUser = await checkAdminRole(session.user.id);
      if (isAdminUser) {
        setLoading(false);
      }
    } else {
      navigate("/admin/login");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Workshop Admin</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground">
            Manage workshop dates, reservations, and participants
          </p>
        </div>

        <Tabs defaultValue="workshops" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="workshops" className="gap-2">
              <Calendar className="h-4 w-4" />
              Workshops
            </TabsTrigger>
            <TabsTrigger value="reservations" className="gap-2">
              <Users className="h-4 w-4" />
              Reservations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workshops" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>Workshop Dates</CardTitle>
                  <CardDescription>
                    View and manage all workshop dates and their capacity
                  </CardDescription>
                </div>
                <AddWorkshopDialog />
              </CardHeader>
              <CardContent>
                <WorkshopsList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reservations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Reservations</CardTitle>
                <CardDescription>
                  View, edit, and manage participant reservations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReservationsList />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
