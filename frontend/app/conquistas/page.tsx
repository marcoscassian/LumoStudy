"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, CheckCircle2, LockKeyhole, Sparkles, Trophy } from "lucide-react";

import "../trilha/trilha.css";
import "../sidebar-pages.css";
import Header from "../components/header";
import Sidebar from "../components/sidebar";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function ConquistasPage() {
  const router = useRouter();
  const [dados, setDados] = useState<any>(null);
  const [erro, setErro] = useState("");

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
            <p className="sidebar-page-subtitle">As conquistas são liberadas automaticamente conforme seus dados reais de questões, flashcards, simulados, sequência, moedas e XP.</p>

            {erro && <div className="inline-message error">{erro}</div>}
            {!dados && !erro && <div className="page-card" style={{padding:24, marginTop:22}}>Carregando conquistas...</div>}

            {dados && (
              <>
                <div className="page-card achievement-summary">
                  <div className="achievement-badge-big"><Trophy size={28}/></div>
                  <div><strong>{dados.desbloqueadas}/{dados.total}</strong><span>conquistas desbloqueadas</span></div>
                  <div style={{marginLeft:"auto"}}><Sparkles size={24} color="var(--lumo-accent)"/></div>
                </div>

                <div className="achievements-grid">
                  {(dados.conquistas || []).map((item:any) => (
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
