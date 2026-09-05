import React, { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import CreatePage from "./create-post-form";

export default async function Create() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading form...</div>}>
      <CreatePage />
    </Suspense>
  );
}