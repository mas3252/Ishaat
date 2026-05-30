import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { booksTable } from "./books";
import { membersTable } from "./members";

export const loansTable = pgTable("loans", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull().references(() => booksTable.id),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  status: text("status").notNull().default("active"), // active | returned
  borrowedAt: timestamp("borrowed_at", { withTimezone: true }).notNull().defaultNow(),
  returnedAt: timestamp("returned_at", { withTimezone: true }),
});

export const insertLoanSchema = createInsertSchema(loansTable).omit({ id: true, borrowedAt: true, returnedAt: true, status: true });
export type InsertLoan = z.infer<typeof insertLoanSchema>;
export type Loan = typeof loansTable.$inferSelect;
