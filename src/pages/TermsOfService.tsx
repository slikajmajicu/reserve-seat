import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/i18n/LanguageContext";

export default function TermsOfService() {
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
            <CardTitle className="text-3xl">{t("tos_title")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("tos_updated")}</p>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("tos_1_title")}</h2>
              <p>{t("tos_1_text")}</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("tos_2_title")}</h2>
              <p>{t("tos_2_text")}</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("tos_3_title")}</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t("tos_3_item1")}</li>
                <li>{t("tos_3_item2")}</li>
                <li>{t("tos_3_item3")}</li>
                <li>{t("tos_3_item4")}</li>
                <li>{t("tos_3_item5")}</li>
              </ul>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("tos_4_title")}</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t("tos_4_item1")}</li>
                <li>{t("tos_4_item2")}</li>
                <li>{t("tos_4_item3")}</li>
                <li>{t("tos_4_item4")}</li>
              </ul>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("tos_5_title")}</h2>
              <p>{t("tos_5_intro")}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t("tos_5_item1")}</li>
                <li>{t("tos_5_item2")}</li>
                <li>{t("tos_5_item3")}</li>
                <li>{t("tos_5_item4")}</li>
                <li>{t("tos_5_item5")}</li>
                <li>{t("tos_5_item6")}</li>
              </ul>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("tos_6_title")}</h2>
              <p>{t("tos_6_text")}</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("tos_7_title")}</h2>
              <p>{t("tos_7_text")}</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("tos_8_title")}</h2>
              <p>{t("tos_8_text")}</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("tos_9_title")}</h2>
              <p>{t("tos_9_text")}</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("tos_10_title")}</h2>
              <p>{t("tos_10_text")}</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("tos_11_title")}</h2>
              <p>{t("tos_11_text")}</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("tos_12_title")}</h2>
              <p>{t("tos_12_text")}</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t("tos_13_title")}</h2>
              <p>{t("tos_13_text")}</p>
              <p className="mt-2"><strong>{t("tos_13_email")}</strong></p>
            </section>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <a href="/" className="text-primary hover:underline">
            {t("tos_back")}
          </a>
        </div>
      </div>
    </div>
  );
}
