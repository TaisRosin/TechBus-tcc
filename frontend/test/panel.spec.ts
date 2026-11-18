import { test, expect, type Page } from "@playwright/test";

const student = {
  id: "12345678-1234-1234-1234-123456789012",
  name: "Aluna de teste",
  phone: "+5549999999999",
  universityId: "unimater",
  habitualDays: [1, 2],
  version: 1,
  active: true,
};

test("endereço antigo permanece até detalhamento explícito", async ({
  page,
}) => {
  await mock(page);
  const point = {
    id: "legacy",
    name: "Praça",
    address: "Ao lado da igreja",
    legacyAddress: "Ao lado da igreja",
    groupId: "g",
    active: true,
    version: 3,
  };
  await page.route("**/api/v1/groups?*", (r) =>
    r.fulfill({
      json: [{ id: "g", name: "Centro", direction: "pickup", active: true }],
    }),
  );
  await page.route("**/api/v1/boarding-points?*", (r) =>
    r.fulfill({ json: [point] }),
  );
  await page.route("**/api/v1/boarding-points/legacy", (r) =>
    r.fulfill({ json: point }),
  );
  await login(page);
  await page
    .getByRole("button", { name: "Grupos e locais", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pontos de embarque", exact: true })
    .click();
  await page.getByRole("button", { name: "Editar Praça" }).click();
  await expect(
    page.getByLabel("Endereço do ponto", { exact: true }),
  ).toHaveValue(point.address);
  await expect(page.getByLabel("Rua / logradouro ou localização")).toHaveCount(
    0,
  );
  await page.getByLabel("Preencher endereço detalhado").check();
  await expect(
    page.getByText("Endereço antigo preservado: Ao lado da igreja"),
  ).toBeVisible();
  await page
    .getByLabel("Rua / logradouro ou localização")
    .fill("Rua das Flores");
  await page.getByLabel("Número", { exact: true }).fill("12A");
  await page.getByLabel("Cidade", { exact: true }).fill("Pato Branco");
  await page.getByLabel("Estado (UF)").selectOption("PR");
  await page.getByLabel("CEP (opcional)").fill("85500-000");
  await page
    .getByLabel("Referência para o motorista (opcional)")
    .fill("Portão lateral");
  await page.screenshot({
    path: "../output/025-address-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Salvar cadastro" }),
  ).toBeVisible();
  await page.screenshot({
    path: "../output/025-address-mobile.png",
    fullPage: true,
  });
  const save = page.waitForRequest(
    (r) =>
      r.method() === "PATCH" && r.url().endsWith("/boarding-points/legacy"),
  );
  await page.getByRole("button", { name: "Salvar cadastro" }).click();
  expect((await save).postDataJSON()).toMatchObject({
    expectedVersion: 3,
    stopReference: "Portão lateral",
    addressDetails: {
      number: "12A",
      noNumber: false,
      postalCode: "85500-000",
      state: "PR",
    },
  });
});

test("ponto fixo de desembarque é cadastrado no grupo da volta e selecionado como padrão", async ({
  page,
}) => {
  await mock(page);
  const point = {
    id: "fixed-stop",
    name: "Praça central",
    address: "Rua central",
    groupId: "return-group",
    active: true,
    version: 1,
  };
  await page.route("**/api/v1/groups?*", (r) =>
    r.fulfill({
      json: [
        {
          id: "return-group",
          name: "Volta centro",
          direction: "dropoff",
          active: true,
        },
        {
          id: "pickup-group",
          name: "Coleta centro",
          direction: "pickup",
          active: true,
        },
      ],
    }),
  );
  await page.route("**/api/v1/dropoff-points?*", (r) =>
    r.fulfill({ json: [point] }),
  );
  await page.route("**/api/v1/students/*/location-defaults", (r) =>
    r.fulfill({
      json: {
        pickup: { value: null, usable: false },
        dropoff: { value: null, usable: false },
      },
    }),
  );
  await login(page);
  await page
    .getByRole("button", { name: "Grupos e locais", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pontos de desembarque", exact: true })
    .click();
  await page.getByRole("button", { name: "Novo cadastro" }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Praça central");
  await page.getByLabel("Rua / logradouro ou localização").fill("Rua central");
  await page.getByLabel("Sem número").check();
  await page
    .getByLabel("Cidade", { exact: true })
    .fill("São Lourenço do Oeste");
  await page.getByLabel("Estado (UF)").selectOption("SC");
  await page
    .getByLabel("Referência para o motorista (opcional)")
    .fill("Portão lateral");
  await expect(
    page
      .getByLabel("Grupo", { exact: true })
      .getByRole("option", { name: "Coleta centro" }),
  ).toHaveCount(0);
  await page.getByLabel("Grupo", { exact: true }).selectOption("return-group");
  const creation = page.waitForRequest(
    (r) => r.url().endsWith("/dropoff-points") && r.method() === "POST",
  );
  await page.getByRole("button", { name: "Salvar cadastro" }).click();
  expect((await creation).postDataJSON()).toEqual({
    name: point.name,
    addressDetails: {
      street: point.address,
      number: "",
      noNumber: true,
      neighborhood: "",
      city: "São Lourenço do Oeste",
      state: "SC",
      country: "BR",
      postalCode: "",
      complement: "",
    },
    stopReference: "Portão lateral",
    groupId: point.groupId,
  });
  await page.getByRole("button", { name: "Alunos", exact: true }).click();
  await page.getByRole("button", { name: "Vigência e locais" }).click();
  const field = page.getByLabel("Ponto de desembarque", { exact: true });
  await field.selectOption(point.id);
  const section = field.locator("xpath=ancestor::section[1]");
  await section
    .getByLabel("Registro do pedido")
    .fill("Cadastro inicial autorizado");
  const save = page.waitForRequest(
    (r) =>
      r.url().endsWith("/location-defaults/dropoff") && r.method() === "PUT",
  );
  await section.getByRole("button", { name: "Salvar padrão" }).click();
  expect((await save).postDataJSON()).toEqual({
    locationId: point.id,
    source: "initial",
    evidence: "Cadastro inicial autorizado",
    expectedVersion: 0,
  });
});
async function mock(page: Page, role = "admin", scope = "operation") {
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith("/auth/login")
      ? { token: "synthetic-session", scope, expiresAt: "2099-01-01" }
      : path.endsWith("/session")
        ? { id: "team-test", role, active: true, version: 1 }
        : path.endsWith("/operations/current")
          ? {
              date: "2026-11-04",
              version: 0,
              demandToken: "current-demand",
              status: "draft",
              closingPending: true,
              universities: [],
              groups: [],
              issues: [],
              planningIssues: [],
              plan: null,
            }
          : path.endsWith("/operations/overview")
            ? {
                date: "2026-11-04",
                total: 1,
                students: [
                  {
                    ...student,
                    studentId: student.id,
                    pickup: { state: "confirmado", origin: "aluno" },
                    dropoff: { state: "indeciso", origin: "aluno" },
                    pickupPlace: null,
                    dropoffPlace: null,
                    issues: ["PICKUP_LOCATION_INVALID"],
                    pending: [],
                    eligible: true,
                  },
                ],
                counts: {
                  pickup: { confirmado: 1 },
                  dropoff: { confirmado: 0 },
                },
              }
            : path.endsWith("/journey/correction")
              ? { version: 2, pendingReceipts: [], journey: null }
              : path.endsWith("/students")
                ? [student]
                : [];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
}
async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel("E-mail").fill("equipe@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

test("mapa exige conferência e mantém a ordem das paradas ao traçar", async ({
  page,
}) => {
  await mock(page);
  await page.route("https://maps.googleapis.com/maps/api/js?*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.google={maps:{Map:class{fitBounds(){}},Marker:class{setMap(){}},Polyline:class{setMap(){}},LatLngBounds:class{extend(){}},geometry:{encoding:{decodePath(){return []}}}}};window.techbusMapsReady();`,
    }),
  );
  await page.route("**/api/v1/groups?*", (route) =>
    route.fulfill({
      json: [
        {
          id: "group-map",
          name: "Coleta centro",
          direction: "pickup",
          active: true,
        },
      ],
    }),
  );
  await page.route("**/api/v1/maps/groups/*?*", (route) =>
    route.fulfill({
      json: {
        token: "view-map",
        ordered: [
          { id: "point-a", name: "Parada A", address: "Rua A" },
          { id: "point-b", name: "Parada B", address: "Rua B" },
        ],
        pending: [],
      },
    }),
  );
  await page.route("**/api/v1/maps/geocode", (route) =>
    route.fulfill({
      json: {
        candidates: [
          {
            placeId: route.request().postDataJSON().address,
            address: "Endereço encontrado",
            lat: -26,
            lng: -52,
            approximate: false,
          },
        ],
      },
    }),
  );
  await page.route("**/api/v1/maps/route", (route) =>
    route.fulfill({
      json: { distanceMeters: 1500, durationSeconds: 180, polyline: "encoded" },
    }),
  );
  await login(page);
  await page.getByRole("button", { name: "Mapa e rotas", exact: true }).click();
  await page.getByLabel("Grupo do percurso").selectOption("group-map");
  const sections = page.locator("ol.stop-list > li > section");
  await expect(sections).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    await sections.nth(i).locator("input").fill(`Endereço ${i}`);
    await sections
      .nth(i)
      .getByRole("button", { name: "Localizar no mapa" })
      .click();
    await sections.nth(i).locator("select").selectOption(`Endereço ${i}`);
  }
  const calculate = page.getByRole("button", { name: "Calcular percurso" });
  await expect(calculate).toBeDisabled();
  await page.getByLabel("Conferi os locais no mapa para esta prévia").check();
  const request = page.waitForRequest((r) => r.url().endsWith("/maps/route"));
  await calculate.click();
  expect(
    (await request)
      .postDataJSON()
      .locations.map((point: { pointId: string | null }) => point.pointId),
  ).toEqual(["point-a", "point-b"]);
  await expect(
    page.getByText("1,5 km · aproximadamente 3 minutos"),
  ).toBeVisible();
  await sections.first().locator("input").fill("Outra origem");
  await expect(
    page.getByText("1,5 km · aproximadamente 3 minutos"),
  ).toHaveCount(0);
  await expect(calculate).toBeDisabled();
});

test("login mantém token apenas em memória e recarga exige autenticação", async ({
  page,
}) => {
  await mock(page);
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Operação do dia" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => JSON.stringify([localStorage, sessionStorage])),
  ).not.toContain("synthetic-session");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeVisible();
});
test("401 encerra sessão e motorista não solicita operação administrativa", async ({
  page,
}) => {
  const administrative: string[] = [];
  page.on("request", (r) => {
    if (/api\/v1\/(students|operations|groups)/.test(r.url()))
      administrative.push(r.url());
  });
  await mock(page, "driver");
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Minhas viagens" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Alunos", exact: true }),
  ).toHaveCount(0);
  expect(administrative).toEqual([]);
  await page.route("**/api/v1/driver/trips", (r) =>
    r.fulfill({
      status: 401,
      body: JSON.stringify({ code: "UNAUTHENTICATED" }),
    }),
  );
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeVisible();
});
test("primeiro acesso solicita senha nova e volta ao login", async ({
  page,
}) => {
  await mock(page, "admin", "password-change");
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Defina sua senha" }),
  ).toBeVisible();
  await page
    .getByLabel("Nova senha", { exact: true })
    .fill("nova-senha-de-teste-123");
  await page
    .getByLabel("Repita a nova senha", { exact: true })
    .fill("nova-senha-de-teste-123");
  const request = page.waitForRequest((r) =>
    r.url().endsWith("/auth/password"),
  );
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  expect((await request).postDataJSON()).toEqual({
    newPassword: "nova-senha-de-teste-123",
  });
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeVisible();
});
test("correção envia só trecho selecionado, versão e justificativa; conflito não mostra sucesso", async ({
  page,
}) => {
  await mock(page);
  await login(page);
  await page.getByRole("button", { name: "Revisar Aluna de teste" }).click();
  await page.getByLabel("Ida", { exact: true }).selectOption("recusado");
  await page
    .getByLabel("Justificativa")
    .fill("Solicitação conferida pela equipe");
  await page.route("**/api/v1/students/*/journey/correction", async (r) => {
    if (r.request().method() === "POST") {
      const b = r.request().postDataJSON();
      expect(b.changes).toEqual({ pickup: "recusado" });
      expect(b.expectedVersion).toBe(2);
      expect(b.reason).toBe("Solicitação conferida pela equipe");
      await r.fulfill({
        status: 409,
        body: JSON.stringify({ code: "VERSION_CONFLICT" }),
      });
    } else await r.fallback();
  });
  await page.getByRole("button", { name: "Salvar correção" }).click();
  await expect(page.getByRole("alert")).toContainText("alterados");
  await expect(page.getByText("Correção registrada.")).toHaveCount(0);
});
test("cadastro preserva zero dias habituais e contrato explícito", async ({
  page,
}) => {
  await mock(page);
  await login(page);
  await page.getByRole("button", { name: "Alunos", exact: true }).click();
  await page.getByRole("button", { name: "Novo aluno" }).click();
  await page.getByLabel("Nome completo").fill("Pessoa fictícia");
  await page.getByLabel("WhatsApp").fill("+5549999998888");
  await page.getByLabel("Início da vigência").fill("2026-11-04");
  await page.getByLabel("Fim da vigência").fill("2026-12-10");
  const request = page.waitForRequest(
    (r) => r.url().includes("/students") && r.method() === "POST",
  );
  await page.getByRole("button", { name: "Salvar aluno" }).click();
  const body = (await request).postDataJSON();
  expect(body.habitualDays).toEqual([]);
  expect(body.contract).toEqual({
    startDate: "2026-11-04",
    endDate: "2026-12-10",
  });
});
test("celular mantém ações acessíveis e registra captura", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mock(page);
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Operação do dia" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../.local/frontend-mobile.png",
    fullPage: true,
  });
});

