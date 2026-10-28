import { z } from "zod";
import { ACTION_PRIORITIES, ACTION_STATUSES } from "./actions";

const dueDate = z.iso.date().nullable().optional();
const assignee = z.string().uuid().nullable().optional();

export const createActionSchema = z.strictObject({
  assessment_item_id: z.string().uuid(),
  priority: z.enum(ACTION_PRIORITIES).default("medium"),
  assigned_to: assignee,
  due_date: dueDate,
  notes: z.string().max(4000).default(""),
});

export const updateActionSchema = z.strictObject({
  status: z.enum(ACTION_STATUSES).optional(),
  priority: z.enum(ACTION_PRIORITIES).optional(),
  assigned_to: assignee,
  due_date: dueDate,
  notes: z.string().max(4000).optional(),
}).refine((value) => Object.keys(value).length > 0, { message: "At least one change is required" });
