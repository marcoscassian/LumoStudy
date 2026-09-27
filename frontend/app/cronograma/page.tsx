"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  CalendarDays,
  CheckCircle2,
  Circle,
  Coffee,
  Clock3,
  FileQuestion,
  Layers3,
  RotateCcw,
  Save,
  Sparkles,
  Target,
} from "lucide-react";

import "../trilha/trilha.css";
import "../sidebar-pages.css";
import "./cronograma.css";
import Header from "../components/header";
import Sidebar from "../components/sidebar";
import { API_BASE, formatApiError } from "../lib/api";

type Periodo = "manha" | "tarde" | "noite";
type PausaDia = { inicio: string; fim: string };
type RotinaDia = { inicio: string; fim: string; pausas: PausaDia[] };

type Atividade = {
  id: number;
  periodo: Periodo;
  periodo_label: string;
  inicio_hora: string | null;
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
    inicio_hora: string;
    fim_hora: string;
    pausa_inicio: string | null;
    pausa_fim: string | null;
    dias_semana: number[];
    prioridades: Record<string, number>;
    rotina_semana: Record<string, RotinaDia>;
    atualizado_em: string;
  };
  dias: DiaCronograma[];
  prioridades: Prioridade[];
  gerado_em: string;
};

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const PRESETS = [
  { id: "equilibrado", nome: "Equilíbrio", valores: [25, 25, 25, 25] },
  { id: "constante", nome: "Mais foco", valores: [30, 30, 20, 20] },
  { id: "intensivo", nome: "Intensivo", valores: [70, 10, 10, 10] },
];
const ROTINA_PADRAO: RotinaDia = { inicio: "13:00", fim: "17:00", pausas: [] };

function minutosHorario(horario: string) {
  const [hora, minuto] = horario.split(":").map(Number);
  return hora * 60 + minuto;
}

