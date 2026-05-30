import { Sidebar, MobileSidebar } from "./sidebar";
import { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background md:flex-row">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-10">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col md:pl-64">
        {/* Mobile Header */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background px-4 shadow-sm md:hidden">
          <MobileSidebar />
          <div className="flex-1 font-serif font-semibold text-primary">Athenaeum</div>
        </header>

        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
