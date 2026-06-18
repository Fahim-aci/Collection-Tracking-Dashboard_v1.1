import { TopBar } from "../layout/TopBar";
import { BusinessUnitDetailsTable } from "./BusinessUnitDetailsTable";
import { ErrorBoundary } from "../ui/ErrorBoundary";

export function CollectionsPage() {
  return (
    <>
      <TopBar />
      <main
        className="flex-1 overflow-auto min-h-0 px-5 pt-5 pb-8"
        style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        <div className="w-full h-full">
          <ErrorBoundary label="Business Unit Details">
            <BusinessUnitDetailsTable />
          </ErrorBoundary>
        </div>
      </main>
    </>
  );
}