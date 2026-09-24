// The single entry point for the frontend, backend, and optional local PostgreSQL.
import { config } from "dotenv";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

config({ path: [".env.local", ".env"], quiet: true });
const require = createRequire(import.meta.url);
const production = process.argv.includes("--production");

async function start() {
  if (process.env.PGDATA && process.env.PGBIN) {
    const pgctl = path.join(
      process.env.PGBIN,
      process.platform === "win32" ? "pg_ctl.exe" : "pg_ctl",
    );
    const status = spawnSync(pgctl, ["-D", process.env.PGDATA, "status"], {
      stdio: "ignore",
      windowsHide: true,
    });
    if (status.status !== 0) {
      console.log("Starting local PostgreSQL…");
      const result = spawnSync(
        pgctl,
        [
          "-D",
          process.env.PGDATA,
          "-l",
          path.resolve(".local-postgres.log"),
          "-o",
          `-p ${process.env.PGPORT || "55432"} -h 127.0.0.1`,
          "-w",
          "-t",
          "60",
          "start",
        ],
        { stdio: "inherit", windowsHide: true },
      );
      if (result.status !== 0)
        throw new Error(
          "Could not start PostgreSQL. Check .local-postgres.log and PGDATA/PGBIN.",
        );
    }
  }
  const { initializeDatabase, pool, schemaName } = await import("./lib/db.ts");
  try {
    await initializeDatabase();
    console.log(`PostgreSQL ready. Inventory schema: ${schemaName()}.`);
  } finally {
    await pool().end();
  }
  const port = process.env.PORT || "3000";
  const child = spawn(
    process.execPath,
    [
      require.resolve("next/dist/bin/next"),
      production ? "start" : "dev",
      "--port",
      port,
    ],
    { stdio: "inherit", windowsHide: true },
  );
  child.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  child.on("exit", (code) => {
    process.exitCode = code ?? 0;
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.on(signal, () => child.kill(signal));
}

start().catch((error) => {
  console.error("Startup failed:", error.code || error.message);
  console.error(
    "Check the PostgreSQL connection in .env.local. Your existing data has not been reset.",
  );
  process.exitCode = 1;
});
