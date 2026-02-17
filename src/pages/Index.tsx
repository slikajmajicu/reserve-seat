//import ReservationForm from "@/components/ReservationForm";

//const Index = () => {
  //return <ReservationForm />;
//};

//export default Index;
import { Link, useNavigate } from "react-router-dom";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import WorkshopCalendar from "@/components/WorkshopCalendar";

export default function Index() {
  const navigate = useNavigate();

  return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold font-heading">reserve-seat</h1>
            </div>
            <nav className="flex items-center gap-4">
              <Link
                to="/privacy-policy"
                className="text-sm text-muted-foreground hover:text-primary hover:underline"
              >
                Privacy Policy
              </Link>
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
            </div>
          </div>
        </section>

        {/* Upcoming Workshops Calendar */}
        <section className="container mx-auto px-4 py-16 bg-muted/30">
          <h2 className="text-3xl font-bold text-center mb-4 font-heading">
            Upcoming Workshops
          </h2>
          <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
            Browse available dates and see what's coming up. Sign in to reserve your spot.
          </p>
          <div className="max-w-3xl mx-auto">
            <WorkshopCalendar />
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
                <Link to="/privacy-policy" className="hover:text-primary hover:underline">
                  Privacy Policy
                </Link>
                <Link to="/terms-of-service" className="hover:text-primary hover:underline">
                  Terms of Service
                </Link>
              </div>
            </div>
            
            <div className="text-center mt-6 text-sm text-muted-foreground">
              <p>© 2026 reserve-seat. Workshop reservation made simple.</p>
            </div>
          </div>
        </footer>
    </div>
  );
}
