import { ApiError } from "@/lib/errors";
import { db } from "@/lib/db";
import { orders } from "@paper-market/core/db";
import { eq, and, inArray } from "drizzle-orm";

export type OrderStatus = typeof orders.$inferSelect["status"];

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["OPEN"],
  OPEN: ["PROCESSING", "CANCELLED", "REJECTED"],
  PROCESSING: ["FILLED", "OPEN"],
  FILLED: [],
  CANCELLED: [],
  REJECTED: [],
};

export class OrderStateMachineService {
  static canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
  }

  static assertTransition(from: OrderStatus, to: OrderStatus, context?: string): void {
    if (this.canTransition(from, to)) return;
    const detail = context ? ` (${context})` : "";
    throw new ApiError(
      `Invalid order status transition: ${from} → ${to}${detail}`,
      400,
      "INVALID_STATE_TRANSITION"
    );
  }

  static async transition(
    orderId: string,
    from: OrderStatus,
    to: OrderStatus,
    tx?: any,
    extra: Partial<typeof orders.$inferSelect> = {}
  ): Promise<typeof orders.$inferSelect> {
    this.assertTransition(from, to, "OrderStateMachine.transition");
    const dbClient = tx || db;
    const result = await dbClient
      .update(orders)
      .set({ ...extra, status: to, updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.status, from)))
      .returning();

    if (result.length === 0) {
      throw new ApiError(
        `Transition failed: Order ${orderId} not found or not in state ${from}`,
        400,
        "TRANSITION_FAILED"
      );
    }
    return result[0];
  }

  static async batchTransition(
    selection: any,
    from: OrderStatus,
    to: OrderStatus,
    tx?: any,
    extra: Partial<typeof orders.$inferSelect> = {}
  ): Promise<any[]> {
    this.assertTransition(from, to, "OrderStateMachine.batchTransition");
    const dbClient = tx || db;
    
    // selection can be subquery or array
    const query = dbClient
      .update(orders)
      .set({ ...extra, status: to, updatedAt: new Date() })
      .where(and(
        selection instanceof Array ? inArray(orders.id, selection) : inArray(orders.id, selection),
        eq(orders.status, from)
      ))
      .returning();
      
    return await query;
  }
}
