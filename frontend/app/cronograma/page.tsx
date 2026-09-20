"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  FileQuestion,
  Layers3,
  Moon,
  RotateCcw,
  Save,
  Sparkles,
  Sun,
  Sunset,
  Target,
} from "lucide-react";

import "../trilha/trilha.css";
import "../sidebar-pages.css";
import "./cronograma.css";
import Header from "../components/header";
import Sidebar from "../components/sidebar";
import { API_BASE, formatApiError } from "../lib/api";

type Periodo = "manha" | "tarde" | "noite";

type Atividade = {
  id: number;
  periodo: Periodo;
  periodo_label: string;
  tipo: "questoes" | "flashcards" | "simulado";
  area: string | null;
  titulo: string;
  descricao: string | null;
  duracao_minutos: number;
  quantidade: number | null;
  rota: string;
  concluida: boolean;
};

type DiaCronograma = {
  data: string;
  total_minutos: number;
  concluidas: number;
  total_atividades: number;
  atividades: Atividade[];
};

type Prioridade = {
  area: string;
  slug: string;
  respondidas: number;
  corretas: number;
  aproveitamento: number | null;
};

type CronogramaData = {
  configuracao: {
    horas_por_dia: number;
    minutos_por_dia: number;
    periodos: Periodo[];
    atualizado_em: string;
  };
  dias: DiaCronograma[];
  prioridades: Prioridade[];
  gerado_em: string;
};

const PERIODOS: Array<{ value: Periodo; label: string; icon: typeof Sun; detalhe: string }> = [
  { value: "manha", label: "Manhã", icon: Sun, detalhe: "antes do almoço" },
  { value: "tarde", label: "Tarde", icon: Sunset, detalhe: "depois do almoço" },
  { value: "noite", label: "Noite", icon: Moon, detalhe: "fim do dia" },
];

const ICONE_TIPO = {
  questoes: Target,
  flashcards: Layers3,
  simulado: FileQuestion,
};

function formatarDuracao(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (!horas) return `${resto} min`;
  if (!resto) return `${horas}h`;
  return `${horas}h ${resto}min`;
}

