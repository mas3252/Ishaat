import { useParams, Link } from "wouter";
import {
  useGetMember, useListLoans, useReturnLoan,
  getGetMemberQueryKey, getListLoansQueryKey, getGetDashboardQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BookOpen, Mail, Phone, RotateCcw, Users } from "lucide-react";

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>();
  const memberId = parseInt(id, 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: member, isLoading } = useGetMember(memberId, {
    query: { enabled: !!memberId, queryKey: getGetMemberQueryKey(memberId) }
  });

  const { data: loans } = useListLoans(
    { memberId },
    { query: { enabled: !!memberId, queryKey: getListLoansQueryKey({ memberId }) } }
  );

  const returnLoan = useReturnLoan();

  const activeLoans = loans?.filter((l) => l.status === "active") ?? [];
  const loanHistory = loans?.filter((l) => l.status === "returned") ?? [];

  function handleReturn(loanId: number) {
    returnLoan.mutate({ id: loanId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(memberId) });
        queryClient.invalidateQueries({ queryKey: getListLoansQueryKey({ memberId }) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        toast({ title: "Book returned successfully" });
      },
      onError: () => toast({ title: "Failed to return book", variant: "destructive" }),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Member not found.</p>
        <Button className="mt-4" asChild>
          <Link href="/members">Back to members</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/members"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Member Profile</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold">{member.name}</h2>
                <Badge variant="outline" className="font-mono">{member.memberCode}</Badge>
                {(member.activeLoansCount ?? 0) > 0 ? (
                  <Badge>{member.activeLoansCount} active loan{member.activeLoansCount !== 1 ? "s" : ""}</Badge>
                ) : (
                  <Badge variant="secondary">No active loans</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                {member.email && (
                  <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{member.email}</span>
                )}
                {member.phone && (
                  <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{member.phone}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Member since {new Date(member.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {activeLoans.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Currently Borrowing</h3>
          <div className="space-y-2">
            {activeLoans.map((loan) => (
              <Card key={loan.id}>
                <CardContent className="py-3 px-4 flex items-center gap-3">
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
                    <Link href={`/books/${loan.bookId}`}>
                      <p className="font-medium text-sm hover:text-primary transition-colors">{loan.book?.title}</p>
                    </Link>
                    <p className="text-xs text-muted-foreground">Borrowed {new Date(loan.borrowedAt).toLocaleDateString()}</p>
                  </div>
                  <Button
                    data-testid={`button-return-loan-${loan.id}`}
                    size="sm"
                    variant="outline"
                    onClick={() => handleReturn(loan.id)}
                    disabled={returnLoan.isPending}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />Return
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {loanHistory.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Loan History</h3>
          <div className="space-y-1">
            {loanHistory.map((loan) => (
              <div key={loan.id} className="flex items-center gap-3 py-2 border-b last:border-0 text-sm">
                <div className="flex-1 min-w-0">
                  <Link href={`/books/${loan.bookId}`}>
                    <span className="hover:text-primary transition-colors">{loan.book?.title ?? "Unknown"}</span>
                  </Link>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(loan.borrowedAt).toLocaleDateString()} &rarr; {loan.returnedAt ? new Date(loan.returnedAt).toLocaleDateString() : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!activeLoans.length && !loanHistory.length && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No loans yet</p>
            <p className="text-sm mt-1">This member has not borrowed any books.</p>
            <Button className="mt-4" asChild>
              <Link href="/loans">Create a loan</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