test("falha ao carregar revisão não permite gravar correção", async ({
  page,
}) => {
  await mock(page);
  await page.route("**/api/v1/students/*/journey/correction", (r) =>
    r.fulfill({ status: 503, body: "{}" }),
  );
  await login(page);
  await page.getByRole("button", { name: "Revisar Aluna de teste" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Salvar correção" }),
  ).toHaveCount(0);
});

test("planejamento salva versão e demanda sem confirmar automaticamente", async ({
  page,
}) => {
  await mock(page);
  const writes: string[] = [];
  await page.route("**/api/v1/operations/current", (r) =>
    r.fulfill({
      json: {
        date: "2026-11-04",
        version: 3,
        demandToken: "current-demand",
        status: "draft",
        closingPending: true,
        universities: [],
        issues: [],
        planningIssues: [],
        plan: null,
      },
    }),
  );
  await page.route("**/api/v1/operations/current/planning", async (r) => {
    writes.push(r.request().url());
    expect(r.request().postDataJSON()).toEqual({
      expectedVersion: 3,
      demandToken: "current-demand",
      trips: [],
    });
    await r.fulfill({ json: {} });
  });
  await login(page);
  await page.getByRole("button", { name: "Itinerários", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Confirmar operação", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await expect.poll(() => writes.length).toBe(1);
});

test("mensagens mostram esclarecimento encaminhado à equipe", async ({
  page,
}) => {
  await mock(page);
  await page.route("**/api/v1/integrations/whatsapp/events?*", (r) =>
    r.fulfill({
      json: [
        {
          id: "context-test",
          receivedAt: "2026-11-05T15:00:00Z",
          phone: "+5549999999999",
          text: "talvez",
          conflict: false,
          interpretation: { code: "CONTEXT_REVIEW_REQUIRED" },
          processing: null,
          acknowledgement: null,
          clarification: {
            state: "escalated",
            code: "TEAM_REVIEW_REQUIRED",
            text: "Você vai hoje (ida e volta)?",
          },
        },
      ],
    }),
  );
  await login(page);
  await page.getByRole("button", { name: "Mensagens", exact: true }).click();
  await page
    .getByText("Esclarecimento: Revisão da equipe", { exact: true })
    .click();
  await expect(
    page.getByText("Você vai hoje (ida e volta)?", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Dúvida persistente; revisar com a equipe", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tentar reenviar" }),
  ).toHaveCount(0);
});

test("itinerário com local sem posição bloqueia publicação e salva ordem explicitamente", async ({
  page,
}) => {
  await mock(page);
  const stop = {
    id: "point-test",
    label: "Ponto de teste",
    studentIds: [student.id],
  };
  await page.route("**/api/v1/groups?*", (r) =>
    r.fulfill({
      json: [
        {
          id: "group-test",
          name: "Grupo de teste",
          active: true,
          direction: "pickup",
        },
      ],
    }),
  );
  await page.route("**/api/v1/operations/groups/group-test/itinerary", (r) =>
    r.fulfill({
      json: {
        date: "2026-11-04",
        version: 4,
        previewToken: "preview",
        order: { version: 2, stopIds: [] },
        candidate: { ordered: [], pending: [stop] },
        planning: { status: "confirmed" },
        needsAdjustment: true,
      },
    }),
  );
  await login(page);
  await page.getByRole("button", { name: "Itinerários", exact: true }).click();
  await page.getByLabel("Grupo", { exact: true }).selectOption("group-test");
  await expect(
    page.getByRole("button", { name: "Publicar itinerário do dia" }),
  ).toBeDisabled();
  await page.getByText("Editar ordem padrão do grupo", { exact: true }).click();
  await page.getByLabel("Local para incluir").selectOption("point-test");
  await page.getByRole("button", { name: "Incluir no fim" }).click();
  await expect(
    page.getByRole("button", { name: "Publicar itinerário do dia" }),
  ).toBeDisabled();
  const request = page.waitForRequest((r) =>
    r.url().endsWith("/groups/group-test/stop-order"),
  );
  await page.getByRole("button", { name: "Salvar ordem padrão" }).click();
  expect((await request).postDataJSON()).toEqual({
    expectedVersion: 2,
    stopIds: ["point-test"],
  });
});

test("itinerário integra abas, filtra grupos e salva escolhas sem horários", async ({
  page,
}) => {
  await mock(page);
  const groups = [
    { id: "pickup-a", name: "Ida centro", direction: "pickup", active: true },
    { id: "pickup-b", name: "Ida bairro", direction: "pickup", active: true },
    {
      id: "dropoff-a",
      name: "Volta centro",
      direction: "dropoff",
      active: true,
    },
  ];
  const vehicles = [
    {
      id: "bus-a",
      identifier: "Ônibus 01",
      seats: 40,
      active: true,
      week: Array(7).fill(true),
    },
    {
      id: "bus-b",
      identifier: "Ônibus 02",
      seats: 50,
      active: true,
      week: Array(7).fill(true),
    },
    {
      id: "bus-c",
      identifier: "Ônibus indisponível",
      seats: 60,
      active: true,
      week: Array(7).fill(false),
    },
  ];
  await page.route("**/api/v1/groups?*", (r) => r.fulfill({ json: groups }));
  await page.route("**/api/v1/vehicles?*", (r) =>
    r.fulfill({ json: vehicles }),
  );
  await page.route("**/api/v1/drivers?*", (r) =>
    r.fulfill({
      json: [{ id: "driver-a", name: "Motorista A", active: true }],
    }),
  );
  await page.route("**/api/v1/operations/current", (r) =>
    r.fulfill({
      json: {
        date: "2026-11-11",
        version: 2,
        demandToken: "daily-demand",
        status: "draft",
        closingPending: true,
        issues: [],
        planningIssues: [],
        plan: null,
        groups: [
          { groupId: "pickup-a", stage: "collection", count: 20 },
          { groupId: "dropoff-a", stage: "distribution", count: 20 },
        ],
        universities: [
          { universityId: "unimater", pickup: 20, dropoff: 19, required: 20 },
          { universityId: "unidep", pickup: 8, dropoff: 10, required: 10 },
        ],
      },
    }),
  );
  await page.route("**/api/v1/operations/groups/*/itinerary", (r) =>
    r.fulfill({
      json: {
        date: "2026-11-11",
        version: 1,
        previewToken: "preview",
        needsAdjustment: false,
        order: { version: 1, stopIds: [] },
        candidate: { ordered: [], pending: [] },
        planning: { status: "draft" },
      },
    }),
  );
  await page.route("**/api/v1/operations/current/vehicle-options", (r) => {
    expect(Object.keys(r.request().postDataJSON())).toEqual(["universityId"]);
    return r.fulfill({
      json: { required: 20, available: vehicles.slice(0, 2) },
    });
  });
  await login(page);
  await expect(
    page.getByRole("button", { name: "Planejamento", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Itinerários", exact: true }).click();
  await expect(page.getByRole("tab")).toHaveCount(3);
  await expect(
    page.getByRole("heading", { name: "Ida centro", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ida bairro", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Grupo", { exact: true }).selectOption("pickup-a");
  await expect(
    page.getByRole("heading", { name: "Ida bairro", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Veículo", { exact: true }).selectOption("bus-a");
  await page.getByLabel("Motorista", { exact: true }).selectOption("driver-a");
  await expect(
    page.getByLabel("Veículo").getByRole("option", { name: /indisponível/ }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: /^Volta/ }).click();
  await page.getByLabel("Veículo", { exact: true }).selectOption("bus-a");
  await page.getByLabel("Motorista", { exact: true }).selectOption("driver-a");
  await page.getByRole("tab", { name: /^Intermunicipal/ }).click();
  const uni = page.getByRole("region", { name: "Unimater", exact: true });
  await uni
    .getByRole("button", { name: "Usar Ônibus 01 · 40 lugares" })
    .click();
  await uni.getByLabel("Motorista da ida").selectOption("driver-a");
  await uni.getByLabel("Motorista da volta").selectOption("driver-a");
  await expect(
    page
      .getByRole("region", { name: "Unidep", exact: true })
      .getByLabel("Veículo")
      .getByRole("option", { name: "Ônibus 01 · 40 lugares", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('input[type="time"]')).toHaveCount(0);
  const saved = page.waitForRequest(
    (r) =>
      r.url().endsWith("/operations/current/planning") && r.method() === "PUT",
  );
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  expect((await saved).postDataJSON()).toEqual({
    expectedVersion: 2,
    demandToken: "daily-demand",
    trips: [
      {
        kind: "local",
        stage: "collection",
        vehicleId: "bus-a",
        driverId: "driver-a",
        groupId: "pickup-a",
      },
      {
        kind: "local",
        stage: "distribution",
        vehicleId: "bus-a",
        driverId: "driver-a",
        groupId: "dropoff-a",
      },
      {
        kind: "intermunicipal",
        universityId: "unimater",
        vehicleId: "bus-a",
        outbound: { driverId: "driver-a" },
        return: { driverId: "driver-a" },
      },
    ],
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("tab", { name: /^Intermunicipal/ }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: "../output/024-itinerario-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole("tab", { name: /^Ida/ }).click();
  await page.screenshot({
    path: "../output/024-itinerario-desktop.png",
    fullPage: true,
  });
});

test("frota configura dias e exceções sem faixas de horário", async ({
  page,
}) => {
  await mock(page);
  const v = {
    id: "bus-test",
    identifier: "Ônibus diário",
    plate: "ABC1234",
    kind: "bus",
    seats: 40,
    active: true,
    version: 1,
  };
  await page.route("**/api/v1/vehicles?*", (r) => r.fulfill({ json: [v] }));
  await page.route("**/api/v1/vehicles/bus-test/availability", (r) =>
    r.fulfill({ json: { version: 1, week: null } }),
  );
  await login(page);
  await page
    .getByRole("button", { name: "Frota e motoristas", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Disponibilidade", exact: true })
    .click();
  await expect(page.locator('input[type="time"]')).toHaveCount(0);
  await page.getByLabel("Seg", { exact: true }).check();
  const week = page.waitForRequest(
    (r) => r.url().endsWith("/availability") && r.method() === "PUT",
  );
  await page
    .getByRole("button", { name: "Salvar semana de disponibilidade" })
    .click();
  expect((await week).postDataJSON()).toEqual({
    expectedVersion: 1,
    week: [false, true, false, false, false, false, false],
  });
  await page.getByLabel("Disponibilidade na data").selectOption("yes");
  const exception = page.waitForRequest(
    (r) =>
      r.url().includes("/availability/exceptions/") && r.method() === "PUT",
  );
  await page
    .getByRole("button", { name: "Salvar exceção", exact: true })
    .click();
  expect((await exception).postDataJSON()).toEqual({
    expectedVersion: 1,
    available: true,
  });
});
