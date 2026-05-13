import { Link } from "react-router-dom";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/i18n/LanguageContext";

export default function MobileMenu() {
  const { t } = useLanguage();

  return (
    <div className="md:hidden flex items-center gap-2">
      <Link
        to="/privacy-policy"
        className="text-[11px] text-[#1a1a1a] hover:text-primary transition-colors whitespace-nowrap"
      >
        {t("nav_privacy")}
      </Link>
      <span className="text-[#1a1a1a] text-xs">|</span>
      <div className="scale-90 origin-right">
        <LanguageSwitcher />
      </div>
    </div>
  );
}
