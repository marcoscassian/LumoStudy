"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, CheckCircle2, LockKeyhole, Sparkles, Trophy } from "lucide-react";

import "../trilha/trilha.css";
import "../sidebar-pages.css";
import Header from "../components/header";
import {
  LevelPath,
  LevelProgress,
  type LevelPathItem,
  type LevelProgressData,
} from "../components/level-progress";
import Sidebar from "../components/sidebar";
import { API_BASE } from "../lib/api";

type Conquista = { slug: string; nome: string; descricao: string; desbloqueada: boolean; atual: number; meta: number; unidade: string; percentual: number };
type DadosConquistas = { desbloqueadas: number; total: number; conquistas: Conquista[]; progressao?: LevelProgressData; trilha_niveis?: LevelPathItem[] };

export default function ConquistasPage() {
  const router = useRouter();
  const [dados, setDados] = useState<DadosConquistas | null>(null);
  const [erro, setErro] = useState("");
  const progressao = dados?.progressao;
  const trilhaNiveis = dados?.trilha_niveis || [];

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login?next=/conquistas"); return; }
    fetch(`${API_BASE}/conquistas`, { headers:{Authorization:`Bearer ${token}`}, cache:"no-store" })
      .then(async (r) => {
        if (r.status === 401) { localStorage.removeItem("token"); router.replace("/login?next=/conquistas"); return null; }
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.detail || "Não foi possível carregar as conquistas.");
        return d;
      })
      .then((d) => d && setDados(d))
      .catch((e) => setErro(e.message || "Não foi possível carregar as conquistas."));
  }, [router]);

  return (
    <main className="dashboard">
      <Header />
      <div className="dashboard-body dashboard-body--sidebar-page">
        <Sidebar />
        <section className="sidebar-page-content">
          <div className="sidebar-page-shell">
            <span className="sidebar-page-kicker"><Award size={14}/> Conquistas</span>
            <h1 className="sidebar-page-title">Seu livro de feitos</h1>
            <p className="sidebar-page-subtitle">As conquistas são liberadas automaticamente conforme seus dados reais de questões, flashcards, simulados, sequência e moedas.</p>

            {erro && <div className="inline-message error">{erro}</div>}
            {!dados && !erro && <div className="page-card" style={{padding:24, marginTop:22}}>Carregando conquistas...</div>}

            {dados && (
              <>
                <div className="page-card achievement-summary">
                  <div className="achievement-badge-big"><Trophy size={28}/></div>
                  <div><strong>{dados.desbloqueadas}/{dados.total}</strong><span>conquistas desbloqueadas</span></div>
                  <div style={{marginLeft:"auto"}}><Sparkles size={24} color="var(--lumo-accent)"/></div>
                </div>

                {progressao ? <section className="page-card wizard-trail">
                  <div className="wizard-trail-heading">
                    <span className="sidebar-page-kicker">Progressão</span>
                    <h2>Trilha do Mundo Bruxo</h2>
                    <p>Avance da esquerda para a direita. Deslize horizontalmente para explorar todos os níveis.</p>
                  </div>
                  <LevelProgress progressao={progressao} titulo="Nível atual" />
                  <LevelPath progressao={progressao} niveis={trilhaNiveis} />
                </section> : (
                  <div className="inline-message" style={{marginTop:22}}>
                    Os dados de progressão ainda não estão disponíveis. Atualize a página em instantes.
                  </div>
                )}

                <div className="achievements-grid">
                  {(dados.conquistas || []).map((item) => (
                    <article key={item.slug} className={`page-card achievement-card ${item.desbloqueada ? "unlocked" : "locked"}`}>
                      <div className="achievement-icon">{item.desbloqueada ? <CheckCircle2 size={24}/> : <LockKeyhole size={22}/>}</div>
                      <h3>{item.nome}</h3>
                      <p>{item.descricao}</p>
                      <div className="achievement-progress">
                        <div className="achievement-progress-bar"><div className="achievement-progress-fill" style={{width:`${item.percentual}%`}} /></div>
                        <small>{item.atual}/{item.meta} {item.unidade}</small>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
