"use client";

import { Fragment, useEffect, useRef } from "react";
import { Check, Crown, LockKeyhole, Sparkles } from "lucide-react";

import styles from "./level-progress.module.css";

export type LevelProgressData = {
  nivel_atual: number;
  nome_nivel_atual: string;
  xp_total: number;
  questoes_contabilizadas: number;
  xp_inicio_nivel: number;
  xp_proximo_nivel: number | null;
  xp_restante: number;
  progresso_percentual: number;
  xp_na_faixa: number;
  xp_total_faixa: number;
  numero_proximo_nivel: number | null;
  nome_proximo_nivel: string | null;
  questoes_restantes: number;
  nivel_maximo: boolean;
};

export type LevelPathItem = {
  numero: number;
  nome: string;
  xp: number;
  questoes: number;
  status: "concluido" | "atual" | "bloqueado";
};

type LevelProgressProps = {
  progressao: LevelProgressData;
  titulo?: string;
};

type LevelPathProps = {
  progressao: LevelProgressData;
  niveis: LevelPathItem[];
};

function numero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

export function LevelProgress({ progressao, titulo = "Sua progressão mágica" }: LevelProgressProps) {
  const percentual = Math.min(100, Math.max(0, Number(progressao.progresso_percentual || 0)));

  return (
    <section className={styles.summary} aria-label="Resumo da progressão de nível">
      <div className={styles.summaryHeading}>
        <div className={styles.summaryIcon}><Sparkles size={20} /></div>
        <div>
          <span>{titulo}</span>
          <h3>{progressao.nome_nivel_atual}</h3>
          <p>Nível {progressao.nivel_atual}</p>
        </div>
      </div>

      <div className={styles.summaryNumbers}>
        <div><strong>{numero(progressao.xp_total)} XP</strong><span>experiência válida</span></div>
        <div><strong>{numero(progressao.questoes_contabilizadas)}</strong><span>questões contabilizadas</span></div>
      </div>

      <div className={styles.progressArea}>
        <div className={styles.progressCopy}>
          {progressao.nivel_maximo ? (
            <strong>Nível máximo alcançado</strong>
          ) : (
            <>
              <span>Progresso para <strong>{progressao.nome_proximo_nivel}</strong></span>
              <strong>{percentual.toLocaleString("pt-BR")}%</strong>
            </>
          )}
        </div>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentual}
          aria-label={progressao.nivel_maximo ? "Nível máximo alcançado" : `Progresso para ${progressao.nome_proximo_nivel}`}
        >
          <div className={styles.progressFill} style={{ width: `${percentual}%` }} />
        </div>
        {progressao.nivel_maximo ? (
          <p className={styles.maximumCopy}>Toda a Trilha do Mundo Bruxo foi concluída.</p>
        ) : (
          <div className={styles.remainingRow}>
            <span>{numero(progressao.xp_na_faixa)} de {numero(progressao.xp_total_faixa)} XP nesta faixa</span>
            <span>Faltam <strong>{numero(progressao.xp_restante)} XP</strong> · <strong>{numero(progressao.questoes_restantes)} questões</strong></span>
          </div>
        )}
      </div>
    </section>
  );
}

export function LevelPath({ progressao, niveis }: LevelPathProps) {
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const atual = viewport?.querySelector<HTMLElement>("[data-current='true']");
    if (!viewport || !atual) return;

    const esquerda = atual.offsetLeft - (viewport.clientWidth - atual.offsetWidth) / 2;
    viewport.scrollTo({ left: Math.max(0, esquerda), behavior: "smooth" });
  }, [progressao.nivel_atual, niveis]);

  function percentualSegmento(numeroNivel: number) {
    if (numeroNivel < progressao.nivel_atual) return 100;
    if (numeroNivel === progressao.nivel_atual && !progressao.nivel_maximo) {
      return Math.min(100, Math.max(0, Number(progressao.progresso_percentual || 0)));
    }
    return 0;
  }

  return (
    <div className={styles.pathViewport} ref={viewportRef} tabIndex={0} aria-label="Trilha horizontal dos níveis">
      <div className={styles.pathTrack}>
        {niveis.map((nivel, indice) => (
          <Fragment key={nivel.numero}>
            <article
              className={`${styles.levelNode} ${styles[nivel.status]}`}
              data-current={nivel.status === "atual" ? "true" : undefined}
              aria-label={`Nível ${nivel.numero}: ${nivel.nome}, ${numero(nivel.xp)} XP, ${numero(nivel.questoes)} questões`}
            >
              <div className={styles.marker}>
                {nivel.status === "concluido" ? <Check size={20} /> : nivel.status === "atual" ? <Crown size={21} /> : <LockKeyhole size={17} />}
              </div>
              <span className={styles.levelNumber}>Nível {nivel.numero}</span>
              <h4>{nivel.nome}</h4>
              <p><strong>{numero(nivel.xp)} XP</strong><span>{numero(nivel.questoes)} questões</span></p>
              {nivel.status === "atual" && <small>Você está aqui</small>}
            </article>

            {indice < niveis.length - 1 && (
              <div className={styles.segment} aria-hidden="true">
                <div style={{ width: `${percentualSegmento(nivel.numero)}%` }} />
                {nivel.numero === progressao.nivel_atual && !progressao.nivel_maximo && (
                  <span>{Number(progressao.progresso_percentual || 0).toLocaleString("pt-BR")}%</span>
                )}
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
