import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { LEGAL_CONTACT_EMAIL, LEGAL_SITE_NAME } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Terms of Service — ${LEGAL_SITE_NAME}`,
  description: `Terms and conditions for using ${LEGAL_SITE_NAME}.`,
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <LegalSection title="1. Agreement">
        <p>
          By creating an account or using {LEGAL_SITE_NAME} (&quot;the
          Service&quot;), you agree to these Terms of Service. If you do not
          agree, do not use the Service.
        </p>
      </LegalSection>

      <LegalSection title="2. What TailorSend does">
        <p>
          {LEGAL_SITE_NAME} helps you search for jobs, tailor resumes and cover
          letters with AI, research company context, and auto-fill application
          forms in a browser.{" "}
          <strong className="font-medium text-slate-800">
            You are always responsible for reviewing application content and
            clicking submit yourself.
          </strong>{" "}
          We do not guarantee that auto-fill will work on every employer site,
          and we do not submit applications on your behalf unless you
          explicitly do so.
        </p>
      </LegalSection>

      <LegalSection title="3. Your responsibilities">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Provide accurate information in your profile and applications.
          </li>
          <li>
            Do not misrepresent your experience, credentials, or work
            authorization.
          </li>
          <li>
            Review every tailored document and auto-filled form before
            submitting.
          </li>
          <li>
            Comply with each employer&apos;s terms, application rules, and
            applicable laws.
          </li>
          <li>
            Keep your account credentials secure and notify us of unauthorized
            use.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. AI-generated content">
        <p>
          AI outputs are suggestions based on your profile and job
          descriptions. They may contain errors or omissions. You must verify
          all content before use. {LEGAL_SITE_NAME} does not invent experience on
          your behalf by design, but you remain solely responsible for what you
          submit to employers.
        </p>
      </LegalSection>

      <LegalSection title="5. Accounts and eligibility">
        <p>
          You must be at least 16 years old to use the Service. You may need a
          valid email address to register. Student benefits may require
          verification of an eligible academic email domain.
        </p>
      </LegalSection>

      <LegalSection title="6. Plans, credits, and payments">
        <p>
          Free and paid plans include usage limits (e.g. tailor kits, autofill
          sessions). Purchased credits and subscriptions are generally
          non-refundable except where required by law. Pricing and limits may
          change with notice. Continued use after changes constitutes acceptance
          of updated limits or fees.
        </p>
      </LegalSection>

      <LegalSection title="7. Acceptable use">
        <p>You may not:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Use the Service for fraud, spam, or unlawful purposes.</li>
          <li>
            Scrape, reverse-engineer, or overload our systems or third-party job
            boards beyond normal use.
          </li>
          <li>Share account access or resell the Service without permission.</li>
          <li>
            Upload content you do not have the right to use or that violates
            others&apos; rights.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Intellectual property">
        <p>
          The Service, including software, branding, and design, is owned by
          {LEGAL_SITE_NAME} or its licensors. You retain ownership of content you
          upload. You grant us a license to process your content solely to
          provide the Service.
        </p>
      </LegalSection>

      <LegalSection title="9. Disclaimer">
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY
          KIND. WE DO NOT GUARANTEE JOB OFFERS, INTERVIEWS, OR APPLICATION
          SUCCESS. WE ARE NOT RESPONSIBLE FOR THIRD-PARTY JOB BOARDS, EMPLOYERS,
          OR ATS PLATFORMS.
        </p>
      </LegalSection>

      <LegalSection title="10. Limitation of liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, {LEGAL_SITE_NAME} AND ITS
          OPERATORS SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, OR
          CONSEQUENTIAL DAMAGES, OR FOR ANY LOSS OF DATA, PROFITS, OR
          OPPORTUNITIES ARISING FROM YOUR USE OF THE SERVICE.
        </p>
      </LegalSection>

      <LegalSection title="11. Termination">
        <p>
          You may stop using the Service at any time. We may suspend or terminate
          access if you violate these Terms or if we discontinue the Service.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes">
        <p>
          We may update these Terms. Material changes will be reflected by
          updating the date at the top of this page. Continued use after changes
          means you accept the revised Terms.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact">
        <p>
          Questions about these Terms:{" "}
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
