import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVendorApplicationEmail, sendAdminApplicationNotification } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

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
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate email format
    if (!body.contactEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
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
    await sendVendorApplicationEmail(
      body.contactEmail,
      body.legalBusinessName,
      application.id
    );

    // Send admin notification
    const dashboardUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/vendor-applications/${application.id}`;
    
    await sendAdminApplicationNotification(
      body.contactFullName,
      body.legalBusinessName,
      body.businessCategory,
      body.contactEmail,
      body.contactPhone,
      application.id,
      dashboardUrl
    );

    return NextResponse.json(
      {
        success: true,
        applicationId: application.id,
        message: 'Application submitted successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Vendor application error:', error);
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}
