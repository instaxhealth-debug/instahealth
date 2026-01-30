import { signOut } from "@/lib/auth";

export async function POST() {
  // Use NextAuth's signOut to properly clear session on server
  await signOut({ redirect: false });
  
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
