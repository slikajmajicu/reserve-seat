import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/i18n/LanguageContext";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-[#1a1a1a] hover:text-primary transition-colors"
        aria-label="Toggle menu"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div
          className="absolute top-full left-0 right-0 z-50 border-b border-white/30 px-6 py-4 space-y-3"
          style={{
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <Link
            to="/privacy-policy"
            className="block text-sm text-[#1a1a1a] hover:text-primary transition-colors"
            onClick={() => setOpen(false)}
          >
            {t("nav_privacy")}
          </Link>
          <div className="pt-1">
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </div>
  );
}
