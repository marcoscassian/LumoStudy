"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Flame, Medal, Trophy } from "lucide-react";

import "../trilha/trilha.css";
import "../sidebar-pages.css";
import Header from "../components/header";
import Sidebar from "../components/sidebar";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function RankingPage() {
  const router = useRouter();
  const [dados, setDados] = useState<any>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login?next=/ranking"); return; }
    fetch(`${API_BASE}/ranking`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) { localStorage.removeItem("token"); router.replace("/login?next=/ranking"); return null; }
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.detail || "Não foi possível carregar o ranking.");
        return d;
      })
      .then((d) => d && setDados(d))
      .catch((e) => setErro(e.message || "Não foi possível carregar o ranking."));
  }, [router]);

  const ranking = dados?.ranking || [];
  const top = ranking.slice(0, 3);
  const ordemPodio = [top[1], top[0], top[2]].filter(Boolean);

  return (
    <main className="dashboard">
      <Header />
      <div className="dashboard-body dashboard-body--sidebar-page">
        <Sidebar />
        <section className="sidebar-page-content">
          <div className="sidebar-page-shell">
            <span className="sidebar-page-kicker"><Trophy size={14}/> Classificação</span>
            <h1 className="sidebar-page-title">Ranking dos bruxos</h1>
            <p className="sidebar-page-subtitle">A classificação usa o XP salvo no banco. Em caso de empate, a maior sequência vem primeiro.</p>

            {erro && <div className="inline-message error">{erro}</div>}
            {!dados && !erro && <div className="page-card" style={{padding:24, marginTop:22}}>Carregando ranking...</div>}

            {dados && (
              <>
                <div className="feature-hero" style={{marginTop:22}}>
                  <h2>Sua posição atual: #{dados.minha_posicao || "—"}</h2>
                  <p>Continue respondendo questões, revisando flashcards e concluindo simulados para ganhar XP e subir no ranking.</p>
                </div>

                {ordemPodio.length > 0 && (
                  <div className="podium-grid">
                    {ordemPodio.map((user:any) => (
                      <article key={user.id} className={`page-card podium-card ${user.posicao === 1 ? "first" : ""}`}>
                        <div className="podium-rank">{user.posicao === 1 ? "🥇" : user.posicao === 2 ? "🥈" : "🥉"}</div>
                        <img className="podium-avatar" src={user.avatar_url || "/avatar.png"} alt="" onError={(e) => { e.currentTarget.src = "/avatar.png"; }} />
                        <div className="podium-name">{user.nome}</div>
                        <div className="podium-xp">{Number(user.xp).toLocaleString("pt-BR")} XP</div>
                        <div className="muted" style={{fontSize:12, marginTop:4}}>Nível {user.nivel} · {user.streak} dias</div>
                      </article>
                    ))}
                  </div>
                )}

                <div className="page-card ranking-card">
                  <div className="ranking-row header-row"><span>Pos.</span><span>Usuário</span><span>XP</span><span>Sequência</span><span>Moedas</span></div>
                  {ranking.map((user:any) => (
                    <div key={user.id} className={`ranking-row ${user.eu ? "me" : ""}`}>
                      <strong>#{user.posicao}</strong>
                      <div className="rank-user"><img src={user.avatar_url || "/avatar.png"} alt="" onError={(e) => { e.currentTarget.src = "/avatar.png"; }}/><div><strong>{user.nome}</strong>{user.eu && <div className="muted" style={{fontSize:11}}>Você</div>}</div></div>
                      <strong>{Number(user.xp).toLocaleString("pt-BR")}</strong>
                      <span><Flame size={14} style={{verticalAlign:"-2px"}}/> {user.streak}</span>
                      <span><Coins size={14} style={{verticalAlign:"-2px"}}/> {user.coins}</span>
                    </div>
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
