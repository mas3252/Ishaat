import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, loansTable, booksTable, membersTable } from "@workspace/db";
import {
  ListLoansQueryParams,
  CreateLoanBody,
  ReturnLoanParams,
} from "@workspace/api-zod";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

async function getLoanWithRelations(id: number) {
  const [loan] = await db.select().from(loansTable).where(eq(loansTable.id, id));
  if (!loan) return null;
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, loan.bookId));
  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, loan.memberId));
  const [loanCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loansTable)
    .where(and(eq(loansTable.memberId, loan.memberId), eq(loansTable.status, "active")));
  return {
    ...loan,
    book: book ? { ...book } : undefined,
    member: member ? { ...member, activeLoansCount: loanCount?.count ?? 0 } : undefined,
  };
}

router.get("/loans", async (req, res): Promise<void> => {
  const query = ListLoansQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.memberId) conditions.push(eq(loansTable.memberId, query.data.memberId));
  if (query.data.bookId) conditions.push(eq(loansTable.bookId, query.data.bookId));
  if (query.data.status) conditions.push(eq(loansTable.status, query.data.status));

  const loans = await db
    .select()
    .from(loansTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(loansTable.borrowedAt));

  const bookIds = [...new Set(loans.map((l) => l.bookId))];
  const memberIds = [...new Set(loans.map((l) => l.memberId))];

  const books =
    bookIds.length > 0
      ? await db.select().from(booksTable).where(sql`${booksTable.id} = ANY(${sql.raw(`ARRAY[${bookIds.join(",")}]`)})`)
      : [];
  const members =
    memberIds.length > 0
      ? await db.select().from(membersTable).where(sql`${membersTable.id} = ANY(${sql.raw(`ARRAY[${memberIds.join(",")}]`)})`)
      : [];

  const activeLoanCounts = await db
    .select({ memberId: loansTable.memberId, count: sql<number>`count(*)::int` })
    .from(loansTable)
    .where(eq(loansTable.status, "active"))
    .groupBy(loansTable.memberId);
  const countMap = new Map(activeLoanCounts.map((r) => [r.memberId, r.count]));

  const bookMap = new Map(books.map((b) => [b.id, b]));
  const memberMap = new Map(members.map((m) => [m.id, m]));

  res.json(
    loans.map((l) => ({
      ...l,
      book: bookMap.get(l.bookId),
      member: memberMap.get(l.memberId)
        ? { ...memberMap.get(l.memberId)!, activeLoansCount: countMap.get(l.memberId) ?? 0 }
        : undefined,
    }))
  );
});

router.post("/loans", async (req, res): Promise<void> => {
  const parsed = CreateLoanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, parsed.data.bookId));
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  if (book.availableCopies <= 0) {
    res.status(400).json({ error: "No copies available for borrowing" });
    return;
  }

  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, parsed.data.memberId));
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const [loan] = await db.insert(loansTable).values(parsed.data).returning();

  await db
    .update(booksTable)
    .set({ availableCopies: book.availableCopies - 1 })
    .where(eq(booksTable.id, book.id));

  const fullLoan = await getLoanWithRelations(loan.id);
  res.status(201).json(fullLoan);
});

router.patch("/loans/:id/return", async (req, res): Promise<void> => {
  const params = ReturnLoanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(loansTable).where(eq(loansTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }
  if (existing.status === "returned") {
    res.status(400).json({ error: "Loan already returned" });
    return;
  }

  await db
    .update(loansTable)
    .set({ status: "returned", returnedAt: new Date() })
    .where(eq(loansTable.id, params.data.id));

  await db
    .update(booksTable)
    .set({ availableCopies: sql`${booksTable.availableCopies} + 1` })
    .where(eq(booksTable.id, existing.bookId));

  const fullLoan = await getLoanWithRelations(params.data.id);
  res.json(fullLoan);
});

export default router;
