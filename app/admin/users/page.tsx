import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-gray-600">Read-only view of users and roles.</p>
      </div>

      <div className="rounded border bg-white">
        <div className="border-b px-4 py-3 font-semibold">All Users</div>
        <div className="divide-y">
          {users.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-600">No users found.</div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="px-4 py-3 text-sm flex items-center justify-between">
                <div>
                  <div className="font-semibold">{user.email}</div>
                  <div className="text-gray-600 text-xs">{user.name || "(no name)"}</div>
                  <div className="text-xs text-gray-500">Role: {user.role || "USER"}</div>
                </div>
                <div className="text-xs text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
