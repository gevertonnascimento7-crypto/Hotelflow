import { expect, test } from "@playwright/test";
import { anon, createHotel, isoDate, join, newUser, type TestUser } from "./helpers";

/**
 * Segurança e regras de negócio direto no banco (RLS, RPCs, Storage),
 * usando a mesma API pública que o app usa.
 */
test.describe.configure({ mode: "serial" });

let adminA: TestUser, staffA1: TestUser, staffA2: TestUser, maintA: TestUser, adminB: TestUser;
let hotelA: string, hotelB: string, codeA: string;

test.beforeAll(async () => {
  adminA = await newUser("Admin A");
  staffA1 = await newUser("Bruno Recepção");
  staffA2 = await newUser("Carla Recepção", "es");
  maintA = await newUser("Diego Manutenção");
  adminB = await newUser("Admin B");
  ({ hotelId: hotelA, code: codeA } = await createHotel(adminA, "Hotel Atlântico"));
  ({ hotelId: hotelB } = await createHotel(adminB, "Pousada Serra"));
  expect(await join(staffA1, codeA, "reception")).toBe("ok");
  expect(await join(staffA2, codeA, "reception")).toBe("ok");
  expect(await join(maintA, codeA.toLowerCase().replace(/(.{5})/, "$1-"), "maintenance")).toBe("ok"); // aceita minúsculas e hífen
});

test("visitante anônimo não lê nenhum dado", async () => {
  const c = anon();
  for (const table of ["hotels", "profiles", "maintenance_tickets", "shifts", "notifications", "lost_items"]) {
    const { data } = await c.from(table).select("*").limit(5);
    expect(data ?? [], table).toHaveLength(0);
  }
  const { error } = await c.rpc("create_hotel", { p_name: "Invasor" });
  expect(error).not.toBeNull();
});

test("isolamento total entre hotéis", async () => {
  const { data: t1 } = await adminA.client.from("maintenance_tickets").insert({ title: "Vazamento na pia", location: "101" }).select().single();
  expect(t1.hotel_id).toBe(hotelA);

  // O outro hotel não enxerga nada do Hotel A
  for (const table of ["maintenance_tickets", "profiles", "checklist_templates"]) {
    const { data } = await adminB.client.from(table).select("hotel_id");
    expect((data ?? []).every((r: { hotel_id: string }) => r.hotel_id === hotelB), table).toBe(true);
  }
  const { data: peek } = await adminB.client.from("maintenance_tickets").select("*").eq("id", t1.id);
  expect(peek).toHaveLength(0);

  // Tentar gravar no outro hotel forjando hotel_id: o gatilho força o próprio hotel
  const { data: forged } = await adminB.client.from("maintenance_tickets").insert({ hotel_id: hotelA, title: "Forjado", location: "X" }).select().single();
  expect(forged.hotel_id).toBe(hotelB);

  // Alterar/excluir dados de outro hotel não afeta nada
  await adminB.client.from("maintenance_tickets").update({ title: "hack" }).eq("id", t1.id);
  await adminB.client.from("maintenance_tickets").delete().eq("id", t1.id);
  const { data: still } = await adminA.client.from("maintenance_tickets").select("title").eq("id", t1.id).single();
  expect(still!.title).toBe("Vazamento na pia");

  // Não dá para mover um registro para outro hotel
  const { error: moveErr } = await adminA.client.from("maintenance_tickets").update({ hotel_id: hotelB }).eq("id", t1.id);
  expect(moveErr).not.toBeNull();
});

test("funcionário não escala a própria permissão", async () => {
  const { error: roleErr } = await staffA1.client.from("profiles").update({ role: "admin" }).eq("id", staffA1.id);
  expect(roleErr).not.toBeNull();
  const { error: hotelErr } = await staffA1.client.from("profiles").update({ hotel_id: hotelB }).eq("id", staffA1.id);
  expect(hotelErr).not.toBeNull();
  // Pode alterar o próprio nome e idioma
  const { error: okErr } = await staffA1.client.from("profiles").update({ locale: "en", full_name: "Bruno R." }).eq("id", staffA1.id);
  expect(okErr).toBeNull();
  const { error: invalidLocale } = await staffA1.client.from("profiles").update({ locale: "fr" }).eq("id", staffA1.id);
  expect(invalidLocale).not.toBeNull(); // francês não é aceito
  // Não altera o perfil de colegas
  const { data: other } = await staffA1.client.from("profiles").update({ full_name: "x" }).eq("id", staffA2.id).select();
  expect(other ?? []).toHaveLength(0);
  // Código de convite é só do administrador
  expect((await staffA1.client.rpc("get_invite_code")).error).not.toBeNull();
  expect((await staffA1.client.from("hotels").select("invite_code")).error).not.toBeNull();
  expect((await staffA1.client.rpc("update_member", { p_user: staffA1.id, p_role: "admin", p_department: "general", p_active: true })).error).not.toBeNull();
  // Escala e conteúdo do hotel só por gestores
  expect((await staffA1.client.from("shifts").insert({ user_id: staffA1.id, shift_date: isoDate(1), start_time: "07:00", end_time: "15:00" })).error).not.toBeNull();
  expect((await staffA1.client.from("guide_items").insert({ title: "Passeio" })).error).not.toBeNull();
  // Não consegue criar notificações nem ler segredos
  expect((await staffA1.client.from("notifications").insert({ hotel_id: hotelA, user_id: adminA.id, type: "x" })).error).not.toBeNull();
  const { data: secrets } = await staffA1.client.from("app_secrets").select("*");
  expect(secrets ?? []).toHaveLength(0);
});

