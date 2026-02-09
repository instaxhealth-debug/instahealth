import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VendorApplicationsTable } from "./vendor-applications-table";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

type StatusFilter = (typeof STATUSES)[number] | "ALL";

export default async function VendorApplicationsPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  await requireAdmin();

  const rawStatus = searchParams?.status?.toUpperCase();
  const statusFilter: StatusFilter = STATUSES.includes(rawStatus as any)
    ? (rawStatus as StatusFilter)
    : "ALL";

  const where =
    statusFilter === "ALL"
      ? undefined
      : {
          status: statusFilter,
        };

  const applications: Array<{
    id: string;
    status: string;
    legalBusinessName: string;
    tradingName: string | null;
    contactFullName: string;
    contactEmail: string;
    createdAt: Date;
    approvedVendorId: string | null;
    confirmationEmailStatus: string;
    confirmationEmailMessageId: string | null;
    confirmationEmailError: string | null;
  }> = await prisma.vendorApplication.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  const applicationIds = applications.map((app) => app.id);

  const invites = applicationIds.length
    ? await prisma.vendorInvite.findMany({
        where: { applicationId: { in: applicationIds } },
        orderBy: { createdAt: "desc" },
        select: {
          applicationId: true,
          emailStatus: true,
          emailMessageId: true,
          emailError: true,
          emailSentAt: true,
        },
      })
    : [];

  const inviteMap = new Map(
    invites.map((invite) => [invite.applicationId || "", invite])
  );

  const approvedVendorIds = applications
    .map((app) => app.approvedVendorId)
    .filter((id): id is string => Boolean(id));

  const vendors: Array<{ id: string; userId: string | null }> = approvedVendorIds.length
    ? await prisma.vendor.findMany({
        where: { id: { in: approvedVendorIds } },
        select: { id: true, userId: true },
      })
    : [];

  const vendorUserIds = vendors
    .map((vendor) => vendor.userId)
    .filter((id): id is string => Boolean(id));

  const users: Array<{ id: string; passwordHash: string | null }> = vendorUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: vendorUserIds } },
        select: { id: true, passwordHash: true },
      })
    : [];

  const userPasswordMap = new Map(
    users.map((user) => [user.id, Boolean(user.passwordHash)])
  );

  const vendorUserMap = new Map(
    vendors.map((vendor) => [vendor.id, vendor.userId || null])
  );

  const rows = applications.map((application) => {
    const vendorUserId = application.approvedVendorId
      ? vendorUserMap.get(application.approvedVendorId)
      : null;
    const isActivated = vendorUserId ? userPasswordMap.get(vendorUserId) : false;

    return {
      ...application,
      isActivated: Boolean(isActivated),
      inviteEmailStatus: inviteMap.get(application.id)?.emailStatus || "PENDING",
      inviteEmailMessageId: inviteMap.get(application.id)?.emailMessageId || null,
      inviteEmailError: inviteMap.get(application.id)?.emailError || null,
    };
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Vendor Applications
          </CardTitle>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link href="/admin/vendor-applications">
              <Button variant={statusFilter === "ALL" ? "default" : "outline"}>
                All
              </Button>
            </Link>
            {STATUSES.map((status) => (
              <Link
                key={status}
                href={`/admin/vendor-applications?status=${status}`}
              >
                <Button
                  variant={statusFilter === status ? "default" : "outline"}
                >
                  {status}
                </Button>
              </Link>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <VendorApplicationsTable applications={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
