import { useState, useRef, useCallback, useEffect } from "react";
import {
  useListLoans, useCreateLoan, useReturnLoan, useListBooks, useListMembers,
  getListLoansQueryKey, getGetDashboardQueryKey, getListBooksQueryKey, getListMembersQueryKey,
  getGetBookQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Plus, BookOpen, RotateCcw, Repeat, ScanLine,
  CheckCircle, AlertCircle, Loader2, Search, UserCheck,
} from "lucide-react";

type StatusFilter = "all" | "active" | "returned";

interface ScannedBook {
  id: number;
  title: string;
  author: string;
  coverImageUrl?: string | null;
  availableCopies: number;
  isbn?: string | null;
}

export default function Loans() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [borrowOpen, setBorrowOpen] = useState(false);

  // Checkout wizard state
  const [step, setStep] = useState<"member" | "scan">("member");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [scannedBook, setScannedBook] = useState<ScannedBook | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanInput, setScanInput] = useState("");

  const scanInputRef = useRef<HTMLInputElement>(null);
  const memberInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: loans, isLoading } = useListLoans(
    statusFilter !== "all" ? { status: statusFilter } : {},
    { query: { queryKey: getListLoansQueryKey(statusFilter !== "all" ? { status: statusFilter } : undefined) } }
  );
  const { data: members } = useListMembers();
  const { data: allBooks } = useListBooks();

  const createLoan = useCreateLoan();
  const returnLoan = useReturnLoan();

  const selectedMember = members?.find((m) => m.id === selectedMemberId);

  const filteredMembers = members?.filter((m) => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.memberCode.toLowerCase().includes(q);
  });

  // Focus scan input whenever we arrive at step 2
  useEffect(() => {
    if (step === "scan" && borrowOpen) {
      setTimeout(() => scanInputRef.current?.focus(), 50);
    }
    if (step === "member" && borrowOpen) {
      setTimeout(() => memberInputRef.current?.focus(), 50);
    }
  }, [step, borrowOpen]);

  const lookupByIsbn = useCallback((rawIsbn: string) => {
    const isbn = rawIsbn.replace(/-/g, "").trim();
    if (!isbn || scanLoading) return;

    setScanError(null);
    setScannedBook(null);
    setScanLoading(true);

    const match = allBooks?.find((b) => b.isbn?.replace(/-/g, "") === isbn);
    if (match) {
      setScannedBook({
        id: match.id,
        title: match.title,
        author: match.author,
        coverImageUrl: match.coverImageUrl,
        availableCopies: match.availableCopies,
        isbn: match.isbn,
      });
    } else {
      setScanError(`ISBN ${isbn} is not in the catalog. Add it via Scan Books first.`);
    }
    setScanLoading(false);
  }, [allBooks, scanLoading]);

  function handleScanKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const val = scanInput.trim();
      if (val) {
        lookupByIsbn(val);
        setScanInput("");
      }
    }
  }

  function resetDialog() {
    setStep("member");
    setMemberSearch("");
    setSelectedMemberId(null);
    setScannedBook(null);
    setScanError(null);
    setScanLoading(false);
    setScanInput("");
  }

  function handleOpenDialog() {
    resetDialog();
    setBorrowOpen(true);
  }

  function handleSelectMember(id: number) {
    setSelectedMemberId(id);
    setScannedBook(null);
    setScanError(null);
    setScanInput("");
    setStep("scan");
  }

  function handleConfirmBorrow() {
    if (!scannedBook || !selectedMemberId) return;
    createLoan.mutate(
      { data: { bookId: scannedBook.id, memberId: selectedMemberId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLoansQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetBookQueryKey(scannedBook.id) });
          toast({ title: `"${scannedBook.title}" checked out to ${selectedMember?.name}` });
          // Stay on scan step — clear book so they can scan the next one
          setScannedBook(null);
          setScanError(null);
          setScanInput("");
          setTimeout(() => scanInputRef.current?.focus(), 50);
        },
        onError: (err: unknown) => {
          const msg = (err as { data?: { error?: string } })?.data?.error ?? "Failed to create loan";
          toast({ title: msg, variant: "destructive" });
        },
      }
    );
  }

  function handleReturn(loanId: number) {
    returnLoan.mutate({ id: loanId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLoansQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        toast({ title: "Book returned" });
      },
      onError: () => toast({ title: "Failed to return book", variant: "destructive" }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loans</h1>
          <p className="text-muted-foreground mt-1">Track who has what and when.</p>
        </div>
        <Button data-testid="button-borrow-book" onClick={handleOpenDialog}>
          <Plus className="h-4 w-4 mr-2" />Borrow Book
        </Button>
      </div>

      <div className="flex gap-2">
        {(["all", "active", "returned"] as StatusFilter[]).map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
            data-testid={`filter-loans-${s}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !loans?.length ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Repeat className="h-10 w-10 mx-auto mb-4 opacity-40" />
            <p className="font-medium text-base">
              {statusFilter !== "all" ? `No ${statusFilter} loans` : "No loans yet"}
            </p>
            {statusFilter === "all" && (
              <Button className="mt-4" onClick={handleOpenDialog}>
                <Plus className="h-4 w-4 mr-2" />Create first loan
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {loans.map((loan) => (
            <Card key={loan.id} data-testid={`card-loan-${loan.id}`} className="hover:bg-accent/30 transition-colors">
              <CardContent className="py-3 px-4 flex items-center gap-4">
                {loan.book?.coverImageUrl ? (
                  <img src={loan.book.coverImageUrl} alt={loan.book?.title}
                    className="h-14 w-10 object-cover rounded-sm shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="h-14 w-10 bg-muted rounded-sm flex items-center justify-center shrink-0">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/books/${loan.bookId}`}>
                      <p className="font-medium text-sm hover:text-primary transition-colors">
                        {loan.book?.title ?? "Unknown book"}
                      </p>
                    </Link>
                    <Badge variant={loan.status === "active" ? "default" : "secondary"} className="text-xs">
                      {loan.status === "active" ? "Borrowed" : "Returned"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <Link href={`/members/${loan.memberId}`} className="hover:text-foreground transition-colors">
                      {loan.member?.name}
                    </Link>
                    {" "}&middot; Code: {loan.member?.memberCode}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Borrowed: {new Date(loan.borrowedAt).toLocaleDateString()}
                    {loan.returnedAt && ` · Returned: ${new Date(loan.returnedAt).toLocaleDateString()}`}
                  </p>
                </div>
                {loan.status === "active" && (
                  <Button data-testid={`button-return-loan-${loan.id}`} size="sm" variant="outline"
                    onClick={() => handleReturn(loan.id)} disabled={returnLoan.isPending} className="shrink-0">
                    <RotateCcw className="h-3 w-3 mr-1" />Return
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Checkout Dialog ── */}
      <Dialog open={borrowOpen} onOpenChange={(o) => { if (!o) { resetDialog(); setBorrowOpen(false); } }}>
        <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
          <DialogHeader className="px-5 pt-5 pb-0">
            <DialogTitle className="text-base font-semibold">Check Out a Book</DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center px-5 pt-3 pb-0">
            <div className="flex items-center gap-1.5">
              <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${step === "member" ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"}`}>
                {step !== "member" ? <CheckCircle className="h-3.5 w-3.5" /> : "1"}
              </div>
              <span className={`text-xs font-medium ${step === "member" ? "text-foreground" : "text-muted-foreground"}`}>Member</span>
            </div>
            <div className="flex-1 h-px bg-border mx-2" />
            <div className="flex items-center gap-1.5">
              <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${step === "scan" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</div>
              <span className={`text-xs font-medium ${step === "scan" ? "text-foreground" : "text-muted-foreground"}`}>Scan Book</span>
            </div>
          </div>

          {/* ── Step 1: Member ── */}
          {step === "member" && (
            <div className="px-5 pt-4 pb-5 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  ref={memberInputRef}
                  autoFocus
                  placeholder="Search by name or member code..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-member-search"
                />
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto rounded-md border">
                {filteredMembers?.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">No members found</p>
                )}
                {filteredMembers?.map((m) => (
                  <button key={m.id} type="button"
                    data-testid={`select-member-${m.id}`}
                    onClick={() => handleSelectMember(m.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors first:rounded-t-md last:rounded-b-md">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-primary">{m.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{m.memberCode}</p>
                    </div>
                    {(m.activeLoansCount ?? 0) > 0 && (
                      <Badge variant="secondary" className="text-xs shrink-0">{m.activeLoansCount} out</Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Scan ── */}
          {step === "scan" && (
            <div className="pb-5 space-y-0">
              {/* Member banner */}
              <div className="flex items-center gap-2 px-5 py-3 bg-primary/5 border-y mt-3">
                <UserCheck className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedMember?.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{selectedMember?.memberCode}</p>
                </div>
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-muted-foreground"
                  onClick={() => { setStep("member"); setScannedBook(null); setScanError(null); }}>
                  Change
                </Button>
              </div>

              <div className="px-5 pt-4 space-y-3">
                {/* Scanner input */}
                <div
                  className="flex items-center gap-3 rounded-lg border-2 border-primary/40 bg-primary/5 px-4 py-3 cursor-text"
                  onClick={() => scanInputRef.current?.focus()}
                >
                  <ScanLine className="h-5 w-5 text-primary shrink-0" />
                  <Input
                    ref={scanInputRef}
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={handleScanKeyDown}
                    onBlur={() => setTimeout(() => scanInputRef.current?.focus(), 100)}
                    placeholder="Scan book barcode or type ISBN..."
                    className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0 shadow-none font-mono placeholder:font-sans"
                    data-testid="input-scan-isbn-loan"
                    autoComplete="off"
                  />
                </div>

                {scanLoading && (
                  <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />Looking up...
                  </div>
                )}

                {scanError && !scanLoading && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{scanError}
                  </div>
                )}

                {scannedBook && !scanLoading && (
                  <div className="rounded-md border bg-card overflow-hidden">
                    <div className="flex items-center gap-3 p-3">
                      {scannedBook.coverImageUrl ? (
                        <img src={scannedBook.coverImageUrl} alt={scannedBook.title}
                          className="h-16 w-11 object-cover rounded-sm shadow-sm shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="h-16 w-11 bg-muted rounded-sm flex items-center justify-center shrink-0">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{scannedBook.title}</p>
                        <p className="text-xs text-muted-foreground">{scannedBook.author}</p>
                        {scannedBook.availableCopies > 0 ? (
                          <Badge className="mt-1 text-xs">{scannedBook.availableCopies} available</Badge>
                        ) : (
                          <Badge variant="destructive" className="mt-1 text-xs">No copies available</Badge>
                        )}
                      </div>
                    </div>
                    <div className="border-t px-3 py-2.5">
                      <Button data-testid="button-confirm-borrow"
                        onClick={handleConfirmBorrow}
                        disabled={createLoan.isPending || scannedBook.availableCopies < 1}
                        size="sm" className="w-full">
                        {createLoan.isPending
                          ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          : <CheckCircle className="h-4 w-4 mr-2" />}
                        Check Out to {selectedMember?.name}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
