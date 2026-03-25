import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | InstaHealth",
  description: "Read InstaHealth's Privacy Policy and data handling practices.",
};

const sections = [
  { id: "who-this-policy-applies-to", label: "1. WHO THIS POLICY APPLIES TO" },
  { id: "information-we-collect", label: "2. INFORMATION WE COLLECT" },
  { id: "information-from-third-parties", label: "3. INFORMATION WE RECEIVE FROM THIRD PARTIES" },
  { id: "technical-information", label: "4. TECHNICAL INFORMATION WE COLLECT AUTOMATICALLY" },
  { id: "cookies", label: "5. COOKIES AND TRACKING TECHNOLOGIES" },
  { id: "log-data", label: "6. LOG DATA AND SECURITY EVENTS" },
  { id: "location-data", label: "7. LOCATION DATA" },
  { id: "sensitive-information", label: "8. SENSITIVE OR HEALTH-RELATED INFORMATION" },
  { id: "how-we-use-information", label: "9. HOW WE USE YOUR INFORMATION" },
  { id: "what-we-share", label: "10. WHAT WE SHARE" },
  { id: "marketing", label: "11. MARKETING AND COMMUNICATIONS" },
  { id: "international-transfers", label: "12. INTERNATIONAL DATA TRANSFERS" },
  { id: "protection", label: "13. HOW WE PROTECT YOUR INFORMATION" },
  { id: "retention", label: "14. DATA RETENTION" },
  { id: "rights", label: "15. YOUR RIGHTS" },
  { id: "automated-processing", label: "16. AUTOMATED PROCESSING AND PLATFORM DECISIONS" },
  { id: "childrens-privacy", label: "17. CHILDREN'S PRIVACY" },
  { id: "third-party-links", label: "18. THIRD-PARTY LINKS AND VENDOR CONTENT" },
  { id: "changes", label: "19. CHANGES TO THIS PRIVACY POLICY" },
  { id: "contact", label: "20. CONTACT US" },
  { id: "important-notice", label: "21. IMPORTANT NOTICE" },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-slate-50 py-8 md:py-12">
      <div className="container mx-auto max-w-5xl px-4">
        <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 px-6 py-8 md:px-10 md:py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Legal</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">PRIVACY POLICY</h1>
            <p className="mt-4 text-sm font-medium text-slate-700">Last Updated: 25 March 2026</p>
            <p className="mt-6 text-sm leading-7 text-slate-700 md:text-base">
              Thank you for using InstaHealth. We are committed to protecting your privacy and handling your personal
              data in a transparent, secure, and commercially responsible manner.
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
              {`This Privacy Policy ("Policy") explains how InstaHealth, its related entities, affiliates, contractors,
              service providers, and technology partners (collectively referred to in this Policy as "InstaHealth",
              "we", "our", or "us") collect, use, disclose, store, transfer, and otherwise process your information
              when you access or use our website, marketplace, mobile-compatible interfaces, vendor tools,
              dashboards, integrations, communications, customer support systems, and related services (collectively,
              the "Services").`}
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
              This Policy applies whether you access InstaHealth through a browser, mobile device, embedded
              application, vendor dashboard, checkout flow, partner integration, or any other supported access point.
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
              By accessing or using InstaHealth, creating an account, submitting information to us, placing an order,
              applying as a vendor, connecting a third-party platform, or otherwise interacting with the Services, you
              acknowledge that your information may be collected and processed as described in this Policy.
            </p>
          </header>

          <nav aria-label="Table of contents" className="border-b border-slate-200 bg-slate-50/80 px-6 py-8 md:px-10">
            <h2 className="text-base font-semibold text-slate-900">Table of Contents</h2>
            <ol className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
              {sections.map((section) => (
                <li key={section.id}>
                  <a className="transition hover:text-emerald-700 hover:underline" href={`#${section.id}`}>
                    {section.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="space-y-10 px-6 py-8 md:px-10 md:py-10">
            <section id="who-this-policy-applies-to" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">1. WHO THIS POLICY APPLIES TO</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">This Policy applies to:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>customers and users browsing or purchasing through InstaHealth;</li>
                <li>users creating customer accounts;</li>
                <li>
                  vendors, merchants, clinics, service providers, suppliers, practitioners, and business applicants
                  using or applying to use InstaHealth;
                </li>
                <li>vendor staff and authorized representatives;</li>
                <li>
                  individuals contacting us for support, sales, onboarding, compliance, legal, or operational
                  purposes;
                </li>
                <li>visitors to our website and marketplace;</li>
                <li>users who interact with our content, advertising, forms, or integrations.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                This Policy does not apply to third-party websites, third-party platforms, or third-party services that
                may be linked from our Services or used by vendors independently of InstaHealth.
              </p>
            </section>

            <section id="information-we-collect" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">2. INFORMATION WE COLLECT</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We collect information in several ways depending on how you use InstaHealth.
              </p>

              <h3 className="mt-6 text-lg font-semibold text-slate-900">2.1 Information You Provide to Us</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700 md:text-base">You may provide us with information directly when you:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>create an account;</li>
                <li>place an order;</li>
                <li>browse or save products/services;</li>
                <li>submit checkout details;</li>
                <li>contact customer support;</li>
                <li>submit a vendor application;</li>
                <li>onboard as a vendor;</li>
                <li>connect a third-party integration;</li>
                <li>communicate with us by email, forms, chat, or phone;</li>
                <li>submit forms, uploads, business documents, or verification information.</li>
              </ul>

              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Depending on your use of the Services, this information may include:
              </p>

              <h4 className="mt-6 text-base font-semibold text-slate-900">Customer / User Information</h4>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>full name;</li>
                <li>email address;</li>
                <li>mobile number or phone number;</li>
                <li>delivery address or service location;</li>
                <li>account login credentials;</li>
                <li>order history;</li>
                <li>shopping preferences;</li>
                <li>saved items or browsing interactions;</li>
                <li>support communications;</li>
                <li>booking-related information;</li>
                <li>account settings and profile information.</li>
              </ul>

              <h4 className="mt-6 text-base font-semibold text-slate-900">Vendor / Merchant / Applicant Information</h4>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>business name;</li>
                <li>contact person name;</li>
                <li>vendor representative information;</li>
                <li>email address and phone number;</li>
                <li>business address;</li>
                <li>service areas or delivery areas;</li>
                <li>onboarding details;</li>
                <li>business verification information;</li>
                <li>vendor profile content;</li>
                <li>bank, payout, invoicing, or settlement-related business details;</li>
                <li>connected store or integration information;</li>
                <li>uploaded product, inventory, pricing, service, and fulfillment data;</li>
                <li>communications with InstaHealth support or admin teams.</li>
              </ul>

              <h4 className="mt-6 text-base font-semibold text-slate-900">Transaction / Checkout Information</h4>
              <p className="mt-3 text-sm leading-7 text-slate-700 md:text-base">
                When you place an order or make a payment through the Services, we may collect or receive information
                relating to:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>items purchased;</li>
                <li>order totals;</li>
                <li>timestamps;</li>
                <li>billing and shipping details;</li>
                <li>payment status;</li>
                <li>refund status;</li>
                <li>fulfillment status;</li>
                <li>booking or service scheduling details;</li>
                <li>vendor allocation and order routing details.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                <strong>Important:</strong> Payment card information is generally processed by third-party payment
                processors and not stored directly by InstaHealth except where technically necessary for transaction
                confirmation, tokenization, fraud prevention, or compliance workflows.
              </p>
            </section>

            <section id="information-from-third-parties" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">3. INFORMATION WE RECEIVE FROM THIRD PARTIES</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We may receive information about you from third parties where relevant to the operation of the
                Services.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">This may include information from:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>payment providers;</li>
                <li>authentication providers;</li>
                <li>social login providers;</li>
                <li>Shopify or connected e-commerce systems;</li>
                <li>search and analytics providers;</li>
                <li>mapping and location providers;</li>
                <li>fraud prevention or security vendors;</li>
                <li>marketing and communications providers;</li>
                <li>vendors or merchants where relevant to your order or booking;</li>
                <li>publicly available business records or verification sources.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                If you choose to sign in using a third-party login or identity provider, we may receive limited account
                information from that provider, such as your name, email address, profile image, or authentication
                identifier, depending on the permissions granted.
              </p>
            </section>

            <section id="technical-information" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">4. TECHNICAL INFORMATION WE COLLECT AUTOMATICALLY</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                When you use InstaHealth, we automatically collect certain technical and usage information relating to
                your device, browser, connection, and interaction with the Services.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">This may include:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>IP address;</li>
                <li>browser type and version;</li>
                <li>operating system;</li>
                <li>device type;</li>
                <li>language preferences;</li>
                <li>referral URLs;</li>
                <li>approximate geographic location;</li>
                <li>pages viewed;</li>
                <li>products or categories viewed;</li>
                <li>clicks, taps, searches, and navigation patterns;</li>
                <li>session duration;</li>
                <li>login timestamps;</li>
                <li>vendor dashboard activity;</li>
                <li>checkout activity;</li>
                <li>error logs and diagnostic data;</li>
                <li>identifiers used for security, fraud prevention, and performance monitoring.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Where you are logged into the Services, this information may be associated with your account.
              </p>
            </section>

            <section id="cookies" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">5. COOKIES AND TRACKING TECHNOLOGIES</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We and our service providers may use cookies, pixels, tags, scripts, SDKs, local storage, and similar
                tracking technologies to collect and store information when you use the Services.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">These technologies may be used to:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>keep you logged in;</li>
                <li>remember preferences and session state;</li>
                <li>improve site performance;</li>
                <li>support search and filtering;</li>
                <li>understand how users interact with the platform;</li>
                <li>analyze traffic and conversion behavior;</li>
                <li>personalize content or recommendations;</li>
                <li>assist with fraud detection and abuse prevention;</li>
                <li>support advertising or retargeting where applicable.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">Cookies may include:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>session cookies (expire when you close your browser);</li>
                <li>persistent cookies (remain until expiry or deletion);</li>
                <li>functional cookies;</li>
                <li>analytics cookies;</li>
                <li>security-related cookies.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                You can usually control cookies through your browser settings. However, disabling some cookies may
                affect the functionality of InstaHealth.
              </p>
            </section>

            <section id="log-data" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">6. LOG DATA AND SECURITY EVENTS</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We maintain logs and records relating to access, usage, system events, and security events for
                operational, security, fraud prevention, and compliance purposes.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">These records may include:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>account access logs;</li>
                <li>vendor dashboard actions;</li>
                <li>admin actions;</li>
                <li>failed login attempts;</li>
                <li>order lifecycle events;</li>
                <li>webhook and integration events;</li>
                <li>fraud or abuse signals;</li>
                <li>API and system request metadata;</li>
                <li>infrastructure and performance logs.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">We use these records to:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>monitor the integrity of the Services;</li>
                <li>investigate incidents;</li>
                <li>detect misuse, fraud, unauthorized access, or abuse;</li>
                <li>maintain audit trails;</li>
                <li>support dispute resolution and internal controls.</li>
              </ul>
            </section>

            <section id="location-data" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">7. LOCATION DATA</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We may collect or infer location-related information where relevant to the operation of the marketplace
                and user experience.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">This may include:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>delivery address or service address;</li>
                <li>location selected by a customer;</li>
                <li>suburb, city, region, or postcode;</li>
                <li>approximate device location (where permitted);</li>
                <li>vendor service radius or delivery zone;</li>
                <li>geographic filtering and availability logic.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">We may use location data to:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>show relevant vendors or listings;</li>
                <li>determine service availability;</li>
                <li>calculate delivery or fulfillment eligibility;</li>
                <li>localize the marketplace experience;</li>
                <li>improve search relevance;</li>
                <li>support operational logistics.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Where device-based location permissions are requested, you may be able to manage these through your
                browser or device settings.
              </p>
            </section>

            <section id="sensitive-information" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">8. SENSITIVE OR HEALTH-RELATED INFORMATION</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                InstaHealth operates in health-adjacent product and service categories. Depending on how the Services
                are used, certain purchases, bookings, search behavior, or vendor interactions may imply interests
                relating to wellness, supplements, diagnostics, skincare, hormones, peptides, consultations, or similar
                categories.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We do not position InstaHealth as a medical records platform unless expressly stated otherwise.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                However, because certain marketplace activity may be considered sensitive in nature depending on
                jurisdiction, we aim to handle such information with an elevated level of care, access restriction, and
                security.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                You should not submit unnecessary medical records, diagnosis notes, prescriptions, or highly sensitive
                clinical information through general forms or support channels unless specifically requested through an
                approved and secure process.
              </p>
            </section>

            <section id="how-we-use-information" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">9. HOW WE USE YOUR INFORMATION</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We may use your information for one or more of the following purposes:
              </p>
              <ol className="mt-4 list-decimal space-y-4 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>
                  <strong>To provide and operate the Services</strong>
                  <br />
                  Including marketplace browsing, account creation, checkout, order processing, booking workflows,
                  vendor onboarding, and vendor operations.
                </li>
                <li>
                  <strong>To facilitate transactions and fulfillment</strong>
                  <br />
                  Including routing orders to vendors, managing order status, enabling service bookings, and supporting
                  customer-vendor interactions where necessary.
                </li>
                <li>
                  <strong>To support vendor and merchant functionality</strong>
                  <br />
                  Including product sync, inventory sync, order sync, booking configuration, vendor dashboards,
                  onboarding, and operational tooling.
                </li>
                <li>
                  <strong>To process payments, refunds, settlements, and transaction workflows</strong>
                  <br />
                  Including fraud checks, charge management, payment confirmations, and reconciliation support.
                </li>
                <li>
                  <strong>To communicate with you</strong>
                  <br />
                  Including account notices, order confirmations, vendor notices, service updates, support responses,
                  operational alerts, and important platform communications.
                </li>
                <li>
                  <strong>To provide customer support and dispute handling</strong>
                  <br />
                  Including troubleshooting, issue resolution, transaction investigations, and marketplace support.
                </li>
                <li>
                  <strong>To improve, analyze, and develop the Services</strong>
                  <br />
                  Including product improvement, user experience optimization, analytics, testing, and feature
                  development.
                </li>
                <li>
                  <strong>To personalize marketplace experiences</strong>
                  <br />
                  Including relevant product suggestions, category experiences, location-based availability, and
                  platform optimization.
                </li>
                <li>
                  <strong>To maintain safety, trust, and security</strong>
                  <br />
                  Including fraud prevention, abuse detection, account verification, security monitoring, and internal
                  audit controls.
                </li>
                <li>
                  <strong>To comply with legal, tax, regulatory, and compliance obligations</strong>
                  <br />
                  Including recordkeeping, investigations, legal responses, and operational compliance.
                </li>
                <li>
                  <strong>To support marketing and communications</strong>
                  <br />
                  Including promotional emails, remarketing, campaigns, or business communications where permitted by
                  law or based on your preferences.
                </li>
                <li>
                  <strong>To enforce our legal rights and platform rules</strong>
                  <br />
                  Including the enforcement of our terms, vendor rules, marketplace policies, and dispute handling.
                </li>
              </ol>
            </section>

            <section id="what-we-share" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">10. WHAT WE SHARE</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                InstaHealth is a platform that connects customers with vendors, merchants, service providers, and
                marketplace operators. In order for the Services to function, we may need to share information with
                relevant parties.
              </p>

              <h3 className="mt-6 text-lg font-semibold text-slate-900">10.1 With Vendors and Service Providers</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700 md:text-base">
                We may share relevant information with vendors or service providers where necessary to:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>process or fulfill your order;</li>
                <li>manage a booking or appointment;</li>
                <li>respond to an issue with your purchase or booking;</li>
                <li>verify fulfillment or delivery;</li>
                <li>provide customer service related to a vendor transaction.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">This may include:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>your name;</li>
                <li>contact details;</li>
                <li>order details;</li>
                <li>delivery or service address;</li>
                <li>booking information;</li>
                <li>relevant customer notes;</li>
                <li>transaction status.</li>
              </ul>

              <h3 className="mt-6 text-lg font-semibold text-slate-900">10.2 With Service Providers and Operational Partners</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700 md:text-base">
                We may share information with trusted third parties who assist us in operating the Services, including
                providers of:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>hosting and infrastructure;</li>
                <li>authentication;</li>
                <li>payments;</li>
                <li>analytics;</li>
                <li>search;</li>
                <li>customer communications;</li>
                <li>email delivery;</li>
                <li>cloud storage;</li>
                <li>fraud prevention;</li>
                <li>logging and monitoring;</li>
                <li>shipping or operational support;</li>
                <li>integrations and commerce tooling.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                These third parties may only process data on our behalf where appropriate and subject to applicable
                contractual or operational safeguards.
              </p>

              <h3 className="mt-6 text-lg font-semibold text-slate-900">10.3 With Integration and Platform Providers</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700 md:text-base">
                Where vendors connect external systems or stores, we may process and share relevant data with those
                systems in order to support:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>catalog sync;</li>
                <li>product sync;</li>
                <li>order sync;</li>
                <li>inventory sync;</li>
                <li>vendor connection workflows;</li>
                <li>marketplace integration logic.</li>
              </ul>

              <h3 className="mt-6 text-lg font-semibold text-slate-900">10.4 For Legal, Regulatory, or Security Reasons</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700 md:text-base">
                We may disclose information where reasonably necessary to:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>comply with applicable law, regulation, court order, subpoena, or lawful request;</li>
                <li>investigate fraud, abuse, or security incidents;</li>
                <li>protect the rights, property, safety, or operations of InstaHealth, our users, vendors, or others;</li>
                <li>enforce our legal agreements or internal policies.</li>
              </ul>

              <h3 className="mt-6 text-lg font-semibold text-slate-900">10.5 In Corporate Transactions</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700 md:text-base">
                If InstaHealth is involved in a merger, acquisition, restructuring, financing, sale of assets, or
                similar transaction, your information may be disclosed as part of that process, subject to appropriate
                confidentiality and legal protections.
              </p>

              <h3 className="mt-6 text-lg font-semibold text-slate-900">10.6 Aggregated or De-Identified Information</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700 md:text-base">
                We may use and share aggregated, anonymized, or de-identified information for analytics, business
                intelligence, commercial reporting, operational insights, or platform improvement, provided it does not
                reasonably identify you.
              </p>
            </section>

            <section id="marketing" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">11. MARKETING AND COMMUNICATIONS</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We may send you service-related, operational, account-related, or transactional communications where
                necessary.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Where permitted, we may also send marketing or promotional communications, including information about:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>new categories or services;</li>
                <li>featured vendors;</li>
                <li>offers or promotions;</li>
                <li>platform updates;</li>
                <li>relevant business or marketplace opportunities.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                You may opt out of non-essential marketing communications using unsubscribe links, account settings, or
                by contacting us.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Even if you opt out of marketing, we may still send important non-promotional messages relating to your
                account, orders, bookings, vendor status, security, or legal notices.
              </p>
            </section>

            <section id="international-transfers" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">12. INTERNATIONAL DATA TRANSFERS</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                InstaHealth may process or store your information in the United Arab Emirates and in other countries
                where we or our service providers operate.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                As a result, your information may be transferred to or accessed from jurisdictions outside your country
                of residence, including jurisdictions that may have different data protection laws.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Where such transfers occur, we take commercially reasonable and appropriate steps to ensure that your
                information remains protected through one or more of the following:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>contractual safeguards;</li>
                <li>access controls;</li>
                <li>organizational security measures;</li>
                <li>vendor diligence and data protection controls;</li>
                <li>technical security protections.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                By using the Services and providing your information, you acknowledge that your information may be
                transferred, stored, or processed internationally in accordance with this Policy.
              </p>
            </section>

            <section id="protection" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">13. HOW WE PROTECT YOUR INFORMATION</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We take data security seriously and implement commercially reasonable technical, administrative, and
                organizational measures designed to protect your information from unauthorized access, misuse,
                disclosure, alteration, or destruction.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">These measures may include:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>secure hosting environments;</li>
                <li>access controls;</li>
                <li>authentication protections;</li>
                <li>role-based permissions;</li>
                <li>encrypted transmission where applicable;</li>
                <li>audit logging;</li>
                <li>internal operational restrictions;</li>
                <li>vendor and system access controls.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                However, no system, website, transmission, or storage environment can be guaranteed to be 100% secure.
                You use the Services at your own risk, and you should also take reasonable steps to protect your own
                account credentials and devices.
              </p>
            </section>

            <section id="retention" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">14. DATA RETENTION</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We retain your information for as long as reasonably necessary to:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>provide the Services;</li>
                <li>maintain your account;</li>
                <li>support orders, bookings, or vendor operations;</li>
                <li>comply with legal, tax, accounting, or regulatory obligations;</li>
                <li>resolve disputes;</li>
                <li>enforce our rights;</li>
                <li>prevent fraud or misuse;</li>
                <li>maintain internal business and security records.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">Retention periods may vary depending on:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>the type of information;</li>
                <li>the purpose for which it was collected;</li>
                <li>operational necessity;</li>
                <li>legal or regulatory requirements;</li>
                <li>risk, fraud, or dispute considerations.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                When information is no longer required, we may delete, anonymize, archive, or securely restrict it,
                subject to applicable obligations.
              </p>
            </section>

            <section id="rights" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">15. YOUR RIGHTS</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Depending on your location and applicable law, you may have rights in relation to your personal data,
                including the right to request:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>access to your data;</li>
                <li>correction of inaccurate information;</li>
                <li>deletion of certain information;</li>
                <li>restriction of certain processing;</li>
                <li>objection to certain processing;</li>
                <li>portability of certain data;</li>
                <li>withdrawal of consent where processing is based on consent;</li>
                <li>review of certain automated decision-making where applicable.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We may need to verify your identity before responding to a request, and certain rights may be limited
                where we are legally entitled or required to retain or continue processing certain information.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                To make a privacy-related request, contact us using the details below.
              </p>
            </section>

            <section id="automated-processing" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">16. AUTOMATED PROCESSING AND PLATFORM DECISIONS</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Some aspects of InstaHealth may involve automated or semi-automated processing, including systems used
                for:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>search relevance;</li>
                <li>location-based matching;</li>
                <li>category relevance;</li>
                <li>fraud or abuse screening;</li>
                <li>operational routing;</li>
                <li>order handling logic;</li>
                <li>vendor visibility or marketplace optimization;</li>
                <li>analytics and product recommendations.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Where such systems are used, we aim to apply reasonable oversight and commercially appropriate
                controls.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Unless expressly stated otherwise, InstaHealth does not intend for automated processing alone to make
                legally binding decisions about you without appropriate operational context or review.
              </p>
            </section>

            <section id="childrens-privacy" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">17. CHILDREN&apos;S PRIVACY</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                InstaHealth is not intended for children who are not legally permitted to use the Services under
                applicable law.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We do not knowingly collect personal data from children in violation of applicable legal requirements.
                If you believe a child has provided personal data to us improperly, please contact us and we will review
                the matter.
              </p>
            </section>

            <section id="third-party-links" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">18. THIRD-PARTY LINKS AND VENDOR CONTENT</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Our Services may contain links to third-party websites, vendor pages, external booking pages, external
                checkout environments, third-party storefronts, social media pages, or third-party services.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We are not responsible for the privacy practices, content, or policies of third parties. You should
                review the privacy policies of any third-party service you access.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Vendors operating on or through InstaHealth may also have their own privacy practices and legal
                obligations separate from InstaHealth.
              </p>
            </section>

            <section id="changes" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">19. CHANGES TO THIS PRIVACY POLICY</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We may update this Privacy Policy from time to time to reflect changes in our business, platform
                functionality, legal requirements, integrations, operational practices, or risk controls.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                {`When we make changes, we will update the "Last Updated" date at the top of this page. Where`}
                appropriate, we may also provide additional notice through the website, dashboard, account
                notifications, or other communications.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Your continued use of the Services after changes are posted may constitute acknowledgment of the
                updated Policy, to the extent permitted by law.
              </p>
            </section>

            <section id="contact" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">20. CONTACT US</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                If you have any questions, concerns, or requests relating to this Privacy Policy or our handling of
                personal data, you can contact us at:
              </p>
              <div className="mt-4 space-y-2 text-sm leading-7 text-slate-700 md:text-base">
                <p>
                  <strong>Email:</strong>{" "}
                  <a className="font-medium text-emerald-700 underline" href="mailto:info@instahealth.ae">
                    info@instahealth.ae
                  </a>
                </p>
                <p>
                  <strong>Support:</strong>{" "}
                  <a className="font-medium text-emerald-700 underline" href="mailto:support@instahealth.ae">
                    support@instahealth.ae
                  </a>
                </p>
                <p>
                  <strong>Legal:</strong>{" "}
                  <a className="font-medium text-emerald-700 underline" href="mailto:legal@instahealth.ae">
                    legal@instahealth.ae
                  </a>
                </p>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                If you do not yet have all of these addresses set up, create them or temporarily route them to your
                main support inbox.
              </p>
            </section>

            <section id="important-notice" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">21. IMPORTANT NOTICE</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                InstaHealth is a marketplace and technology platform. Unless expressly stated otherwise, InstaHealth
                does not provide medical advice, diagnosis, treatment, or emergency services.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Any health-related products, services, consultations, diagnostics, or vendor offerings made available
                through the platform are subject to the relevant vendor, provider, practitioner, merchant, or
                third-party operator.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Users should exercise appropriate judgment and obtain independent professional advice where necessary.
              </p>
            </section>
          </div>

          <footer className="border-t border-slate-200 px-6 py-5 text-sm text-slate-600 md:px-10">
            Looking for other legal documents? Visit the homepage footer legal links or return to{" "}
            <Link className="font-medium text-emerald-700 underline" href="/">
              InstaHealth
            </Link>
            .
          </footer>
        </article>
      </div>
    </div>
  );
}
