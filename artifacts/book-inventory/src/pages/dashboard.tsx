import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, ArrowUpDown, BookMarked, Clock, TrendingUp } from "lucide-react";
import { Link } from "wouter";

function StatCard({ title, value, icon: Icon, description, isLoading }: {
  title: string;
  value: number;
  icon: React.ElementType;
  description?: string;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-3xl font-bold font-serif">{value.toLocaleString()}</div>
        )}
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboard();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your library collection and activity.</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Titles" value={stats?.totalBooks ?? 0} icon={BookOpen} description="Unique books" isLoading={isLoading} />
        <StatCard title="Total Copies" value={stats?.totalCopies ?? 0} icon={BookMarked} description="Physical volumes" isLoading={isLoading} />
        <StatCard title="Available" value={stats?.availableCopies ?? 0} icon={TrendingUp} description="Ready to borrow" isLoading={isLoading} />
        <StatCard title="Borrowed" value={stats?.borrowedCopies ?? 0} icon={ArrowUpDown} description="Currently out" isLoading={isLoading} />
        <StatCard title="Members" value={stats?.totalMembers ?? 0} icon={Users} description="Registered" isLoading={isLoading} />
        <StatCard title="Active Loans" value={stats?.activeLoans ?? 0} icon={Clock} description="Open checkouts" isLoading={isLoading} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          <Link href="/loans" className="text-sm text-primary hover:underline">View all loans</Link>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !stats?.recentLoans?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No loan activity yet</p>
              <p className="text-sm mt-1">Loans will appear here when books are borrowed.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {stats.recentLoans.map((loan) => (
              <Card key={loan.id} className="hover:bg-accent/30 transition-colors">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-4">
                    {loan.book?.coverImageUrl ? (
                      <img
                        src={loan.book.coverImageUrl}
                        alt={loan.book?.title}
                        className="h-12 w-9 object-cover rounded-sm shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="h-12 w-9 bg-muted rounded-sm flex items-center justify-center shrink-0">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{loan.book?.title ?? "Unknown book"}</p>
                      <p className="text-xs text-muted-foreground">
                        {loan.member?.name ?? "Unknown"} &middot; {loan.member?.memberCode}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={loan.status === "active" ? "default" : "secondary"}>
                        {loan.status === "active" ? "Borrowed" : "Returned"}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(loan.borrowedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
