import { useLanguage } from "@/i18n/LanguageContext";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 text-sm font-medium">
      <button
        onClick={() => setLanguage("en")}
        className={`px-2 py-1 rounded transition-colors ${
          language === "en"
            ? "text-primary font-semibold"
            : "text-[#6b7280] hover:text-[#1a1a1a]"
        }`}
      >
        EN
      </button>
      <span className="text-[#d1d5db]">|</span>
      <button
        onClick={() => setLanguage("sr")}
        className={`px-2 py-1 rounded transition-colors ${
          language === "sr"
            ? "text-primary font-semibold"
            : "text-[#6b7280] hover:text-[#1a1a1a]"
        }`}
      >
        SR
      </button>
    </div>
  );
}