function formatarHora(minutos: number) {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

function duracaoRotina(rotina: RotinaDia) {
  return minutosHorario(rotina.fim) - minutosHorario(rotina.inicio)
    - rotina.pausas.reduce((total, pausa) => total + minutosHorario(pausa.fim) - minutosHorario(pausa.inicio), 0);
}

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
  const [editandoCronograma, setEditandoCronograma] = useState(true);
  const [diasSemana, setDiasSemana] = useState<number[]>([0, 1, 2, 3, 4]);
  const [rotinaSemana, setRotinaSemana] = useState<Record<number, RotinaDia>>({});
  const [prioridades, setPrioridades] = useState<Record<string, number>>({});
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
        setEditandoCronograma(!Object.keys(data.configuracao.prioridades || {}).length);
        setDiasSemana(data.configuracao.dias_semana || [0, 1, 2, 3, 4]);
        const rotinaSalva = data.configuracao.rotina_semana || {};
        const rotinaPadrao = { inicio: data.configuracao.inicio_hora || "13:00", fim: data.configuracao.fim_hora || "17:00", pausas: data.configuracao.pausa_inicio && data.configuracao.pausa_fim ? [{ inicio: data.configuracao.pausa_inicio, fim: data.configuracao.pausa_fim }] : [] };
        setRotinaSemana(Object.fromEntries(DIAS.map((_, dia) => [dia, rotinaSalva[dia] || rotinaPadrao])));
        const shares = data.configuracao.prioridades || {};
        setPrioridades(Object.keys(shares).length ? shares : Object.fromEntries(data.prioridades.map((area) => [area.slug, 25])));
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

  function alternarDia(dia: number) {
    setDiasSemana((atuais) => atuais.includes(dia) ? atuais.filter((item) => item !== dia) : [...atuais, dia].sort());
    setRotinaSemana((atuais) => ({ ...atuais, [dia]: atuais[dia] || { ...ROTINA_PADRAO, pausas: [] } }));
  }

  function atualizarRotina(dia: number, atualizacao: Partial<RotinaDia>) {
    setRotinaSemana((atuais) => ({ ...atuais, [dia]: { ...(atuais[dia] || ROTINA_PADRAO), ...atualizacao } }));
  }

  function adicionarPausa(dia: number) {
    const rotina = rotinaSemana[dia] || ROTINA_PADRAO;
    const inicio = minutosHorario(rotina.inicio);
    const fim = minutosHorario(rotina.fim);
    let novaPausa: PausaDia | null = null;
    const candidatos = [];
    for (let candidato = inicio + 15; candidato + 15 <= fim; candidato += 15) candidatos.push(candidato);
    candidatos.sort((a, b) => Math.abs(a + 7.5 - (inicio + fim) / 2) - Math.abs(b + 7.5 - (inicio + fim) / 2));
    for (const candidato of candidatos) {
      const livre = rotina.pausas.every((pausa) => candidato + 15 <= minutosHorario(pausa.inicio) || candidato >= minutosHorario(pausa.fim));
      if (livre) {
        novaPausa = { inicio: formatarHora(candidato), fim: formatarHora(candidato + 15) };
        break;
      }
    }
    if (novaPausa && rotina.pausas.length < 8) atualizarRotina(dia, { pausas: [...rotina.pausas, novaPausa].sort((a, b) => a.inicio.localeCompare(b.inicio)) });
  }

  function atualizarPausa(dia: number, indice: number, campo: keyof PausaDia, valor: string) {
    const rotina = rotinaSemana[dia] || ROTINA_PADRAO;
    atualizarRotina(dia, { pausas: rotina.pausas.map((pausa, i) => i === indice ? { ...pausa, [campo]: valor } : pausa) });
  }

function rotinaValida(dia: number) {
    const rotina = rotinaSemana[dia];
    if (!rotina || !Number.isFinite(minutosHorario(rotina.fim)) || !Number.isFinite(minutosHorario(rotina.inicio)) || minutosHorario(rotina.fim) <= minutosHorario(rotina.inicio)) return false;
    if (duracaoRotina(rotina) < 60 || duracaoRotina(rotina) > 600) return false;
    let fimAnterior = minutosHorario(rotina.inicio);
    for (const pausa of [...rotina.pausas].sort((a, b) => a.inicio.localeCompare(b.inicio))) {
      if (!Number.isFinite(minutosHorario(pausa.inicio)) || !Number.isFinite(minutosHorario(pausa.fim))) return false;
      const pausaInicioMin = minutosHorario(pausa.inicio);
      const pausaFimMin = minutosHorario(pausa.fim);
      if (pausaInicioMin < fimAnterior || pausaFimMin <= pausaInicioMin || pausaFimMin > minutosHorario(rotina.fim)) return false;
      fimAnterior = pausaFimMin;
    }
    return rotina.pausas.length <= 8;
  }

  function selecionarPreset(valores: number[]) {
    const areas = cronograma?.prioridades || [];
    setPrioridades(Object.fromEntries(areas.map((area, index) => [area.slug, valores[index] ?? 25])));
  }

  function ajustarPrioridade(slug: string, percentual: number) {
    setPrioridades((atuais) => ({ ...atuais, [slug]: percentual }));
  }

  const totalPrioridades = Object.values(prioridades).reduce((soma, valor) => soma + valor, 0);

  const rotinasValidas = diasSemana.length > 0 && diasSemana.every(rotinaValida);

  async function salvarConfiguracao() {
    const token = localStorage.getItem("token");
    if (!token) return router.replace("/login?next=/cronograma");

    setSalvando(true);
    setErro("");
    setMensagem("");
    try {
      const rotinasSelecionadas = diasSemana.map((dia) => rotinaSemana[dia] || ROTINA_PADRAO);
      const minutosMedios = rotinasSelecionadas.reduce((total, rotina) => total + duracaoRotina(rotina), 0) / rotinasSelecionadas.length;
      const periodosCompativeis = [...new Set(rotinasSelecionadas.map((rotina) => {
        const hora = minutosHorario(rotina.inicio);
        return hora < 12 * 60 ? "manha" : hora < 18 * 60 ? "tarde" : "noite";
      }))];
      const response = await fetch(`${API_BASE}/cronograma/configuracao`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inicio_hora: rotinaSemana[diasSemana[0]]?.inicio || "13:00",
          fim_hora: rotinaSemana[diasSemana[0]]?.fim || "17:00",
          pausa_inicio: rotinaSemana[diasSemana[0]]?.pausas[0]?.inicio || null,
          pausa_fim: rotinaSemana[diasSemana[0]]?.pausas[0]?.fim || null,
          dias_semana: diasSemana,
          rotina_semana: Object.fromEntries(DIAS.map((_, dia) => [dia, rotinaSemana[dia] || ROTINA_PADRAO])),
          prioridades,
          horas_por_dia: minutosMedios / 60,
          periodos: periodosCompativeis.length ? periodosCompativeis : ["tarde"],
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(formatApiError(data?.detail, "Não foi possível salvar a configuração."));
      }
      setCronograma(data as CronogramaData);
      setPrioridades(data.configuracao.prioridades || prioridades);
      setEditandoCronograma(false);
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
                <p className="sidebar-page-subtitle">Escolha seus dias, horários, pausas e percentuais de foco. O cronograma organiza blocos de questões dentro da rotina que você definir.</p>
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
                <p>Você define quanto tempo quer dedicar a cada área. Seus acertos ficam visíveis aqui para ajudar a escolher onde concentrar o foco.</p>
                <div className="hero-stat-row">
                  <span className="hero-pill"><Clock3 size={15} /> {formatarDuracao(resumoSemana.minutos)} nos próximos estudos</span>
                  <span className="hero-pill"><CalendarDays size={15} /> 7 dias de estudo</span>
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

            {editandoCronograma && <div className="page-card cronograma-config-card">
              <div className="page-card-header">
                <div>
                  <h3>Monte sua rotina da semana</h3>
                  <p>Escolha seus dias, horários e pausas. O plano respeita sua rotina diária.</p>
                </div>
              </div>

              <div className="routine-section">
                <span className="period-picker-title">Quais dias você estuda?</span>
                <div className="weekday-picker">
                  {DIAS.map((dia, index) => (
                    <button type="button" key={dia} className={diasSemana.includes(index) ? "selected" : ""} aria-pressed={diasSemana.includes(index)} onClick={() => alternarDia(index)}>{dia}</button>
                  ))}
                </div>
              </div>

              <div className="weekly-routines">
                {diasSemana.map((dia) => {
                  const rotina = rotinaSemana[dia] || ROTINA_PADRAO;
                  return (
                    <section className="daily-routine-card" key={dia}>
                      <div className="daily-routine-heading"><div><h4>{DIAS[dia]}</h4><span>{formatarDuracao(duracaoRotina(rotina))} líquidos para estudar</span></div></div>
                      <div className="routine-time-grid">
                        <label className="hours-field"><span>Começa às</span><div className="hours-input-wrap"><Clock3 size={18}/><input type="time" value={rotina.inicio} onChange={(event) => atualizarRotina(dia, { inicio: event.target.value })}/></div></label>
                        <label className="hours-field"><span>Termina às</span><div className="hours-input-wrap"><Clock3 size={18}/><input type="time" value={rotina.fim} onChange={(event) => atualizarRotina(dia, { fim: event.target.value })}/></div></label>
                      </div>
                      <div className="daily-breaks">
                        <div className="daily-breaks-heading"><strong><Coffee size={16}/> Pausas</strong><button type="button" onClick={() => adicionarPausa(dia)} disabled={rotina.pausas.length >= 8}>+ Adicionar pausa</button></div>
                        {rotina.pausas.length === 0 && <small className="no-breaks">Sem pausas neste dia.</small>}
                        {rotina.pausas.map((pausa, indice) => <div className="daily-break-row" key={`${dia}-${indice}`}><span>Pausa {indice + 1}</span><label>Começa<input type="time" value={pausa.inicio} onChange={(event) => atualizarPausa(dia, indice, "inicio", event.target.value)}/></label><span>até</span><label>Volta<input type="time" value={pausa.fim} onChange={(event) => atualizarPausa(dia, indice, "fim", event.target.value)}/></label><button type="button" className="remove-break" aria-label={`Remover pausa ${indice + 1} de ${DIAS[dia]}`} onClick={() => atualizarRotina(dia, { pausas: rotina.pausas.filter((_, i) => i !== indice) })}>Remover</button></div>)}
                        {!rotinaValida(dia) && <small className="daily-routine-error">Confira os horários e as pausas. É preciso ter ao menos 1 hora líquida de estudo.</small>}
                      </div>
                    </section>
                  );
                })}
              </div>
              <div className="routine-priorities">
                <div className="routine-priority-heading"><div><span className="period-picker-title">Como dividir seu foco?</span><small>Defina cada área individualmente. A soma precisa fechar em 100%.</small></div><strong className={totalPrioridades === 100 ? "" : "invalid"}>{totalPrioridades}%</strong></div>
                <div className="priority-presets">{PRESETS.map((preset) => <button type="button" key={preset.id} onClick={() => selecionarPreset(preset.valores)}>{preset.nome}<small>{preset.valores.join(" / ")}%</small></button>)}</div>
                <div className="priority-sliders">{(cronograma?.prioridades || []).map((area) => <label key={area.slug}><span>{area.area}</span><div className="priority-number"><input type="number" min="0" max="100" step="1" value={prioridades[area.slug] ?? 0} onChange={(event) => ajustarPrioridade(area.slug, Math.max(0, Math.min(100, Number(event.target.value) || 0)))}/><strong>%</strong></div></label>)}</div>
                <p className={`priority-help ${totalPrioridades === 100 ? "valid" : "invalid"}`} role="status">{totalPrioridades === 100 ? "Distribuição correta: 100%." : `As porcentagens somam ${totalPrioridades}%. Ajuste os valores para chegar a 100%.`}</p>
              </div>
              <div className="config-actions">
                <span className="muted">Ao salvar, os próximos 7 dias serão reorganizados.</span>
                <button type="button" className="primary-action" onClick={salvarConfiguracao} disabled={salvando || !rotinasValidas || totalPrioridades !== 100}>
                  <Save size={17} /> {salvando ? "Salvando..." : "Salvar e gerar cronograma"}
                </button>
              </div>
            </div>}

            <div className="cronograma-week">
              {(cronograma?.dias || []).map((dia, diaIndex) => (
                <article className="page-card cronograma-day-card" key={dia.data}>
                  <div className="cronograma-day-head">
                    <div>
                      <span className="day-number">Estudo {diaIndex + 1}</span>
                      <h3>{formatarDia(dia.data)}</h3>
                    </div>
                  <div className="day-summary">
                      <span><Clock3 size={15} /> {formatarDuracao(dia.total_minutos)}</span>
                      <span><CheckCircle2 size={15} /> {dia.concluidas}/{dia.total_atividades}</span>
                  </div>
                  </div>

                  <div className="cronograma-activities">
                    {(() => {
                      const diaSemana = (new Date(`${dia.data}T12:00:00`).getDay() + 6) % 7;
                      const pausasDoDia = rotinaSemana[diaSemana]?.pausas || [];
                      return dia.atividades.map((atividade, atividadeIndex) => {
                        const IconeTipo = ICONE_TIPO[atividade.tipo] || Target;
                        const inicioAnterior = dia.atividades[atividadeIndex - 1]?.inicio_hora;
                        const pausasAntes = atividade.inicio_hora
                          ? pausasDoDia.filter((pausa) => pausa.fim <= atividade.inicio_hora! && (!inicioAnterior || pausa.fim > inicioAnterior))
                          : [];
                        return (
                          <Fragment key={atividade.id}>
                            {pausasAntes.map((pausa, indice) => <div className="cronograma-break" key={`${pausa.inicio}-${indice}`}><Coffee size={17}/><strong>Pausa</strong><span>{pausa.inicio}–{pausa.fim}</span><small>Descanse e retome no horário combinado</small></div>)}
                            <div className={`cronograma-activity ${atividade.concluida ? "done" : ""}`}>
                              <button type="button" className="activity-check" onClick={() => marcarAtividade(atividade)} aria-label={atividade.concluida ? "Marcar como pendente" : "Marcar como concluída"}>
                                {atividade.concluida ? <CheckCircle2 size={23} /> : <Circle size={23} />}
                              </button>
                              <div className={`activity-icon type-${atividade.tipo}`}><IconeTipo size={20} /></div>
                              <div className="activity-main">
                                <div className="activity-meta">
                                  {atividade.inicio_hora && <span>{atividade.inicio_hora}</span>}
                                  <span>{atividade.periodo_label}</span>
                                  <span>{formatarDuracao(atividade.duracao_minutos)}</span>
                                  {atividade.quantidade && <span>{atividade.quantidade} questões</span>}
                                </div>
                                <strong>{atividade.titulo}</strong>
                                {atividade.descricao && <p>{atividade.descricao}</p>}
                              </div>
                              <Link className="secondary-action activity-open" href={atividade.rota}>Abrir</Link>
                            </div>
                          </Fragment>
                        );
                      }).concat(pausasDoDia.filter((pausa) => !dia.atividades.some((atividade) => atividade.inicio_hora && atividade.inicio_hora >= pausa.fim)).map((pausa, indice) => <div className="cronograma-break" key={`${pausa.inicio}-fim-${indice}`}><Coffee size={17}/><strong>Pausa</strong><span>{pausa.inicio}–{pausa.fim}</span><small>Descanse e retome no horário combinado</small></div>));
                    })()}
                  </div>
                </article>
              ))}
            </div>
            {!editandoCronograma && <div className="cronograma-plan-actions">
              <button type="button" className="secondary-action" onClick={() => setEditandoCronograma(true)}><Save size={17} /> Editar cronograma</button>
              <button type="button" className="primary-action" onClick={() => {
                setDiasSemana([0, 1, 2, 3, 4]);
                setRotinaSemana(Object.fromEntries(DIAS.map((_, dia) => [dia, { ...ROTINA_PADRAO, pausas: [] }])));
                setPrioridades(Object.fromEntries((cronograma?.prioridades || []).map((area) => [area.slug, 25])));
                setMensagem("");
                setErro("");
                setEditandoCronograma(true);
              }}><Sparkles size={17} /> Criar um novo cronograma</button>
            </div>}
          </div>
        </section>
      </div>
    </main>
  );
}

