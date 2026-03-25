import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | InstaHealth",
  description: "Read InstaHealth's Terms of Service.",
};

const sections = [
  { id: "about-instahealth", label: "1. ABOUT INSTAHEALTH" },
  { id: "eligibility", label: "2. ELIGIBILITY" },
  { id: "accounts", label: "3. ACCOUNTS" },
  { id: "marketplace-nature", label: "4. MARKETPLACE NATURE OF THE PLATFORM" },
  { id: "products-services-listings", label: "5. PRODUCTS, SERVICES, AND LISTINGS" },
  { id: "no-medical-advice", label: "6. NO MEDICAL ADVICE OR CLINICAL RELATIONSHIP" },
  { id: "orders-bookings-transactions", label: "7. ORDERS, BOOKINGS, AND TRANSACTIONS" },
  { id: "payments", label: "8. PAYMENTS" },
  { id: "refunds-returns-cancellations-disputes", label: "9. REFUNDS, RETURNS, CANCELLATIONS, AND DISPUTES" },
  { id: "vendor-terms-third-party-performance", label: "10. VENDOR TERMS AND THIRD-PARTY PERFORMANCE" },
  { id: "user-conduct", label: "11. USER CONDUCT" },
  { id: "vendor-business-submissions", label: "12. VENDOR AND BUSINESS SUBMISSIONS" },
  { id: "integrations-third-party-systems", label: "13. INTEGRATIONS AND THIRD-PARTY SYSTEMS" },
  { id: "intellectual-property", label: "14. INTELLECTUAL PROPERTY" },
  { id: "reviews-feedback-user-content", label: "15. REVIEWS, FEEDBACK, AND USER CONTENT" },
  { id: "disclaimers", label: "16. DISCLAIMERS" },
  { id: "limitation-of-liability", label: "17. LIMITATION OF LIABILITY" },
  { id: "indemnity", label: "18. INDEMNITY" },
  { id: "compliance-regulated-categories", label: "19. COMPLIANCE AND REGULATED CATEGORIES" },
  { id: "force-majeure", label: "20. FORCE MAJEURE" },
  { id: "termination", label: "21. TERMINATION" },
  { id: "changes-to-these-terms", label: "22. CHANGES TO THESE TERMS" },
  { id: "governing-law-disputes", label: "23. GOVERNING LAW AND DISPUTES" },
  { id: "severability", label: "24. SEVERABILITY" },
  { id: "no-waiver", label: "25. NO WAIVER" },
  { id: "entire-agreement", label: "26. ENTIRE AGREEMENT" },
  { id: "contact-us", label: "27. CONTACT US" },
];

