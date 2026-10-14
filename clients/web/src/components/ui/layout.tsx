import React from "react";

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

/**
 * Standardized responsive page container that gracefully scales across all viewport breakpoints:
 * Mobile (< 768px): comfortable 16px padding
 * Tablet (768 - 1023px): 24px padding
 * Desktop (1024 - 1535px): 32px padding, full width usage
 * Large Desktop (≥ 1536px): 40px–48px padding, up to 1920px max or full width, eliminating massive empty gutters
 */
export function PageContainer({
  children,
  className = "",
  fullWidth = false,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={`w-full ${
        fullWidth ? "max-w-none" : "max-w-[1920px]"
      } mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 min-h-[calc(100vh-4rem)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader utilizes horizontal desktop space effectively by placing the title/description
 * on the left and actions/buttons on the right, avoiding vertical whitespace waste.
 */
export function PageHeader({
  title,
  description,
  badge,
  breadcrumbs,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200/80 transition-all ${className}`}
    >
      <div className="space-y-1.5 min-w-0">
        {breadcrumbs && <div className="mb-1 text-xs text-slate-500">{breadcrumbs}</div>}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
            {title}
          </h1>
          {badge && <div>{badge}</div>}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0 self-start md:self-auto">
          {actions}
        </div>
      )}
    </div>
  );
}

export interface DashboardGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5;
  className?: string;
}

/**
 * Responsive dashboard metric card grid. Automatically scales to 4 columns on large screens.
 */
export function DashboardGrid({
  children,
  cols = 4,
  className = "",
  ...props
}: DashboardGridProps) {
  const colClasses = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
  };

  return (
    <div className={`grid ${colClasses[cols]} gap-4 sm:gap-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export interface SplitPaneProps {
  main: React.ReactNode;
  secondary: React.ReactNode;
  className?: string;
  secondaryWidth?: "narrow" | "default" | "wide";
  reverseOnMobile?: boolean;
}

/**
 * 2-column split pane for desktop dashboards and management views:
 * Main interactive/table area takes remaining space (minmax(0, 2fr)),
 * Secondary pane (timeline, actions, side widgets) takes dedicated width.
 */
export function SplitPane({
  main,
  secondary,
  className = "",
  secondaryWidth = "default",
  reverseOnMobile = false,
}: SplitPaneProps) {
  const widthClasses = {
    narrow: "lg:grid-cols-4 xl:grid-cols-5 [&>*:first-child]:lg:col-span-3 [&>*:first-child]:xl:col-span-4",
    default: "lg:grid-cols-3 xl:grid-cols-4 [&>*:first-child]:lg:col-span-2 [&>*:first-child]:xl:col-span-3",
    wide: "lg:grid-cols-12 [&>*:first-child]:lg:col-span-7 xl:[&>*:first-child]:lg:col-span-8 [&>*:last-child]:lg:col-span-5 xl:[&>*:last-child]:lg:col-span-4",
  };

  return (
    <div
      className={`grid grid-cols-1 ${widthClasses[secondaryWidth]} gap-6 lg:gap-8 items-start ${
        reverseOnMobile ? "flex flex-col-reverse lg:grid" : ""
      } ${className}`}
    >
      <div className="min-w-0 space-y-6">{main}</div>
      <div className="min-w-0 space-y-6">{secondary}</div>
    </div>
  );
}

export interface DataTableContainerProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerActions?: React.ReactNode;
  filterBar?: React.ReactNode;
  className?: string;
}

/**
 * Full-width data table container with integrated sticky header support and filter area.
 */
export function DataTableContainer({
  children,
  title,
  subtitle,
  headerActions,
  filterBar,
  className = "",
}: DataTableContainerProps) {
  return (
    <div
      className={`w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col ${className}`}
    >
      {(title || headerActions || filterBar) && (
        <div className="p-4 sm:p-6 border-b border-slate-100 space-y-4">
          {(title || headerActions) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                {title && (
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {title}
                  </h3>
                )}
                {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
              </div>
              {headerActions && (
                <div className="flex flex-wrap items-center gap-2">{headerActions}</div>
              )}
            </div>
          )}

          {filterBar && <div className="pt-1">{filterBar}</div>}
        </div>
      )}

      <div className="w-full overflow-x-auto relative scrollbar-thin">
        {children}
      </div>
    </div>
  );
}

export interface DetailLayoutProps {
  main: React.ReactNode;
  sidebar: React.ReactNode;
  className?: string;
}

/**
 * Multi-column detail page layout (e.g. Order Detail, Pickup Inspection).
 */
export function DetailLayout({ main, sidebar, className = "" }: DetailLayoutProps) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start ${className}`}>
      <div className="lg:col-span-2 min-w-0 space-y-6">{main}</div>
      <div className="lg:col-span-1 min-w-0 space-y-6">{sidebar}</div>
    </div>
  );
}

export interface SectionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  children: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function Section({
  children,
  title,
  description,
  actions,
  className = "",
  ...props
}: SectionProps) {
  return (
    <section className={`space-y-4 ${className}`} {...props}>
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            {title && (
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {title}
              </h2>
            )}
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
