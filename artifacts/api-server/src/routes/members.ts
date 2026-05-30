import { Router, type IRouter } from "express";
import { and, eq, like, or, sql } from "drizzle-orm";
import { db, membersTable, loansTable } from "@workspace/db";
import {
  ListMembersQueryParams,
  CreateMemberBody,
  GetMemberParams,
  UpdateMemberParams,
  UpdateMemberBody,
  DeleteMemberParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/members", async (req, res): Promise<void> => {
  const query = ListMembersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let dbQuery = db.select().from(membersTable).$dynamic();

  if (query.data.search) {
    const term = `%${query.data.search}%`;
    dbQuery = dbQuery.where(
      or(like(membersTable.name, term), like(membersTable.memberCode, term), like(membersTable.email ?? "", term))
    );
  }

  const members = await dbQuery.orderBy(membersTable.name);

  const activeLoanCounts = await db
    .select({ memberId: loansTable.memberId, count: sql<number>`count(*)::int` })
    .from(loansTable)
    .where(eq(loansTable.status, "active"))
    .groupBy(loansTable.memberId);

  const countMap = new Map(activeLoanCounts.map((r) => [r.memberId, r.count]));

  res.json(members.map((m) => ({ ...m, activeLoansCount: countMap.get(m.id) ?? 0 })));
});

router.post("/members", async (req, res): Promise<void> => {
  const parsed = CreateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [member] = await db.insert(membersTable).values(parsed.data).returning();
  res.status(201).json({ ...member, activeLoansCount: 0 });
});

router.get("/members/:id", async (req, res): Promise<void> => {
  const params = GetMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, params.data.id));
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const [loanCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loansTable)
    .where(and(eq(loansTable.memberId, member.id), eq(loansTable.status, "active")));

  res.json({ ...member, activeLoansCount: loanCount?.count ?? 0 });
});

router.patch("/members/:id", async (req, res): Promise<void> => {
  const params = UpdateMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [member] = await db
    .update(membersTable)
    .set(parsed.data)
    .where(eq(membersTable.id, params.data.id))
    .returning();

  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const [loanCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loansTable)
    .where(and(eq(loansTable.memberId, member.id), eq(loansTable.status, "active")));

  res.json({ ...member, activeLoansCount: loanCount?.count ?? 0 });
});

router.delete("/members/:id", async (req, res): Promise<void> => {
  const params = DeleteMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [member] = await db.delete(membersTable).where(eq(membersTable.id, params.data.id)).returning();
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
