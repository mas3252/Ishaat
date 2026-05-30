import { useState } from "react";
import { useListBooks, useDeleteBook, getListBooksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, MoreVertical, BookOpen, Trash2, Eye, BookX } from "lucide-react";

export default function Books() {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: books, isLoading } = useListBooks({ search: search || undefined });
  const deleteBook = useDeleteBook();

  function handleDelete() {
    if (!deleteId) return;
    deleteBook.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() });
        toast({ title: "Book removed from catalog" });
        setDeleteId(null);
      },
      onError: () => {
        toast({ title: "Failed to delete book", variant: "destructive" });
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catalog</h1>
          <p className="text-muted-foreground mt-1">Your complete book collection.</p>
        </div>
        <Button asChild data-testid="button-add-book">
          <Link href="/books/new"><Plus className="h-4 w-4 mr-2" />Add Book</Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          data-testid="input-search-books"
          placeholder="Search by title, author, or ISBN..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[2/3] w-full rounded-md" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      ) : !books?.length ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <BookX className="h-10 w-10 mx-auto mb-4 opacity-40" />
            <p className="font-medium text-base">
              {search ? "No books match your search" : "No books in catalog yet"}
            </p>
            <p className="text-sm mt-1">
              {search ? "Try a different search term." : "Add your first book to get started."}
            </p>
            {!search && (
              <Button asChild className="mt-4">
                <Link href="/books/new"><Plus className="h-4 w-4 mr-2" />Add Book</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {books.map((book) => (
            <div key={book.id} data-testid={`card-book-${book.id}`} className="group relative flex flex-col">
              <Link href={`/books/${book.id}`} className="block">
                <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-muted shadow-sm group-hover:shadow-md transition-shadow">
                  {book.coverImageUrl ? (
                    <img
                      src={book.coverImageUrl}
                      alt={book.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="h-full w-full flex items-center justify-center bg-muted"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></div>`;
                      }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <BookOpen className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1">
                    <Badge
                      variant={book.availableCopies > 0 ? "default" : "destructive"}
                      className="text-xs px-1.5 py-0"
                    >
                      {book.availableCopies > 0 ? `${book.availableCopies} avail.` : "Out"}
                    </Badge>
                  </div>
                </div>
              </Link>

              <div className="mt-2 flex-1 flex flex-col min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <Link href={`/books/${book.id}`} className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight line-clamp-2 hover:text-primary transition-colors">
                      {book.title}
                    </p>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 -mr-1" data-testid={`button-menu-book-${book.id}`}>
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/books/${book.id}`}><Eye className="h-4 w-4 mr-2" />View detail</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteId(book.id)}
                        data-testid={`button-delete-book-${book.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{book.author}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove book from catalog?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the book and all its loan history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
