'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { upload } from '@vercel/blob/client';
import { BUSINESS_CATEGORIES } from '@/lib/constants/vendor-categories';

export default function VendorApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [formData, setFormData] = useState({
    // Business identity
    legalBusinessName: '',
    tradingName: '',
    country: '',
    city: '',
    businessRegNumber: '',
    taxVatNumber: '',
    website: '',
    businessCategory: '',
    businessDescription: '',
    logoUrl: '',
    selectedCategories: [] as string[],

    // Contact person
    contactFullName: '',
    contactRole: '',
    contactEmail: '',
    contactPhone: '',
    contactWhatsApp: '',
    preferredContactMethod: 'Email',

    // Operations
    operationRegion: '',
    fulfillmentType: '',
    deliveryTimeframe: '',
    hasProductImages: false,
    complianceDocs: [] as string[],

    // Products
    productDescription: '',
    skuCount: '',
    hasPricing: false,

    // Agreements
    informationAccuracy: false,
    agreeContact: false,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as any;

    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      if (name === 'complianceDocs') {
        setFormData((prev) => ({
          ...prev,
          complianceDocs: checked
            ? [...prev.complianceDocs, value]
            : prev.complianceDocs.filter((doc) => doc !== value),
        }));
      } else if (name === 'selectedCategories') {
        setFormData((prev) => ({
          ...prev,
          selectedCategories: checked
            ? [...prev.selectedCategories, value]
            : prev.selectedCategories.filter((cat) => cat !== value),
        }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: checked }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Logo must be an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Logo file size must be less than 5MB');
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setError('');

    // Upload to Vercel Blob immediately
    try {
      setUploadingLogo(true);
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload/vendor-logo',
      });

      setFormData((prev) => ({ ...prev, logoUrl: blob.url }));
      setUploadingLogo(false);
    } catch (err) {
      setError('Failed to upload logo. Please try again.');
      setUploadingLogo(false);
      setLogoFile(null);
      setLogoPreview(null);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.logoUrl) {
      setError('Vendor logo is required - please upload your company logo');
      return false;
    }
    if (!formData.legalBusinessName.trim()) {
      setError('Legal business name is required');
      return false;
    }
    if (!formData.country.trim()) {
      setError('Country is required');
      return false;
    }
    if (!formData.city.trim()) {
      setError('City is required');
      return false;
    }
    if (!formData.businessRegNumber.trim()) {
      setError('Business registration number is required');
      return false;
    }
    if (!formData.businessCategory) {
      setError('Business category is required');
      return false;
    }
    if (!formData.businessDescription.trim()) {
      setError('Business description is required');
      return false;
    }
    if (formData.selectedCategories.length === 0) {
      setError('Please select at least one marketplace category');
      return false;
    }
    if (!formData.contactFullName.trim()) {
      setError('Contact full name is required');
      return false;
    }
    if (!formData.contactRole.trim()) {
      setError('Contact role is required');
      return false;
    }
    if (!formData.contactEmail.trim() || !formData.contactEmail.includes('@')) {
      setError('Valid contact email is required');
      return false;
    }
    if (!formData.contactPhone.trim()) {
      setError('Contact phone is required');
      return false;
    }
    if (!formData.operationRegion) {
      setError('Operation region is required');
      return false;
    }
    if (!formData.fulfillmentType) {
      setError('Fulfillment type is required');
      return false;
    }
    if (!formData.deliveryTimeframe) {
      setError('Delivery timeframe is required');
      return false;
    }
    if (!formData.productDescription.trim()) {
      setError('Product description is required');
      return false;
    }
    if (!formData.informationAccuracy) {
      setError('Please confirm the information accuracy');
      return false;
    }
    if (!formData.agreeContact) {
      setError('Please agree to be contacted about onboarding');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/vendor/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      // Check for errors (either non-2xx status OR ok: false)
      if (!response.ok || result.ok === false) {
        const code = result.code || 'UNKNOWN';
        const message = result.message || result.error || 'Application submission failed';
        const requestId = result.requestId || 'N/A';

        setError(`Submit failed: ${code} (requestId: ${requestId}) - ${message}`);
        setLoading(false);
        return;
      }

      // Success - check if confirmation email failed
      if (result.confirmationEmailStatus === 'FAILED') {
        console.warn('Application created but confirmation email failed', {
          requestId: result.requestId,
          applicationId: result.applicationId,
        });
      }

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setError(`Network error: ${err instanceof Error ? err.message : 'Unknown error occurred'}`);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-green-700">
              Application Received!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-green-700">
              Thank you for applying to become a vendor on InstaHealth.
            </p>
            <p className="text-sm text-green-600">
              Your application has been received. Our team will review it within 24–48 hours.
            </p>
            <p className="text-gray-700">
              Our team will review your application within 24–48 hours and contact you via your preferred method.
            </p>
            <div className="pt-4 space-y-2">
              <Link href="/vendor/login" className="block">
                <Button className="w-full">Back to Vendor Login</Button>
              </Link>
              <Link href="/" className="block">
                <Button variant="outline" className="w-full">
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Become a Vendor
          </CardTitle>
          <p className="text-center text-sm text-gray-600 mt-2">
            Join InstaHealth and start selling to customers across the UAE.
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-6 p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* SECTION A: Business Identity */}
            <fieldset>
              <legend className="text-lg font-semibold mb-4 pb-2 border-b">
                A. Business Identity
              </legend>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Legal Business Name *
                  </label>
                  <Input
                    name="legalBusinessName"
                    value={formData.legalBusinessName}
                    onChange={handleInputChange}
                    placeholder="e.g., Acme Health Ltd"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Trading Name (optional)
                  </label>
                  <Input
                    name="tradingName"
                    value={formData.tradingName}
                    onChange={handleInputChange}
                    placeholder="e.g., Acme Wellness"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Country *
                    </label>
                    <Input
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      placeholder="e.g., UAE"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      City *
                    </label>
                    <Input
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="e.g., Dubai"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Trade License Number *
                  </label>
                  <Input
                    name="businessRegNumber"
                    value={formData.businessRegNumber}
                    onChange={handleInputChange}
                    placeholder="e.g., Dubai Trade License number"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tax/VAT Number (optional)
                  </label>
                  <Input
                    name="taxVatNumber"
                    value={formData.taxVatNumber}
                    onChange={handleInputChange}
                    placeholder="e.g., VAT registration number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Website (optional)
                  </label>
                  <Input
                    name="website"
                    type="url"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder="https://yourbusiness.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Business Category *
                  </label>
                  <select
                    name="businessCategory"
                    value={formData.businessCategory}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#41a59b]"
                    required
                  >
                    <option value="">Select a category</option>
                    <option value="Blood testing packages">Blood testing packages</option>
                    <option value="IV Drips">IV Drips</option>
                    <option value="Clinics">Clinics</option>
                    <option value="Peptides">Peptides</option>
                    <option value="Hormones">Hormones</option>
                    <option value="Consultations">Consultations</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Supplements">Supplements</option>
                    <option value="Haircare">Haircare</option>
                    <option value="Pets">Pets</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Business Description *
                  </label>
                  <textarea
                    name="businessDescription"
                    value={formData.businessDescription}
                    onChange={handleInputChange}
                    placeholder="Tell us about your business..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#41a59b]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Company Logo * {uploadingLogo && <span className="text-xs text-gray-500">(Uploading...)</span>}
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#41a59b]"
                      disabled={uploadingLogo}
                      required
                    />
                    {logoPreview && (
                      <div className="mt-2 p-4 border border-gray-200 rounded-md bg-gray-50">
                        <p className="text-xs text-gray-600 mb-2">Logo preview:</p>
                        <Image
                          src={logoPreview}
                          alt="Logo preview"
                          width={200}
                          height={80}
                          className="h-20 w-auto object-contain"
                        />
                      </div>
                    )}
                    <p className="text-xs text-gray-500">Upload your company logo (PNG, JPG, or SVG, max 5MB)</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Marketplace Categories * (Select all that apply)
                  </label>
                  <div className="space-y-2">
                    {BUSINESS_CATEGORIES.map((cat) => (
                      <label key={cat.slug} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          name="selectedCategories"
                          value={cat.slug}
                          checked={formData.selectedCategories.includes(cat.slug)}
                          onChange={handleInputChange}
                          className="w-4 h-4 mt-1"
                        />
                        <div>
                          <span className="text-sm font-medium">{cat.label}</span>
                          <p className="text-xs text-gray-500">{cat.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Your vendor card will appear in these marketplace categories</p>
                </div>
              </div>
            </fieldset>

            {/* SECTION B: Contact Person */}
            <fieldset>
              <legend className="text-lg font-semibold mb-4 pb-2 border-b">
                B. Contact Person
              </legend>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Full Name *
                    </label>
                    <Input
                      name="contactFullName"
                      value={formData.contactFullName}
                      onChange={handleInputChange}
                      placeholder="e.g., John Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Role/Title *
                    </label>
                    <Input
                      name="contactRole"
                      value={formData.contactRole}
                      onChange={handleInputChange}
                      placeholder="e.g., Owner, Manager"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email *
                  </label>
                  <Input
                    name="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    placeholder="john@business.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Phone (with country code) *
                  </label>
                  <Input
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    placeholder="e.g., +971501234567"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    WhatsApp Number (optional)
                  </label>
                  <Input
                    name="contactWhatsApp"
                    value={formData.contactWhatsApp}
                    onChange={handleInputChange}
                    placeholder="e.g., +971501234567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Preferred Contact Method *
                  </label>
                  <select
                    name="preferredContactMethod"
                    value={formData.preferredContactMethod}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#41a59b]"
                    required
                  >
                    <option value="Email">Email</option>
                    <option value="Phone">Phone</option>
                    <option value="WhatsApp">WhatsApp</option>
                  </select>
                </div>
              </div>
            </fieldset>

            {/* SECTION C: Operations */}
            <fieldset>
              <legend className="text-lg font-semibold mb-4 pb-2 border-b">
                C. Operations
              </legend>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Where do you operate? *
                  </label>
                  <select
                    name="operationRegion"
                    value={formData.operationRegion}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#41a59b]"
                    required
                  >
                    <option value="">Select region</option>
                    <option value="UAE only">UAE only</option>
                    <option value="UAE + International">UAE + International</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Fulfillment Type *
                  </label>
                  <select
                    name="fulfillmentType"
                    value={formData.fulfillmentType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#41a59b]"
                    required
                  >
                    <option value="">Select fulfillment type</option>
                    <option value="Vendor delivers">Vendor delivers/ships</option>
                    <option value="Clinic appointments">Clinic appointment fulfillment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Typical Delivery Timeframe *
                  </label>
                  <select
                    name="deliveryTimeframe"
                    value={formData.deliveryTimeframe}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#41a59b]"
                    required
                  >
                    <option value="">Select timeframe</option>
                    <option value="Same day">Same day</option>
                    <option value="1-2 days">1-2 days</option>
                    <option value="3-5 days">3-5 days</option>
                    <option value="1-2 weeks">1-2 weeks</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="hasProductImages"
                      checked={formData.hasProductImages}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Do you have product images ready?</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Compliance Documents Available (optional)
                  </label>
                  <div className="space-y-2">
                    {['COA', 'MSDS', 'Trade License', 'Lab testing', 'Other'].map((doc) => (
                      <label key={doc} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="complianceDocs"
                          value={doc}
                          checked={formData.complianceDocs.includes(doc)}
                          onChange={handleInputChange}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{doc}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </fieldset>

            {/* SECTION D: Products */}
            <fieldset>
              <legend className="text-lg font-semibold mb-4 pb-2 border-b">
                D. Products
              </legend>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    What do you want to list? *
                  </label>
                  <textarea
                    name="productDescription"
                    value={formData.productDescription}
                    onChange={handleInputChange}
                    placeholder="Describe the products/services you want to list..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#41a59b]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Approximate number of SKUs (optional)
                  </label>
                  <Input
                    name="skuCount"
                    type="number"
                    value={formData.skuCount}
                    onChange={handleInputChange}
                    placeholder="e.g., 50"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="hasPricing"
                      checked={formData.hasPricing}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Do you have pricing/wholesale/retail rates ready?</span>
                  </label>
                </div>
              </div>
            </fieldset>

            {/* SECTION E: Agreements */}
            <fieldset>
              <legend className="text-lg font-semibold mb-4 pb-2 border-b">
                E. Agreements
              </legend>
              <div className="space-y-3">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="informationAccuracy"
                    checked={formData.informationAccuracy}
                    onChange={handleInputChange}
                    className="w-4 h-4 mt-1 flex-shrink-0"
                    required
                  />
                  <span className="text-sm">
                    I confirm the above information is accurate and complete. *
                  </span>
                </label>

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="agreeContact"
                    checked={formData.agreeContact}
                    onChange={handleInputChange}
                    className="w-4 h-4 mt-1 flex-shrink-0"
                    required
                  />
                  <span className="text-sm">
                    I agree that InstaHealth may contact me about my vendor application and onboarding. *
                  </span>
                </label>
              </div>
            </fieldset>

            {/* Submit Button */}
            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                className="flex-1"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </Button>
              <Link href="/vendor/login" className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  Back to Login
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
