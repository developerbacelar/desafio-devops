"use client";

import { useState, type FormEvent } from "react";
import { z } from "zod";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export interface CompanyFormValues {
  slug: string;
  name: string;
  persona: string;
  primaryColor: string;
  logoUrl: string;
}

const nameSchema = z.string().trim().min(1, "Nome e obrigatorio.");
const personaSchema = z.string().trim().min(1, "Persona e obrigatoria.");
const primaryColorSchema = z.string().regex(COLOR_PATTERN, "Cor primaria invalida. Use o formato #rrggbb.");

// Campos declarados nesta ordem (slug primeiro) para que, com varios campos
// invalidos ao mesmo tempo, o primeiro issue do Zod seja sempre o mesmo campo
// que a validacao manual anterior reportava primeiro.
const createValuesSchema = z.object({
  slug: z.string().regex(SLUG_PATTERN, "Slug invalido. Use letras minusculas, numeros e hifens (ex: minha-empresa)."),
  name: nameSchema,
  persona: personaSchema,
  primaryColor: primaryColorSchema,
  logoUrl: z.string(),
});

const editValuesSchema = z.object({
  slug: z.string().regex(SLUG_PATTERN, "Slug invalido. Use letras minusculas, numeros e hifens (ex: minha-empresa)."),
  name: nameSchema,
  persona: personaSchema,
  primaryColor: primaryColorSchema,
  logoUrl: z.string(),
});

interface CompanyFormProps {
  mode: "create" | "edit";
  initialValues: CompanyFormValues;
  submitLabel: string;
  onSubmit: (values: CompanyFormValues) => Promise<void>;
}

export function CompanyForm({ mode, initialValues, submitLabel, onSubmit }: CompanyFormProps) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    const schema = mode === "create" ? createValuesSchema : editValuesSchema;
    const result = schema.safeParse(values);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(result.data);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar a empresa.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm" htmlFor="company-slug">
        Slug
        <input
          id="company-slug"
          value={values.slug}
          onChange={(event) => setValues({ ...values, slug: event.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      {mode === "edit" ? (
        <p className="text-xs text-amber-700">
          Alterar o slug quebra widgets já publicados em sites de clientes até o{" "}
          <code>data-company</code> do script ser atualizado.
        </p>
      ) : null}
      <label className="flex flex-col gap-1 text-sm" htmlFor="company-name">
        Nome
        <input
          id="company-name"
          value={values.name}
          onChange={(event) => setValues({ ...values, name: event.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm" htmlFor="company-persona">
        Persona
        <textarea
          id="company-persona"
          value={values.persona}
          onChange={(event) => setValues({ ...values, persona: event.target.value })}
          rows={4}
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm" htmlFor="company-color">
        Cor primaria
        <div className="flex items-center gap-2">
          <input
            id="company-color"
            value={values.primaryColor}
            onChange={(event) => setValues({ ...values, primaryColor: event.target.value })}
            placeholder="#2563eb"
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
          <span
            aria-hidden="true"
            style={{ backgroundColor: COLOR_PATTERN.test(values.primaryColor) ? values.primaryColor : "#e2e8f0" }}
            className="h-8 w-8 shrink-0 rounded-full border border-slate-300"
          />
        </div>
      </label>
      <label className="flex flex-col gap-1 text-sm" htmlFor="company-logo">
        Logo (URL, opcional)
        <input
          id="company-logo"
          value={values.logoUrl}
          onChange={(event) => setValues({ ...values, logoUrl: event.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
        {values.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={values.logoUrl} alt="Preview do logo" className="mt-1 h-10 max-w-[160px] object-contain" />
        ) : null}
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {saved ? <p className="text-sm text-green-600">Salvo com sucesso.</p> : null}
      <button
        type="submit"
        disabled={submitting}
        className="w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}
