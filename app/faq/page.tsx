import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ | InstaHealth",
  description: "Frequently asked questions about using InstaHealth.",
};

type FAQItem = {
  id: number;
  question: string;
  answer: React.ReactNode;
};

type FAQSection = {
  id: string;
  title: string;
  items: FAQItem[];
};

const sections: FAQSection[] = [
  {
    id: "general",
    title: "General",
    items: [
      {
        id: 1,
        question: "What is InstaHealth?",
        answer:
          "InstaHealth is a multi-vendor health marketplace that connects customers with vendors, merchants, clinics, and service providers offering health-related products and services. Depending on the category, users may browse products, place orders, or book services through the platform.",
      },
      {
        id: 2,
        question: "Does InstaHealth sell products directly?",
        answer:
          "In most cases, no. InstaHealth operates as a marketplace and platform. Products and services are generally offered by independent vendors and service providers listed on the platform unless expressly stated otherwise.",
      },
      {
        id: 3,
        question: "What types of products and services are available on InstaHealth?",
        answer:
          "Categories may include peptides, IV drips, blood tests, supplements, hormones, consultations, skincare, haircare, insurance, and other health-related or wellness-related offerings, depending on availability and vendor participation.",
      },
      {
        id: 4,
        question: "Is InstaHealth a medical provider?",
        answer:
          "No. InstaHealth is not a medical provider and does not provide medical advice, diagnosis, treatment, or emergency services. Any health-related products or services available through the platform are offered by independent vendors or providers.",
      },
      {
        id: 5,
        question: "Can I use InstaHealth on mobile?",
        answer: "Yes. InstaHealth can be accessed through supported mobile browsers and compatible devices.",
      },
    ],
  },
  {
    id: "orders-and-purchases",
    title: "Orders and Purchases",
    items: [
      {
        id: 6,
        question: "How do I place an order?",
        answer:
          "You can browse categories or products, add items to your basket, complete checkout, and submit your order through the platform.",
      },
      {
        id: 7,
        question: "Who fulfills my order?",
        answer:
          "Orders are generally fulfilled by the vendor or service provider offering the relevant product or service. InstaHealth may facilitate the transaction and order flow, but fulfillment is typically handled by the vendor.",
      },
      {
        id: 8,
        question: "Can I cancel an order after placing it?",
        answer:
          "It depends on the type of product or service, vendor policy, fulfillment status, and applicable law. Some orders may be canceled, while others may already be processed, booked, or dispatched and may not be cancellable.",
      },
      {
        id: 9,
        question: "Can I get a refund?",
        answer:
          "Refund eligibility depends on the product or service category, vendor policy, fulfillment status, and applicable law. Some items or services may be non-refundable or subject to specific return or cancellation conditions.",
      },
      {
        id: 10,
        question: "What if my order is wrong, delayed, or incomplete?",
        answer:
          "Contact support as soon as possible with your order details. We may investigate the issue with the relevant vendor and help coordinate a resolution where appropriate.",
      },
      {
        id: 11,
        question: "Are prices and availability guaranteed?",
        answer:
          "No. Prices, stock levels, service slots, and availability may change. While we aim to keep listings current, errors or changes may occur.",
      },
    ],
  },
  {
    id: "bookings-and-services",
    title: "Bookings and Services",
    items: [
      {
        id: 12,
        question: "Can I book services through InstaHealth?",
        answer:
          "Yes, for participating service categories and vendors. Some listings may allow direct booking or redirect you to a vendor-approved booking flow.",
      },
      {
        id: 13,
        question: "Who provides booked services?",
        answer:
          "Booked services are provided by the relevant vendor, clinic, practitioner, or service provider, not by InstaHealth itself unless expressly stated otherwise.",
      },
      {
        id: 14,
        question: "Can I reschedule or cancel a booking?",
        answer:
          "That depends on the relevant provider's policy, timing, and service type. Some bookings may allow changes, while others may be subject to strict cancellation terms.",
      },
      {
        id: 15,
        question: "Does booking a service mean InstaHealth is responsible for the treatment or result?",
        answer:
          "No. InstaHealth provides the platform and booking flow. The relevant provider is responsible for the actual service, consultation, treatment, or appointment.",
      },
    ],
  },
  {
    id: "accounts",
    title: "Accounts",
    items: [
      {
        id: 16,
        question: "Do I need an account to use InstaHealth?",
        answer:
          "Some features may be available without an account, but placing orders, tracking orders, managing settings, or using vendor tools may require account creation.",
      },
      {
        id: 17,
        question: "How do I update my account details?",
        answer:
          "You can update available account details through your account area or by contacting support if needed.",
      },
      {
        id: 18,
        question: "What should I do if I cannot access my account?",
        answer: "Use the available login recovery options or contact support if you continue having issues.",
      },
    ],
  },
  {
    id: "vendors-and-merchants",
    title: "Vendors and Merchants",
    items: [
      {
        id: 19,
        question: "Can businesses sell on InstaHealth?",
        answer:
          "Yes. Businesses, merchants, clinics, and eligible service providers may apply to join InstaHealth as vendors, subject to approval and onboarding requirements.",
      },
      {
        id: 20,
        question: "How do I apply to become a vendor?",
        answer:
          "You can apply through the vendor onboarding or vendor application flow on InstaHealth. We may request business, contact, category, or operational information as part of the review process.",
      },
      {
        id: 21,
        question: "Is every vendor automatically approved?",
        answer:
          "No. InstaHealth may review vendor applications and reserves the right to approve, reject, suspend, or remove vendors at its discretion.",
      },
      {
        id: 22,
        question: "What can vendors do from the vendor dashboard?",
        answer:
          "Depending on access and configuration, vendors may manage products, orders, bookings, settings, service areas, profile details, and integration settings.",
      },
      {
        id: 23,
        question: "Can vendors connect their Shopify store?",
        answer:
          "Yes, eligible vendors may be able to connect their Shopify store to sync products, inventory, and order-related data into the InstaHealth platform.",
      },
      {
        id: 24,
        question: "Do vendors need Shopify to use InstaHealth?",
        answer:
          "No. Shopify integration may be available for supported vendors, but not every vendor is required to use Shopify.",
      },
      {
        id: 25,
        question: "Can a vendor disconnect Shopify later?",
        answer:
          "Yes, subject to platform functionality and account status. Disconnecting an integration may affect product sync, inventory sync, and related workflows.",
      },
    ],
  },
  {
    id: "product-sync-and-integrations",
    title: "Product Sync and Integrations",
    items: [
      {
        id: 26,
        question: "What happens when a vendor connects Shopify?",
        answer:
          "Depending on the integration setup, vendor products, inventory, and certain order-related information may sync between Shopify and InstaHealth.",
      },
      {
        id: 27,
        question: "Does InstaHealth edit my Shopify store automatically?",
        answer:
          "InstaHealth may perform approved sync actions depending on the integration setup, but vendor access and platform permissions determine how the connection operates.",
      },
      {
        id: 28,
        question: "Will all product changes sync instantly?",
        answer:
          "Not always. Some changes may sync in near real time, while others may depend on webhook delivery, scheduled syncs, platform processing, or temporary system delays.",
      },
      {
        id: 29,
        question: "What if synced products look incorrect?",
        answer:
          "The vendor should check source data, product configuration, category mapping, and connection settings. Support may assist with troubleshooting where appropriate.",
      },
    ],
  },
  {
    id: "payments-and-security",
    title: "Payments and Security",
    items: [
      {
        id: 30,
        question: "How are payments processed?",
        answer:
          "Payments may be processed by approved third-party payment processors. InstaHealth may facilitate the payment flow, but payment handling may rely on external providers.",
      },
      {
        id: 31,
        question: "Does InstaHealth store my card details?",
        answer:
          "In most cases, payment data is handled by payment processors rather than stored directly by InstaHealth, except where required for transaction handling, tokenization, fraud prevention, or operational purposes.",
      },
      {
        id: 32,
        question: "Is my information secure?",
        answer:
          "InstaHealth uses commercially reasonable technical, administrative, and organizational measures designed to protect personal and account information. However, no platform can guarantee absolute security.",
      },
    ],
  },
  {
    id: "privacy-and-legal",
    title: "Privacy and Legal",
    items: [
      {
        id: 33,
        question: "How does InstaHealth use my personal information?",
        answer:
          "We use personal information to operate the platform, process transactions, support accounts, improve services, communicate with users, manage vendors, and meet legal or operational requirements. Please review our Privacy Policy for full details.",
      },
      {
        id: 34,
        question: "Does InstaHealth share my information with vendors?",
        answer:
          "Where necessary to process orders, bookings, support requests, or fulfillment, relevant information may be shared with the vendor or service provider involved in your transaction.",
      },
      {
        id: 35,
        question: "Where can I read your Privacy Policy?",
        answer: (
          <>
            You can read our Privacy Policy at:
            <br />
            <Link className="font-medium text-emerald-700 underline" href="/privacy-policy">
              https://instahealth.ae/privacy-policy
            </Link>
          </>
        ),
      },
      {
        id: 36,
        question: "Where can I read your Terms of Service?",
        answer: (
          <>
            You can read our Terms of Service at:
            <br />
            <Link className="font-medium text-emerald-700 underline" href="/terms-of-service">
              https://instahealth.ae/terms-of-service
            </Link>
          </>
        ),
      },
    ],
  },
  {
    id: "support",
    title: "Support",
    items: [
      {
        id: 37,
        question: "How do I contact InstaHealth?",
        answer:
          "For support, order issues, account issues, vendor questions, or general enquiries, contact us through the support channels listed on the website.",
      },
      {
        id: 38,
        question: "How long does support take to respond?",
        answer:
          "Response times may vary depending on the issue type, urgency, vendor involvement, and support volume.",
      },
      {
        id: 39,
        question: "Can InstaHealth resolve vendor disputes?",
        answer:
          "We may help investigate or coordinate certain marketplace issues, but some matters depend on vendor policy, evidence, category rules, and applicable law.",
      },
    ],
  },
  {
    id: "important-notice",
    title: "Important Notice",
    items: [
      {
        id: 40,
        question: "Should I rely on InstaHealth for medical advice?",
        answer:
          "No. InstaHealth is not a medical provider and does not provide diagnosis, treatment, prescribing, or emergency advice. Always seek appropriate professional advice where needed.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="bg-slate-50 py-8 md:py-12">
      <div className="container mx-auto max-w-5xl px-4">
        <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 px-6 py-8 md:px-10 md:py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Help</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">FAQ</h1>
            <p className="mt-4 text-sm font-medium text-slate-700">Last Updated: 25 March 2026</p>
            <p className="mt-6 text-sm leading-7 text-slate-700 md:text-base">
              Below are answers to common questions about using InstaHealth as a customer, vendor, or marketplace
              partner.
            </p>
          </header>

          <nav aria-label="FAQ sections" className="border-b border-slate-200 bg-slate-50/80 px-6 py-8 md:px-10">
            <h2 className="text-base font-semibold text-slate-900">Sections</h2>
            <ul className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
              {sections.map((section) => (
                <li key={section.id}>
                  <a className="transition hover:text-emerald-700 hover:underline" href={`#${section.id}`}>
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-10 px-6 py-8 md:px-10 md:py-10">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-28">
                <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
                <div className="mt-4 space-y-3">
                  {section.items.map((item) => (
                    <details
                      key={item.id}
                      className="group rounded-xl border border-slate-200 bg-white px-4 py-3 open:border-emerald-200 open:bg-emerald-50/40"
                    >
                      <summary className="cursor-pointer list-none pr-8 text-sm font-semibold leading-6 text-slate-900 marker:hidden">
                        <span>{item.id}. {item.question}</span>
                      </summary>
                      <div className="mt-3 border-t border-slate-200 pt-3 text-sm leading-7 text-slate-700 md:text-base">
                        {item.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
