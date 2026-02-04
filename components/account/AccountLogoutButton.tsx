"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogOut, ChevronRight } from "lucide-react";
import { useState } from "react";

export function AccountLogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await signOut({ redirect: false });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="relative flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-gray-50 w-full text-left disabled:opacity-50"
    >
      <div className="flex items-center gap-3 flex-1">
        <LogOut className="w-5 h-5 text-gray-500" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-700">
            {isLoading ? "Logging out..." : "Log out"}
          </div>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
    </button>
  );
}
