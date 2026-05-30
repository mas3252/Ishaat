import { useRef, useState, useCallback, useEffect } from "react";
import { useCreateBook, useListBooks, getListBooksQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Loader2, Plus, Minus, Trash2,
  BookOpen, CheckCircle, ScanLine, PackagePlus,
} from "lucide-react";

interface ScannedBook {
  isbn: string;
  title: string;
  author: string;
  publisher?: string | null;
  coverImageUrl?: string | null;
  genre?: string | null;
  publishedYear?: number | null;
  description?: string | null;
  copies: number;
  status: "loading" | "found" | "not_found" | "added";
  alreadyInCatalog?: boolean;
}

export default function ScanBooks() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [queue, setQueue] = useState<ScannedBook[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createBook = useCreateBook();
  const { data: existingBooks } = useListBooks();

  // Keep input focused so scanner input is always captured
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const lookupIsbn = useCallback(async (rawIsbn: string) => {
    const isbn = rawIsbn.replace(/-/g, "").trim();
    if (!isbn) return;

    // Already in queue — bump copies
    const inQueue = queue.find((b) => b.isbn === isbn);
    if (inQueue) {
      if (inQueue.status === "added") {
        toast({ title: "Already added to catalog" });
      } else {
        setQueue((prev) => prev.map((b) => b.isbn === isbn ? { ...b, copies: b.copies + 1 } : b));
        toast({ title: `+1 copy of "${inQueue.title}"` });
      }
      return;
    }

    // Add loading placeholder
    setQueue((prev) => [
      { isbn, title: "Looking up...", author: "", copies: 1, status: "loading" as const },
      ...prev,
    ]);

    try {
      const res = await fetch(`/api/books/isbn/${isbn}`);
      if (!res.ok) throw new Error("not found");
      const data = await res.json();
      const alreadyInCatalog = existingBooks?.some((b) => b.isbn === isbn) ?? false;
      setQueue((prev) =>
        prev.map((b) =>
          b.isbn === isbn && b.status === "loading"
            ? { ...b, ...data, copies: b.copies, status: "found" as const, alreadyInCatalog }
            : b
        )
      );
    } catch {
      setQueue((prev) =>
        prev.map((b) =>
          b.isbn === isbn && b.status === "loading"
            ? { ...b, title: isbn, author: "Unknown author", status: "not_found" as const }
            : b
        )
      );
    }
  }, [queue, existingBooks, toast]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const val = inputValue.trim();
      if (val) {
        lookupIsbn(val);
        setInputValue("");
      }
    }
  }

  function adjustCopies(isbn: string, delta: number) {
    setQueue((prev) =>
      prev.map((b) => b.isbn !== isbn ? b : { ...b, copies: Math.max(1, b.copies + delta) })
    );
  }

  function removeFromQueue(isbn: string) {
    setQueue((prev) => prev.filter((b) => b.isbn !== isbn));
  }

  async function handleAddAll() {
    const toAdd = queue.filter((b) => b.status === "found" || b.status === "not_found");
    if (!toAdd.length) return;
    setIsSubmitting(true);

    let added = 0;
    let failed = 0;

    for (const book of toAdd) {
      try {
        await new Promise<void>((resolve, reject) => {
          createBook.mutate(
            {
              data: {
                isbn: book.isbn,
                title: book.title,
                author: book.author,
                ...(book.publisher ? { publisher: book.publisher } : {}),
                ...(book.coverImageUrl ? { coverImageUrl: book.coverImageUrl } : {}),
                ...(book.genre ? { genre: book.genre } : {}),
                ...(book.publishedYear ? { publishedYear: book.publishedYear } : {}),
                ...(book.description ? { description: book.description } : {}),
                totalCopies: book.copies,
              },
            },
            { onSuccess: () => resolve(), onError: () => reject() }
          );
        });
        setQueue((prev) => prev.map((b) => b.isbn === book.isbn ? { ...b, status: "added" } : b));
        added++;
      } catch {
        failed++;
      }
    }

    queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
    setIsSubmitting(false);

    if (added > 0) toast({ title: `${added} book${added !== 1 ? "s" : ""} added to catalog` });
    if (failed > 0) toast({ title: `${failed} failed to add`, variant: "destructive" });

    // Re-focus for next scan
    inputRef.current?.focus();
  }

  const pendingCount = queue.filter((b) => b.status === "found" || b.status === "not_found").length;
  const addedCount = queue.filter((b) => b.status === "added").length;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/books"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scan Books</h1>
          <p className="text-muted-foreground mt-0.5">Scan ISBN barcodes to bulk-add books to the catalog.</p>
        </div>
      </div>

      {/* Scanner input */}
      <div
        className="flex items-center gap-3 rounded-lg border-2 border-primary/40 bg-primary/5 px-4 py-3 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        <ScanLine className="h-5 w-5 text-primary shrink-0" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => inputRef.current?.focus(), 100)}
          placeholder="Scan barcode or type ISBN and press Enter..."
          className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0 shadow-none font-mono placeholder:font-sans"
          data-testid="input-scan-isbn"
          autoComplete="off"
        />
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Scan Queue
              {pendingCount > 0 && <Badge className="ml-2">{pendingCount} pending</Badge>}
              {addedCount > 0 && <Badge variant="secondary" className="ml-1">{addedCount} added</Badge>}
            </h2>
            {pendingCount > 0 && (
              <Button onClick={handleAddAll} disabled={isSubmitting} data-testid="button-add-all">
                {isSubmitting
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <PackagePlus className="h-4 w-4 mr-2" />}
                Add All to Catalog ({pendingCount})
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {queue.map((book) => (
              <Card
                key={book.isbn}
                data-testid={`card-scanned-${book.isbn}`}
                className={book.status === "added" ? "opacity-60 bg-muted/30" : ""}
              >
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  {/* Cover */}
                  <div className="shrink-0">
                    {book.status === "loading" ? (
                      <Skeleton className="h-16 w-12 rounded-sm" />
                    ) : book.coverImageUrl ? (
                      <img
                        src={book.coverImageUrl}
                        alt={book.title}
                        className="h-16 w-12 object-cover rounded-sm shadow-sm"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="h-16 w-12 bg-muted rounded-sm flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {book.status === "loading" ? (
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{book.title}</p>
                          {book.status === "added" && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <CheckCircle className="h-3 w-3" />Added
                            </Badge>
                          )}
                          {book.alreadyInCatalog && book.status !== "added" && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">Already in catalog</Badge>
                          )}
                          {book.status === "not_found" && (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Not found online</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{book.author}</p>
                        <p className="text-xs text-muted-foreground font-mono">{book.isbn}</p>
                      </>
                    )}
                  </div>

                  {/* Copies */}
                  {book.status !== "loading" && book.status !== "added" && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="outline" size="icon" className="h-7 w-7"
                        onClick={() => adjustCopies(book.isbn, -1)}
                        data-testid={`button-dec-${book.isbn}`}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium tabular-nums">{book.copies}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7"
                        onClick={() => adjustCopies(book.isbn, 1)}
                        data-testid={`button-inc-${book.isbn}`}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* Remove */}
                  {book.status !== "added" && (
                    <Button variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeFromQueue(book.isbn)}
                      data-testid={`button-remove-${book.isbn}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {queue.length === 0 && (
        <div className="py-16 text-center text-muted-foreground border-2 border-dashed rounded-lg">
          <ScanLine className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Ready to scan</p>
          <p className="text-sm mt-1">Scan a book's barcode or type an ISBN above.</p>
        </div>
      )}
    </div>
  );
}
