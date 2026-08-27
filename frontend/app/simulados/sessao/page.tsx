"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock3, Send, X } from "lucide-react";

import "../../trilha/trilha.css";
import "../../sidebar-pages.css";
import Header from "../../components/header";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function formatarTempo(total: number) {
  const segundos = Math.max(0, total);
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function SessaoSimuladoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [tentativaId, setTentativaId] = useState<number | null>(null);
  const [simulado, setSimulado] = useState<any>(null);
  const [questoes, setQuestoes] = useState<any[]>([]);
  const [indice, setIndice] = useState(0);
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [restante, setRestante] = useState(0);
  const [finalizando, setFinalizando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const iniciadoRef = useRef(false);

  useEffect(() => {
    if (iniciadoRef.current) return;
    iniciadoRef.current = true;

    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login?next=/simulados");
      return;
    }

    const raw = sessionStorage.getItem("lumo_sim_config");
    if (!raw) {
      router.replace("/simulados");
      return;
    }

    let config: any;
    try { config = JSON.parse(raw); } catch { router.replace("/simulados"); return; }

    fetch(`${API_BASE}/simulados/iniciar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(config),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.detail || "Não foi possível iniciar o simulado.");
        return data;
      })
      .then((data) => {
        setTentativaId(data.tentativa_id);
        setSimulado(data.simulado);
        setQuestoes(data.questoes || []);
        setRestante(Number(data.simulado?.tempo_limite_minutos || 0) * 60);
      })
      .catch((err) => setErro(err.message || "Não foi possível iniciar o simulado."))
      .finally(() => setLoading(false));
  }, [router]);

  const finalizar = useCallback(async (automatico = false) => {
    if (finalizando || resultado || !tentativaId || questoes.length === 0) return;
    if (!automatico) {
      const faltam = questoes.length - Object.keys(respostas).length;
      const texto = faltam > 0
        ? `Ainda faltam ${faltam} questões. Deseja finalizar mesmo assim?`
        : "Deseja entregar o simulado agora?";
      if (!window.confirm(texto)) return;
    }

    setFinalizando(true);
    setErro("");
    const token = localStorage.getItem("token");
    try {
      const payloadRespostas = Object.entries(respostas).map(([idx, letra]) => {
        const q = questoes[Number(idx)];
        return { prova: q.prova, index: q.index, letra, tempo_segundos: 0 };
      });

      if (payloadRespostas.length > 0) {
        const correcao = await fetch(`${API_BASE}/questoes/corrigir`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ respostas: payloadRespostas, tentativa_simulado_id: tentativaId }),
        });
        const correcaoData = await correcao.json().catch(() => ({}));
        if (!correcao.ok) throw new Error(correcaoData.detail || "Não foi possível corrigir o simulado.");
      }

      const fim = await fetch(`${API_BASE}/simulados/tentativas/${tentativaId}/finalizar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const fimData = await fim.json().catch(() => ({}));
      if (!fim.ok) throw new Error(fimData.detail || "Não foi possível finalizar o simulado.");
      setResultado(fimData);
      sessionStorage.removeItem("lumo_sim_config");
      window.dispatchEvent(new Event("lumostudy:stats-changed"));
    } catch (err: any) {
      setErro(err?.message || "Não foi possível finalizar o simulado.");
    } finally {
      setFinalizando(false);
    }
  }, [finalizando, resultado, tentativaId, questoes, respostas]);

  useEffect(() => {
    if (loading || resultado || erro || restante <= 0) return;
    const timer = window.setInterval(() => setRestante((prev) => Math.max(0, prev - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [loading, resultado, erro, restante]);

  useEffect(() => {
    if (!loading && !resultado && !erro && restante === 0 && simulado && tentativaId) {
      finalizar(true);
    }
  }, [restante, loading, resultado, erro, simulado, tentativaId, finalizar]);

  function sair() {
    if (window.confirm("Sair do simulado? A tentativa atual ficará incompleta.")) router.push("/simulados");
  }

  if (loading) {
    return <><Header /><main className="sim-session"><div className="sim-session-shell"><div className="page-card sim-result">Preparando seu simulado...</div></div></main></>;
  }

  if (erro && !resultado) {
    return <><Header /><main className="sim-session"><div className="sim-session-shell"><div className="page-card sim-result"><h2>Não foi possível continuar</h2><p className="muted">{erro}</p><button className="primary-action" onClick={() => router.push("/simulados")}>Voltar</button></div></div></main></>;
  }

  if (resultado) {
    const tentativa = resultado.tentativa || {};
    const total = Number(tentativa.total_questoes || questoes.length || 0);
    const acertos = Number(tentativa.acertos || 0);
    return (
      <><Header /><main className="sim-session"><div className="sim-session-shell">
        <div className="page-card sim-result">
          <span className="sidebar-page-kicker">Simulado concluído</span>
          <h1>Resultado do ENEM · Dia {simulado?.dia_prova}</h1>
          <div className="sim-result-score">{acertos}/{total}</div>
          <p className="muted">{total ? Math.round((acertos / total) * 100) : 0}% de aproveitamento · +{resultado.xp_ganhos || 0} XP · +{resultado.coins_ganhas || 0} moedas</p>
          <div style={{display:"flex", gap:12, justifyContent:"center", marginTop:22}}>
            <button className="secondary-action" onClick={() => router.push("/simulados")}>Novo simulado</button>
            <button className="primary-action" onClick={() => router.push("/usuario")}>Ver meu desempenho</button>
          </div>
        </div>
      </div></main></>
    );
  }

  const questao = questoes[indice];
  if (!questao) return null;

  return (
    <><Header />
      <main className="sim-session">
        <div className="sim-session-shell">
          <div className="sim-session-top">
            <div className="sim-session-meta">
              <span className="sim-chip">ENEM · Dia {simulado?.dia_prova}</span>
              <span className="sim-chip">{Object.keys(respostas).length}/{questoes.length} respondidas</span>
            </div>
            <div style={{display:"flex", alignItems:"center", gap:14}}>
              <div className="sim-timer"><Clock3 size={18} style={{verticalAlign:"-3px", marginRight:6}} />{formatarTempo(restante)}</div>
              <button className="danger-action" onClick={sair}><X size={16}/> Sair</button>
            </div>
          </div>

          <div className="sim-progress-line"><div className="sim-progress-fill" style={{width:`${((indice + 1) / questoes.length) * 100}%`}} /></div>

          <div className="page-card sim-question-card">
            <div className="sim-question-nav">
              <button className="secondary-action" disabled={indice === 0} onClick={() => setIndice((i) => Math.max(0, i - 1))}><ChevronLeft size={16}/> Anterior</button>
              <strong>Questão {indice + 1} de {questoes.length}</strong>
              <button className="secondary-action" disabled={indice === questoes.length - 1} onClick={() => setIndice((i) => Math.min(questoes.length - 1, i + 1))}>Próxima <ChevronRight size={16}/></button>
            </div>

            {questao.assunto && <span className="sidebar-page-kicker">{questao.assunto}</span>}
            {questao.enunciado && <p style={{marginTop:18, lineHeight:1.7, whiteSpace:"pre-wrap"}}>{questao.enunciado}</p>}
            {questao.imagens?.length > 0 && <div style={{display:"grid", gap:12, marginTop:16}}>{questao.imagens.map((src:string) => <img key={src} src={`${API_BASE}${src}`} alt="" style={{maxWidth:"100%", borderRadius:12}} />)}</div>}
            {questao.comando && <p style={{marginTop:18, lineHeight:1.65, fontWeight:700}}>{questao.comando}</p>}

            <div className="sim-answer-grid">
              {questao.alternativas?.map((alt:any) => (
                <div key={alt.letra} className={`sim-answer ${respostas[indice] === alt.letra ? "selected" : ""}`} onClick={() => setRespostas((prev) => ({...prev, [indice]: alt.letra}))}>
                  <span className="sim-answer-letter">{alt.letra}</span>
                  <div style={{lineHeight:1.55}}>
                    {alt.texto}
                    {alt.imagem && <img src={`${API_BASE}${alt.imagem}`} alt="" style={{display:"block", maxWidth:"100%", marginTop:8, borderRadius:10}} />}
                  </div>
                </div>
              ))}
            </div>

            <div className="question-map">
              {questoes.map((_:any, i:number) => (
                <button key={i} className={`question-dot ${respostas[i] ? "answered" : ""} ${i === indice ? "current" : ""}`} onClick={() => setIndice(i)}>{i + 1}</button>
              ))}
            </div>

            <div className="sim-footer-nav">
              <span className="muted">Você pode voltar e alterar respostas antes de entregar.</span>
              <button className="primary-action" onClick={() => finalizar(false)} disabled={finalizando}><Send size={17}/>{finalizando ? "Finalizando..." : "Entregar simulado"}</button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
