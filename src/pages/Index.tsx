//import ReservationForm from "@/components/ReservationForm";

//const Index = () => {
  //return <ReservationForm />;
//};

//export default Index;
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, Users, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Helmet } from "react-helmet";

export default function Index() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        // Redirect to dashboard or main app
        navigate("/dashboard"); // ili gde god ide authenticated user
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
        navigate("/dashboard");
      } else {
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Public landing page
  return (
    <>
      <Helmet>
        <meta name="google-site-verification" content="TVOJ_VERIFICATION_CODE" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold font-heading">reserve-seat</h1>
            </div>
            <nav className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
              <Button onClick={() => navigate("/auth")}>
                Get Started
              </Button>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-5xl font-bold tracking-tight font-heading">
              Reserve Your Workshop Spot
            </h1>
            <p className="text-xl text-muted-foreground font-body">
              reserve-seat is a simple and efficient workshop reservation system. 
              Book your spot, manage your schedule, and never miss a workshop again.
            </p>
            <div className="flex gap-4 justify-center mt-8">
              <Button size="lg" onClick={() => navigate("/auth")}>
                Get Started Free
              </Button>
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center mb-12 font-heading">
            Why Choose reserve-seat?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Calendar className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Easy Booking</CardTitle>
                <CardDescription>
                  Reserve your workshop spot in seconds with our intuitive interface
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Clock className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Real-Time Updates</CardTitle>
                <CardDescription>
                  Get instant notifications about your reservations and schedule changes
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Manage Attendance</CardTitle>
                <CardDescription>
                  Track your workshop attendance and never miss an important session
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="container mx-auto px-4 py-16 bg-muted/30">
          <h2 className="text-3xl font-bold text-center mb-12 font-heading">
            How It Works
          </h2>
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Create Your Account</h3>
                <p className="text-muted-foreground">
                  Sign up in seconds using your email or Google account
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Browse Workshops</h3>
                <p className="text-muted-foreground">
                  View available workshops and find the ones that interest you
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Reserve Your Seat</h3>
                <p className="text-muted-foreground">
                  Book your spot instantly and receive confirmation
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-4xl font-bold font-heading">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-muted-foreground">
              Join reserve-seat today and never miss a workshop again
            </p>
            <Button size="lg" onClick={() => navigate("/auth")}>
              Sign Up Now - It's Free
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                <span className="font-semibold">reserve-seat</span>
              </div>
              
              <div className="flex gap-6 text-sm text-muted-foreground">
                <a href="/privacy-policy" className="hover:text-primary hover:underline">
                  Privacy Policy
                </a>
                <a href="/terms-of-service" className="hover:text-primary hover:underline">
                  Terms of Service
                </a>
              </div>
            </div>
            
            <div className="text-center mt-6 text-sm text-muted-foreground">
              <p>© 2026 reserve-seat. Workshop reservation made simple.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}