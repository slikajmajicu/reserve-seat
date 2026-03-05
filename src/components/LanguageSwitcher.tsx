import { useLanguage } from "@/i18n/LanguageContext";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 text-sm font-medium">
      <button
        onClick={() => setLanguage("en")}
        className={`px-2 py-1 rounded transition-colors ${
          language === "en"
            ? "text-foreground font-semibold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
      <span className="text-foreground">|</span>
      <button
        onClick={() => setLanguage("sr")}
        className={`px-2 py-1 rounded transition-colors ${
          language === "sr"
            ? "text-foreground font-semibold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        SR
      </button>
    </div>
  );
}
