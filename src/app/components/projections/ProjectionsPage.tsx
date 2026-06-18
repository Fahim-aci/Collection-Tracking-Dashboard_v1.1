import { useEffect }                from "react";
import { TopBar }                    from "../layout/TopBar";
import { SbuCreditPerformanceTable } from "./SbuCreditPerformanceTable";
import { ProjectionTrendChart }      from "./ProjectionTrendChart";
import { ErrorBoundary }             from "../ui/ErrorBoundary";
import { useDateFilter }             from "../../../context/DateFilterContext";

export function ProjectionsPage() {
  const { setPreset } = useDateFilter();

  // Switch the global TopBar filter to MTD whenever the Projections page mounts.
  useEffect(() => {
    setPreset("mtd");
  }, [setPreset]);

  return (
    <>
      <TopBar />
      <main
        className="flex-1 overflow-y-auto py-8 px-5 min-h-0"
        style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        <div className="flex flex-col gap-5">
          <ErrorBoundary label="Collection Trend Chart">
            <ProjectionTrendChart />
          </ErrorBoundary>
          <ErrorBoundary label="SBU Credit Performance">
            <SbuCreditPerformanceTable />
          </ErrorBoundary>
        </div>
      </main>
    </>
  );
}
