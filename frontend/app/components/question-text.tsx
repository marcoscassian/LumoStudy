import type { ReactNode } from "react";

type QuestionTextProps = {
  text: string;
  className?: string;
};

export const NOMES_DISCIPLINAS: Record<string, string> = {
  linguagens: "Linguagens",
  "ciencias-humanas": "Ciências Humanas",
  "ciencias-humana": "Ciências Humanas",
  matematica: "Matemática",
  "ciencias-natureza": "Ciências da Natureza",
};

export function nomeDisciplina(disciplina?: string | null) {
  const chave = disciplina?.trim().toLowerCase();
  return chave ? NOMES_DISCIPLINAS[chave] || disciplina : "Questão";
}

export function anoDaProva(prova: string) {
  return prova.match(/ENEM(\d{4})/i)?.[1] || prova;
}

function renderInline(text: string): ReactNode[] {
  const partes = text.split(/(\*\*[^*]+\*\*)/g);

  return partes.map((parte, indice) => {
    if (parte.startsWith("**") && parte.endsWith("**")) {
      return <strong key={indice}>{parte.slice(2, -2)}</strong>;
    }
    return <span key={indice}>{parte}</span>;
  });
}

function ehFonte(texto: string) {
  const inicio = texto.trim().split("\n", 1)[0];
  const referenciaExplicita = /\b(?:fonte|fontes|referência|referências|disponível em|acesso em|adaptado de)\b/i.test(texto);
  const citacaoBibliografica = /\b(?:19|20)\d{2}\b/.test(texto)
    && (/^[A-ZÀ-Ý][A-ZÀ-Ý. '’()-]+,\s*[A-Z]/.test(inicio) || /\bet al\./i.test(inicio));
  return referenciaExplicita || citacaoBibliografica;
}

export default function QuestionText({ text, className = "" }: QuestionTextProps) {
  const paragrafos = text.split(/\n{2,}/);

  return (
    <div className={`question-text ${className}`.trim()}>
      {paragrafos.map((paragrafo, indice) => (
        <span key={indice} className={ehFonte(paragrafo) ? "question-text-source" : undefined}>
          {paragrafo.split("\n").map((linha, linhaIndice) => (
            <span key={linhaIndice} className={ehFonte(linha) ? "question-text-source" : undefined}>
              {renderInline(linha)}
              {linhaIndice < paragrafo.split("\n").length - 1 && <br />}
            </span>
          ))}
          {indice < paragrafos.length - 1 && <><br /><br /></>}
        </span>
      ))}
    </div>
  );
}