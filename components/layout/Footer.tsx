"use client";

import Link from "next/link";
import { Facebook, Instagram, Twitter, Linkedin, Youtube } from "lucide-react";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="w-full bg-white border-t border-gray-300">
      <div className="container mx-auto max-w-7xl px-4 py-16">
        {/* Main Footer Grid - 5 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-x-16 gap-y-12 mb-16">
          {/* Column 1: Brand Description */}
          <div className="space-y-6">
            <Link href="/" className="inline-block">
              <Image
                src="/InstaHealth Logo white background.png"
                alt="InstaHealth logo"
                width={210}
                height={48}
                className="object-contain"
                unoptimized
              />
            </Link>
            <p className="text-[14px] text-gray-600 leading-relaxed font-light">
              InstaHealth offers a streamlined digital health marketplace connecting customers with licensed providers, regulated services, and trusted wellness brands — all in one unified platform.
            </p>
          </div>

          {/* Column 2: Contact */}
          <div className="space-y-6">
            <h3 className="text-[15px] font-semibold text-gray-900">Contact</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/faqs"
                  className="text-[14px] text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  FAQs
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-[14px] text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Contact us
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Terms & Policies */}
          <div className="space-y-6">
            <h3 className="text-[15px] font-semibold text-gray-900">Terms & Policies</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/personal-data"
                  className="text-[14px] text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Personal data
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-[14px] text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Terms of service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-[14px] text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link
                  href="/information-security"
                  className="text-[14px] text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Information Security Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="text-[14px] text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Cookies Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Our Team */}
          <div className="space-y-6">
            <h3 className="text-[15px] font-semibold text-gray-900">Our team</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/about"
                  className="text-[14px] text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  About us
                </Link>
              </li>
              <li>
                <Link
                  href="/careers"
                  className="text-[14px] text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Apps */}
          <div className="space-y-6">
            <h3 className="text-[15px] font-semibold text-gray-900">Apps</h3>
            <div className="flex flex-col gap-3">
              <div className="relative w-[180px] h-[54px] sm:w-[200px] sm:h-[60px]">
                <Image
                  src="/Footerimages/appstoregoogleplay.png"
                  alt="Download on App Store and Google Play"
                  fill
                  sizes="(min-width: 640px) 200px, 180px"
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom Section */}
        <div className="pt-12 border-t border-gray-300">
          {/* Security & Compliance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-1">
              <p className="text-[13px] text-gray-600 leading-relaxed">
                Your security is our highest priority. InstaHealth maintains industry-standard security and compliance certifications.
              </p>
            </div>

            {/* Compliance Badges */}
            <div className="lg:col-span-2 flex flex-wrap items-center gap-4">
              <Image
                src="/Footerimages/15.png"
                alt="ISO 27001 Certification"
                width={120}
                height={50}
                className="h-auto w-auto max-h-10"
              />
              <Image
                src="/Footerimages/16.png"
                alt="PCI DSS Compliance"
                width={120}
                height={50}
                className="h-auto w-auto max-h-10"
              />
              <Image
                src="/Footerimages/17.png"
                alt="SOC 2 Type II Certification"
                width={120}
                height={50}
                className="h-auto w-auto max-h-10"
              />
              <Image
                src="/Footerimages/18.png"
                alt="Data Protection"
                width={120}
                height={50}
                className="h-auto w-auto max-h-10"
              />
            </div>
          </div>

          {/* Social Icons + Copyright */}
          <div className="pt-8 border-t border-gray-300">
            {/* Social Icons */}
            <div className="flex justify-center items-center gap-6 mb-6">
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-900 transition-colors duration-200"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-900 transition-colors duration-200"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-900 transition-colors duration-200"
                aria-label="X (Twitter)"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-900 transition-colors duration-200"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-900 transition-colors duration-200"
                aria-label="YouTube"
              >
                <Youtube className="h-5 w-5" />
              </a>
            </div>

            {/* Copyright */}
            <p className="text-xs text-gray-500 text-center">
              © {new Date().getFullYear()} InstaHealth. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
