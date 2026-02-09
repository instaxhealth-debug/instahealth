import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVendorApplicationEmail, sendAdminApplicationNotification } from '@/lib/email';
import { getBaseUrl } from "@/lib/url";
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const body = await request.json();
    const applicantEmail = typeof body?.contactEmail === 'string' ? body.contactEmail : '';
    const host = request.headers.get('host') || 'unknown';
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
          { error: `Missing required field: ${field}`, requestId, applicationId: null },
          { status: 400 }
        );
      }
    }

    if (typeof body.businessRegNumber !== 'string' || !body.businessRegNumber.trim()) {
      return NextResponse.json(
        { error: 'Business registration number is required', requestId, applicationId: null },
        { status: 400 }
      );
    }

    if (!allowedFulfillmentTypes.has(body.fulfillmentType)) {
      return NextResponse.json(
        { error: 'Invalid fulfillment type', requestId, applicationId: null },
        { status: 400 }
      );
    }

    // Validate email format
    if (!body.contactEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address', requestId, applicationId: null },
        { status: 400 }
      );
    }

    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'Unknown';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

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
        contactFullName: body.contactFullName,
        contactRole: body.contactRole,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        contactWhatsApp: body.contactWhatsApp || null,
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
    const applicantEmailAttempted = true;
    const applicantEmailResult = await sendVendorApplicationEmail(
      body.contactEmail,
      body.legalBusinessName,
      application.id
    );
    const applicantEmailSuccess = applicantEmailResult.success;
    const applicantEmailError = applicantEmailResult.error;
    const applicantEmailMessageId = applicantEmailResult.messageId;

    // Send admin notification
    const baseUrl = getBaseUrl({ requestId, route: "/api/vendor/apply" });
    const dashboardUrl = `${baseUrl}/admin/vendor-applications/${application.id}`;
    
    const adminEmailResult = await sendAdminApplicationNotification(
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
      environment,
      host,
      baseUrl,
      applicantEmail,
      applicationId: application.id,
      resendAttempted: applicantEmailAttempted,
      resendResult: applicantEmailSuccess ? 'success' : 'failure',
      resendErrorMessage: applicantEmailError || null,
      resendMessageId: applicantEmailMessageId || null,
    });

    return NextResponse.json(
      {
        success: true,
        applicationId: application.id,
        message: 'Application submitted successfully',
        requestId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Vendor application error:', error);
    return NextResponse.json(
      { error: 'Failed to submit application', requestId, applicationId: null },
      { status: 500 }
    );
  }
}
