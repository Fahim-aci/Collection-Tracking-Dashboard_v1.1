import { Sidebar }                from "./components/layout/Sidebar";
import { TopBar }                 from "./components/layout/TopBar";
import { useState }               from "react";
import { KpiCards }               from "./components/dashboard/KpiCards";
import { PortfolioCollections }   from "./components/dashboard/PortfolioCollections";
import { ProjectionTrendChart }   from "./components/projections/ProjectionTrendChart";
import { CollectionTable }        from "./components/dashboard/CollectionTable";
import { ProjectionVsCollection } from "./components/dashboard/ProjectionVsCollection";
import { Top10Businesses }        from "./components/dashboard/Top10Businesses";
import { ImportDataPage }         from "./components/import/ImportDataPage";
import { ProjectionsPage }        from "./components/projections/ProjectionsPage";
import { CollectionsPage }        from "./components/collections/CollectionsPage";
import { ProjectionInputPage }    from "./components/projections/ProjectionInputPage";
import { VariancePage }           from "./components/variances/VariancePage";
import { ErrorBoundary }          from "./components/ui/ErrorBoundary";
import { DateFilterProvider }     from "../context/DateFilterContext";
import { NavigationProvider, useNavigation } from "../context/NavigationContext";
import { AuthProvider, useAuth }  from "../context/AuthContext";
import { LoginPage }              from "./components/auth/LoginPage";

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: In Figma Make there is no main.tsx — App.tsx is the root entry point.
// DateFilterProvider replaces PeriodProvider (v2 schema — no collection_periods).
// All dashboard components now consume a { dateFrom, dateTo } date range
// instead of a period UUID.
// ─────────────────────────────────────────────────────────────────────────────

/** The main dashboard view */
function Dashboard() {
  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-5 min-h-0">
        <div className="flex gap-5 items-start">
          {/* ── Left column ── */}
          <div className="flex flex-col gap-5 flex-1 min-w-0">
            <ErrorBoundary label="KPI Cards"><KpiCards /></ErrorBoundary>
            <ErrorBoundary label="Portfolio Collections"><PortfolioCollections /></ErrorBoundary>
            <ErrorBoundary label="Performance Stats"><ProjectionTrendChart variant="splm" /></ErrorBoundary>
            <ErrorBoundary label="Collection Table"><CollectionTable /></ErrorBoundary>
          </div>
          {/* ── Right column ── */}
          <div className="flex flex-col gap-5 shrink-0" style={{ width: 340 }}>
            <ErrorBoundary label="Collections Achievement"><ProjectionVsCollection /></ErrorBoundary>
            <ErrorBoundary label="SBU Metrics"><Top10Businesses /></ErrorBoundary>
          </div>
        </div>
      </main>
    </>
  );
}

/** Root shell: sidebar + whichever view is active */
function Shell() {
  const { activeView } = useNavigation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="flex h-screen w-screen overflow-hidden bg-[#F2F4F7]"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {activeView === 'dashboard'       && <Dashboard />}
        {activeView === 'collections'     && <CollectionsPage />}
        {activeView === 'projections'     && <ProjectionsPage />}
        {activeView === 'import'          && <ImportDataPage />}
        {activeView === 'set-projections' && <ProjectionInputPage />}
        {activeView === 'variances'       && <VariancePage />}
      </div>
    </div>
  );
}

function AuthGate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center bg-[#0F1117]"
        style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        <svg className="animate-spin size-8 text-[#E91922]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );
  }

  if (!session) return <LoginPage />;

  return (
    <NavigationProvider>
      <DateFilterProvider>
        <Shell />
      </DateFilterProvider>
    </NavigationProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}