export default function TermsOfServicePage() {
  return (
    <div className="bg-slate-50 py-8 md:py-12">
      <div className="container mx-auto max-w-5xl px-4">
        <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 px-6 py-8 md:px-10 md:py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Legal</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">TERMS OF SERVICE</h1>
            <p className="mt-4 text-sm font-medium text-slate-700">Last Updated: 25 March 2026</p>
            <p className="mt-6 text-sm leading-7 text-slate-700 md:text-base">
              {`These Terms of Service ("Terms") govern your access to and use of the InstaHealth website, marketplace, applications, dashboards, interfaces, integrations, communications, and related services (collectively, the "Services").`}
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
              {`These Terms form a legally binding agreement between you and InstaHealth, together with its affiliates, subsidiaries, related entities, successors, assigns, contractors, service providers, and technology partners ("InstaHealth", "we", "our", or "us").`}
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
              By accessing, browsing, registering for, purchasing through, selling through, listing on, integrating
              with, or otherwise using the Services, you agree to be bound by these Terms and our related policies,
              including our Privacy Policy and any additional vendor, merchant, booking, payment, category-specific, or
              operational terms we may publish from time to time.
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
              If you do not agree to these Terms, you must not access or use the Services.
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
            <section id="about-instahealth" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">1. ABOUT INSTAHEALTH</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                InstaHealth is a technology-enabled marketplace and platform that connects customers with independent
                vendors, merchants, suppliers, clinics, service providers, practitioners, businesses, and other
                {`third-party operators ("Vendors").`}
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                InstaHealth may facilitate the listing, discovery, marketing, sale, booking, routing, payment
                processing, fulfillment support, order management, and operational coordination of products and
                services offered by Vendors.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                InstaHealth may also provide administrative tools, merchant tools, vendor dashboards, integrations,
                search functionality, location-based discovery, account systems, payment support, and related
                infrastructure.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Important: Unless expressly stated otherwise, InstaHealth is not the manufacturer, seller, supplier,
                distributor, prescribing provider, healthcare provider, laboratory, clinic, doctor, pharmacist, or
                direct service provider of the products or services listed by Vendors on the platform.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                InstaHealth provides the platform. Vendors provide the actual goods and/or services.
              </p>
            </section>

            <section id="eligibility" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">2. ELIGIBILITY</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">To use the Services, you must:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>be legally capable of entering into a binding agreement;</li>
                <li>provide accurate and complete information when requested;</li>
                <li>comply with all applicable laws and regulations;</li>
                <li>use the Services only for lawful and authorized purposes.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                If you are using the Services on behalf of a company, vendor, clinic, merchant, or other legal entity,
                you represent and warrant that you have authority to bind that entity to these Terms.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We reserve the right to refuse access, registration, onboarding, or continued use of the Services at
                our discretion.
              </p>
            </section>

            <section id="accounts" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">3. ACCOUNTS</h2>

              <h3 className="mt-6 text-lg font-semibold text-slate-900">3.1 Account Creation</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700 md:text-base">
                Certain parts of the Services require you to create an account. You agree to provide accurate, current,
                and complete information and to keep it updated.
              </p>

              <h3 className="mt-6 text-lg font-semibold text-slate-900">3.2 Account Security</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700 md:text-base">You are responsible for:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>maintaining the confidentiality of your login credentials;</li>
                <li>restricting access to your account and devices;</li>
                <li>all activity that occurs under your account.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                You must notify us immediately if you suspect unauthorized access, misuse, or a security breach
                involving your account.
              </p>

              <h3 className="mt-6 text-lg font-semibold text-slate-900">3.3 Suspension or Termination</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700 md:text-base">
                We may suspend, restrict, or terminate your account or access to the Services at any time, with or
                without notice, if we reasonably believe:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>you have breached these Terms;</li>
                <li>
                  your use creates legal, commercial, operational, reputational, compliance, or security risk;
                </li>
                <li>your account is being used fraudulently, improperly, or unlawfully;</li>
                <li>
                  suspension is otherwise necessary to protect InstaHealth, Vendors, users, or the platform.
                </li>
              </ul>
            </section>

            <section id="marketplace-nature" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">4. MARKETPLACE NATURE OF THE PLATFORM</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                You acknowledge and agree that InstaHealth is a multi-vendor marketplace and platform facilitator.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">Unless expressly stated otherwise:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>products and services are listed and offered by independent Vendors;</li>
                <li>
                  Vendors are responsible for their own listings, pricing, descriptions, fulfillment, service delivery,
                  compliance, and operational conduct;
                </li>
                <li>
                  InstaHealth does not independently verify every listing, claim, specification, service description,
                  product representation, stock level, treatment statement, timeline, or Vendor statement.
                </li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                While we may review, moderate, remove, rank, suppress, or reject listings and Vendors, we do not
                guarantee:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>that all listings are accurate;</li>
                <li>that all products or services are suitable for you;</li>
                <li>that all Vendors are compliant with every law applicable to them;</li>
                <li>that any product or service will meet your expectations or requirements.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">You use the marketplace at your own risk.</p>
            </section>

            <section id="products-services-listings" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">5. PRODUCTS, SERVICES, AND LISTINGS</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Products and services displayed on InstaHealth may include health-adjacent, wellness, beauty,
                supplement, skincare, consultation, diagnostics, peptide, hormone, insurance, or service-based
                categories.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                All product or service listings, images, pricing, specifications, availability, descriptions, benefits,
                statements, or promotional content are provided for general informational and commercial purposes only.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">We do not guarantee that listings are:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>complete;</li>
                <li>current;</li>
                <li>accurate;</li>
                <li>clinically suitable;</li>
                <li>legally suitable in your jurisdiction;</li>
                <li>appropriate for your personal circumstances.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Vendors are solely responsible for the content and legality of their listings and offerings.
              </p>
            </section>

            <section id="no-medical-advice" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">6. NO MEDICAL ADVICE OR CLINICAL RELATIONSHIP</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">InstaHealth is not a medical provider.</p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Nothing on the Services constitutes or should be relied on as:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>medical advice;</li>
                <li>clinical advice;</li>
                <li>diagnosis;</li>
                <li>treatment advice;</li>
                <li>prescribing advice;</li>
                <li>emergency advice;</li>
                <li>professional healthcare advice.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Any information, product descriptions, consultation availability, vendor content, category
                descriptions, educational content, or marketplace listings made available through InstaHealth are
                provided for general informational and commercial purposes only.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                You should not rely on the Services as a substitute for qualified professional advice from an
                appropriately licensed provider.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                If you have a medical concern, emergency, adverse reaction, or urgent health issue, seek immediate
                assistance from an appropriate qualified professional or emergency service.
              </p>
            </section>

            <section id="orders-bookings-transactions" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">7. ORDERS, BOOKINGS, AND TRANSACTIONS</h2>

              <h3 className="mt-6 text-lg font-semibold text-slate-900">7.1 Placing Orders or Bookings</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700 md:text-base">
                When you place an order or make a booking through InstaHealth, you are submitting a request to
                purchase or reserve goods and/or services offered by a Vendor.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We may facilitate the transaction, but acceptance, fulfillment, scheduling, stock confirmation,
                availability, and completion may depend on the relevant Vendor or service provider.
              </p>

              <h3 className="mt-6 text-lg font-semibold text-slate-900">7.2 Order Acceptance</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700 md:text-base">Orders and bookings may be:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>accepted;</li>
                <li>rejected;</li>
                <li>delayed;</li>
                <li>modified;</li>
                <li>canceled;</li>
                <li>rescheduled;</li>
                <li>refunded;</li>
                <li>partially fulfilled;</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                depending on availability, compliance requirements, vendor decisions, payment status, operational
                limitations, or other factors.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We reserve the right to cancel or refuse any transaction where necessary.
              </p>

              <h3 className="mt-6 text-lg font-semibold text-slate-900">7.3 Pricing and Availability</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700 md:text-base">
                Prices, listings, and availability may change at any time without notice.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We do not guarantee that all prices, promotions, stock levels, availability windows, or booking slots
                displayed on the platform are current or error-free.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                In the event of an error, we may cancel, correct, or reverse affected transactions.
              </p>

              <h3 className="mt-6 text-lg font-semibold text-slate-900">7.4 Vendor Responsibility</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700 md:text-base">
                The Vendor is primarily responsible for the actual supply, fulfillment, booking, service delivery,
                scheduling, dispatch, service quality, and operational handling of the product or service you purchase.
              </p>
            </section>

            <section id="payments" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">8. PAYMENTS</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Payments made through InstaHealth may be processed by third-party payment processors.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                By submitting payment information, you represent and warrant that:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>you are authorized to use the payment method;</li>
                <li>the payment information provided is accurate;</li>
                <li>you authorize the applicable charges and associated transaction processing.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">We reserve the right to:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>place holds;</li>
                <li>delay processing;</li>
                <li>reverse transactions;</li>
                <li>decline payments;</li>
                <li>request additional verification;</li>
                <li>investigate suspicious or high-risk transactions.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                You are responsible for any taxes, duties, charges, bank fees, processor fees, currency conversion
                charges, or similar amounts applicable to your transaction unless expressly stated otherwise.
              </p>
            </section>

            <section id="refunds-returns-cancellations-disputes" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">9. REFUNDS, RETURNS, CANCELLATIONS, AND DISPUTES</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Refunds, returns, cancellations, rescheduling, credits, and related remedies may depend on:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>the nature of the product or service;</li>
                <li>vendor policy;</li>
                <li>category-specific restrictions;</li>
                <li>applicable law;</li>
                <li>hygiene, safety, or perishability considerations;</li>
                <li>timing and fulfillment status;</li>
                <li>
                  whether the product or service has already been provided, dispatched, consumed, booked, or
                  reserved.
                </li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Some products or services may be non-refundable, non-returnable, or subject to strict cancellation
                terms.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                InstaHealth may facilitate refund or dispute handling, but does not guarantee that every dispute will
                be resolved in your favor.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Where a dispute arises, we reserve the right to investigate, request evidence, pause payouts, restrict
                accounts, reverse credits, or make a platform-level determination where commercially or operationally
                necessary.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Further details may also be governed by our separate Refund / Returns / Cancellation Policy if
                published.
              </p>
            </section>

            <section id="vendor-terms-third-party-performance" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">10. VENDOR TERMS AND THIRD-PARTY PERFORMANCE</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Vendors using InstaHealth are independent third parties and are not employees, agents, franchisees, or
                legal representatives of InstaHealth unless expressly stated otherwise.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We are not liable for acts, omissions, statements, failures, misconduct, delays, negligence,
                misrepresentations, regulatory breaches, or service issues caused by Vendors.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">This includes issues relating to:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>product quality;</li>
                <li>product legality;</li>
                <li>ingredient or composition concerns;</li>
                <li>service quality;</li>
                <li>practitioner conduct;</li>
                <li>appointment delays;</li>
                <li>booking failures;</li>
                <li>delivery issues;</li>
                <li>customer service failures;</li>
                <li>inaccurate listings;</li>
                <li>misuse of customer information by a Vendor;</li>
                <li>professional licensing or operational compliance.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                You agree that your use of any Vendor offering is at your own risk.
              </p>
            </section>

            <section id="user-conduct" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">11. USER CONDUCT</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">You agree not to use the Services to:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>violate any law or regulation;</li>
                <li>infringe the rights of others;</li>
                <li>commit fraud or misrepresentation;</li>
                <li>submit false, misleading, or inaccurate information;</li>
                <li>interfere with platform operations;</li>
                <li>scrape, harvest, copy, reverse engineer, or misuse the Services;</li>
                <li>bypass security or access controls;</li>
                <li>impersonate another person or business;</li>
                <li>abuse support channels or staff;</li>
                <li>upload harmful, unlawful, infringing, offensive, or deceptive content;</li>
                <li>use the platform in a way that could damage InstaHealth, Vendors, or users.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We reserve the right to investigate and act on any suspected misuse, abuse, fraud, or policy breach.
              </p>
            </section>

            <section id="vendor-business-submissions" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">12. VENDOR AND BUSINESS SUBMISSIONS</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Where you apply to become a Vendor or submit business information through InstaHealth, you represent
                and warrant that:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>all information submitted is true, accurate, and not misleading;</li>
                <li>you are authorized to act for the business;</li>
                <li>your listings, products, services, and operations comply with applicable law;</li>
                <li>
                  you hold any licenses, approvals, permissions, or qualifications required for your business;
                </li>
                <li>your use of InstaHealth does not infringe the rights of any third party.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We reserve the right to approve, reject, suspend, delist, or remove any Vendor, listing, or
                submission at our discretion.
              </p>
            </section>

            <section id="integrations-third-party-systems" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">13. INTEGRATIONS AND THIRD-PARTY SYSTEMS</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                InstaHealth may support integrations with third-party platforms, tools, APIs, and systems, including
                but not limited to e-commerce systems, payment providers, authentication systems, search tools,
                communications tools, mapping services, or operational software.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We do not guarantee that any integration will be:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>uninterrupted;</li>
                <li>error-free;</li>
                <li>compatible indefinitely;</li>
                <li>available at all times;</li>
                <li>free from third-party failures or changes.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                You acknowledge that third-party platforms may change their APIs, policies, access, permissions, or
                technical behavior at any time, and InstaHealth is not liable for resulting disruption, data mismatch,
                sync issues, or integration failures.
              </p>
            </section>

            <section id="intellectual-property" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">14. INTELLECTUAL PROPERTY</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                All content, software, design, branding, layout, workflows, databases, systems, user interfaces, text,
                graphics, logos, icons, compilations, and platform materials associated with InstaHealth are owned by
                or licensed to InstaHealth and are protected by intellectual property and other applicable laws.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Except as expressly permitted by us in writing, you may not:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>copy;</li>
                <li>reproduce;</li>
                <li>republish;</li>
                <li>modify;</li>
                <li>distribute;</li>
                <li>exploit;</li>
                <li>reverse engineer;</li>
                <li>commercially use;</li>
                <li>create derivative works from;</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">any part of the Services.</p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Vendors and users retain ownership of content they lawfully submit, but by submitting content to the
                Services, you grant InstaHealth a broad, non-exclusive, worldwide, royalty-free license to use, host,
                display, reproduce, modify, distribute, and operate that content as reasonably necessary to run,
                promote, secure, and improve the Services.
              </p>
            </section>

            <section id="reviews-feedback-user-content" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">15. REVIEWS, FEEDBACK, AND USER CONTENT</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                If you submit reviews, ratings, comments, feedback, suggestions, media, content, or other materials
                through the Services, you grant InstaHealth a non-exclusive, worldwide, perpetual, royalty-free,
                sublicensable right to use, display, reproduce, adapt, publish, and otherwise exploit that content in
                connection with the Services and our business.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                You are solely responsible for content you submit and must ensure it is lawful, accurate, and
                non-infringing.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We reserve the right to remove, edit, suppress, refuse, or moderate any content at our discretion.
              </p>
            </section>

            <section id="disclaimers" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">16. DISCLAIMERS</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                {`To the maximum extent permitted by law, the Services are provided on an "as is", "as available", and
                "with all faults" basis.`}
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                InstaHealth disclaims all express, implied, statutory, and other warranties, representations, and
                conditions, including any implied warranties of:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>merchantability;</li>
                <li>fitness for a particular purpose;</li>
                <li>title;</li>
                <li>non-infringement;</li>
                <li>reliability;</li>
                <li>availability;</li>
                <li>quality;</li>
                <li>suitability;</li>
                <li>performance.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Without limiting the above, InstaHealth does not warrant that:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>the Services will be uninterrupted or error-free;</li>
                <li>listings will be accurate or complete;</li>
                <li>products or services will meet your expectations;</li>
                <li>Vendors will perform properly;</li>
                <li>bookings or orders will always succeed;</li>
                <li>the platform will be free from bugs, downtime, delays, or vulnerabilities;</li>
                <li>
                  any information made available through the Services is suitable for your personal, legal, medical,
                  commercial, or professional circumstances.
                </li>
              </ul>
            </section>

            <section id="limitation-of-liability" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">17. LIMITATION OF LIABILITY</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                To the maximum extent permitted by law, InstaHealth and its affiliates, officers, directors, employees,
                contractors, service providers, licensors, agents, and partners shall not be liable for any:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>indirect damages;</li>
                <li>incidental damages;</li>
                <li>special damages;</li>
                <li>exemplary damages;</li>
                <li>punitive damages;</li>
                <li>consequential damages;</li>
                <li>loss of profits;</li>
                <li>loss of revenue;</li>
                <li>loss of opportunity;</li>
                <li>loss of goodwill;</li>
                <li>loss of data;</li>
                <li>business interruption;</li>
                <li>procurement of substitute goods or services;</li>
                <li>health-related consequences;</li>
                <li>professional reliance losses;</li>
                <li>product-related losses;</li>
                <li>vendor-related losses;</li>
                <li>booking-related losses;</li>
                <li>service-related losses;</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                arising out of or relating to your use of or inability to use the Services, even if advised of the
                possibility of such damages.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                {`To the maximum extent permitted by law, InstaHealth's total aggregate liability for any claim arising out of or relating to the Services shall not exceed the greater of:`}
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>
                  the amount paid by you to InstaHealth through the Services in the three (3) months immediately
                  preceding the event giving rise to the claim; or
                </li>
                <li>AED 500.</li>
              </ul>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Some jurisdictions do not allow certain limitations of liability, so parts of this section may not
                apply to you to the extent prohibited by law.
              </p>
            </section>

            <section id="indemnity" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">18. INDEMNITY</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                You agree to indemnify, defend, and hold harmless InstaHealth and its affiliates, officers, directors,
                employees, contractors, licensors, service providers, and partners from and against any and all claims,
                losses, liabilities, damages, costs, expenses, investigations, judgments, fines, penalties, and legal
                fees arising out of or relating to:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>your use of the Services;</li>
                <li>your breach of these Terms;</li>
                <li>your violation of any law or regulation;</li>
                <li>your misuse of the platform;</li>
                <li>your listings, content, products, services, or submissions;</li>
                <li>your dealings with Vendors or users;</li>
                <li>your infringement of any rights of another person or entity.</li>
              </ul>
            </section>

            <section id="compliance-regulated-categories" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">19. COMPLIANCE AND REGULATED CATEGORIES</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                You acknowledge that some categories available through InstaHealth may be regulated, restricted,
                age-sensitive, prescription-sensitive, consultation-sensitive, or otherwise subject to legal or
                professional controls depending on the jurisdiction.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                It is your responsibility to ensure that your access to, use of, purchase of, sale of, or reliance on
                any product or service is lawful and appropriate in your jurisdiction and circumstances.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Vendors are solely responsible for complying with all laws, licensing rules, product restrictions,
                advertising rules, and professional obligations applicable to their business and offerings.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                InstaHealth reserves the right to restrict, remove, suppress, reject, or monitor any category, listing,
                vendor, or transaction at any time.
              </p>
            </section>

            <section id="force-majeure" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">20. FORCE MAJEURE</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                InstaHealth shall not be liable for any delay, interruption, failure, loss, or inability to perform
                caused by events outside our reasonable control, including:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>internet or infrastructure outages;</li>
                <li>cyber incidents;</li>
                <li>platform outages;</li>
                <li>vendor failures;</li>
                <li>logistics disruptions;</li>
                <li>government actions;</li>
                <li>regulatory changes;</li>
                <li>acts of God;</li>
                <li>war;</li>
                <li>civil unrest;</li>
                <li>labor disputes;</li>
                <li>natural disasters;</li>
                <li>utility failures;</li>
                <li>pandemics or public health events.</li>
              </ul>
            </section>

            <section id="termination" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">21. TERMINATION</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We may suspend, restrict, or terminate your access to the Services at any time, with or without
                notice, for any reason, including where we reasonably believe continued access is commercially,
                operationally, legally, or reputationally inappropriate.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">Upon termination:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 md:text-base">
                <li>your right to use the Services ceases immediately;</li>
                <li>we may disable or restrict access to your account;</li>
                <li>we may retain information as permitted or required by law or policy;</li>
                <li>
                  accrued rights, obligations, liabilities, and protections under these Terms survive as applicable.
                </li>
              </ul>
            </section>

            <section id="changes-to-these-terms" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">22. CHANGES TO THESE TERMS</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                We may update or modify these Terms at any time.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                {`When we do, we may update the "Last Updated" date and, where appropriate, provide additional notice
                through the Services, by email, by account notice, or otherwise.`}
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Your continued use of the Services after updated Terms are posted constitutes your acceptance of the
                updated Terms to the extent permitted by law.
              </p>
            </section>

            <section id="governing-law-disputes" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">23. GOVERNING LAW AND DISPUTES</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                These Terms shall be governed by and construed in accordance with the laws applicable in the United
                Arab Emirates, unless otherwise required by mandatory law.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                You agree that any dispute, claim, controversy, or proceeding arising out of or relating to the
                Services or these Terms shall be subject to the exclusive or otherwise appropriate jurisdiction and
                forum determined by InstaHealth, subject to any non-waivable legal rights you may have under
                applicable law.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Before commencing formal legal action, you agree to first contact us and make a genuine effort to
                resolve the dispute informally.
              </p>
            </section>

            <section id="severability" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">24. SEVERABILITY</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                If any provision of these Terms is found to be unlawful, invalid, or unenforceable, that provision
                shall be severed or limited to the minimum extent necessary, and the remaining provisions shall remain
                in full force and effect.
              </p>
            </section>

            <section id="no-waiver" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">25. NO WAIVER</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Any failure by InstaHealth to enforce any right or provision under these Terms shall not operate as a
                waiver of that right or provision.
              </p>
            </section>

            <section id="entire-agreement" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">26. ENTIRE AGREEMENT</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                These Terms, together with our Privacy Policy and any other policies, guidelines, or supplemental terms
                expressly incorporated by reference, constitute the entire agreement between you and InstaHealth
                regarding the Services and supersede any prior understandings, communications, or agreements relating
                to the same subject matter.
              </p>
            </section>

            <section id="contact-us" className="scroll-mt-28">
              <h2 className="text-xl font-semibold text-slate-900">27. CONTACT US</h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                If you have any questions regarding these Terms, you may contact us at:
              </p>
              <div className="mt-4 space-y-2 text-sm leading-7 text-slate-700 md:text-base">
                <p>Support: support@instahealth.ae</p>
                <p>General: info@instahealth.ae</p>
              </div>
            </section>
          </div>
        </article>
      </div>
    </div>
  );
}
