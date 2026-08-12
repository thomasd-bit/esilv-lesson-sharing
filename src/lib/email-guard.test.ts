import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const emailGuardMigration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260812140000_guard_school_email_updates.sql"), "utf8");

describe("garde-fou du domaine scolaire", () => {
  it("réapplique la validation lors d’un changement d’adresse", () => {
    expect(emailGuardMigration).toContain("drop trigger if exists enforce_school_email_before_user_insert on auth.users");
    expect(emailGuardMigration).toContain("before insert or update of email on auth.users");
    expect(emailGuardMigration).toContain("public.enforce_school_email()");
  });
});
