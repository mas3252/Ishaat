import { useParams, useLocation, Link } from "wouter";
import {
  useGetBook, useUpdateBook, useDeleteBook, useAdjustInventory, useListLoans, useReturnLoan,
  getGetBookQueryKey, getListBooksQueryKey, getListLoansQueryKey, getGetDashboardQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Minus, BookOpen, Users, RotateCcw, Pencil, Loader2, ImageIcon, Trash2,
} from "lucide-react";

interface EditForm {
  title: string;
  author: string;
  publisher: string;
  genre: string;
  publishedYear: string;
  description: string;
  coverImageUrl: string;
}

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const bookId = parseInt(id, 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Inventory adjust state
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustType, setAdjustType] = useState<"add" | "subtract">("add");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    title: "", author: "", publisher: "", genre: "",
    publishedYear: "", description: "", coverImageUrl: "",
  });
  const [coverPreview, setCoverPreview] = useState("");

  const { data: book, isLoading } = useGetBook(bookId, {
    query: { enabled: !!bookId, queryKey: getGetBookQueryKey(bookId) }
  });

  const { data: loans } = useListLoans(
    { bookId },
    { query: { enabled: !!bookId, queryKey: getListLoansQueryKey({ bookId }) } }
  );

  const [deleteOpen, setDeleteOpen] = useState(false);

  const adjustInventory = useAdjustInventory();
  const returnLoan = useReturnLoan();
  const updateBook = useUpdateBook();
  const deleteBook = useDeleteBook();

  function handleDelete() {
    deleteBook.mutate({ id: bookId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        toast({ title: `"${book?.title}" deleted` });
        setLocation("/books");
      },
      onError: () => toast({ title: "Failed to delete book", variant: "destructive" }),
    });
  }

  const activeLoans = loans?.filter((l) => l.status === "active") ?? [];
  const loanHistory = loans?.filter((l) => l.status === "returned") ?? [];

  function openEdit() {
    if (!book) return;
    setEditForm({
      title: book.title ?? "",
      author: book.author ?? "",
      publisher: book.publisher ?? "",
      genre: book.genre ?? "",
      publishedYear: book.publishedYear ? String(book.publishedYear) : "",
      description: book.description ?? "",
      coverImageUrl: book.coverImageUrl ?? "",
    });
    setCoverPreview(book.coverImageUrl ?? "");
    setEditOpen(true);
  }

  function handleCoverUrlChange(url: string) {
    setEditForm((f) => ({ ...f, coverImageUrl: url }));
    setCoverPreview(url);
  }

  function handleSaveEdit() {
    const year = editForm.publishedYear ? parseInt(editForm.publishedYear, 10) : undefined;
    updateBook.mutate(
      {
        id: bookId,
        data: {
          title: editForm.title || undefined,
          author: editForm.author || undefined,
          publisher: editForm.publisher || undefined,
          genre: editForm.genre || undefined,
          publishedYear: year && !isNaN(year) ? year : undefined,
          description: editForm.description || undefined,
          coverImageUrl: editForm.coverImageUrl || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetBookQueryKey(bookId) });
          queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() });
          toast({ title: "Book updated" });
          setEditOpen(false);
        },
        onError: () => toast({ title: "Failed to update book", variant: "destructive" }),
      }
    );
  }

  function handleAdjust() {
    adjustInventory.mutate({ id: bookId, data: { type: adjustType, quantity, notes: notes || undefined } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBookQueryKey(bookId) });
        queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        toast({ title: "Inventory updated" });
        setAdjustOpen(false);
        setQuantity(1);
        setNotes("");
      },
      onError: () => toast({ title: "Failed to adjust inventory", variant: "destructive" }),
    });
  }

  function handleReturn(loanId: number) {
    returnLoan.mutate({ id: loanId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBookQueryKey(bookId) });
        queryClient.invalidateQueries({ queryKey: getListLoansQueryKey({ bookId }) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        toast({ title: "Book returned" });
      },
      onError: () => toast({ title: "Failed to return book", variant: "destructive" }),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-6">
          <Skeleton className="h-56 w-36 rounded-md" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Book not found.</p>
        <Button className="mt-4" asChild>
          <Link href="/books">Back to catalog</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/books"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight flex-1">Book Detail</h1>
        <Button variant="outline" size="sm" onClick={openEdit} data-testid="button-edit-book">
          <Pencil className="h-4 w-4 mr-1.5" />Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDeleteOpen(true)}
          className="text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/40"
          data-testid="button-delete-book"
        >
          <Trash2 className="h-4 w-4 mr-1.5" />Delete
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Cover */}
        <div className="shrink-0 group relative cursor-pointer" onClick={openEdit}>
          {book.coverImageUrl ? (
            <img
              src={book.coverImageUrl}
              alt={book.title}
              className="w-36 h-56 object-cover rounded-md shadow-md group-hover:brightness-75 transition-all"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-36 h-56 bg-muted rounded-md flex items-center justify-center group-hover:bg-muted/70 transition-colors">
              <BookOpen className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/60 rounded-full p-2">
              <Pencil className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <h2 className="text-2xl font-bold">{book.title}</h2>
            <p className="text-muted-foreground text-lg">{book.author}</p>
            {book.publisher && (
              <p className="text-sm text-muted-foreground">
                {book.publisher}{book.publishedYear ? `, ${book.publishedYear}` : ""}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {book.genre && <Badge variant="secondary">{book.genre}</Badge>}
            <Badge variant={book.availableCopies > 0 ? "default" : "destructive"}>
              {book.availableCopies} / {book.totalCopies} available
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground font-mono">ISBN: {book.isbn}</p>

          {book.description && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{book.description}</p>
          )}

          <div className="flex gap-2 pt-2 flex-wrap">
            <Button
              data-testid="button-add-copies"
              variant="outline"
              size="sm"
              onClick={() => { setAdjustType("add"); setAdjustOpen(true); }}
            >
              <Plus className="h-4 w-4 mr-1" />Add Copies
            </Button>
            <Button
              data-testid="button-remove-copies"
              variant="outline"
              size="sm"
              onClick={() => { setAdjustType("subtract"); setAdjustOpen(true); }}
            >
              <Minus className="h-4 w-4 mr-1" />Remove Copies
            </Button>
          </div>
        </div>
      </div>

      {activeLoans.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="h-5 w-5" />Currently Borrowed
          </h3>
          <div className="space-y-2">
            {activeLoans.map((loan) => (
              <Card key={loan.id}>
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{loan.member?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Code: {loan.member?.memberCode} &middot; Since {new Date(loan.borrowedAt).toLocaleDateString()}
                    </p>
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
            {loanHistory.slice(0, 10).map((loan) => (
              <div key={loan.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                <span className="text-muted-foreground">{loan.member?.name} ({loan.member?.memberCode})</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(loan.borrowedAt).toLocaleDateString()} &rarr;{" "}
                  {loan.returnedAt ? new Date(loan.returnedAt).toLocaleDateString() : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Book</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-[auto_1fr] gap-6 py-2">
            {/* Cover preview column */}
            <div className="flex flex-col items-center gap-3 w-32">
              <div className="w-32 h-48 rounded-md overflow-hidden bg-muted flex items-center justify-center shadow-sm border">
                {coverPreview ? (
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                    onError={() => setCoverPreview("")}
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">Cover preview</p>
            </div>

            {/* Fields column */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    data-testid="input-edit-title"
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-author">Author</Label>
                  <Input
                    id="edit-author"
                    data-testid="input-edit-author"
                    value={editForm.author}
                    onChange={(e) => setEditForm((f) => ({ ...f, author: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-publisher">Publisher</Label>
                  <Input
                    id="edit-publisher"
                    data-testid="input-edit-publisher"
                    value={editForm.publisher}
                    onChange={(e) => setEditForm((f) => ({ ...f, publisher: e.target.value }))}
                    className="mt-1"
                    placeholder="e.g. Penguin Books"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-year">Published Year</Label>
                  <Input
                    id="edit-year"
                    data-testid="input-edit-year"
                    type="number"
                    value={editForm.publishedYear}
                    onChange={(e) => setEditForm((f) => ({ ...f, publishedYear: e.target.value }))}
                    className="mt-1"
                    placeholder="e.g. 1997"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-genre">Genre</Label>
                  <Input
                    id="edit-genre"
                    data-testid="input-edit-genre"
                    value={editForm.genre}
                    onChange={(e) => setEditForm((f) => ({ ...f, genre: e.target.value }))}
                    className="mt-1"
                    placeholder="e.g. Fiction, Science, History"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-cover">Cover Image URL</Label>
                  <Input
                    id="edit-cover"
                    data-testid="input-edit-cover"
                    value={editForm.coverImageUrl}
                    onChange={(e) => handleCoverUrlChange(e.target.value)}
                    className="mt-1 font-mono text-xs"
                    placeholder="https://covers.openlibrary.org/..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Paste any image URL — the preview updates live.
                  </p>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    data-testid="input-edit-description"
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    className="mt-1 resize-none"
                    rows={3}
                    placeholder="Short summary or notes about this book..."
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              data-testid="button-save-edit"
              onClick={handleSaveEdit}
              disabled={updateBook.isPending || !editForm.title || !editForm.author}
            >
              {updateBook.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Adjust Inventory Dialog ── */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{adjustType === "add" ? "Add Copies" : "Remove Copies"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Type</Label>
              <Select value={adjustType} onValueChange={(v) => setAdjustType(v as "add" | "subtract")}>
                <SelectTrigger data-testid="select-adjust-type" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add copies</SelectItem>
                  <SelectItem value="subtract">Remove copies</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                data-testid="input-adjust-quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input
                data-testid="input-adjust-notes"
                placeholder="e.g. Damaged copy removed"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button data-testid="button-confirm-adjust" onClick={handleAdjust} disabled={adjustInventory.isPending}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{book?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the book and all its loan history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteBook.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
