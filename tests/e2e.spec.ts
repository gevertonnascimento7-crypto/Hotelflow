import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { admin, PASSWORD } from "./helpers";

/**
 * Fluxos reais no navegador (celular Android emulado) contra o Supabase local.
 */
test.describe.configure({ mode: "serial" });

const stamp = Date.now();
const adminEmail = `gerente.${stamp}@hotelflow.test`;
const staffEmail = `camareira.${stamp}@hotelflow.test`;
const PHOTO = "public/icons/icon-512.png";

let adminCtx: BrowserContext, staffCtx: BrowserContext;
let a: Page, s: Page;
let inviteCode = "";

async function newPage(browser: Browser) {
  const ctx = await browser.newContext({ ...test.info().project.use, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept());
  return { ctx, page };
}

test.beforeAll(async ({ browser }) => {
  ({ ctx: adminCtx, page: a } = await newPage(browser));
  ({ ctx: staffCtx, page: s } = await newPage(browser));
});
test.afterAll(async () => {
  await adminCtx?.close();
  await staffCtx?.close();
});

test("idioma escolhido antes do login vale para o cadastro (inglês)", async () => {
  await a.goto("/login");
  await expect(a.getByRole("heading", { name: "Entrar" })).toBeVisible(); // padrão pt-BR
  await a.getByRole("radio", { name: "English" }).click();
  await expect(a.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await a.getByRole("link", { name: "Create account" }).click();
  await a.getByLabel("Full name").fill("Gabriela Gerente");
  await a.getByLabel("Email").fill(adminEmail);
  await a.getByLabel("Password").fill(PASSWORD);
  await a.getByRole("button", { name: "Create account" }).click();
  await a.waitForURL("**/onboarding");
  await expect(a.getByText("Let's get started")).toBeVisible();
  await a.getByRole("tab", { name: "Create hotel" }).click();
  await a.getByLabel("Hotel, resort or inn name").fill("Hotel Praia Azul");
  await a.getByRole("button", { name: "Create and continue" }).click();
  await a.waitForURL((u) => u.pathname === "/");
  await expect(a.getByText("Tools")).toBeVisible();
  await expect(a.getByRole("link", { name: /Shift swaps/ })).toBeVisible();
});

test("trocar idioma nas configurações traduz o app e salva na conta", async () => {
  await a.getByRole("link", { name: "Settings" }).click();
  const options = a.getByRole("radiogroup").getByRole("radio");
  await expect(options).toHaveCount(3);
  await expect(options).toHaveText(["Português (Brasil)", "English", "Español"]);

  await options.filter({ hasText: "Español" }).click();
  await expect(a.getByRole("heading", { name: "Ajustes" })).toBeVisible();
  await expect(a.getByText("Idioma actualizado.")).toBeVisible();
  await expect(a.getByRole("link", { name: "Inicio" })).toBeVisible();
  await expect(a.locator("html")).toHaveAttribute("lang", "es");

  // Preferência salva no banco
  const { data: users } = await admin().auth.admin.listUsers({ perPage: 200 });
  const me = users.users.find((u) => u.email === adminEmail)!;
  const { data: profile } = await admin().from("profiles").select("locale").eq("id", me.id).single();
  expect(profile!.locale).toBe("es");

  // Vale em outro aparelho: limpa o armazenamento local e entra de novo
  await a.evaluate(() => localStorage.removeItem("hf-locale"));
  await a.reload();
  await expect(a.getByRole("heading", { name: "Ajustes" })).toBeVisible();

  await options.filter({ hasText: "Português (Brasil)" }).click();
  await expect(a.getByRole("heading", { name: "Ajustes" })).toBeVisible();
  await expect(a.getByText("Idioma atualizado.")).toBeVisible();
  await expect(a.getByRole("link", { name: "Início" })).toBeVisible();
});

test("modo escuro e claro", async () => {
  await a.getByRole("tab", { name: "Escuro" }).click();
  await expect(a.locator("html")).toHaveClass(/dark/);
  await a.getByRole("tab", { name: "Claro" }).click();
  await expect(a.locator("html")).not.toHaveClass(/dark/);
});

test("administrador vê o código de convite e funcionário entra na equipe", async () => {
  await a.getByRole("link", { name: "Equipe e convites" }).click();
  await expect(a.getByTestId("invite-code")).toHaveText(/^[A-Z2-9]{10}$/);
  inviteCode = (await a.getByTestId("invite-code").textContent())!;

  await s.goto("/signup");
  await s.getByLabel("Nome completo").fill("Sofia Camareira");
  await s.getByLabel("E-mail").fill(staffEmail);
  await s.getByLabel("Senha").fill(PASSWORD);
  await s.getByRole("button", { name: "Criar conta" }).click();
  await s.waitForURL("**/onboarding");
  await s.getByLabel("Código de convite").fill(inviteCode.toLowerCase());
  await s.getByLabel("Seu setor").selectOption("housekeeping");
  await s.getByRole("button", { name: "Entrar na equipe" }).click();
  await s.waitForURL((u) => u.pathname === "/");
  await expect(s.getByText("Hotel Praia Azul")).toBeVisible();

  // Funcionário não acessa a administração
  await s.goto("/settings");
  await expect(s.getByRole("link", { name: "Equipe e convites" })).toHaveCount(0);
  // Administrador recebe aviso de novo colaborador
  await a.reload();
  await expect(a.getByText("Sofia Camareira")).toBeVisible();
});

test("chamado de manutenção com foto aparece em tempo real para o gestor", async () => {
  await a.goto("/maintenance");
  await expect(a.getByText("Ao vivo")).toBeVisible();
  await expect(a.locator("header span.animate-pulse")).toBeVisible(); // canal conectado

  await s.goto("/maintenance");
  await s.getByRole("button", { name: "Novo chamado" }).click();
  await s.getByLabel("O que aconteceu?").fill("Chuveiro sem água quente");
  await s.getByLabel("Local").fill("Quarto 204");
  await s.getByRole("tab", { name: "Urgente" }).click();
  await s.getByTestId("photo-input").setInputFiles(PHOTO);
  await expect(s.getByRole("dialog").locator("img")).toBeVisible();
  await s.getByRole("button", { name: "Enviar" }).click();
  await expect(s.getByText("Chamado aberto. A equipe foi avisada.")).toBeVisible();

  // O gestor vê o chamado chegar sem recarregar e recebe o aviso
  await expect(a.getByText("Chuveiro sem água quente")).toBeVisible({ timeout: 15_000 });
  await expect(a.getByRole("button", { name: /Novo chamado #\d+/ })).toBeVisible({ timeout: 15_000 });

  await a.getByText("Chuveiro sem água quente").click();
  await expect(a.locator("img[src*='/storage/v1/object/sign/']")).toBeVisible();
  await a.getByRole("button", { name: "Iniciar" }).click();
  await expect(a.getByText("Em andamento").first()).toBeVisible();
  await a.getByLabel("Escreva uma atualização…").fill("Técnico a caminho");
  await a.getByRole("button", { name: "Enviar" }).click();
  await expect(a.getByText("Técnico a caminho")).toBeVisible();
  await a.getByRole("button", { name: "Resolver" }).click();
  await expect(a.getByText("Resolvido").first()).toBeVisible();

  // A autora recebe os avisos (contador na barra inferior)
  await s.goto("/notifications");
  await expect(s.getByText(/Chamado #\d+: Resolvido/)).toBeVisible();
  await expect(s.getByText(/Atualização no chamado #\d+/)).toBeVisible();
});

test("checklist de governança: marcar itens e concluir", async () => {
  await s.goto("/housekeeping");
  await s.getByRole("button", { name: "Nova arrumação" }).click();
  await s.getByLabel("Quarto").fill("101");
  await s.getByRole("button", { name: "Iniciar" }).click();
  await s.waitForURL(/\/housekeeping\/[0-9a-f-]+$/);
  const items = s.getByRole("checkbox");
  await expect(items).toHaveCount(12);
  await items.nth(0).click();
  await items.nth(1).click();
  await expect(s.getByText("2 de 12")).toBeVisible();
  await s.reload();
  await expect(s.getByText("2 de 12")).toBeVisible(); // salvo no banco
  await s.getByRole("button", { name: "Concluir arrumação" }).click(); // confirma itens pendentes
  await s.waitForURL("**/housekeeping");
  await s.getByRole("button", { name: "Todas" }).click();
  await expect(s.getByText("Concluído").first()).toBeVisible();

  // Gestor aprova a inspeção
  await a.goto("/housekeeping");
  await a.getByText("101").first().click();
  await a.getByRole("button", { name: "Aprovar inspeção" }).click();
  await expect(a.getByText("Inspecionado").first()).toBeVisible();
});

test("frases prontas: somente PT/EN/ES, copiar e ouvir", async () => {
  await s.goto("/phrases");
  const from = s.getByLabel("Eu falo");
  await expect(from.locator("option")).toHaveText(["Português", "Inglês", "Espanhol"]);
  await expect(s.getByLabel("Hóspede fala").locator("option")).toHaveCount(3);
  await s.getByLabel("Hóspede fala").selectOption("es");
  await s.getByPlaceholder("Buscar frase…").fill("wi-fi");
  const card = s.locator("p[lang=es]", { hasText: "contraseña del Wi-Fi" });
  await expect(card).toBeVisible();
  await s.getByRole("button", { name: "Copiar" }).first().click();
  expect(await s.evaluate(() => navigator.clipboard.readText())).toBe("Esta es la contraseña del Wi-Fi.");
  await expect(s.getByRole("button", { name: "Ouvir" }).first()).toBeVisible();
});

test("achados e perdidos com foto", async () => {
  await s.goto("/lost-found");
  await s.getByRole("button", { name: "Registrar item" }).click();
  await s.getByTestId("photo-input").setInputFiles(PHOTO);
  await s.getByRole("textbox", { name: "Item", exact: true }).fill("Óculos de sol pretos");
  await s.getByLabel("Onde foi encontrado").fill("Quarto 312");
  await s.getByRole("dialog").getByRole("button", { name: "Salvar" }).click();
  const card = s.getByRole("button", { name: /Óculos de sol pretos/ });
  await expect(card).toBeVisible();
  await expect(card.locator("img")).toHaveAttribute("src", /\/storage\/v1\/object\/sign\//);
  await card.click();
  await s.getByRole("button", { name: "Registrar devolução" }).click();
  await s.getByLabel("Nome do hóspede").fill("Sr. Carlos");
  await s.getByRole("button", { name: "Confirmar" }).click();
  await s.getByRole("button", { name: "Devolvido" }).click();
  await expect(s.getByRole("button", { name: /Óculos de sol pretos/ })).toBeVisible();
});

test("escala, folga e banco de horas", async () => {
  await a.goto("/schedule");
  await a.getByRole("button", { name: "Adicionar turno" }).click();
  await a.getByLabel("Colaborador").selectOption({ label: "Sofia Camareira" });
  await a.getByRole("dialog").getByRole("button", { name: "Salvar" }).click();
  await expect(a.getByText("Salvo")).toBeVisible();

  await s.goto("/schedule");
  await expect(s.getByText("07:00 – 15:00")).toBeVisible();
  await s.getByRole("tab", { name: "Banco de horas" }).click();
  await s.getByRole("button", { name: "Registrar horas" }).click();
  await s.getByLabel("Horas", { exact: true }).selectOption("2");
  await s.getByLabel("Minutos", { exact: true }).selectOption("30");
  await s.getByRole("dialog").getByRole("button", { name: "Salvar" }).click();
  await expect(s.getByText("Horas registradas.")).toBeVisible();
  await expect(s.getByText("Pendente")).toBeVisible();

  await a.goto("/schedule?tab=hours");
  await a.getByRole("button", { name: "Aprovar" }).click();
  await s.reload();
  await expect(s.getByText("+2h30").first()).toBeVisible();
});

test("treinamento com teste rápido", async () => {
  await s.goto("/training");
  await s.getByRole("link", { name: /Segurança e emergências/ }).click();
  await s.getByRole("radio", { name: "Pelas escadas" }).click();
  await s.getByRole("radio", { name: "192" }).click();
  await s.getByRole("radio", { name: "Fechadas e desobstruídas" }).click();
  await s.getByRole("button", { name: "Verificar respostas" }).click();
  await expect(s.getByText("Você acertou 100%")).toBeVisible();
  await s.goto("/training");
  await expect(s.getByText("1 de 5 concluídos")).toBeVisible();
});

test("roteiro da recepção muda a fala conforme o idioma do hóspede", async () => {
  await s.goto("/scripts/checkin");
  await s.getByRole("tab", { name: /EN/ }).click();
  await expect(s.getByText("“Welcome! How can I help you?”")).toBeVisible();
  await s.getByRole("tab", { name: /ES/ }).click();
  await expect(s.getByText("“¡Bienvenido! ¿En qué puedo ayudarle?”")).toBeVisible();
});

test("conversor de câmbio", async () => {
  await s.route("**/api/rates", (route) =>
    route.fulfill({ json: { base: "BRL", rates: { USD: 0.2, EUR: 0.16, ARS: 200 }, updatedAt: new Date().toISOString(), source: "AwesomeAPI + ExchangeRate-API" } }),
  );
  await s.goto("/exchange");
  await s.getByLabel("Valor").fill("100");
  await expect(s.locator("output")).toHaveText(/R\$\s?500,00/);
  await s.getByRole("button", { name: "Inverter moedas" }).click();
  await expect(s.locator("output")).toHaveText(/US\$\s?20,00/);
  await expect(s.getByText("Fonte: AwesomeAPI + ExchangeRate-API")).toBeVisible();
});

test("guia local: gestor adiciona e funcionário envia ao hóspede", async () => {
  await a.goto("/guide");
  await a.getByRole("button", { name: "Adicionar ao guia" }).click();
  await a.getByLabel("Título").fill("Passeio de barco");
  await a.getByLabel(/^Preço/).fill("R$ 120");
  await a.getByLabel(/^Endereço/).fill("Praia do Forte");
  await a.getByRole("dialog").getByRole("button", { name: "Salvar" }).click();
  await s.goto("/guide");
  await expect(s.getByText("Passeio de barco")).toBeVisible();
  await expect(s.getByRole("link", { name: "Abrir no mapa" })).toHaveAttribute("href", /google\.com\/maps/);
});

test("PWA instalável: manifesto e service worker", async () => {
  const manifest = await (await s.request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.some((i: { purpose: string }) => i.purpose === "maskable")).toBe(true);
  await s.goto("/");
  const scope = await s.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toMatch(/\/$/);
});
