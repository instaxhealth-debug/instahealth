import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="container mx-auto max-w-md px-4 py-16" /> }>
      <ResetPasswordClient />
    </Suspense>
  );
}
