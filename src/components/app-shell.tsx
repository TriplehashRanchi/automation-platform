"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Bell, ChevronsUpDown, GitBranch, LayoutDashboard, ListChecks, Plug, Users, Workflow } from "lucide-react";
import { Toaster } from "sonner";
import { LogDrawer } from "@/components/log-drawer";
import { ACCOUNT_NAME } from "@/mock/seed";
import { comingSoon } from "@/lib/toast";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/runs", label: "Run logs", icon: ListChecks },
  { href: "/funnels", label: "Funnels", icon: GitBranch },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/connections", label: "Connections", icon: Plug },
  { href: "/alerts", label: "Alerts", icon: Bell },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

function NavLinks({ variant }: { variant: "side" | "top" }) {
  const pathname = usePathname();
  return (
    <>
      {NAV.map(({ href, label, icon: Icon }) =>
        variant === "side" ? (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              isActive(pathname, href) && "bg-accent text-accent-foreground hover:bg-accent",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ) : (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground",
              isActive(pathname, href) && "bg-accent font-medium text-accent-foreground",
            )}
          >
            {label}
          </Link>
        ),
      )}
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col self-start overflow-y-auto border-r bg-card md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Workflow className="size-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">FlowPilot</span>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          <Suspense fallback={null}>
            <NavLinks variant="side" />
          </Suspense>
        </nav>
        <button
          type="button"
          onClick={() => comingSoon("Switching accounts")}
          className="m-3 flex items-center gap-2 rounded-md border px-3 py-2 text-left hover:bg-muted"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">{ACCOUNT_NAME.split(" ").slice(0, 2).map((w) => w[0]).join("")}</span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{ACCOUNT_NAME}</span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-card md:hidden">
          <div className="flex items-center gap-2 px-4 py-3">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Workflow className="size-4" />
            </span>
            <span className="font-semibold">FlowPilot</span>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
            <Suspense fallback={null}>
              <NavLinks variant="top" />
            </Suspense>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>{children}</Suspense>
        </main>
      </div>
      <Suspense fallback={null}>
        <LogDrawer />
      </Suspense>
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