test("o hotel nunca fica sem administrador", async () => {
  const { error } = await adminA.client.rpc("update_member", { p_user: adminA.id, p_role: "staff", p_department: "management", p_active: true });
  expect(error?.message).toContain("last_admin");
  // Promover um supervisor funciona
  expect((await adminA.client.rpc("update_member", { p_user: staffA2.id, p_role: "supervisor", p_department: "reception", p_active: true })).error).toBeNull();
  expect((await adminA.client.rpc("update_member", { p_user: staffA2.id, p_role: "staff", p_department: "reception", p_active: true })).error).toBeNull();
});

test("troca de turnos: pedido → colega aceita → supervisor aprova", async () => {
  const d1 = isoDate(2);
  const d2 = isoDate(3);
  const { data: shifts, error } = await adminA.client
    .from("shifts")
    .insert([
      { user_id: staffA1.id, shift_date: d1, start_time: "07:00", end_time: "15:00" },
      { user_id: staffA2.id, shift_date: d2, start_time: "15:00", end_time: "23:00" },
    ])
    .select();
  expect(error).toBeNull();
  const [s1, s2] = shifts!;

  // Não pode pedir troca de turno alheio
  expect((await staffA1.client.rpc("request_swap", { p_my_shift: s2.id, p_target: staffA2.id })).error?.message).toContain("not_your_shift");

  const { data: swapId, error: reqErr } = await staffA1.client.rpc("request_swap", { p_my_shift: s1.id, p_target: staffA2.id, p_target_shift: s2.id, p_reason: "Consulta médica" });
  expect(reqErr).toBeNull();
  // Supervisor não pode aprovar antes do colega aceitar
  expect((await adminA.client.rpc("decide_swap", { p_swap: swapId, p_approve: true })).error?.message).toContain("invalid_state");
  // Outra pessoa não responde pelo colega
  expect((await maintA.client.rpc("respond_swap", { p_swap: swapId, p_accept: true })).error).not.toBeNull();

  const { data: notif } = await staffA2.client.from("notifications").select("type, data").eq("type", "swap_requested");
  expect(notif!.length).toBe(1);
  expect(notif![0].data.actor).toBe("Bruno R.");

  expect((await staffA2.client.rpc("respond_swap", { p_swap: swapId, p_accept: true })).error).toBeNull();
  const { data: mgrNotif } = await adminA.client.from("notifications").select("type").eq("type", "swap_pending_approval");
  expect(mgrNotif!.length).toBeGreaterThan(0);

  // Funcionário comum não aprova
  expect((await staffA1.client.rpc("decide_swap", { p_swap: swapId, p_approve: true })).error?.message).toContain("forbidden");
  expect((await adminA.client.rpc("decide_swap", { p_swap: swapId, p_approve: true })).error).toBeNull();

  const { data: after } = await adminA.client.from("shifts").select("id, user_id").in("id", [s1.id, s2.id]);
  const byId = Object.fromEntries(after!.map((s) => [s.id, s.user_id]));
  expect(byId[s1.id]).toBe(staffA2.id);
  expect(byId[s2.id]).toBe(staffA1.id);

  const { data: approved } = await staffA1.client.from("notifications").select("type").eq("type", "swap_approved");
  expect(approved!.length).toBe(1);

  // Colegas não envolvidos não veem a troca
  const { data: hidden } = await maintA.client.from("shift_swaps").select("id").eq("id", swapId);
  expect(hidden).toHaveLength(0);
});

test("folga aprovada entra na escala automaticamente", async () => {
  const day = isoDate(10);
  await adminA.client.from("shifts").insert({ user_id: maintA.id, shift_date: day, start_time: "08:00", end_time: "16:00" });
  const { data: leaveId, error } = await maintA.client.rpc("request_leave", { p_start: day, p_end: isoDate(11), p_kind: "day_off", p_reason: "Casamento" });
  expect(error).toBeNull();
  expect((await maintA.client.rpc("decide_leave", { p_leave: leaveId, p_approve: true })).error).not.toBeNull();
  expect((await adminA.client.rpc("decide_leave", { p_leave: leaveId, p_approve: true })).error).toBeNull();
  const { data: shifts } = await adminA.client.from("shifts").select("shift_date, kind").eq("user_id", maintA.id).gte("shift_date", day).lte("shift_date", isoDate(11)).order("shift_date");
  expect(shifts!.map((s) => s.kind)).toEqual(["off", "off"]);
});

