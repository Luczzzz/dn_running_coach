import type { ManualEvent, UserProfile } from "../domain/types.js";
import { ManualEventSchema, UserProfileSchema } from "../domain/types.js";
import type { AppDatabase } from "./db.js";

type DataRow = { data: string };

export function createRepositories(db: AppDatabase) {
  return {
    profile: {
      save(profile: UserProfile) {
        const parsed = UserProfileSchema.parse(profile);
        db.prepare(
          `INSERT INTO profiles (id, data, updated_at)
           VALUES (?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
        ).run(parsed.id, JSON.stringify(parsed), parsed.updatedAt);
      },
      get(id: string): UserProfile | undefined {
        const row = db.prepare("SELECT data FROM profiles WHERE id = ?").get(id) as DataRow | undefined;
        return row ? UserProfileSchema.parse(JSON.parse(row.data)) : undefined;
      }
    },
    events: {
      addManual(event: ManualEvent) {
        const parsed = ManualEventSchema.parse(event);
        db.prepare("INSERT INTO manual_events (occurred_at, type, data) VALUES (?, ?, ?)").run(
          parsed.occurredAt,
          parsed.type,
          JSON.stringify(parsed)
        );
      },
      listManualSince(isoDate: string): ManualEvent[] {
        const rows = db
          .prepare("SELECT data FROM manual_events WHERE occurred_at >= ? ORDER BY occurred_at ASC")
          .all(isoDate) as DataRow[];
        return rows.map((row) => ManualEventSchema.parse(JSON.parse(row.data)));
      }
    },
    summaries: {
      save(scope: "daily" | "weekly" | "monthly" | "cycle", periodStart: string, periodEnd: string, content: string) {
        db.prepare(
          `INSERT INTO summaries (scope, period_start, period_end, content, created_at)
           VALUES (?, ?, ?, ?, ?)`
        ).run(scope, periodStart, periodEnd, content, new Date().toISOString());
      }
    }
  };
}
