// Browser -> Vite proxy -> real NestJS -> isolated PostgreSQL. No external providers.
const { createRequire } = require("node:module");
const { resolve } = require("node:path");
const { readFileSync } = require("node:fs");
const { parseEnv } = require("node:util");
const { randomUUID, randomInt, createHash } = require("node:crypto");
const assert = require("node:assert/strict");
const backendRequire = createRequire(
  resolve(__dirname, "../../backend/package.json"),
);
const { createMigrationDataSource } = backendRequire(
  "./dist/infrastructure/database/data-source.js",
);
const { PasswordHasher } = backendRequire(
  "./dist/access/infrastructure/password-hasher.js",
);
const { createApplication } = backendRequire("./dist/main.js");
const { chromium } = require("@playwright/test");

async function main() {
  const raw = parseEnv(
    readFileSync(resolve(__dirname, "../../backend/.env.test"), "utf8"),
  );
  if (
    raw.APP_ENV !== "test" ||
    raw.DB_NAME !== "techbus_test" ||
    raw.DB_HOST !== "127.0.0.1" ||
    raw.DB_PORT !== "55433"
  )
    throw new Error("ISOLATED_TEST_DATABASE_REQUIRED");
  Object.assign(raw, {
    EVOLUTION_ENABLED: "false",
    EVOLUTION_PROCESS_ENABLED: "false",
    EVOLUTION_SEND_ENABLED: "false",
    GEMINI_ENABLED: "false",
  });
  const source = createMigrationDataSource(raw);
  const id = randomUUID(),
    email = `${id}@example.test`,
    password = randomUUID() + "-test";
  const phone = `+55469${randomInt(10000000, 99999999)}`;
  let app, vite, browser, studentId, groupId, fixedPointId;
  const created = [],
    pageErrors = [];
  try {
    await source.initialize();
    await source.transaction(async (m) => {
      await m.query(
        "INSERT INTO app.team_users(id,subject,role,active) VALUES($1,$1,'admin',true)",
        [id],
      );
      await m.query(
        "INSERT INTO app.auth_credentials VALUES($1,$2,$3,false,NULL,1,now())",
        [id, email, await new PasswordHasher().hash(password)],
      );
    });
    app = await createApplication(raw);
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address();
    const { createServer } = await import("vite");
    vite = await createServer({
      configFile: resolve(__dirname, "../vite.config.ts"),
      root: resolve(__dirname, ".."),
      server: {
        port: 5176,
        strictPort: true,
        host: "127.0.0.1",
        proxy: { "/api": { target: `http://127.0.0.1:${address.port}` } },
      },
    });
    await vite.listen();
    browser = await chromium.launch({ channel: "msedge", headless: true });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 960 },
    });
    page.on("pageerror", (e) => pageErrors.push(e.message));
    await page.goto("http://127.0.0.1:5176");
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.getByRole("heading", { name: "Operação do dia" }).waitFor();
    await page.getByRole("button", { name: "Alunos", exact: true }).click();
    await page.getByRole("button", { name: "Novo aluno" }).click();
    await page.getByLabel("Nome completo").fill("Pessoa sintética do painel");
    await page.getByLabel("WhatsApp").fill(phone);
    await page.getByLabel("Início da vigência").fill("2026-11-01");
    await page.getByLabel("Fim da vigência").fill("2026-12-01");
    const creation = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/v1/students") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Salvar aluno" }).click();
    const response = await creation;
    assert.equal(response.status(), 201);
    studentId = (await response.json()).student.id;
    await page
      .getByRole("cell", { name: "Pessoa sintética do painel", exact: true })
      .waitFor();
    const [saved] = await source.query(
      "SELECT habitual_days,name FROM app.students WHERE id=$1",
      [studentId],
    );
    assert.deepEqual(saved.habitual_days, []);
    assert.equal(saved.name, "Pessoa sintética do painel");
    created.push("student-through-browser");
    await page
      .getByRole("button", { name: "Grupos e locais", exact: true })
      .click();
    await page.getByRole("button", { name: "Novo cadastro" }).click();
    await page
      .getByLabel("Nome", { exact: true })
      .fill("Distribuição sintética " + id);
    await page.getByLabel("Sentido").selectOption("dropoff");
    const groupResponse = page.waitForResponse(
      (r) => r.url().endsWith("/groups") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Salvar cadastro" }).click();
    const gr = await groupResponse;
    assert.equal(gr.status(), 201);
    groupId = (await gr.json()).id;
    await page
      .getByRole("button", { name: "Pontos de desembarque", exact: true })
      .click();
    await page.getByRole("button", { name: "Novo cadastro" }).click();
    await page.getByLabel("Nome", { exact: true }).fill("Praça sintética");
    await page
      .getByLabel("Endereço do ponto")
      .fill("Referência sintética, sem mapas");
    await page.getByLabel("Grupo", { exact: true }).selectOption(groupId);
    const pointResponse = page.waitForResponse(
      (r) =>
        r.url().endsWith("/dropoff-points") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Salvar cadastro" }).click();
    const pr = await pointResponse;
    assert.equal(pr.status(), 201);
    fixedPointId = (await pr.json()).id;
    await page.getByRole("button", { name: "Alunos", exact: true }).click();
    await page
      .getByRole("row")
      .filter({ hasText: phone })
      .getByRole("button", { name: "Vigência e locais" })
      .click();
    const field = page.getByLabel("Ponto de desembarque", { exact: true });
    await field.selectOption(fixedPointId);
    const section = field.locator("xpath=ancestor::section[1]");
    await section
      .getByLabel("Registro do pedido")
      .fill("Cadastro inicial sintético");
    const defaultResponse = page.waitForResponse(
      (r) =>
        r.url().endsWith("/location-defaults/dropoff") &&
        r.request().method() === "PUT",
    );
    await section.getByRole("button", { name: "Salvar padrão" }).click();
    assert.equal((await defaultResponse).status(), 200);
    const [standard] = await source.query(
      "SELECT return_location_id FROM app.student_place_defaults WHERE student_id=$1 AND direction='dropoff'",
      [studentId],
    );
    assert.equal(standard.return_location_id, fixedPointId);
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Ponto de desembarque", { exact: true }).waitFor();
    assert.equal(
      await page
        .getByLabel("Ponto de desembarque", { exact: true })
        .inputValue(),
      fixedPointId,
    );
    await page.screenshot({
      path: resolve(__dirname, "../../.local/frontend-fixed-dropoff.png"),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await page.screenshot({
      path: resolve(__dirname, "../../.local/frontend-real-students.png"),
      fullPage: true,
    });
    // Exercise all read-only screens against actual response shapes.
    for (const name of [
      "Calendários",
      "Grupos e locais",
      "Frota e motoristas",
      "Planejamento",
      "Itinerários",
      "Mensagens",
    ]) {
      const reads = [];
      const handler = (r) => {
        if (r.url().includes("/api/v1/")) reads.push(r);
      };
      page.on("response", handler);
      const firstRead = page.waitForResponse((r) =>
        r.url().includes("/api/v1/"),
      );
      await page.getByRole("button", { name, exact: true }).click();
      await firstRead;
      await page.waitForLoadState("networkidle");
      page.off("response", handler);
      assert.ok(reads.length > 0, `No API requests for ${name}`);
      assert.ok(
        reads.every((r) => r.status() === 200),
        `API error on ${name}`,
      );
      assert.equal(await page.getByRole("alert").count(), 0);
    }
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await page.getByRole("button", { name: "Entrar", exact: true }).waitFor();
    assert.deepEqual(pageErrors, []);
    console.log(
      JSON.stringify({
        passed: true,
        checks: [
          "real-login",
          "student-create",
          "zero-habitual-days",
          "fixed-dropoff-create-and-default",
          "read-screens",
          "real-logout",
          "no-browser-errors",
        ],
        providers: "disabled",
      }),
    );
  } finally {
    await browser?.close();
    await vite?.close();
    await app?.close();
    if (source.isInitialized) {
      // Only this run's unique synthetic rows; preserve all other test data.
      await source.transaction(async (m) => {
        await m.query(
          "DELETE FROM app.student_place_defaults WHERE student_id IN (SELECT id FROM app.students WHERE phone=$1)",
          [phone],
        );
        if (fixedPointId)
          await m.query("DELETE FROM app.return_locations WHERE id=$1", [
            fixedPointId,
          ]);
        if (groupId)
          await m.query("DELETE FROM app.local_groups WHERE id=$1", [groupId]);
        await m.query(
          "DELETE FROM app.contracts WHERE student_id IN (SELECT id FROM app.students WHERE phone=$1)",
          [phone],
        );
        await m.query("DELETE FROM app.students WHERE phone=$1", [phone]);
        await m.query(
          "DELETE FROM app.auth_events WHERE actor_id=$1 OR target_id=$1",
          [id],
        );
        await m.query("DELETE FROM app.auth_sessions WHERE user_id=$1", [id]);
        await m.query("DELETE FROM app.auth_credentials WHERE user_id=$1", [
          id,
        ]);
        await m.query("DELETE FROM app.team_users WHERE id=$1", [id]);
        await m.query(
          "DELETE FROM app.auth_attempt_windows WHERE key_hash=$1",
          [createHash("sha256").update(email).digest("hex")],
        );
      });
      await source.destroy();
    }
  }
}
main().catch((e) => {
  console.error("PANEL_SMOKE_FAILED", e.code ?? e.name, e.stack);
  process.exitCode = 1;
});
