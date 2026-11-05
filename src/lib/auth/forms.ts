/**
 * Validação e regras dos formulários de conta. Funções puras: recebem o
 * cliente de autenticação como parâmetro (o Supabase no app, um dublê nos
 * testes) e devolvem o estado do formulário. Mensagens em pt-BR, sem
 * revelar se um e-mail está ou não cadastrado.
 */

export type FieldName = "email" | "password" | "confirm";

export interface AuthFormState {
  status: "idle" | "error" | "success" | "unconfigured";
  message: string | null;
  fieldErrors: Partial<Record<FieldName, string>>;
  /** E-mail digitado, para não apagar o campo após um erro. */
  email: string;
  /** Destino após sucesso (as actions fazem o redirect no servidor). */
  redirectTo?: string;
}

export const INITIAL_FORM_STATE: AuthFormState = { status: "idle", message: null, fieldErrors: {}, email: "" };

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

export const UNCONFIGURED_MESSAGE =
  "As contas ainda não estão ativadas neste ambiente: o Supabase não foi configurado. Nenhum dado foi enviado.";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Subconjunto do cliente Supabase Auth usado pelos formulários. */
export interface AuthClient {
  auth: {
    signInWithPassword(input: { email: string; password: string }): Promise<{ error: AuthLikeError | null }>;
    signUp(input: {
      email: string;
      password: string;
      options?: { emailRedirectTo?: string };
    }): Promise<{ data: { session: unknown | null }; error: AuthLikeError | null }>;
    resetPasswordForEmail(email: string, options?: { redirectTo?: string }): Promise<{ error: AuthLikeError | null }>;
    updateUser(input: { password: string }): Promise<{ error: AuthLikeError | null }>;
  };
}

export interface AuthLikeError {
  message: string;
  code?: string;
  status?: number;
}

export function readField(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v : "";
}

export function validateEmail(email: string): string | null {
  const v = email.trim();
  if (!v) return "Informe seu e-mail.";
  if (v.length > 254 || !EMAIL_RE.test(v)) return "Digite um e-mail válido, como nome@exemplo.com.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Informe uma senha.";
  if (password.length < PASSWORD_MIN) return `A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres.`;
  if (password.length > PASSWORD_MAX) return `A senha pode ter no máximo ${PASSWORD_MAX} caracteres.`;
  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) return "Use letras e números na senha.";
  return null;
}

/** Traduz erros do Supabase Auth para mensagens claras (sem expor detalhes internos). */
export function authErrorMessage(error: AuthLikeError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "E-mail ou senha incorretos.";
    case "email_not_confirmed":
      return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
    case "weak_password":
      return "Essa senha é fraca demais. Use uma senha mais longa, com letras e números.";
    case "same_password":
      return "A nova senha precisa ser diferente da atual.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
    case "signup_disabled":
      return "Novos cadastros estão desativados no momento.";
    case "session_not_found":
    case "session_expired":
      return "Sua sessão expirou. Abra novamente o link de recuperação enviado por e-mail.";
  }
  if (error.status === 429) return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
  if (/auth session missing/i.test(error.message)) return "Sessão não encontrada. Abra novamente o link de recuperação enviado por e-mail.";
  return "Não foi possível concluir agora. Tente novamente em instantes.";
}

const fail = (email: string, fieldErrors: AuthFormState["fieldErrors"], message: string | null = null): AuthFormState => ({
  status: "error",
  message,
  fieldErrors,
  email,
});

const unconfigured = (email: string): AuthFormState => ({ status: "unconfigured", message: UNCONFIGURED_MESSAGE, fieldErrors: {}, email });

export async function performLogin(client: AuthClient | null, form: FormData): Promise<AuthFormState> {
  const email = readField(form, "email").trim();
  const password = readField(form, "password");
  const fieldErrors: AuthFormState["fieldErrors"] = {};
  const emailError = validateEmail(email);
  if (emailError) fieldErrors.email = emailError;
  if (!password) fieldErrors.password = "Informe sua senha.";
  if (Object.keys(fieldErrors).length) return fail(email, fieldErrors);
  if (!client) return unconfigured(email);

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) return fail(email, {}, authErrorMessage(error));
  // Volta para onde a pessoa queria ir (só caminhos internos); por padrão, o painel.
  // Sem licença, /app manda para /conta, que não redireciona de volta: sem loop.
  return { status: "success", message: "Login feito.", fieldErrors: {}, email, redirectTo: safeNextPath(readField(form, "next"), "/app") };
}

export async function performSignup(client: AuthClient | null, form: FormData, confirmUrl: string): Promise<AuthFormState> {
  const email = readField(form, "email").trim();
  const password = readField(form, "password");
  const confirm = readField(form, "confirm");
  const fieldErrors: AuthFormState["fieldErrors"] = {};
  const emailError = validateEmail(email);
  if (emailError) fieldErrors.email = emailError;
  const passwordError = validatePassword(password);
  if (passwordError) fieldErrors.password = passwordError;
  if (!confirm) fieldErrors.confirm = "Repita a senha.";
  else if (confirm !== password) fieldErrors.confirm = "As senhas não são iguais.";
  if (Object.keys(fieldErrors).length) return fail(email, fieldErrors);
  if (!client) return unconfigured(email);

  const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: confirmUrl } });
  if (error) {
    // Não confirmar nem negar que o e-mail existe.
    if (error.code === "user_already_exists" || error.code === "email_exists") return checkInbox(email);
    return fail(email, {}, authErrorMessage(error));
  }
  if (data.session) return { status: "success", message: "Conta criada.", fieldErrors: {}, email, redirectTo: "/conta" };
  return checkInbox(email);
}

function checkInbox(email: string): AuthFormState {
  return {
    status: "success",
    message: `Se este e-mail puder ser cadastrado, enviamos um link de confirmação para ${email}. Abra-o para ativar sua conta.`,
    fieldErrors: {},
    email,
  };
}

export async function performResetRequest(client: AuthClient | null, form: FormData, redirectUrl: string): Promise<AuthFormState> {
  const email = readField(form, "email").trim();
  const emailError = validateEmail(email);
  if (emailError) return fail(email, { email: emailError });
  if (!client) return unconfigured(email);

  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
  if (error && (error.status === 429 || /rate_limit/.test(error.code ?? ""))) return fail(email, {}, authErrorMessage(error));
  // Mesma resposta para e-mails cadastrados ou não.
  return {
    status: "success",
    message: `Se existir uma conta com ${email}, você vai receber um link para criar uma nova senha.`,
    fieldErrors: {},
    email,
  };
}

export async function performPasswordUpdate(client: AuthClient | null, form: FormData): Promise<AuthFormState> {
  const password = readField(form, "password");
  const confirm = readField(form, "confirm");
  const fieldErrors: AuthFormState["fieldErrors"] = {};
  const passwordError = validatePassword(password);
  if (passwordError) fieldErrors.password = passwordError;
  if (!confirm) fieldErrors.confirm = "Repita a senha.";
  else if (confirm !== password) fieldErrors.confirm = "As senhas não são iguais.";
  if (Object.keys(fieldErrors).length) return fail("", fieldErrors);
  if (!client) return unconfigured("");

  const { error } = await client.auth.updateUser({ password });
  if (error) return fail("", {}, authErrorMessage(error));
  return { status: "success", message: "Senha atualizada.", fieldErrors: {}, email: "", redirectTo: "/conta" };
}

/** Aceita só caminhos internos (evita open redirect em ?next=). */
export function safeNextPath(next: string | null | undefined, fallback = "/conta"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
