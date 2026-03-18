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

  const applications = await prisma.vendorApplication.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  // Removed invites query - VendorInvite schema doesn't have these fields
  const inviteMap = new Map();

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
      id: application.id,
      legalBusinessName: application.legalBusinessName,
      tradingName: application.tradingName,
      contactFullName: application.contactFullName,
      contactEmail: application.contactEmail,
      status: application.status,
      confirmationEmailStatus: application.confirmationEmailStatus,
      confirmationEmailMessageId: application.confirmationEmailMessageId,
      confirmationEmailError: application.confirmationEmailError,
      inviteEmailStatus: application.inviteEmailStatus,
      inviteEmailMessageId: application.inviteEmailMessageId,
      inviteEmailError: application.inviteEmailError,
      isActivated: Boolean(isActivated),
      createdAt: application.createdAt,
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
