import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateBook, useLookupIsbn, getListBooksQueryKey, getLookupIsbnQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Search, BookOpen, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";

const formSchema = z.object({
  isbn: z.string().min(1, "ISBN is required"),
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  publisher: z.string().optional(),
  genre: z.string().optional(),
  publishedYear: z.coerce.number().int().min(1000).max(2100).optional().or(z.literal("")),
  description: z.string().optional(),
  coverImageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  totalCopies: z.coerce.number().int().min(1, "Must have at least 1 copy").default(1),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewBook() {
  const [isbnInput, setIsbnInput] = useState("");
  const [lookupIsbn, setLookupIsbn] = useState("");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isbn: "",
      title: "",
      author: "",
      publisher: "",
      genre: "",
      description: "",
      coverImageUrl: "",
      totalCopies: 1,
    },
  });

  const { data: lookupResult, isLoading: isLookingUp, isError: lookupError } = useLookupIsbn(
    lookupIsbn,
    { query: { enabled: !!lookupIsbn, queryKey: getLookupIsbnQueryKey(lookupIsbn) } }
  );

  const createBook = useCreateBook();

  const currentCover = form.watch("coverImageUrl");

  if (lookupResult && lookupIsbn) {
    const currentIsbn = form.getValues("isbn");
    if (currentIsbn !== lookupResult.isbn) {
      form.setValue("isbn", lookupResult.isbn);
      form.setValue("title", lookupResult.title);
      form.setValue("author", lookupResult.author);
      if (lookupResult.publisher) form.setValue("publisher", lookupResult.publisher);
      if (lookupResult.coverImageUrl) form.setValue("coverImageUrl", lookupResult.coverImageUrl);
      if (lookupResult.description) form.setValue("description", lookupResult.description);
      if (lookupResult.genre) form.setValue("genre", lookupResult.genre);
      if (lookupResult.publishedYear) form.setValue("publishedYear", lookupResult.publishedYear);
    }
  }

  function handleLookup() {
    const cleaned = isbnInput.replace(/-/g, "");
    if (!cleaned) return;
    setLookupIsbn(cleaned);
    queryClient.invalidateQueries({ queryKey: getLookupIsbnQueryKey(cleaned) });
  }

  function onSubmit(values: FormValues) {
    const { publishedYear, coverImageUrl, ...rest } = values;
    createBook.mutate({
      data: {
        ...rest,
        ...(publishedYear ? { publishedYear: Number(publishedYear) } : {}),
        ...(coverImageUrl && coverImageUrl !== "" ? { coverImageUrl } : {}),
      }
    }, {
      onSuccess: (book) => {
        queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() });
        toast({ title: `"${book.title}" added to catalog` });
        setLocation(`/books/${book.id}`);
      },
      onError: () => {
        toast({ title: "Failed to add book", variant: "destructive" });
      },
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/books"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Book</h1>
          <p className="text-muted-foreground mt-0.5">Look up by ISBN or enter details manually.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ISBN Lookup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              data-testid="input-isbn-lookup"
              placeholder="Enter ISBN (e.g. 9780743273565)"
              value={isbnInput}
              onChange={(e) => setIsbnInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              className="font-mono"
            />
            <Button
              data-testid="button-lookup-isbn"
              onClick={handleLookup}
              disabled={isLookingUp || !isbnInput}
            >
              {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2">{isLookingUp ? "Looking up..." : "Lookup"}</span>
            </Button>
          </div>
          {lookupError && lookupIsbn && !isLookingUp && (
            <p className="text-sm text-destructive mt-2">ISBN not found. Please enter details manually below.</p>
          )}
          {lookupResult && !isLookingUp && (
            <p className="text-sm text-primary mt-2">Book found — form filled in below.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-6">
        <div className="shrink-0">
          {isLookingUp ? (
            <Skeleton className="w-28 h-44 rounded-md" />
          ) : currentCover ? (
            <img
              src={currentCover}
              alt="Book cover"
              className="w-28 h-44 object-cover rounded-md shadow-md"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-28 h-44 bg-muted rounded-md flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isbn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ISBN</FormLabel>
                    <FormControl>
                      <Input data-testid="input-isbn" placeholder="ISBN-13" {...field} className="font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalCopies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Copies</FormLabel>
                    <FormControl>
                      <Input data-testid="input-total-copies" type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input data-testid="input-title" placeholder="Book title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="author"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Author</FormLabel>
                  <FormControl>
                    <Input data-testid="input-author" placeholder="Author name(s)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="publisher"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Publisher</FormLabel>
                    <FormControl>
                      <Input data-testid="input-publisher" placeholder="Publisher" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="publishedYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year Published</FormLabel>
                    <FormControl>
                      <Input data-testid="input-published-year" type="number" placeholder="Year" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="genre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Genre</FormLabel>
                    <FormControl>
                      <Input data-testid="input-genre" placeholder="e.g. Fiction, Biography" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="coverImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Image URL</FormLabel>
                    <FormControl>
                      <Input data-testid="input-cover-url" placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button data-testid="button-submit-book" type="submit" disabled={createBook.isPending}>
                {createBook.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add to Catalog
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
