"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FileText, Target, X } from "lucide-react";

const NOMES_AREAS: Record<string, string> = {
  linguagens: "Linguagens",
  "ciencias-humanas": "Ciências Humanas",
  matematica: "Matemática",
  "ciencias-natureza": "Ciências da Natureza",
};

const QUANTIDADES = [5, 10, 15, 20] as const;

type Props = {
  area: string;
  quantidadeInicial: number;
  onClose: () => void;
};

export default function StudyChoiceModal({ area, quantidadeInicial, onClose }: Props) {
  const router = useRouter();
  const [modo, setModo] = useState<"bloco" | "simulado">("bloco");
  const [quantidade, setQuantidade] = useState(quantidadeInicial);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const modalRef = useRef<HTMLElement>(null);
  const diaSimulado = area === "linguagens" || area === "ciencias-humanas" ? 1 : 2;

  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;
    const focoAnterior = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    tituloRef.current?.focus();
    const tratarTeclado = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "Tab") {
        const botoes = modalRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])");
        if (!botoes?.length) return;
        const primeiro = botoes[0];
        const ultimo = botoes[botoes.length - 1];
        if (event.shiftKey && (document.activeElement === primeiro || document.activeElement === tituloRef.current)) {
          event.preventDefault();
          ultimo.focus();
        } else if (!event.shiftKey && document.activeElement === ultimo) {
          event.preventDefault();
          primeiro.focus();
        }
      }
    };
    window.addEventListener("keydown", tratarTeclado);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", tratarTeclado);
      if (focoAnterior?.isConnected) focoAnterior.focus();
    };
  }, [onClose]);

  function continuar() {
    if (modo === "simulado") {
      router.push(`/simulados?dia=${diaSimulado}`);
      return;
    }
    router.push(`/trilha/sessao?area=${encodeURIComponent(area)}&quantidade=${quantidade}`);
  }

  return (
    <div className="study-choice-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section ref={modalRef} className="study-choice-modal" role="dialog" aria-modal="true" aria-labelledby="study-choice-title" aria-describedby="study-choice-description">
        <button type="button" className="study-choice-close" onClick={onClose} aria-label="Fechar opções de estudo">
          <X size={20} />
        </button>
        <span className="study-choice-eyebrow">Trilha de Estudos</span>
        <h2 id="study-choice-title" ref={tituloRef} tabIndex={-1}>Como você quer estudar?</h2>
        <p id="study-choice-description">{NOMES_AREAS[area]}</p>

        <div className="study-choice-modes" role="group" aria-label="Tipo de atividade">
          <button type="button" className={`study-choice-mode ${modo === "bloco" ? "selected" : ""}`} aria-pressed={modo === "bloco"} onClick={() => setModo("bloco") }>
            <Target size={22} />
            <strong>Bloco de questões</strong>
            <span>Pratique apenas esta área.</span>
          </button>
          <button type="button" className={`study-choice-mode ${modo === "simulado" ? "selected" : ""}`} aria-pressed={modo === "simulado"} onClick={() => setModo("simulado") }>
            <FileText size={22} />
            <strong>Fazer um simulado</strong>
            <span>Treine no formato do ENEM.</span>
          </button>
        </div>

        {modo === "bloco" ? (
          <div className="study-choice-details">
            <span className="study-choice-label">Quantas questões?</span>
            <div className="study-choice-quantities" role="group" aria-label="Quantidade de questões">
              {QUANTIDADES.map((valor) => (
                <button key={valor} type="button" className={quantidade === valor ? "selected" : ""} aria-pressed={quantidade === valor} onClick={() => setQuantidade(valor)}>
                  {valor}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="study-choice-note">
            O Dia {diaSimulado} reúne {diaSimulado === 1 ? "Linguagens e Ciências Humanas" : "Ciências da Natureza e Matemática"}. Na próxima tela você escolhe 25 ou 90 questões.
          </p>
        )}

        <button type="button" className="study-choice-start" onClick={continuar}>
          {modo === "bloco" ? `Começar bloco de ${quantidade} questões` : "Configurar simulado"}
          <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
}
