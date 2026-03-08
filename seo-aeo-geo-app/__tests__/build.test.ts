import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Build verification", () => {
  it("TypeScript compiles without errors", () => {
    let output = "";
    try {
      output = execSync("npx tsc --noEmit 2>&1", {
        cwd: ROOT,
        encoding: "utf-8",
        timeout: 120000,
      });
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string };
      output = (e.stdout || "") + (e.stderr || "");
    }
    // Filter to only real TS errors (ignore vitest config which isn't part of the app)
    const errors = output
      .split("\n")
      .filter((line: string) => line.includes("error TS"))
      .filter((line: string) => !line.includes("vitest.config"));
    expect(errors).toEqual([]);
  }, 120000);

  it("all critical files exist", () => {
    const criticalFiles = [
      "app/page.tsx",
      "app/layout.tsx",
      "app/audits/new/page.tsx",
      "app/audits/[id]/page.tsx",
      "app/audits/[id]/report/page.tsx",
      "app/api/jobs/route.ts",
      "app/api/jobs/[id]/route.ts",
      "app/api/jobs/[id]/download/route.ts",
      "app/api/pipeline/run/route.ts",
      "app/api/parse-upload/route.ts",
      "app/api/autopopulate/route.ts",
      "app/api/clients/route.ts",
      "app/api/clients/[id]/route.ts",
      "lib/claude.ts",
      "lib/supabase.ts",
      "lib/utils.ts",
      "lib/agents/pipeline.ts",
      "lib/agents/prompts.ts",
      "lib/agents/schemas.ts",
      "lib/reports/docx-generator.ts",
      "lib/reports/markdown-generator.ts",
      "lib/reports/schema-packager.ts",
      "lib/reports/roadmap-csv.ts",
      "lib/utils/scoring.ts",
      "lib/utils/validators.ts",
      "components/navigation.tsx",
      "supabase/migrations/001_initial_schema.sql",
      "supabase/migrations/002_audit_logs.sql",
      "supabase/migrations/003_formatted_report.sql",
    ];

    const missing: string[] = [];
    for (const file of criticalFiles) {
      const fullPath = path.join(ROOT, file);
      if (!existsSync(fullPath)) {
        missing.push(file);
      }
    }
    expect(missing).toEqual([]);
  });

  it("all API routes export dynamic = force-dynamic", () => {
    const apiRoutes = [
      "app/api/jobs/route.ts",
      "app/api/jobs/[id]/route.ts",
      "app/api/jobs/[id]/download/route.ts",
      "app/api/parse-upload/route.ts",
      "app/api/autopopulate/route.ts",
      "app/api/clients/route.ts",
      "app/api/clients/[id]/route.ts",
    ];

    const { readFileSync } = require("fs");
    const missingDynamic: string[] = [];
    for (const route of apiRoutes) {
      const content = readFileSync(path.join(ROOT, route), "utf-8");
      if (!content.includes('dynamic = "force-dynamic"') && !content.includes("dynamic = 'force-dynamic'")) {
        missingDynamic.push(route);
      }
    }
    expect(missingDynamic).toEqual([]);
  });

  it("no API routes use Sonnet model directly (should use constants)", () => {
    // The autopopulate and parse-upload routes use haiku directly which is fine
    // But pipeline agents should use MODEL_DEEP/MODEL_BATCH constants
    const { readFileSync } = require("fs");
    const pipelineContent = readFileSync(path.join(ROOT, "lib/agents/pipeline.ts"), "utf-8");

    // Count direct model string references (excluding the constant definitions)
    const lines = pipelineContent.split("\n");
    const directModelUses = lines.filter(
      (line: string) =>
        line.includes('"claude-') &&
        !line.includes("const MODEL_DEEP") &&
        !line.includes("const MODEL_BATCH") &&
        !line.startsWith("//")
    );
    expect(directModelUses).toEqual([]);
  });

  it("package.json has all required dependencies", () => {
    const pkg = require(path.join(ROOT, "package.json"));
    const required = [
      "next",
      "react",
      "react-dom",
      "@supabase/supabase-js",
      "docx",
      "jszip",
      "papaparse",
      "zod",
    ];
    for (const dep of required) {
      expect(pkg.dependencies[dep] || pkg.devDependencies?.[dep]).toBeDefined();
    }
  });
});
