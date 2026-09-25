"use client";

import { useState } from "react";
import { CATEGORIES, TECH_FIELDS, type TechInfo } from "@/lib/constants";
import { Field, TextArea } from "../forms";
import { Icon } from "../icons";

type Defaults = {
  title?: string;
  description?: string;
  category?: string;
  tags?: string;
  visibility?: string;
  tech?: TechInfo;
};

/** Campos compartilhados entre publicar e editar vídeo. */
export function VideoDetailsFields({ defaults = {}, errors = {} }: { defaults?: Defaults; errors?: Record<string, string> }) {
  const [title, setTitle] = useState(defaults.title ?? "");
  const hasTech = Object.values(defaults.tech ?? {}).some(Boolean);
  const [techOpen, setTechOpen] = useState(hasTech);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Field
          label="Título *"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="Ex.: Olha o resultado da minha pizza hoje"
          error={errors.title}
          required
        />
        <p className="mt-1 text-right text-xs text-muted">{title.length}/100</p>
      </div>
      <TextArea
        label="Descrição"
        name="description"
        defaultValue={defaults.description}
        maxLength={5000}
        rows={5}
        placeholder="Conte o contexto: o que você fez, o que testou, o que deu certo ou errado."
        error={errors.description}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="label">
            Categoria *
          </label>
          <select id="category" name="category" defaultValue={defaults.category ?? ""} className={`input ${errors.category ? "border-tomato" : ""}`} required>
            <option value="" disabled>
              Escolha…
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.category && <p className="mt-1 text-xs text-tomato">{errors.category}</p>}
        </div>
        <div>
          <label htmlFor="visibility" className="label">
            Visibilidade
          </label>
          <select id="visibility" name="visibility" defaultValue={defaults.visibility ?? "public"} className="input">
            <option value="public">Público — aparece no feed e na busca</option>
            <option value="unlisted">Não listado — só quem tem o link</option>
          </select>
        </div>
      </div>
      <Field label="Tags" name="tags" defaultValue={defaults.tags} placeholder="biga, napolitana, forno a lenha" hint="Separe por vírgula. Ajudam a busca." />

      <div className="rounded-2xl border border-line">
        <button type="button" onClick={() => setTechOpen(!techOpen)} className="flex w-full items-center gap-3 p-4 text-left">
          <span className="flex size-9 items-center justify-center rounded-full bg-basil/10 text-basil">
            <Icon name="chef" size={18} />
          </span>
          <span className="flex-1">
            <span className="block font-semibold">Informações técnicas (opcional)</span>
            <span className="text-xs text-muted">Hidratação, farinha, fermentação, forno… Preencha só o que quiser.</span>
          </span>
          <Icon name="chevronDown" className={`transition ${techOpen ? "rotate-180" : ""}`} />
        </button>
        <div className={`grid gap-3 border-t border-line p-4 sm:grid-cols-2 ${techOpen ? "" : "hidden"}`}>
          {TECH_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} name={`tech_${f.key}`} defaultValue={defaults.tech?.[f.key]} placeholder={f.placeholder} maxLength={300} />
          ))}
        </div>
      </div>
    </div>
  );
}
