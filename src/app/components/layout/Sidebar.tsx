import { useNavigation, type AppView } from '../../../context/NavigationContext';
import svgPaths from '../../../imports/svg-s8mivaat72';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function AciLogo() {
  return (
    <div className="relative shrink-0 size-[36px]">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 40 40">
        <g clipPath="url(#clip0_sidebar)">
          <path d={svgPaths.p2334c3c0} fill="#00A65D" />
          <path d={svgPaths.p165abc00} fill="#FEFEFE" />
          <path d={svgPaths.p18223d70} fill="#00A65D" />
          <path d={svgPaths.pe259300}  fill="#00A65D" />
          <path d={svgPaths.p2abcd300} fill="#00A65D" />
          <path d={svgPaths.p4f08e00}  fill="#FEFEFE" />
          <path d={svgPaths.p1a93ad00} fill="#00A65D" />
          <path d={svgPaths.p15150f00} fill="#FEFEFE" />
          <path d={svgPaths.p2ad31ab0} fill="#FEFEFE" />
        </g>
        <defs>
          <clipPath id="clip0_sidebar"><rect fill="white" height="40" width="40" /></clipPath>
        </defs>
      </svg>
    </div>
  );
}

// ── Nav icons (inline SVGs matching the original design) ──────────────────

function DashboardIcon({ active }: { active?: boolean }) {
  return (
    <svg className="shrink-0 size-[20px]" fill="none" viewBox="0 0 24 24">
      <path clipRule="evenodd" d={svgPaths.pd8f7900} fill={active ? '#465FFF' : '#667085'} fillRule="evenodd" />
    </svg>
  );
}
function CollectionsIcon({ active }: { active?: boolean }) {
  return (
    <svg className="shrink-0 size-[20px]" fill="none" viewBox="0 0 24 24">
      <path clipRule="evenodd" d={svgPaths.p3bb18b80} fill={active ? '#465FFF' : '#667085'} fillRule="evenodd" />
    </svg>
  );
}
function ProjectionsIcon({ active }: { active?: boolean }) {
  return (
    <svg className="shrink-0 size-[20px]" fill="none" viewBox="0 0 24 24">
      <path clipRule="evenodd" d={svgPaths.p17458f00} fill={active ? '#465FFF' : '#667085'} fillRule="evenodd" />
    </svg>
  );
}
function VariancesIcon({ active }: { active?: boolean }) {
  return (
    <svg className="shrink-0 size-[20px]" fill="none" viewBox="0 0 24 24">
      <path clipRule="evenodd" d={svgPaths.p2a2f1d00} fill={active ? '#465FFF' : '#667085'} fillRule="evenodd" />
    </svg>
  );
}

/** Upload / Import icon */
function ImportIcon({ active }: { active?: boolean }) {
  const color = active ? '#00A65D' : '#667085';
  return (
    <svg className="shrink-0 size-[20px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.7" stroke={color}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

/** Target / Set Projections icon */
function SetProjectionsIcon({ active }: { active?: boolean }) {
  const color = active ? '#00A65D' : '#667085';
  return (
    <svg className="shrink-0 size-[20px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.7" stroke={color}>
      <circle cx="12" cy="12" r="9"  strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2M12 20v2M2 12h2M20 12h2" />
    </svg>
  );
}

// ── Nav item config ────────────────────────────────────────────────────────

interface NavItem {
  label:    string;
  view:     AppView | null;      // null = coming soon (no view yet)
  icon:     (active: boolean) => React.ReactNode;
  divider?: boolean;             // draw a separator line before this item
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    view:  'dashboard',
    icon:  (a) => <DashboardIcon active={a} />,
  },
  {
    label: 'Collections',
    view:  'collections',
    icon:  (a) => <CollectionsIcon active={a} />,
  },
  {
    label: 'Projections',
    view:  'projections',
    icon:  (a) => <ProjectionsIcon active={a} />,
  },
  {
    label: 'Variances',
    view:  'variances',
    icon:  (a) => <VariancesIcon active={a} />,
  },
  // ── Divider then data tools ─────────────────────────────────────────────
  {
    label:   'Import Data',
    view:    'import',
    icon:    (a) => <ImportIcon active={a} />,
    divider: true,
  },
  {
    label: 'Set Projections',
    view:  'set-projections',
    icon:  (a) => <SetProjectionsIcon active={a} />,
  },
];

// ── Sidebar ────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { activeView, navigate } = useNavigation();

  return (
    <aside
      className="flex flex-col bg-white border-r border-[#E4E7EC] shrink-0 h-full overflow-hidden transition-all duration-300 ease-in-out"
      style={{ width: collapsed ? 64 : 160, fontFamily: "'Outfit', sans-serif" }}
    >
      {/* Header / Logo */}
      <div className={`flex items-center border-b border-[#E4E7EC] pt-7 pb-6 transition-all duration-300 ${collapsed ? 'justify-center px-0' : 'gap-2 px-4'}`}>
        <AciLogo />
        {!collapsed && (
          <div className="flex flex-col leading-tight overflow-hidden">
            <span className="font-semibold text-[11px] text-[#475467] leading-[14px] whitespace-nowrap">ACI Collection</span>
            <span className="font-semibold text-[11px] text-[#475467] leading-[14px] whitespace-nowrap">Tracking Dashboard</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col px-2 pt-5 gap-1">
        {!collapsed && (
          <p className="text-[11px] font-normal text-[#98A2B3] uppercase tracking-wide mb-2 px-2">MENU</p>
        )}

        {NAV_ITEMS.map((item) => {
          const isActive   = !!item.view && item.view === activeView;
          const isDataTool = item.view === 'import' || item.view === 'set-projections';

          return (
            <div key={item.label}>
              {item.divider && (
                <div className="mx-2 my-2 border-t border-[#F2F4F7]" />
              )}

              <button
                onClick={() => { if (item.view) navigate(item.view); }}
                disabled={!item.view}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 py-2 rounded-lg w-full transition-colors group ${
                  collapsed ? 'justify-center px-0' : 'px-3'
                } ${
                  isActive
                    ? isDataTool ? 'bg-[#ECFDF3] text-[#00A65D]' : 'bg-[#ECFDF3] text-[#465FFF]'
                    : item.view ? 'text-[#344054] hover:bg-[#F9FAFB]' : 'text-[#98A2B3] cursor-not-allowed'
                }`}
              >
                {item.icon(isActive)}
                {!collapsed && (
                  <span className={`text-[13px] font-medium leading-tight whitespace-nowrap ${
                    isActive
                      ? isDataTool ? 'text-[#00A65D]' : 'text-[#465FFF]'
                      : item.view ? 'text-[#344054]' : 'text-[#C0C7D1]'
                  }`}>
                    {item.label}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Toggle button */}
      <div className="mt-auto pb-5 flex justify-center">
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex items-center justify-center size-8 rounded-lg text-[#98A2B3] hover:bg-[#F2F4F7] hover:text-[#344054] transition-colors"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </div>
    </aside>
  );
}