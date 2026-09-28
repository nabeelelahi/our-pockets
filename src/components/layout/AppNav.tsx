"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, ListIcon, SettingsIcon, WalletIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/styles";

const LINKS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/transactions", label: "Transactions", Icon: ListIcon },
  { href: "/budget", label: "Budget", Icon: WalletIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ householdName }: { householdName: string }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop / tablet: top bar */}
      <header className="sticky top-0 z-30 hidden border-b border-border bg-bg/90 backdrop-blur md:block">
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-5xl items-center gap-6 px-4">
          <Link href="/" className="mr-auto font-semibold">
            <span aria-hidden="true" className="mr-2 text-accent">◐</span>
            {householdName}
          </Link>
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium",
                isActive(pathname, href) ? "bg-accent-soft text-accent" : "text-muted hover:text-fg",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Mobile: bottom tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {LINKS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                    active ? "text-accent" : "text-muted",
                  )}
                >
                  <Icon />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
