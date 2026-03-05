import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import WorkshopCalendar from "@/components/WorkshopCalendar";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/i18n/LanguageContext";

export default function Index() {
  const { t } = useLanguage();

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden bg-[url('/background.jpg')] bg-center bg-no-repeat bg-cover">
      
      {/* Header — transparent */}
      <header className="py-4 px-8">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="text-base font-semibold text-[#1a1a1a]">{t("brand")}</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/privacy-policy" className="text-sm text-[#1a1a1a] hover:text-primary transition-colors">
              {t("nav_privacy")}
            </Link>
            <LanguageSwitcher />
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-12 pb-8 text-center">
        <div className="mx-auto space-y-3">
          <h1 className="text-[42px] leading-tight font-extrabold font-heading text-[#1a1a1a] whitespace-nowrap">
            <span className="italic">{t("hero_tshirt")}</span>{t("hero_painting")}
            <span className="text-[28px] font-medium text-[#4a4a4a]">{t("hero_belgrade")}</span>
          </h1>
          <p className="text-[15px] leading-relaxed max-w-[480px] mx-auto text-secondary-foreground">
            {t("hero_subtitle")}
          </p>
        </div>
      </section>

      {/* Main content */}
      <section className="container mx-auto px-6 pb-12 flex-1">
        <div className="max-w-[900px] mx-auto space-y-6">
          {/* Workshop card — glassmorphism */}
          <div
            className="rounded-[16px] shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-10"
            style={{
              background: "rgba(255, 255, 255, 0.11)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.19)"
            }}>
            
            <h2 className="text-[22px] font-bold text-center text-[#1a1a1a] font-heading">{t("upcoming_title")}</h2>
            <p className="text-center text-sm text-foreground mt-1.5 mb-6 max-w-xl mx-auto">
              {t("upcoming_subtitle")}
            </p>
            <WorkshopCalendar />
          </div>

          {/* Group Bookings card — glassmorphism */}
          <div
            className="rounded-[16px] shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-10 text-center space-y-3"
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(5px)",
              WebkitBackdropFilter: "blur(5px)",
              border: "1px solid rgba(255, 255, 255, 0.3)"
            }}>
            <h2 className="text-[22px] font-bold text-[#1a1a1a] font-heading">
              {t("group_title")}
            </h2>
            <p className="text-[15px] text-[#6b7280]">
              {t("group_text")}
            </p>
            <a
              href="mailto:slikajmajicu@gmail.com"
              className="text-base font-medium text-primary hover:underline transition-colors">
              
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
            <span className="text-sm font-semibold text-[#1a1a1a]">{t("brand")}</span>
          </div>
          <p className="text-[13px] text-[#9ca3af]">{t("footer_copy")}</p>
          <div className="flex gap-4 text-[13px]">
            <Link to="/privacy-policy" className="text-[#6b7280] hover:text-primary transition-colors">
              {t("nav_privacy")}
            </Link>
            <Link to="/terms-of-service" className="text-[#6b7280] hover:text-primary transition-colors">
              {t("footer_terms")}
            </Link>
          </div>
        </div>
      </footer>
    </div>);

}