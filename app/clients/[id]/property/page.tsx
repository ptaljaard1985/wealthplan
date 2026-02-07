"use client";

import { Home } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function PropertyPage() {
  return (
    <>
      <PageHeader title="Property" subtitle="Property portfolio and valuations" />
      <EmptyState
        icon={Home}
        title="Coming soon"
        body="Track residential and investment properties, valuations, and rental income."
      />
    </>
  );
}
