import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { LEGAL_CONTACT_EMAIL, LEGAL_SITE_NAME } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Privacy Policy — ${LEGAL_SITE_NAME}`,
  description: `How ${LEGAL_SITE_NAME} collects, uses, and protects your data.`,
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <LegalSection title="1. Overview">
        <p>
          {LEGAL_SITE_NAME} (&quot;we,&quot; &quot;us&quot;) respects your
          privacy. This policy explains what information we collect, how we use
          it, and your choices. By using the Service, you agree to this policy.
        </p>
      </LegalSection>

      <LegalSection title="2. Information we collect">
        <p>
          <strong className="font-medium text-slate-800">Account data:</strong>{" "}
          name, email address, password (stored hashed), and profile settings.
        </p>
        <p>
          <strong className="font-medium text-slate-800">
            Application data:
          </strong>{" "}
          resumes, cover letters, skills, work history, education,
          certifications, visa or work-authorization preferences, EEO defaults
          you choose to save, job applications, match scores, and autofill logs.
        </p>
        <p>
          <strong className="font-medium text-slate-800">Usage data:</strong>{" "}
          feature usage (e.g. tailor and autofill counts), billing plan, credit
          balance, and basic technical logs (IP address, browser type, timestamps)
          for security and operations.
        </p>
        <p>
          <strong className="font-medium text-slate-800">Payment data:</strong>{" "}
          if you purchase credits or a plan, payment is processed by our payment
          provider. We do not store full card numbers on our servers.
        </p>
      </LegalSection>

      <LegalSection title="3. How we use information">
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide job search, AI tailoring, and autofill features.</li>
          <li>Store and display your applications and profile.</li>
          <li>Enforce usage limits and process billing.</li>
          <li>Improve reliability, security, and product quality.</li>
          <li>Respond to support requests and legal obligations.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. AI processing">
        <p>
          To tailor resumes, cover letters, and related content, we send
          relevant portions of your profile, job descriptions, and prompts to
          third-party AI providers (such as OpenAI). We configure these services
          to process data only to deliver features you request. Do not upload
          information you are not comfortable sharing for this purpose.
        </p>
      </LegalSection>

      <LegalSection title="5. Browser autofill">
        <p>
          Autofill may open or control a browser session to complete employer
          application forms. Form data and screenshots may be stored in your
          account so you can review them. You control whether and when an
          application is submitted on the employer&apos;s site.
        </p>
      </LegalSection>

      <LegalSection title="6. Sharing">
        <p>We do not sell your personal information. We may share data with:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Service providers (hosting, database, AI, payment, email) under
            contracts that limit their use.
          </li>
          <li>
            Employers only when you submit an application through their systems
            — not through us directly.
          </li>
          <li>
            Authorities when required by law or to protect rights and safety.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Retention">
        <p>
          We keep your data while your account is active and as needed to provide
          the Service, comply with law, or resolve disputes. You may request
          deletion of your account by contacting us.
        </p>
      </LegalSection>

      <LegalSection title="8. Security">
        <p>
          We use industry-standard measures such as encrypted connections,
          hashed passwords, and access controls. No method of transmission or
          storage is 100% secure; use the Service at your own risk.
        </p>
      </LegalSection>

      <LegalSection title="9. Your rights">
        <p>
          Depending on where you live, you may have rights to access, correct,
          delete, or export your data, or to object to certain processing.
          Contact us to make a request. We will respond within a reasonable
          time.
        </p>
      </LegalSection>

      <LegalSection title="10. Cookies and local storage">
        <p>
          We use cookies or local storage for authentication (session tokens) and
          preferences. You can clear these in your browser, but you may need to
          sign in again.
        </p>
      </LegalSection>

      <LegalSection title="11. Children">
        <p>
          The Service is not directed at children under 16. We do not knowingly
          collect data from children under 16.
        </p>
      </LegalSection>

      <LegalSection title="12. International users">
        <p>
          Your data may be processed in the United States or other countries
          where our providers operate. By using the Service, you consent to this
          transfer where applicable law allows.
        </p>
      </LegalSection>

      <LegalSection title="13. Changes">
        <p>
          We may update this Privacy Policy. The &quot;Last updated&quot; date at
          the top will change when we do. Continued use after updates means you
          accept the revised policy.
        </p>
      </LegalSection>

      <LegalSection title="14. Contact">
        <p>
          Privacy questions or requests:{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="font-medium text-emerald-600 hover:text-emerald-700"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
