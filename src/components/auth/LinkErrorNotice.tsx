"use client";

import { useSearchParams } from "next/navigation";

/** Mostra o aviso quando um link de e-mail (confirmação/recuperação) expirou ou é inválido. */
export function LinkErrorNotice() {
  const params = useSearchParams();
  if (params.get("erro") !== "link") return null;
  return (
    <p role="alert" className="mb-5 rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm leading-relaxed text-fg">
      Esse link expirou ou já foi usado. Entre com sua senha ou peça um novo link de recuperação.
    </p>
  );
}
