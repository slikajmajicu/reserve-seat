import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import WorkshopCalendar from "@/components/WorkshopCalendar";

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold font-heading text-foreground">reserve-seat</h1>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              to="/privacy-policy"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Privacy Policy
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#4F46E5] to-[#818CF8] text-white">
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-5xl font-bold tracking-tight font-heading">
              T-Shirt Printing Workshops in Belgrade
            </h1>
            <p className="text-xl text-white/85 font-body">
              Join our hands-on screen printing workshops. Pick a date, request
              a spot, and we'll confirm your reservation by email.
            </p>
          </div>
        </div>
      </section>

      {/* Upcoming Workshops Calendar */}
      <section className="bg-secondary">
        <div className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center mb-4 font-heading text-foreground">
            Upcoming Workshops
          </h2>
          <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
            Browse available dates and request your spot — no account needed.
          </p>
          <div className="max-w-4xl mx-auto">
            <WorkshopCalendar />
          </div>
        </div>
      </section>

      {/* Group Bookings Section */}
      <section className="bg-background">
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-4xl font-bold font-heading text-foreground">
              Group Bookings, Team Building &amp; Gift Vouchers
            </h2>
            <p className="text-xl text-muted-foreground">
              Planning a team event or looking for a unique gift? Get in touch
              at{" "}
              <a
                href="mailto:slikajmajicu@gmail.com"
                className="text-primary underline hover:text-[#1a6fe0] transition-colors"
              >
                slikajmajicu@gmail.com
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#334155] text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-white/70" />
              <span className="font-semibold">reserve-seat</span>
            </div>

            <div className="flex gap-6 text-sm text-white/70">
              <Link to="/privacy-policy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms-of-service" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>

          <div className="text-center mt-6 text-sm text-white/50">
            <p>© 2026 reserve-seat. Workshop reservation made simple.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
