import type { ReactNode } from "react";
import { AvatarMenu } from "./avatar-menu";

export function AppShell({
  title,
  subnav,
  children,
}: {
  title: ReactNode;
  subnav?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 md:px-6">
          <h1 className="truncate text-lg font-semibold md:text-xl">{title}</h1>
          <AvatarMenu />
        </div>
        {subnav && (
          <div className="mx-auto max-w-3xl px-4 pb-3 md:px-6">{subnav}</div>
        )}
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">{children}</main>
    </div>
  );
}
