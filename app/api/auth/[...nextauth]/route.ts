import { handlers } from "@/lib/auth";

// NextAuth v5 App Router handler
export const { GET, POST } = handlers;

// Force nodejs runtime to avoid Edge runtime issues with Prisma
export const runtime = "nodejs";
