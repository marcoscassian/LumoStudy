"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Coins, ShoppingBag, Sparkles, UserRound } from "lucide-react";

import "../trilha/trilha.css";
import "../sidebar-pages.css";
import Header from "../components/header";
import Sidebar from "../components/sidebar";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const NOMES_CASAS: Record<string, string> = {
  corvinal: "Corvinal",
  "lufa-lufa": "Lufa-Lufa",
  sonserina: "Sonserina",
  grifinoria: "Grifinória",
};

function AvatarLoja({ src, nome }: { src: string; nome: string }) {
  const [falhou, setFalhou] = useState(false);
  return (
    <div className="shop-avatar-wrap">
      {!falhou ? (
        <img src={src} alt={nome} className="shop-avatar" onError={() => setFalhou(true)} />
      ) : (
        <div className="shop-avatar-fallback">{nome.slice(0, 1).toUpperCase()}</div>
      )}
    </div>
  );
}

export default function LojaPage() {
  const router = useRouter();
  const [dados, setDados] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acao, setAcao] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState<{tipo:string; texto:string} | null>(null);

  async function carregar() {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login?next=/loja");
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/loja`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (response.status === 401) {
        localStorage.removeItem("token");
        router.replace("/login?next=/loja");
        return;
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Não foi possível carregar a loja.");
      setDados(data);
    } catch (err:any) {
      setMensagem({tipo:"error", texto: err?.message || "Não foi possível carregar a loja."});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  async function executar(item:any, tipo:"comprar"|"equipar") {
    const token = localStorage.getItem("token");
    if (!token) return;
    setAcao(item.id);
    setMensagem(null);
    try {
      const response = await fetch(`${API_BASE}/loja/${item.id}/${tipo}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Não foi possível concluir a ação.");
      setMensagem({tipo:"success", texto:data.mensagem || "Pronto!"});
      await carregar();
      window.dispatchEvent(new Event("lumostudy:stats-changed"));
    } catch (err:any) {
      setMensagem({tipo:"error", texto:err?.message || "Não foi possível concluir a ação."});
    } finally {
      setAcao(null);
    }
  }

  return (
    <main className="dashboard">
      <Header />
      <div className="dashboard-body dashboard-body--sidebar-page">
        <Sidebar />
        <section className="sidebar-page-content">
          <div className="sidebar-page-shell">
            <div className="feature-hero">
              <span className="sidebar-page-kicker" style={{background:"rgba(255,255,255,.14)", color:"white"}}><ShoppingBag size={14}/> Loja Mágica</span>
              <h2>Escolha uma nova foto de perfil</h2>
              <p>Use as moedas conquistadas estudando para liberar avatares exclusivos do LumoStudy. Cada foto custa 10 moedas e fica sua para sempre.</p>
              <div className="hero-stat-row">
                <span className="hero-pill"><Coins size={16}/> Saldo: {Number(dados?.coins || 0).toLocaleString("pt-BR")} moedas</span>
                <span className="hero-pill"><Sparkles size={16}/> 4 avatares disponíveis</span>
              </div>
            </div>

            <div className="shop-head">
              <div>
                <h2 style={{fontSize:22}}>Fotos de perfil</h2>
                <p className="muted" style={{marginTop:4}}>Compre e equipe a que quiser.</p>
              </div>
              <div className="balance-card"><Coins size={18} color="#d69b00"/> {Number(dados?.coins || 0)} moedas</div>
            </div>

            {mensagem && <div className={`inline-message ${mensagem.tipo}`}>{mensagem.texto}</div>}
            {loading && <div className="page-card" style={{padding:24}}>Carregando itens...</div>}

            {!loading && (
              <div className="shop-grid">
                {(dados?.itens || []).map((item:any) => (
                  <article key={item.id} className="page-card shop-card">
                    <AvatarLoja src={item.arquivo} nome={item.nome} />
                    <div className="shop-name-row">
                      <h3>{item.nome}</h3>
                      {item.casa && <span className={`shop-house-badge house-${item.casa}`}>{NOMES_CASAS[item.casa] || item.casa}</span>}
                    </div>
                    <p>{item.descricao}</p>
                    <div className="shop-card-footer">
                      <div>
                        {item.equipado ? <span className="shop-status"><Check size={13} style={{verticalAlign:"-2px"}}/> Em uso</span> : <span className="price"><Coins size={15}/>{item.preco_coins}</span>}
                      </div>
                      {!item.comprado ? (
                        <button className="primary-action" disabled={acao === item.id || Number(dados?.coins || 0) < Number(item.preco_coins)} onClick={() => executar(item, "comprar")}>Comprar</button>
                      ) : item.equipado ? (
                        <button className="secondary-action" disabled><Check size={15}/> Equipado</button>
                      ) : (
                        <button className="secondary-action" disabled={acao === item.id} onClick={() => executar(item, "equipar")}><UserRound size={15}/> Usar</button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

          </div>
        </section>
      </div>
    </main>
  );
}