test("banco de horas: lançamento pendente, aprovação e privacidade", async () => {
  const { error } = await staffA1.client.rpc("log_hours", { p_user: staffA1.id, p_date: isoDate(-1), p_minutes: 90, p_reason: "Evento" });
  expect(error).toBeNull();
  // Funcionário não lança horas para outra pessoa
  expect((await staffA1.client.rpc("log_hours", { p_user: staffA2.id, p_date: isoDate(-1), p_minutes: 600 })).error?.message).toContain("forbidden");
  const { data: mine } = await staffA1.client.from("time_entries").select("id, status, minutes");
  expect(mine![0].status).toBe("pending");
  // Colega não vê as horas de outro
  const { data: peek } = await staffA2.client.from("time_entries").select("id").eq("user_id", staffA1.id);
  expect(peek).toHaveLength(0);
  expect((await adminA.client.rpc("decide_hours", { p_entry: mine![0].id, p_approve: true })).error).toBeNull();
  const { data: approved } = await staffA1.client.from("time_entries").select("status").eq("id", mine![0].id).single();
  expect(approved!.status).toBe("approved");
});

test("chamados de manutenção notificam gestores e manutenção", async () => {
  const { data: ticket } = await staffA1.client.from("maintenance_tickets").insert({ title: "Ar-condicionado pingando", location: "Quarto 305", priority: "high", category: "hvac" }).select().single();
  expect(ticket.status).toBe("open");
  const { data: forMaint } = await maintA.client.from("notifications").select("type, data").eq("type", "ticket_created").eq("data->>code", String(ticket.code));
  expect(forMaint!.length).toBe(1);
  // Manutenção atualiza; autor recebe aviso de status
  expect((await maintA.client.from("maintenance_tickets").update({ status: "in_progress", assigned_to: maintA.id }).eq("id", ticket.id)).error).toBeNull();
  const { data: forAuthor } = await staffA1.client.from("notifications").select("type").eq("type", "ticket_status");
  expect(forAuthor!.length).toBeGreaterThan(0);
  // Colega da recepção que não é autor nem responsável não altera
  const { data: noUpdate } = await staffA2.client.from("maintenance_tickets").update({ status: "cancelled" }).eq("id", ticket.id).select();
  expect(noUpdate ?? []).toHaveLength(0);
  // Não dá para atribuir a alguém de outro hotel
  expect((await adminA.client.from("maintenance_tickets").update({ assigned_to: adminB.id }).eq("id", ticket.id)).error).not.toBeNull();
  // Comentário notifica o autor
  expect((await maintA.client.from("ticket_comments").insert({ ticket_id: ticket.id, body: "Troquei a mangueira" })).error).toBeNull();
  const { data: comm } = await staffA1.client.from("notifications").select("type").eq("type", "ticket_comment");
  expect(comm!.length).toBe(1);
});

test("fotos ficam isoladas por hotel no Storage", async () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  const path = `${hotelA}/lost-found/teste.png`;
  expect((await staffA1.client.storage.from("hotel-files").upload(path, png, { contentType: "image/png" })).error).toBeNull();
  // Outro hotel não lê nem sobrescreve
  expect((await adminB.client.storage.from("hotel-files").download(path)).error).not.toBeNull();
  expect((await adminB.client.storage.from("hotel-files").createSignedUrl(path, 60)).error).not.toBeNull();
  expect((await adminB.client.storage.from("hotel-files").upload(`${hotelA}/lost-found/x.png`, png, { contentType: "image/png" })).error).not.toBeNull();
  // Só imagens são aceitas
  expect((await staffA1.client.storage.from("hotel-files").upload(`${hotelA}/lost-found/x.html`, Buffer.from("<script>"), { contentType: "text/html" })).error).not.toBeNull();
  // Colega do mesmo hotel consegue ver
  expect((await staffA2.client.storage.from("hotel-files").createSignedUrl(path, 60)).error).toBeNull();
});

test("código de convite resiste a força bruta", async () => {
  const intruder = await newUser("Intruso");
  const results: string[] = [];
  for (let i = 0; i < 9; i++) results.push((await intruder.client.rpc("join_hotel", { p_code: `ZZZZZZZZ${i}` })).data as string);
  expect(results.slice(0, 8).every((r) => r === "invalid_code")).toBe(true);
  expect(results[8]).toBe("too_many_attempts");
  // Mesmo com o código certo, fica bloqueado por 15 minutos
  expect((await intruder.client.rpc("join_hotel", { p_code: codeA })).data).toBe("too_many_attempts");
});

test("rotas de push exigem login e só enviam avisos reais", async ({ request }) => {
  expect((await request.post("/api/push/dispatch")).status()).toBe(401);
  expect((await request.get("/api/push/key")).status()).toBe(401);
  const key = await request.get("/api/push/key", { headers: { authorization: `Bearer ${staffA1.token}` } });
  expect(key.status()).toBe(200);
  expect((await key.json()).publicKey).toMatch(/^[A-Za-z0-9_-]{80,}$/);
  const res = await request.post("/api/push/dispatch", { headers: { authorization: `Bearer ${staffA1.token}` } });
  expect(res.status()).toBe(200);
});
