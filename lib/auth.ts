import NextAuth, { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  providers: [
    (() => {
      const google = GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        allowDangerousEmailAccountLinking: false,
      });

      const originalProfile = google.profile;
      google.profile = (profile, tokens) => {
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
        const profileEmail = profile?.email?.toLowerCase?.() || "";
        google.allowDangerousEmailAccountLinking =
          !!adminEmail && profileEmail === adminEmail;

        return originalProfile
          ? originalProfile(profile, tokens)
          : {
              id: profile.sub || profile.id || profile.email,
              name: profile.name,
              email: profile.email,
              image: profile.picture,
            };
      };

      return google;
    })(),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("[AUTH] authorize() called with email:", credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log("[AUTH] Missing email or password");
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user) {
            console.log("[AUTH] User not found:", credentials.email);
            return null;
          }

          console.log("[AUTH] User found:", user.email, "| Role:", user.role);

          // Check for passwordHash (new field) or password (legacy field)
          const passwordToCheck = user.passwordHash || (user as any).password;
          if (!passwordToCheck) {
            console.log("[AUTH] No password hash for user:", credentials.email);
            return null;
          }

          const storedPasswordHash = passwordToCheck.trim();
          console.log("[AUTH] Password hash exists, length:", storedPasswordHash.length);

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            storedPasswordHash
          );

          console.log("[AUTH] Password comparison result:", isPasswordValid);

          if (!isPasswordValid) {
            console.log("[AUTH] Password invalid for:", credentials.email);
            return null;
          }

          console.log("[AUTH] Authorization successful for:", credentials.email);

          return {
            id: user.id,
            email: user.email,
            name: user.name || null,
            role: user.role || "USER",
          };
        } catch (error) {
          console.error("[AUTH] authorize() error:", error);
          throw error;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      // Only set role during initial login - don't query DB in Edge runtime
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = (user as any).role || "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.role = (token as any).role || "USER";
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Create cart for brand new users (OAuth + credentials both trigger this)
      try {
        await prisma.cart.create({
          data: {
            userId: user.id,
            status: "ACTIVE",
          },
        });
        console.log("[AUTH] Created cart for new user:", user.id);
      } catch (error) {
        console.error("[AUTH] Failed to create cart for new user:", error);
      }
    },
    async signIn({ user }) {
      // Ensure existing users have a cart (safety net)
      if (!user?.email) return;

      try {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        if (!dbUser) return;

        const existingCart = await prisma.cart.findUnique({
          where: { userId: dbUser.id },
        });
        if (!existingCart) {
          await prisma.cart.create({
            data: {
              userId: dbUser.id,
              status: "ACTIVE",
            },
          });
          console.log("[AUTH] Created safety cart for existing user:", dbUser.id);
        }
      } catch (error) {
        console.error("[AUTH] Failed to ensure cart for user:", error);
      }
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Silence noisy Auth.js debug logs unless explicitly enabled
  debug: process.env.AUTH_DEBUG === "true",
};

// Validate required environment variables
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("❌ NEXTAUTH_SECRET is not set in environment variables! Please add it to .env.local");
}

// Validate NEXTAUTH_URL and detect port mismatch
if (process.env.NODE_ENV === "development") {
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (!nextAuthUrl) {
    console.warn("⚠️  NEXTAUTH_URL not set, defaulting to http://localhost:3000 in development");
  } else {
    const urlPort = new URL(nextAuthUrl).port || (nextAuthUrl.includes(":3001") ? "3001" : "3000");
    const processPort = process.env.PORT || "3000";
    if (urlPort !== processPort && processPort !== "3000") {
      throw new Error(
        `❌ NEXTAUTH_URL port mismatch! NEXTAUTH_URL=${nextAuthUrl} (port ${urlPort}) but server running on port ${processPort}. Update .env.local to match.`
      );
    }
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
