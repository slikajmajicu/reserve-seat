import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import WorkshopCalendar from "@/components/WorkshopCalendar";

export default function Index() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: "url('/images/background.svg')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Header — transparent */}
      <header className="py-4 px-8">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="text-base font-semibold text-[#1a1a1a]">reserve-seat</span>
          </div>
          <nav>
            <Link
              to="/privacy-policy"
              className="text-sm text-[#1a1a1a] hover:text-primary transition-colors"
            >
              Privacy Policy
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-12 pb-8 text-center">
        <div className="max-w-xl mx-auto space-y-3">
          <h1 className="text-[42px] leading-tight font-extrabold font-heading text-[#1a1a1a]">
            <span className="italic">T-Shirt</span> Painting Workshops{" "}
            <span className="text-[28px] font-medium text-[#4a4a4a] not-italic">
              in Belgrade
            </span>
          </h1>
          <p className="text-[15px] text-[#6b7280] leading-relaxed max-w-[480px] mx-auto">
            Join our hands-on screen printing workshops. Pick a date, request
            a spot, and we'll confirm your reservation by email.
          </p>
        </div>
      </section>

      {/* Main content */}
      <section className="container mx-auto px-6 pb-12 flex-1">
        <div className="max-w-[900px] mx-auto space-y-6">
          {/* Workshop card — glassmorphism */}
          <div className="rounded-[20px] bg-white/75 backdrop-blur-[20px] shadow-[0_4px_32px_rgba(0,0,0,0.08)] p-10">
            <h2 className="text-[22px] font-bold text-center text-[#1a1a1a] font-heading">
              Upcoming Workshops
            </h2>
            <p className="text-center text-sm text-[#9ca3af] mt-1.5 mb-6 max-w-xl mx-auto">
              Browse available dates and request your spot — no account needed.
            </p>
            <WorkshopCalendar />
          </div>

          {/* Group Bookings card — glassmorphism */}
          <div className="rounded-[20px] bg-white/75 backdrop-blur-[20px] shadow-[0_4px_32px_rgba(0,0,0,0.08)] p-10 text-center space-y-3">
            <h2 className="text-[22px] font-bold text-[#1a1a1a] font-heading">
              Group Bookings, Team Building &amp; Gift Vouchers
            </h2>
            <p className="text-[15px] text-[#6b7280]">
              Planning a team event or looking for a unique gift? Get in touch at
            </p>
            <a
              href="mailto:slikajmajicu@gmail.com"
              className="text-base font-medium text-primary hover:underline transition-colors"
            >
              slikajmajicu@gmail.com
            </a>
          </div>
        </div>
      </section>

      {/* Footer — transparent */}
      <footer className="py-5 px-8">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-[#1a1a1a]">reserve-seat</span>
          </div>
          <p className="text-[13px] text-[#9ca3af]">
            © 2026 reserve-seat. Workshop reservation made simple.
          </p>
          <div className="flex gap-4 text-[13px]">
            <Link to="/privacy-policy" className="text-[#6b7280] hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="text-[#6b7280] hover:text-primary transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
