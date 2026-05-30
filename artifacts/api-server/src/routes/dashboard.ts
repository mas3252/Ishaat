import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, booksTable, membersTable, loansTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard", async (_req, res): Promise<void> => {
  const [bookStats] = await db
    .select({
      totalBooks: sql<number>`count(*)::int`,
      totalCopies: sql<number>`sum(${booksTable.totalCopies})::int`,
      availableCopies: sql<number>`sum(${booksTable.availableCopies})::int`,
    })
    .from(booksTable);

  const [memberStats] = await db
    .select({ totalMembers: sql<number>`count(*)::int` })
    .from(membersTable);

  const [loanStats] = await db
    .select({ activeLoans: sql<number>`count(*)::int` })
    .from(loansTable)
    .where(eq(loansTable.status, "active"));

  const recentLoans = await db
    .select()
    .from(loansTable)
    .orderBy(desc(loansTable.borrowedAt))
    .limit(10);

  const bookIds = [...new Set(recentLoans.map((l) => l.bookId))];
  const memberIds = [...new Set(recentLoans.map((l) => l.memberId))];

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

  const totalCopies = bookStats?.totalCopies ?? 0;
  const availableCopies = bookStats?.availableCopies ?? 0;

  res.json({
    totalBooks: bookStats?.totalBooks ?? 0,
    totalCopies,
    availableCopies,
    borrowedCopies: totalCopies - availableCopies,
    totalMembers: memberStats?.totalMembers ?? 0,
    activeLoans: loanStats?.activeLoans ?? 0,
    recentLoans: recentLoans.map((l) => ({
      ...l,
      book: bookMap.get(l.bookId),
      member: memberMap.get(l.memberId)
        ? { ...memberMap.get(l.memberId)!, activeLoansCount: countMap.get(l.memberId) ?? 0 }
        : undefined,
    })),
  });
});

export default router;
