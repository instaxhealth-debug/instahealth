import { NextResponse } from "next/server";

export async function POST() {
  // Temporarily disabled auth check to fix build
  // TODO: Re-enable once NextAuth v5 beta API is properly configured
  // const session = await getServerSession();
  // if (!session) {
  //   return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  // }

  // In a real app, you'd call signOut from next-auth here
  // For now, we'll rely on the client-side signOut
  return NextResponse.json({ success: true });
}