function formatarDia(data: string) {
  const dataLocal = new Date(`${data}T12:00:00`);
  const texto = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  }).format(dataLocal);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function CronogramaPage() {
  const router = useRouter();
  const [cronograma, setCronograma] = useState<CronogramaData | null>(null);
  const [horas, setHoras] = useState(2);
  const [periodos, setPeriodos] = useState<Periodo[]>(["tarde"]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login?next=/cronograma");
      return;
    }

    fetch(`${API_BASE}/cronograma`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(async (response) => {
        if (response.status === 401) {
          localStorage.removeItem("token");
          router.replace("/login?next=/cronograma");
          return null;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(formatApiError(data?.detail, "Não foi possível carregar o cronograma."));
        }
        return data as CronogramaData;
      })
      .then((data) => {
        if (!data) return;
        setCronograma(data);
        setHoras(data.configuracao.horas_por_dia);
        setPeriodos(data.configuracao.periodos);
      })
      .catch((err: Error) => setErro(err.message || "Não foi possível conectar ao servidor."))
      .finally(() => setCarregando(false));
  }, [router]);

  const resumoSemana = useMemo(() => {
    if (!cronograma) return { minutos: 0, atividades: 0, concluidas: 0 };
    return cronograma.dias.reduce(
      (acc, dia) => ({
        minutos: acc.minutos + dia.total_minutos,
        atividades: acc.atividades + dia.total_atividades,
        concluidas: acc.concluidas + dia.concluidas,
      }),
      { minutos: 0, atividades: 0, concluidas: 0 }
    );
  }, [cronograma]);

  function alternarPeriodo(periodo: Periodo) {
    setMensagem("");
    setErro("");
    setPeriodos((atual) => {
      if (atual.includes(periodo)) {
        if (atual.length === 1) return atual;
        return atual.filter((item) => item !== periodo);
      }
      return [...atual, periodo];
    });
  }

  async function salvarConfiguracao() {
    const token = localStorage.getItem("token");
    if (!token) return router.replace("/login?next=/cronograma");

    setSalvando(true);
    setErro("");
    setMensagem("");
    try {
      const response = await fetch(`${API_BASE}/cronograma/configuracao`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ horas_por_dia: horas, periodos }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(formatApiError(data?.detail, "Não foi possível salvar a configuração."));
      }
      setCronograma(data as CronogramaData);
      setMensagem("Preferências salvas e cronograma recalculado para os próximos 7 dias.");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar a configuração.");
    } finally {
      setSalvando(false);
    }
  }

  async function recalcular() {
    const token = localStorage.getItem("token");
    if (!token) return router.replace("/login?next=/cronograma");

    setRecalculando(true);
    setErro("");
    setMensagem("");
    try {
      const response = await fetch(`${API_BASE}/cronograma/gerar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(formatApiError(data?.detail, "Não foi possível recalcular o cronograma."));
      }
      setCronograma(data as CronogramaData);
      setMensagem("Cronograma recalculado usando seu desempenho mais recente.");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível recalcular o cronograma.");
    } finally {
      setRecalculando(false);
    }
  }

  async function marcarAtividade(atividade: Atividade) {
    const token = localStorage.getItem("token");
    if (!token) return router.replace("/login?next=/cronograma");

    const novoEstado = !atividade.concluida;
    try {
      const response = await fetch(`${API_BASE}/cronograma/atividades/${atividade.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ concluida: novoEstado }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(formatApiError(data?.detail, "Não foi possível atualizar a atividade."));
      }

      setCronograma((atual) => {
        if (!atual) return atual;
        return {
          ...atual,
          dias: atual.dias.map((dia) => {
            const contem = dia.atividades.some((item) => item.id === atividade.id);
            if (!contem) return dia;
            const novasAtividades = dia.atividades.map((item) =>
              item.id === atividade.id ? { ...item, concluida: novoEstado } : item
            );
            return {
              ...dia,
              atividades: novasAtividades,
              concluidas: novasAtividades.filter((item) => item.concluida).length,
            };
          }),
        };
      });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível atualizar a atividade.");
    }
  }

  if (carregando) return null;

  return (
    <main className="dashboard">
      <Header />
      <div className="dashboard-body dashboard-body--sidebar-page">
        <Sidebar />
        <section className="sidebar-page-content">
          <div className="sidebar-page-shell cronograma-shell">
            <span className="sidebar-page-kicker"><Sparkles size={14} /> Plano inteligente</span>
            <div className="cronograma-heading-row">
              <div>
                <h1 className="sidebar-page-title">Cronograma de estudos</h1>
                <p className="sidebar-page-subtitle">
                  Informe seu tempo disponível. O LumoStudy distribui blocos de questões das quatro áreas,
                  revisões por flashcards e simulados ao longo da semana. Você pode ajustar cada bloco antes de começar.
                </p>
              </div>
              <button type="button" className="secondary-action" onClick={recalcular} disabled={recalculando}>
                <RotateCcw size={17} /> {recalculando ? "Recalculando..." : "Recalcular plano"}
              </button>
            </div>

            {erro && <div className="inline-message error">{erro}</div>}
            {mensagem && <div className="inline-message success">{mensagem}</div>}

            <div className="cronograma-hero-grid">
              <div className="feature-hero cronograma-hero">
                <Brain size={28} />
                <h2>Seu plano se adapta ao desempenho</h2>
                <p>
                  As áreas com menor aproveitamento recebem mais atenção, mas o ciclo continua cobrindo Linguagens,
                  Humanas, Matemática e Natureza. Ao evoluir, use “Recalcular plano” para atualizar as prioridades.
                </p>
                <div className="hero-stat-row">
                  <span className="hero-pill"><Clock3 size={15} /> {formatarDuracao(resumoSemana.minutos)} na semana</span>
                  <span className="hero-pill"><CalendarDays size={15} /> 7 dias planejados</span>
                  <span className="hero-pill"><CheckCircle2 size={15} /> {resumoSemana.concluidas}/{resumoSemana.atividades} concluídas</span>
                </div>
              </div>

              <div className="page-card cronograma-priority-card">
                <div className="page-card-header">
                  <div>
                    <h3>Prioridade atual</h3>
                    <p>Calculada pelos seus acertos.</p>
                  </div>
                </div>
                <div className="priority-list">
                  {(cronograma?.prioridades || []).map((item, index) => (
                    <div className="priority-row" key={item.slug}>
                      <span className="priority-position">{index + 1}</span>
                      <div>
                        <strong>{item.area}</strong>
                        <small>
                          {item.aproveitamento === null
                            ? "Ainda sem histórico de questões"
                            : `${item.aproveitamento}% de acerto em ${item.respondidas} questões`}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="page-card cronograma-config-card">
              <div className="page-card-header">
                <div>
                  <h3>Quando você consegue estudar?</h3>
                  <p>O total informado será distribuído entre os períodos selecionados.</p>
                </div>
              </div>

              <div className="cronograma-config-grid">
                <label className="hours-field">
                  <span>Horas por dia</span>
                  <div className="hours-input-wrap">
                    <Clock3 size={18} />
                    <input
                      type="number"
                      min="1"
                      max="10"
                      step="0.5"
                      value={horas}
                      onChange={(event) => setHoras(Math.min(10, Math.max(1, Number(event.target.value) || 1)))}
                    />
                  </div>
                  <small>De 1 a 10 horas por dia. Você pode usar valores como 1,5 ou 2,5.</small>
                </label>

                <div className="period-picker">
                  <span className="period-picker-title">Partes do dia</span>
                  <div className="period-grid">
                    {PERIODOS.map(({ value, label, icon: Icon, detalhe }) => {
                      const ativo = periodos.includes(value);
                      return (
                        <button
                          type="button"
                          key={value}
                          className={`period-card ${ativo ? "selected" : ""}`}
                          onClick={() => alternarPeriodo(value)}
                        >
                          <Icon size={20} />
                          <strong>{label}</strong>
                          <small>{detalhe}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="config-actions">
                <span className="muted">Ao salvar, os próximos 7 dias são reorganizados.</span>
                <button type="button" className="primary-action" onClick={salvarConfiguracao} disabled={salvando}>
                  <Save size={17} /> {salvando ? "Salvando..." : "Salvar e gerar cronograma"}
                </button>
              </div>
            </div>

            <div className="cronograma-week">
              {(cronograma?.dias || []).map((dia, diaIndex) => (
                <article className="page-card cronograma-day-card" key={dia.data}>
                  <div className="cronograma-day-head">
                    <div>
                      <span className="day-number">Dia {diaIndex + 1}</span>
                      <h3>{formatarDia(dia.data)}</h3>
                    </div>
                    <div className="day-summary">
                      <span><Clock3 size={15} /> {formatarDuracao(dia.total_minutos)}</span>
                      <span><CheckCircle2 size={15} /> {dia.concluidas}/{dia.total_atividades}</span>
                    </div>
                  </div>

                  <div className="cronograma-activities">
                    {dia.atividades.map((atividade) => {
                      const IconeTipo = ICONE_TIPO[atividade.tipo] || Target;
                      return (
                        <div className={`cronograma-activity ${atividade.concluida ? "done" : ""}`} key={atividade.id}>
                          <button
                            type="button"
                            className="activity-check"
                            onClick={() => marcarAtividade(atividade)}
                            aria-label={atividade.concluida ? "Marcar como pendente" : "Marcar como concluída"}
                          >
                            {atividade.concluida ? <CheckCircle2 size={23} /> : <Circle size={23} />}
                          </button>

                          <div className={`activity-icon type-${atividade.tipo}`}>
                            <IconeTipo size={20} />
                          </div>

                          <div className="activity-main">
                            <div className="activity-meta">
                              <span>{atividade.periodo_label}</span>
                              <span>{formatarDuracao(atividade.duracao_minutos)}</span>
                              {atividade.quantidade && <span>{atividade.quantidade} questões</span>}
                            </div>
                            <strong>{atividade.titulo}</strong>
                            {atividade.descricao && <p>{atividade.descricao}</p>}
                          </div>

                          <Link className="secondary-action activity-open" href={atividade.rota}>
                            Abrir
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
