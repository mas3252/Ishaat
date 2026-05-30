import { Router, type IRouter } from "express";
import { eq, like, or, sql } from "drizzle-orm";
import { db, booksTable, loansTable } from "@workspace/db";
import {
  ListBooksQueryParams,
  CreateBookBody,
  GetBookParams,
  UpdateBookParams,
  UpdateBookBody,
  DeleteBookParams,
  AdjustInventoryParams,
  AdjustInventoryBody,
  LookupIsbnParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/books", async (req, res): Promise<void> => {
  const query = ListBooksQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let dbQuery = db.select().from(booksTable).$dynamic();

  if (query.data.search) {
    const term = `%${query.data.search}%`;
    dbQuery = dbQuery.where(
      or(like(booksTable.title, term), like(booksTable.author, term), like(booksTable.isbn, term))
    );
  }

  if (query.data.available === true) {
    dbQuery = dbQuery.where(sql`${booksTable.availableCopies} > 0`);
  }

  const books = await dbQuery.orderBy(booksTable.title);
  res.json(books);
});

router.post("/books", async (req, res): Promise<void> => {
  const parsed = CreateBookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { totalCopies = 1, ...rest } = parsed.data;
  const [book] = await db
    .insert(booksTable)
    .values({ ...rest, totalCopies, availableCopies: totalCopies })
    .returning();

  res.status(201).json(book);
});

router.get("/books/isbn/:isbn", async (req, res): Promise<void> => {
  const params = LookupIsbnParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const isbn = params.data.isbn.replace(/-/g, "");

  try {
    const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
    const data = await response.json() as Record<string, unknown>;
    const key = `ISBN:${isbn}`;
    const bookData = data[key] as Record<string, unknown> | undefined;

    if (!bookData) {
      res.status(404).json({ error: "ISBN not found" });
      return;
    }

    const authors = (bookData.authors as { name: string }[] | undefined) ?? [];
    const publishers = (bookData.publishers as { name: string }[] | undefined) ?? [];
    const publishDate = bookData.publish_date as string | undefined;
    const year = publishDate ? parseInt(publishDate.slice(-4), 10) : null;
    const coverData = bookData.cover as { medium?: string; large?: string } | undefined;
    const coverUrl = coverData?.large ?? coverData?.medium ?? null;
    const subjects = (bookData.subjects as { name: string }[] | undefined) ?? [];
    const genre = subjects.length > 0 ? subjects[0].name : null;

    res.json({
      isbn,
      title: bookData.title as string,
      author: authors.map((a) => a.name).join(", ") || "Unknown",
      publisher: publishers[0]?.name ?? null,
      coverImageUrl: coverUrl,
      description: (bookData.notes as string | undefined) ?? null,
      genre: genre ?? null,
      publishedYear: isNaN(year as number) ? null : year,
    });
  } catch {
    res.status(404).json({ error: "Could not lookup ISBN" });
  }
});

router.get("/books/:id", async (req, res): Promise<void> => {
  const params = GetBookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, params.data.id));
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  res.json(book);
});

router.patch("/books/:id", async (req, res): Promise<void> => {
  const params = UpdateBookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateBookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [book] = await db
    .update(booksTable)
    .set(parsed.data)
    .where(eq(booksTable.id, params.data.id))
    .returning();

  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  res.json(book);
});

router.delete("/books/:id", async (req, res): Promise<void> => {
  const params = DeleteBookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Delete loan history first to satisfy the foreign key constraint
  await db.delete(loansTable).where(eq(loansTable.bookId, params.data.id));

  const [book] = await db.delete(booksTable).where(eq(booksTable.id, params.data.id)).returning();
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/books/:id/inventory", async (req, res): Promise<void> => {
  const params = AdjustInventoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AdjustInventoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(booksTable).where(eq(booksTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  const { type, quantity } = parsed.data;
  const delta = type === "add" ? quantity : -quantity;
  const newTotal = existing.totalCopies + delta;
  const newAvailable = existing.availableCopies + delta;

  if (newTotal < 0 || newAvailable < 0) {
    res.status(400).json({ error: "Cannot reduce below 0 copies" });
    return;
  }

  const [book] = await db
    .update(booksTable)
    .set({ totalCopies: newTotal, availableCopies: newAvailable })
    .where(eq(booksTable.id, params.data.id))
    .returning();

  res.json(book);
});

export default router;
