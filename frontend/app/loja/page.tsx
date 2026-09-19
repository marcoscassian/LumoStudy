"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Coins, PawPrint, ShoppingBag, Sparkles, UserRound } from "lucide-react";

import "../trilha/trilha.css";
import "../sidebar-pages.css";
import Header from "../components/header";
import Sidebar from "../components/sidebar";
import MascotSprite from "../components/mascot-sprite";
import { API_BASE } from "../lib/api";
import { aplicarTema } from "../components/theme-provider";
import { NOMES_CASAS, NOMES_CURSOS } from "../lib/identidade";

type ItemLoja = {
  id: number;
  nome: string;
  slug: string;
  descricao?: string;
  preco_coins: number;
  arquivo: string;
  tipo: "avatar" | "mascote" | string;
  casa?: string | null;
  comprado: boolean;
  equipado: boolean;
};

type LojaDados = {
  coins: number;
  curso: string;
  casa: string;
  avatar_url: string;
  mascote_slug: string;
  mascote_url: string;
  itens: ItemLoja[];
};

function AvatarLoja({ src, nome }: { src: string; nome: string }) {
  const [falhou, setFalhou] = useState(false);
  return (
    <div className="shop-avatar-wrap">
      {!falhou ? <img src={src} alt={nome} className="shop-avatar" onError={() => setFalhou(true)} /> : <div className="shop-avatar-fallback">{nome.slice(0, 1).toUpperCase()}</div>}
    </div>
  );
}

