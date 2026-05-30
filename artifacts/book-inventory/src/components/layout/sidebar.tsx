import { Link, useLocation } from "wouter";
import { Book, Users, Repeat, Library, Menu, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { useHealthCheck } from "@workspace/api-client-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Library },
  { name: "Catalog", href: "/books", icon: Book },
  { name: "Scan Books", href: "/books/scan", icon: ScanLine },
  { name: "Members", href: "/members", icon: Users },
  { name: "Loans", href: "/loans", icon: Repeat },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  return (
    <>
      {navigation.map((item) => {
        const isActive =
          item.href === "/"
            ? location === "/"
            : location === item.href || location.startsWith(item.href + "/");
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <item.icon
              className={`h-5 w-5 shrink-0 ${
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              }`}
            />
            {item.name}
          </Link>
        );
      })}
    </>
  );
}

export function Sidebar() {
  useHealthCheck();
  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      <div className="flex h-16 shrink-0 items-center px-6 border-b">
        <div className="flex items-center gap-2 text-primary">
          <Library className="h-6 w-6" />
          <span className="font-serif font-bold text-lg tracking-tight">Edmonton Library</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
        <nav className="flex-1 space-y-1">
          <NavItems />
        </nav>
      </div>
    </div>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open sidebar</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-16 shrink-0 items-center px-6 border-b">
          <div className="flex items-center gap-2 text-primary">
            <Library className="h-6 w-6" />
            <span className="font-serif font-bold text-lg tracking-tight">Edmonton Library</span>
          </div>
        </div>
        <div className="px-4 py-6">
          <nav className="space-y-1">
            <NavItems onNavigate={() => setOpen(false)} />
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
