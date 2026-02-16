import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVendorApplicationEmail, sendAdminApplicationNotification } from '@/lib/email';
import { getBaseUrl } from "@/lib/url";
import { randomUUID } from 'crypto';
import { isValidCategoryLabel, validateCategorySlugs } from '@/lib/constants/vendor-categories';
import { normalizePhone, isValidPhone } from '@/lib/phone';

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const body = await request.json();
    const environment = process.env.NODE_ENV || 'unknown';

    const allowedFulfillmentTypes = new Set([
      'Vendor delivers',
      'Clinic appointments',
      'Clinic appointment',
    ]);

    // Validate required fields
    const requiredFields = [
      'legalBusinessName',
      'country',
      'city',
      'businessRegNumber',
      'businessCategory',
      'businessDescription',
      'contactFullName',
      'contactRole',
      'contactEmail',
      'contactPhone',
      'operationRegion',
      'fulfillmentType',
      'deliveryTimeframe',
      'productDescription',
      'informationAccuracy',
      'agreeContact',
    ];

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        return NextResponse.json(
          {
            ok: false,
            code: 'VALIDATION_ERROR',
            message: `Missing required field: ${field}`,
            requestId,
            applicationId: null
          },
          { status: 400 }
        );
      }
    }

    if (typeof body.businessRegNumber !== 'string' || !body.businessRegNumber.trim()) {
      return NextResponse.json(
        {
          ok: false,
          code: 'VALIDATION_ERROR',
          message: 'Business registration number is required',
          requestId,
          applicationId: null
        },
        { status: 400 }
      );
    }

    if (!allowedFulfillmentTypes.has(body.fulfillmentType)) {
      return NextResponse.json(
        {
          ok: false,
          code: 'VALIDATION_ERROR',
          message: 'Invalid fulfillment type',
          requestId,
          applicationId: null
        },
        { status: 400 }
      );
    }

    // Validate email format
    if (!body.contactEmail.includes('@')) {
      return NextResponse.json(
        {
          ok: false,
          code: 'VALIDATION_ERROR',
          message: 'Invalid email address',
          requestId,
          applicationId: null
        },
        { status: 400 }
      );
    }

    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'Unknown';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Validate logo URL
    if (!body.logoUrl || typeof body.logoUrl !== 'string') {
      return NextResponse.json(
        {
          ok: false,
          code: 'VALIDATION_ERROR',
          message: 'Vendor logo is required',
          requestId,
          applicationId: null
        },
        { status: 400 }
      );
    }

    // Validate selectedCategories (server-side enforcement)
    if (!validateCategorySlugs(body.selectedCategories)) {
      return NextResponse.json(
        {
          ok: false,
          code: 'VALIDATION_ERROR',
          message: 'Invalid marketplace categories. Only approved categories are allowed.',
          requestId,
          applicationId: null
        },
        { status: 400 }
      );
    }

    // Validate businessCategory (server-side enforcement)
    if (!isValidCategoryLabel(body.businessCategory)) {
      return NextResponse.json(
        {
          ok: false,
          code: 'VALIDATION_ERROR',
          message: 'Invalid business category',
          requestId,
          applicationId: null
        },
        { status: 400 }
      );
    }

    // Validate and normalize phone number to E.164 format
    if (!body.contactPhone || !isValidPhone(body.contactPhone, body.country)) {
      return NextResponse.json(
        {
          ok: false,
          code: 'VALIDATION_ERROR',
          message: 'Invalid phone number format. Please enter a valid phone number.',
          requestId,
          applicationId: null
        },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(body.contactPhone, body.country);
    if (!normalizedPhone) {
      return NextResponse.json(
        {
          ok: false,
          code: 'VALIDATION_ERROR',
          message: 'Unable to normalize phone number. Please check the format.',
          requestId,
          applicationId: null
        },
        { status: 400 }
      );
    }

    // Create vendor application in database
    const application = await prisma.vendorApplication.create({
      data: {
        legalBusinessName: body.legalBusinessName,
        tradingName: body.tradingName || null,
        country: body.country,
        city: body.city,
        businessRegNumber: body.businessRegNumber,
        taxVatNumber: body.taxVatNumber || null,
        website: body.website || null,
        businessCategory: body.businessCategory,
        businessDescription: body.businessDescription,
        logoUrl: body.logoUrl,
        selectedCategories: body.selectedCategories,
        contactFullName: body.contactFullName,
        contactRole: body.contactRole,
        contactEmail: body.contactEmail,
        contactPhone: normalizedPhone,
        contactPhoneRaw: body.contactPhone,
        contactWhatsApp: body.contactWhatsApp ? normalizePhone(body.contactWhatsApp, body.country) : null,
        preferredContactMethod: body.preferredContactMethod,
        operationRegion: body.operationRegion,
        fulfillmentType: body.fulfillmentType,
        deliveryTimeframe: body.deliveryTimeframe,
        hasProductImages: body.hasProductImages || false,
        complianceDocs: body.complianceDocs || [],
        productDescription: body.productDescription,
        skuCount: body.skuCount ? parseInt(body.skuCount) : null,
        hasPricing: body.hasPricing || false,
        informationAccuracy: body.informationAccuracy,
        agreeContact: body.agreeContact,
        ipAddress,
        userAgent,
        status: 'PENDING',
      },
    });

    // Send confirmation email to applicant
    const applicantEmailResult = await sendVendorApplicationEmail(
      body.contactEmail,
      body.legalBusinessName,
      application.id
    );
    const applicantEmailSuccess = applicantEmailResult.success;
    const applicantEmailError = applicantEmailResult.error;
    const applicantEmailMessageId = applicantEmailResult.messageId;

    // Validate base URL for email
    let baseUrl: string;
    try {
      baseUrl = getBaseUrl({ requestId, route: "/api/vendor/apply" });

      // Production safety check
      if (environment === 'production') {
        if (!process.env.NEXT_PUBLIC_BASE_URL) {
          console.error('[VENDOR_APPLY_ERROR]', {
            requestId,
            errName: 'BAD_ENV',
            errMessage: 'NEXT_PUBLIC_BASE_URL missing in production',
            applicationId: application.id,
          });
        } else if (!process.env.NEXT_PUBLIC_BASE_URL.startsWith('https://instahealth.ae')) {
          console.error('[VENDOR_APPLY_ERROR]', {
            requestId,
            errName: 'BAD_ENV',
            errMessage: `Invalid production base URL: ${process.env.NEXT_PUBLIC_BASE_URL}`,
            applicationId: application.id,
          });
        }
      }
    } catch (error: any) {
      baseUrl = 'https://instahealth.ae'; // Fallback
      console.error('[VENDOR_APPLY_ERROR]', {
        requestId,
        errName: 'BAD_ENV',
        errMessage: `getBaseUrl failed: ${error.message}`,
        applicationId: application.id,
      });
    }

    const dashboardUrl = `${baseUrl}/admin/vendor-applications/${application.id}`;

    // Send admin notification (fire and forget)
    await sendAdminApplicationNotification(
      body.contactFullName,
      body.legalBusinessName,
      body.businessCategory,
      body.contactEmail,
      body.contactPhone,
      application.id,
      dashboardUrl
    );

    await prisma.vendorApplication.update({
      where: { id: application.id },
      data: {
        confirmationEmailStatus: applicantEmailSuccess ? 'SENT' : 'FAILED',
        confirmationEmailMessageId: applicantEmailMessageId || null,
        confirmationEmailError: applicantEmailError || null,
        confirmationEmailSentAt: applicantEmailSuccess ? new Date() : null,
      },
    });

    console.log('[VENDOR_APPLY]', {
      requestId,
      applicationId: application.id,
      confirmationEmailStatus: applicantEmailSuccess ? 'SENT' : 'FAILED',
      emailError: applicantEmailError ? applicantEmailError.substring(0, 200) : null,
    });

    return NextResponse.json(
      {
        ok: true,
        applicationId: application.id,
        requestId,
        confirmationEmailStatus: applicantEmailSuccess ? 'SENT' : 'FAILED',
      },
      { status: 200 }
    );
  } catch (error: any) {
    const errorName = error?.name || 'UnknownError';
    const errorMessage = error?.message || 'Unknown error occurred';
    const errorStack = error?.stack || '';

    console.error('[VENDOR_APPLY_ERROR]', {
      requestId,
      errName: errorName,
      errMessage: errorMessage,
      errStack: errorStack,
    });

    // Determine error code
    let code = 'UNKNOWN';
    let statusCode = 500;
    let safeMessage = 'Failed to submit application';

    if (errorMessage.includes('Prisma') || errorMessage.includes('database')) {
      code = 'DB_ERROR';
      safeMessage = 'Database error occurred';
    } else if (errorMessage.includes('unauthorized') || errorMessage.includes('auth')) {
      code = 'UNAUTHORIZED';
      statusCode = 401;
      safeMessage = 'Unauthorized';
    } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      code = 'VALIDATION_ERROR';
      statusCode = 400;
      safeMessage = errorMessage; // Validation errors are safe to show
    }

    return NextResponse.json(
      {
        ok: false,
        code,
        message: safeMessage,
        requestId,
        applicationId: null
      },
      { status: statusCode }
    );
  }
}
