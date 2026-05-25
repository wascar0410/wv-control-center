/**
 * DriverPage.tsx
 * Main driver portal page that shows driver operations dashboard
 * Wraps DriverOps component with DashboardLayout for consistent UI
 */

import { Suspense, lazy } from "react";
import { DashboardLayoutSkeleton as PageLoader } from "@/components/DashboardLayoutSkeleton";

const DriverOps = lazy(() => import("./DriverOps"));

export default function DriverPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <DriverOps />
    </Suspense>
  );
}
