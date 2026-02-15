import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground font-heading">reserve-seat</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: February 15, 2026</p>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
              <p>
                Welcome to reserve-seat. We respect your privacy and are committed to protecting your personal data. 
                This privacy policy will inform you about how we handle your personal data when you use our workshop 
                reservation service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. Information We Collect</h2>
              <p>We collect and process the following information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Information:</strong> Email address, name (when you sign up)</li>
                <li><strong>Authentication Data:</strong> Password (encrypted) or OAuth provider data (Google)</li>
                <li><strong>Reservation Data:</strong> Workshop bookings, attendance records</li>
                <li><strong>Usage Data:</strong> How you interact with our service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide and maintain our workshop reservation service</li>
                <li>Manage your account and reservations</li>
                <li>Send you booking confirmations and updates</li>
                <li>Improve our service and user experience</li>
                <li>Communicate with you about service changes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Data Storage and Security</h2>
              <p>
                Your data is stored securely using Supabase infrastructure. We implement appropriate technical 
                and organizational measures to protect your personal data against unauthorized access, alteration, 
                disclosure, or destruction.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Third-Party Services</h2>
              <p>We use the following third-party services:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Google OAuth:</strong> For authentication (when you choose to sign in with Google)</li>
                <li><strong>Supabase:</strong> For data storage and authentication</li>
              </ul>
              <p className="mt-2">
                These services have their own privacy policies governing their use of your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Data Retention</h2>
              <p>
                We retain your personal data only for as long as necessary to provide our services and fulfill 
                the purposes outlined in this privacy policy. When you delete your account, we will delete or 
                anonymize your personal data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Cookies and Tracking</h2>
              <p>
                We use essential cookies to maintain your session and authentication. We do not use advertising 
                or tracking cookies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Children's Privacy</h2>
              <p>
                Our service is not directed to children under 13. We do not knowingly collect personal information 
                from children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. Changes to This Policy</h2>
              <p>
                We may update this privacy policy from time to time. We will notify you of any changes by posting 
                the new privacy policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">11. Contact Us</h2>
              <p>
                If you have any questions about this privacy policy or our data practices, please contact us at:
              </p>
              <p className="mt-2">
                <strong>Email:</strong> privacy@reserve-seat.app (ili tvoj email)
              </p>
            </section>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <a href="/" className="text-primary hover:underline">
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  );
}