import { describe, expect, it, vi } from "vitest";
import {
  UNCONFIGURED_MESSAGE,
  authErrorMessage,
  performLogin,
  performPasswordUpdate,
  performResetRequest,
  performSignup,
  safeNextPath,
  validateEmail,
  validatePassword,
} from "@/lib/auth/forms";
import type { AuthClient } from "@/lib/auth/forms";
import { readSupabaseConfig } from "@/lib/supabase/config";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

function fakeClient(overrides: Partial<AuthClient["auth"]> = {}): AuthClient {
  return {
    auth: {
      signInWithPassword: vi.fn(async () => ({ error: null })),
      signUp: vi.fn(async () => ({ data: { session: null }, error: null })),
      resetPasswordForEmail: vi.fn(async () => ({ error: null })),
      updateUser: vi.fn(async () => ({ error: null })),
      ...overrides,
    },
  };
}

describe("configuração do Supabase", () => {
  it("incompleta ou inválida → não configurado", () => {
    expect(readSupabaseConfig({})).toBeNull();
    expect(readSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co" })).toBeNull();
    expect(readSupabaseConfig({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x" })).toBeNull();
    expect(readSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: "sem-url", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "k" })).toBeNull();
    expect(readSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: "http://x.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "k" })).toBeNull();
  });

  it("completa → configurado", () => {
    expect(readSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co/", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x" })).toEqual({
      url: "https://x.supabase.co",
      publishableKey: "sb_publishable_x",
    });
  });
});

describe("validação", () => {
  it("e-mail", () => {
    expect(validateEmail("")).toMatch(/Informe/);
    expect(validateEmail("ana@")).toMatch(/válido/);
    expect(validateEmail("ana@exemplo.com")).toBeNull();
  });

  it("senha", () => {
    expect(validatePassword("")).toMatch(/Informe/);
    expect(validatePassword("abc12")).toMatch(/pelo menos 8/);
    expect(validatePassword("abcdefgh")).toMatch(/letras e números/);
    expect(validatePassword("a1".repeat(40))).toMatch(/no máximo 72/);
    expect(validatePassword("historia42")).toBeNull();
  });
});

describe("login", () => {
  it("campos vazios não chamam o Supabase", async () => {
    const client = fakeClient();
    const s = await performLogin(client, form({ email: "", password: "" }));
    expect(s.status).toBe("error");
    expect(s.fieldErrors.email).toBeTruthy();
    expect(s.fieldErrors.password).toBeTruthy();
    expect(client.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("sem configuração: estado honesto, nada é enviado", async () => {
    const s = await performLogin(null, form({ email: "ana@exemplo.com", password: "historia42" }));
    expect(s).toMatchObject({ status: "unconfigured", message: UNCONFIGURED_MESSAGE });
  });

  it("credenciais erradas → mensagem clara", async () => {
    const client = fakeClient({
      signInWithPassword: vi.fn(async () => ({ error: { message: "Invalid login credentials", code: "invalid_credentials", status: 400 } })),
    });
    const s = await performLogin(client, form({ email: "ana@exemplo.com", password: "historia42" }));
    expect(s).toMatchObject({ status: "error", message: "E-mail ou senha incorretos.", email: "ana@exemplo.com" });
  });

  it("e-mail não confirmado", async () => {
    const client = fakeClient({ signInWithPassword: vi.fn(async () => ({ error: { message: "x", code: "email_not_confirmed", status: 400 } })) });
    expect((await performLogin(client, form({ email: "ana@exemplo.com", password: "historia42" }))).message).toMatch(/Confirme seu e-mail/);
  });

  it("sucesso leva à conta (redirect feito no servidor)", async () => {
    const s = await performLogin(fakeClient(), form({ email: " ana@exemplo.com ", password: "historia42" }));
    expect(s).toMatchObject({ status: "success", redirectTo: "/conta" });
  });
});

describe("cadastro", () => {
  const valid = { email: "ana@exemplo.com", password: "historia42", confirm: "historia42" };

  it("confirmação diferente da senha", async () => {
    const s = await performSignup(fakeClient(), form({ ...valid, confirm: "outra42x" }), "https://site/auth/confirm");
    expect(s.fieldErrors.confirm).toMatch(/não são iguais/);
  });

  it("envia o link de confirmação para /auth/confirm", async () => {
    const client = fakeClient();
    const s = await performSignup(client, form(valid), "https://site/auth/confirm?next=/conta");
    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: "ana@exemplo.com",
      password: "historia42",
      options: { emailRedirectTo: "https://site/auth/confirm?next=/conta" },
    });
    expect(s.status).toBe("success");
    expect(s.message).toMatch(/link de confirmação/);
    expect(s.redirectTo).toBeUndefined();
  });

  it("e-mail já cadastrado não é revelado", async () => {
    const client = fakeClient({
      signUp: vi.fn(async () => ({ data: { session: null }, error: { message: "exists", code: "user_already_exists", status: 422 } })),
    });
    const s = await performSignup(client, form(valid), "x");
    expect(s.status).toBe("success");
    expect(s.message).toMatch(/Se este e-mail puder ser cadastrado/);
  });

  it("senha fraca recusada pelo Supabase", async () => {
    const client = fakeClient({
      signUp: vi.fn(async () => ({ data: { session: null }, error: { message: "weak", code: "weak_password", status: 422 } })),
    });
    expect((await performSignup(client, form(valid), "x")).message).toMatch(/fraca/);
  });

  it("sem configuração", async () => {
    expect((await performSignup(null, form(valid), "x")).status).toBe("unconfigured");
  });
});

describe("recuperação de senha", () => {
  it("mesma resposta exista ou não a conta", async () => {
    const client = fakeClient();
    const s = await performResetRequest(client, form({ email: "ana@exemplo.com" }), "https://site/auth/confirm?next=/redefinir-senha");
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith("ana@exemplo.com", { redirectTo: "https://site/auth/confirm?next=/redefinir-senha" });
    expect(s.message).toMatch(/Se existir uma conta/);
  });

  it("limite de envios é informado", async () => {
    const client = fakeClient({
      resetPasswordForEmail: vi.fn(async () => ({ error: { message: "rate", code: "over_email_send_rate_limit", status: 429 } })),
    });
    expect((await performResetRequest(client, form({ email: "ana@exemplo.com" }), "x")).message).toMatch(/Muitas tentativas/);
  });

  it("e-mail inválido", async () => {
    expect((await performResetRequest(fakeClient(), form({ email: "x" }), "x")).fieldErrors.email).toBeTruthy();
  });

  it("sem configuração", async () => {
    expect((await performResetRequest(null, form({ email: "ana@exemplo.com" }), "x")).status).toBe("unconfigured");
  });

  it("nova senha: valida e trata sessão ausente", async () => {
    expect((await performPasswordUpdate(fakeClient(), form({ password: "historia42", confirm: "outra" }))).fieldErrors.confirm).toBeTruthy();
    const client = fakeClient({ updateUser: vi.fn(async () => ({ error: { message: "Auth session missing!" } })) });
    expect((await performPasswordUpdate(client, form({ password: "historia42", confirm: "historia42" }))).message).toMatch(/link de recuperação/);
    expect(await performPasswordUpdate(fakeClient(), form({ password: "historia42", confirm: "historia42" }))).toMatchObject({
      status: "success",
      redirectTo: "/conta",
    });
  });
});

describe("segurança dos redirecionamentos", () => {
  it("?next= só aceita caminhos internos", () => {
    expect(safeNextPath("/redefinir-senha")).toBe("/redefinir-senha");
    expect(safeNextPath("https://malicioso.com")).toBe("/conta");
    expect(safeNextPath("//malicioso.com")).toBe("/conta");
    expect(safeNextPath("/\\malicioso.com")).toBe("/conta");
    expect(safeNextPath(null)).toBe("/conta");
  });

  it("erros desconhecidos não expõem detalhes internos", () => {
    expect(authErrorMessage({ message: "pg: relation does not exist" })).toBe("Não foi possível concluir agora. Tente novamente em instantes.");
  });
});
