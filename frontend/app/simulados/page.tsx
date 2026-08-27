"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock3, FileQuestion, Play, Sparkles } from "lucide-react";

import "../trilha/trilha.css";
import "../sidebar-pages.css";
import Header from "../components/header";
import Sidebar from "../components/sidebar";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function SimuladosPage() {
  const router = useRouter();
  const [dia, setDia] = useState(1);
  const [quantidade, setQuantidade] = useState(25);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [disponiveis, setDisponiveis] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login?next=/simulados");
      return;
    }

    fetch(`${API_BASE}/simulados`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(async (response) => {
        if (response.status === 401) {
          localStorage.removeItem("token");
          router.replace("/login?next=/simulados");
          return [];
        }
        if (!response.ok) throw new Error("Não foi possível carregar os simulados.");
        return response.json();
      })
      .then((data) => setDisponiveis(Array.isArray(data) ? data : []))
      .catch((err) => setErro(err.message || "Não foi possível conectar ao servidor."))
      .finally(() => setCarregando(false));
  }, [router]);

  const tempo = dia === 1 ? 330 : 300;
  const resumo = useMemo(() => {
    const achou = disponiveis.find(
      (item) => Number(item.dia_prova) === dia && Number(item.quantidade_questoes) === quantidade
    );
    return achou || null;
  }, [disponiveis, dia, quantidade]);

  function iniciar() {
    sessionStorage.setItem("lumo_sim_config", JSON.stringify({ dia_prova: dia, quantidade }));
    router.push("/simulados/sessao");
  }

  return (
    <main className="dashboard">
      <Header />
      <div className="dashboard-body dashboard-body--sidebar-page">
        <Sidebar />
        <section className="sidebar-page-content">
          <div className="sidebar-page-shell">
            <span className="sidebar-page-kicker"><Sparkles size={14} /> Simulação ENEM</span>
            <h1 className="sidebar-page-title">Monte seu simulado</h1>
            <p className="sidebar-page-subtitle">
              Escolha o dia da prova e faça um treino de 25 questões ou a prova completa com 90. O cronômetro segue o tempo do ENEM para o dia escolhido.
            </p>

            <div className="simulado-layout">
              <div className="page-card simulado-builder">
                <div className="option-section">
                  <h3>1. Escolha o dia de prova</h3>
                  <p>Cada dia reúne duas áreas do conhecimento.</p>
                  <div className="option-grid">
                    {[1, 2].map((valor) => (
                      <label key={valor} className={`choice-card ${dia === valor ? "selected" : ""}`}>
                        <input type="radio" checked={dia === valor} onChange={() => setDia(valor)} />
                        <div className="choice-icon"><CalendarDays size={20} /></div>
                        <div>
                          <strong>Dia {valor}</strong>
                          <span>
                            {valor === 1
                              ? "Linguagens + Ciências Humanas · 5h30"
                              : "Ciências da Natureza + Matemática · 5h00"}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="option-section">
                  <h3>2. Escolha o tamanho</h3>
                  <p>Você pode praticar com uma versão menor ou encarar todas as questões do dia.</p>
                  <div className="option-grid">
                    {[25, 90].map((valor) => (
                      <label key={valor} className={`choice-card ${quantidade === valor ? "selected" : ""}`}>
                        <input type="radio" checked={quantidade === valor} onChange={() => setQuantidade(valor)} />
                        <div className="choice-icon"><FileQuestion size={20} /></div>
                        <div>
                          <strong>{valor === 25 ? "25 questões" : "Todas as questões"}</strong>
                          <span>{valor === 25 ? "Treino focado e mais curto" : "90 questões · experiência completa"}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {erro && <div className="inline-message error">{erro}</div>}
                {carregando && <div className="inline-message">Verificando simulados disponíveis...</div>}
              </div>

              <aside className="page-card simulado-summary">
                <div className="page-card-header">
                  <div>
                    <h3>Seu simulado</h3>
                    <p>Confira antes de começar.</p>
                  </div>
                  <Clock3 size={22} color="var(--lumo-accent)" />
                </div>
                <div className="simulado-summary-list">
                  <div className="summary-line"><span>Dia</span><strong>ENEM · Dia {dia}</strong></div>
                  <div className="summary-line"><span>Questões</span><strong>{quantidade}</strong></div>
                  <div className="summary-line"><span>Tempo</span><strong>{tempo === 330 ? "5h30" : "5h00"}</strong></div>
                  <div className="summary-line"><span>Áreas</span><strong>{dia === 1 ? "Linguagens + Humanas" : "Natureza + Matemática"}</strong></div>
                </div>
                <button className="primary-action" onClick={iniciar} disabled={carregando || Boolean(erro) || !resumo}>
                  <Play size={18} /> Começar simulado
                </button>
                <p className="enem-note">
                  O tempo é contado em ordem regressiva. Ao chegar a zero, o simulado é finalizado automaticamente com as respostas marcadas até aquele momento.
                </p>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