export default function LojaPage() {
  const router = useRouter();
  const [dados, setDados] = useState<LojaDados | null>(null);
  const [loading, setLoading] = useState(true);
  const [acao, setAcao] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: string; texto: string } | null>(null);

  async function carregar() {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login?next=/loja"); return; }
    try {
      const response = await fetch(`${API_BASE}/loja`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (response.status === 401) { localStorage.removeItem("token"); router.replace("/login?next=/loja"); return; }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Não foi possível carregar a loja.");
      setDados(data as LojaDados);
    } catch (err) {
      setMensagem({ tipo: "error", texto: err instanceof Error ? err.message : "Não foi possível carregar a loja." });
    } finally { setLoading(false); }
  }

  useEffect(() => { const inicial = window.setTimeout(() => { void carregar(); }, 0); return () => window.clearTimeout(inicial); }, []);

  const avatares = useMemo(() => (dados?.itens || []).filter((item) => item.tipo === "avatar"), [dados]);
  const mascotes = useMemo(() => (dados?.itens || []).filter((item) => item.tipo === "mascote"), [dados]);

  async function equiparCoruja() {
    const token = localStorage.getItem("token");
    if (!token) return;
    setMensagem(null);
    try {
      const response = await fetch(`${API_BASE}/loja/equipar-mascote-padrao`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Não foi possível equipar a coruja.");
      setMensagem({ tipo: "success", texto: data.mensagem || "Coruja equipada!" });
      await carregar();
      window.dispatchEvent(new Event("lumostudy:mascot-changed"));
    } catch (err) {
      setMensagem({ tipo: "error", texto: err instanceof Error ? err.message : "Não foi possível equipar a coruja." });
    }
  }

  async function executar(item: ItemLoja, tipo: "comprar" | "equipar") {
    const token = localStorage.getItem("token");
    if (!token) return;
    setAcao(item.id);
    setMensagem(null);
    try {
      const response = await fetch(`${API_BASE}/loja/${item.id}/${tipo}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Não foi possível concluir a ação.");
      setMensagem({ tipo: "success", texto: data.mensagem || "Pronto!" });
      if (tipo === "equipar" && item.tipo === "avatar") {
        const dark = localStorage.getItem("lumostudy_theme") === "dark";
        aplicarTema(dark, data.casa || dados?.casa || "grifinoria", Boolean(data.tema_roxo_padrao), data.avatar_url);
      }
      await carregar();
      window.dispatchEvent(new Event("lumostudy:stats-changed"));
      window.dispatchEvent(new Event("lumostudy:mascot-changed"));
      window.dispatchEvent(new Event("lumostudy:notifications-changed"));
    } catch (err) {
      setMensagem({ tipo: "error", texto: err instanceof Error ? err.message : "Não foi possível concluir a ação." });
    } finally { setAcao(null); }
  }

  function ItemCard({ item }: { item: ItemLoja }) {
    const semSaldo = Number(dados?.coins || 0) < Number(item.preco_coins);
    return (
      <article className="page-card shop-card">
        {item.tipo === "mascote" ? (
          <div className="shop-avatar-wrap shop-mascot-wrap"><MascotSprite src={item.arquivo} nome={item.nome} size={88} /></div>
        ) : (
          <AvatarLoja src={item.arquivo} nome={item.nome} />
        )}
        <div className="shop-name-row">
          <h3>{item.nome}</h3>
          {item.casa && <span className={`shop-house-badge house-${item.casa}`}>{NOMES_CASAS[item.casa] || item.casa}</span>}
        </div>
        <p>{item.descricao}</p>
        <div className="shop-card-footer">
          <div>{item.equipado ? <span className="shop-status"><Check size={13} /> Em uso</span> : <span className="price"><Coins size={15}/>{item.preco_coins}</span>}</div>
          {!item.comprado ? (
            <button className="primary-action" disabled={acao === item.id || semSaldo} onClick={() => void executar(item, "comprar")}>Comprar</button>
          ) : item.equipado ? (
            <button className="secondary-action" disabled><Check size={15}/> Equipado</button>
          ) : (
            <button className="secondary-action" disabled={acao === item.id} onClick={() => void executar(item, "equipar")}>{item.tipo === "mascote" ? <PawPrint size={15}/> : <UserRound size={15}/>} Usar</button>
          )}
        </div>
      </article>
    );
  }

  return (
    <main className="dashboard">
      <Header />
      <div className="dashboard-body dashboard-body--sidebar-page">
        <Sidebar />
        <section className="sidebar-page-content">
          <div className="sidebar-page-shell">
            <div className="feature-hero">
              <span className="sidebar-page-kicker" style={{ background: "rgba(255,255,255,.14)", color: "white" }}><ShoppingBag size={14}/> Loja Mágica</span>
              <h2>Personalize sua jornada</h2>
              <p>Seu curso define a casa e a aparência do LumoStudy. Na loja você libera avatares da sua casa e novos mascotes para entregar notificações.</p>
              <div className="hero-stat-row">
                <span className="hero-pill"><Coins size={16}/> Saldo: {Number(dados?.coins || 0).toLocaleString("pt-BR")}</span>
                <span className="hero-pill"><Sparkles size={16}/> {NOMES_CURSOS[dados?.curso || ""] || "Curso"} · {NOMES_CASAS[dados?.casa || ""] || "Casa"}</span>
              </div>
            </div>

            {mensagem && <div className={`inline-message ${mensagem.tipo}`}>{mensagem.texto}</div>}
            {loading && <div className="page-card" style={{ padding: 24 }}>Carregando itens...</div>}

            {!loading && (
              <>
                <div className="shop-head">
                  <div><h2 style={{ fontSize: 22 }}>Fotos de perfil</h2><p className="muted" style={{ marginTop: 4 }}>Você vê apenas as quatro versões da sua casa.</p></div>
                  <div className="balance-card"><Coins size={18} color="#d69b00"/> {Number(dados?.coins || 0)} moedas</div>
                </div>
                <div className="shop-grid">{avatares.map((item) => <ItemCard item={item} key={item.id} />)}</div>

                <div className="shop-head shop-section-gap">
                  <div><h2 style={{ fontSize: 22 }}>Mascotes</h2><p className="muted" style={{ marginTop: 4 }}>A coruja é padrão e grátis. Outros animais são desbloqueados aqui.</p></div>
                  <PawPrint size={24}/>
                </div>
                <div className="page-card default-mascot-card">
                  <MascotSprite src="/sprites/mascotes/coruja.png" nome="Coruja" size={72} />
                  <div><strong>Coruja</strong><p>Seu mascote inicial. Ela entrega suas cartas e notificações.</p></div>
                  {dados?.mascote_slug === "coruja" ? (
                    <span className="shop-status"><Check size={13}/> Em uso</span>
                  ) : (
                    <button className="secondary-action" onClick={() => void equiparCoruja()}><PawPrint size={15}/> Usar</button>
                  )}
                </div>
                <div className="shop-grid">{mascotes.map((item) => <ItemCard item={item} key={item.id} />)}</div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
