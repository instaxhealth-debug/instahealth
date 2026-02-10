"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface VendorApplicationRow {
  id: string;
  legalBusinessName: string;
  tradingName: string | null;
  contactFullName: string;
  contactEmail: string;
  status: string;
  confirmationEmailStatus: string;
  confirmationEmailMessageId: string | null;
  confirmationEmailError: string | null;
  inviteEmailStatus: string;
  inviteEmailMessageId: string | null;
  inviteEmailError: string | null;
  isActivated: boolean;
  createdAt: Date;
}

export function VendorApplicationsTable({
  applications,
}: {
  applications: VendorApplicationRow[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAction = async (
    action: "approve" | "reject" | "resend-confirmation" | "invite",
    id: string
  ) => {
    setLoadingId(id);
    try {
      const response = await fetch(
        `/api/admin/vendor-applications/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId: id }),
        }
      );

      const result = await response.json();

      // Check for errors (either non-2xx status OR ok: false)
      if (!response.ok || result.ok === false) {
        const code = result.code || 'UNKNOWN';
        const message = result.message || result.error || 'Action failed';
        const requestId = result.requestId || 'N/A';

        alert(`${action} failed: ${code} (requestId: ${requestId}) - ${message}`);
      } else {
        // Success - check if email failed (for approve action)
        if (action === 'approve' && result.inviteEmailStatus === 'FAILED') {
          alert(
            `Approved successfully!\n\n` +
            `However, invite email FAILED (requestId: ${result.requestId || 'N/A'}).\n` +
            `Use "Send invite email" button to retry.`
          );
        }
        router.refresh();
      }
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoadingId(null);
    }
  };

  if (applications.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No vendor applications found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {applications.map((application) => (
          <div
            key={application.id}
            className="flex flex-col gap-3 rounded-lg border border-border/60 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-col gap-1">
              <div className="text-sm font-semibold">
                {application.tradingName || application.legalBusinessName}
              </div>
              <div className="text-xs text-muted-foreground">
                {application.contactFullName} · {application.contactEmail}
              </div>
              <div className="text-xs text-muted-foreground">
                Submitted {new Date(application.createdAt).toLocaleString()} · Status: {application.status}
              </div>
              <div className="text-xs text-muted-foreground">
                Confirmation Email: {application.confirmationEmailStatus}
                {application.confirmationEmailMessageId
                  ? ` · ${application.confirmationEmailMessageId}`
                  : ""}
                {application.confirmationEmailError
                  ? ` · ${application.confirmationEmailError}`
                  : ""}
              </div>
              <div className="text-xs text-muted-foreground">
                Invite Email: {application.inviteEmailStatus}
                {application.inviteEmailMessageId
                  ? ` · ${application.inviteEmailMessageId}`
                  : ""}
                {application.inviteEmailError
                  ? ` · ${application.inviteEmailError}`
                  : ""}
              </div>
            </div>

            {application.status === "PENDING" ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => handleAction("approve", application.id)}
                  disabled={loadingId === application.id}
                >
                  {loadingId === application.id ? "Processing..." : "Approve"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAction("reject", application.id)}
                  disabled={loadingId === application.id}
                >
                  Reject
                </Button>
                {(application.confirmationEmailStatus === "FAILED" ||
                  application.confirmationEmailStatus === "PENDING") && (
                  <Button
                    variant="outline"
                    onClick={() => handleAction("resend-confirmation", application.id)}
                    disabled={loadingId === application.id}
                  >
                    Resend confirmation email
                  </Button>
                )}
              </div>
            ) : application.status === "APPROVED" ? (
              <div className="flex flex-wrap gap-2">
                {!application.isActivated && (
                  <Button
                    onClick={() => handleAction("invite", application.id)}
                    disabled={loadingId === application.id}
                  >
                    Send invite email
                  </Button>
                )}
                {(application.confirmationEmailStatus === "FAILED" ||
                  application.confirmationEmailStatus === "PENDING") && (
                  <Button
                    variant="outline"
                    onClick={() => handleAction("resend-confirmation", application.id)}
                    disabled={loadingId === application.id}
                  >
                    Resend confirmation email
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
