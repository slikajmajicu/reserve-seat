import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/i18n/LanguageContext";

export default function PrivacyPolicy() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-secondary py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground font-heading">{t("brand")}</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{t("pp_title")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("pp_updated")}</p>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("pp_1_title")}</h2>
              <p>{t("pp_1_text")}</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("pp_2_title")}</h2>
              <p>{t("pp_2_intro")}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t("pp_2_item1")}</li>
                <li>{t("pp_2_item2")}</li>
                <li>{t("pp_2_item3")}</li>
                <li>{t("pp_2_item4")}</li>
              </ul>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("pp_3_title")}</h2>
              <p>{t("pp_3_intro")}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t("pp_3_item1")}</li>
                <li>{t("pp_3_item2")}</li>
                <li>{t("pp_3_item3")}</li>
                <li>{t("pp_3_item4")}</li>
                <li>{t("pp_3_item5")}</li>
              </ul>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("pp_4_title")}</h2>
              <p>{t("pp_4_text")}</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("pp_5_title")}</h2>
              <p>{t("pp_5_intro")}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t("pp_5_item1")}</li>
                <li>{t("pp_5_item2")}</li>
              </ul>
              <p className="mt-2">{t("pp_5_note")}</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("pp_6_title")}</h2>
              <p>{t("pp_6_intro")}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t("pp_6_item1")}</li>
                <li>{t("pp_6_item2")}</li>
                <li>{t("pp_6_item3")}</li>
                <li>{t("pp_6_item4")}</li>
                <li>{t("pp_6_item5")}</li>
              </ul>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("pp_7_title")}</h2>
              <p>{t("pp_7_text")}</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("pp_8_title")}</h2>
              <p>{t("pp_8_text")}</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("pp_9_title")}</h2>
              <p>{t("pp_9_text")}</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("pp_10_title")}</h2>
              <p>{t("pp_10_text")}</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("pp_11_title")}</h2>
              <p>{t("pp_11_text")}</p>
              <p className="mt-2"><strong>{t("pp_11_email")}</strong></p>
            </section>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <a href="/" className="text-primary hover:underline">
            {t("pp_back")}
          </a>
        </div>
      </div>
    </div>
  );
}
