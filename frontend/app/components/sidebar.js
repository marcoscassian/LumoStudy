"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Award,
  BarChart3,
  BookOpen,
  CalendarRange,
  CheckCheck,
  Mail,
  Settings,
  ShoppingCart,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import MascotSprite from "./mascot-sprite";
import { API_BASE } from "../lib/api";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mascote, setMascote] = useState({ slug: "coruja", nome: "Coruja", url: "/sprites/mascotes/coruja.png" });
  const [notificacoes, setNotificacoes] = useState([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [aberto, setAberto] = useState(false);
  const [marcandoTodas, setMarcandoTodas] = useState(false);

  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`);

  async function carregarMascoteENotificacoes() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [meRes, notifRes] = await Promise.all([
        fetch(`${API_BASE}/login/me`, { headers, cache: "no-store" }),
        fetch(`${API_BASE}/notificacoes?limite=12`, { headers, cache: "no-store" }),
      ]);
      if (meRes.ok) {
        const me = await meRes.json();
        const nomeMascote = String(me.mascote_slug || "Coruja");
        setMascote({
          slug: String(me.mascote_slug || "coruja").toLowerCase(),
          nome: nomeMascote.charAt(0).toUpperCase() + nomeMascote.slice(1),
          url: me.mascote_url || "/sprites/mascotes/coruja.png",
        });
      }
      if (notifRes.ok) {
        const dados = await notifRes.json();
        setNotificacoes(Array.isArray(dados.itens) ? dados.itens : []);
        setNaoLidas(Number(dados.nao_lidas || 0));
      }
    } catch (error) {
      console.error("Erro ao carregar mascote/notificações:", error);
    }
  }

  useEffect(() => {
    const inicial = window.setTimeout(() => { void carregarMascoteENotificacoes(); }, 0);
    const intervalo = window.setInterval(() => { void carregarMascoteENotificacoes(); }, 15000);
    window.addEventListener("lumostudy:mascot-changed", carregarMascoteENotificacoes);
    window.addEventListener("lumostudy:notifications-changed", carregarMascoteENotificacoes);
    return () => {
      window.clearTimeout(inicial);
      window.clearInterval(intervalo);
      window.removeEventListener("lumostudy:mascot-changed", carregarMascoteENotificacoes);
      window.removeEventListener("lumostudy:notifications-changed", carregarMascoteENotificacoes);
    };
  }, []);

  useEffect(() => {
    if (!aberto) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setAberto(false);
    };
    const body = document.body;
    const anterior = body.style.overflow;
    body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      body.style.overflow = anterior;
      document.removeEventListener("keydown", onKey);
    };
  }, [aberto]);

  async function abrirNotificacao(item) {
    const token = localStorage.getItem("token");
    if (token && !item.lida) {
      try {
        await fetch(`${API_BASE}/notificacoes/${item.id}/ler`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      } catch {}
    }
    await carregarMascoteENotificacoes();
    setAberto(false);
    if (item.rota) router.push(item.rota);
  }

  async function lerTodas() {
    const token = localStorage.getItem("token");
    if (!token || marcandoTodas) return;
    setMarcandoTodas(true);
    try {
      const response = await fetch(`${API_BASE}/notificacoes/ler-todas`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        setNotificacoes((atuais) => atuais.map((item) => ({ ...item, lida: true })));
        setNaoLidas(0);
      }
      await carregarMascoteENotificacoes();
    } catch {
    } finally {
      setMarcandoTodas(false);
    }
  }

  return (
    <>
      <aside className="sidebar">
        <div className="profile-card profile-card--compact mascot-card">
          <button type="button" className="mascot-notification-trigger" onClick={() => setAberto(true)} aria-label="Abrir cartas e notificações" aria-expanded={aberto}>
            <MascotSprite
              src={mascote.slug === "coruja" && naoLidas > 0 ? "/sprites/mascotes/corujan.png" : mascote.url}
              fallbackSrc={mascote.url}
              nome={mascote.nome}
              size={82}
              frames={mascote.slug === "coruja" && naoLidas > 0 ? 5 : 6}
              duration={mascote.slug === "coruja" && naoLidas > 0 ? 1.9 : 2.7}
            />
            {naoLidas > 0 && <span className="mascot-notification-badge">{naoLidas > 9 ? "9+" : naoLidas}</span>}
          </button>
          <div className="profile-text">
            <h3>Olá, Bruxo.</h3>
            <p>Clique no mascote para abrir suas mensagens mágicas.</p>
          </div>
        </div>

        <nav>
          <Link href="/trilha" className={`menu ${isActive("/trilha") ? "active" : ""}`}><BookOpen size={20}/><span>Trilha de Estudos</span></Link>
          <Link href="/cronograma" className={`menu ${isActive("/cronograma") ? "active" : ""}`}><CalendarRange size={20}/><span>Cronograma</span></Link>
          <Link href="/questoes" className={`menu ${isActive("/questoes") ? "active" : ""}`}><Target size={20}/><span>Questões</span></Link>
          <Link href="/flashcards" className={`menu ${isActive("/flashcards") ? "active" : ""}`}><BarChart3 size={20}/><span>Flashcards</span></Link>
          <Link href="/simulados" className={`menu ${isActive("/simulados") ? "active" : ""}`}><Zap size={20}/><span>Simulados</span></Link>
          <Link href="/ranking" className={`menu ${isActive("/ranking") ? "active" : ""}`}><Trophy size={20}/><span>Ranking</span></Link>
          <Link href="/loja" className={`menu ${isActive("/loja") ? "active" : ""}`}><ShoppingCart size={20}/><span>Loja</span></Link>
          <Link href="/conquistas" className={`menu ${isActive("/conquistas") ? "active" : ""}`}><Award size={20}/><span>Conquistas</span></Link>
          <Link href="/configuracoes" className={`menu ${isActive("/configuracoes") ? "active" : ""}`}><Settings size={20}/><span>Configurações</span></Link>
        </nav>
      </aside>

      {aberto && (
        <div className="notification-modal-backdrop" role="presentation" onClick={() => setAberto(false)}>
          <section className="notification-letter-modal" role="dialog" aria-modal="true" aria-labelledby="notification-letter-title" onClick={(event) => event.stopPropagation()}>
            <div className="notification-letter-topbar">
              <div className="notification-letter-stamp">
                <Mail size={18}/>
                <span>Estudo de correspondência</span>
              </div>
              <button type="button" className="notification-letter-close" onClick={() => setAberto(false)} aria-label="Fechar cartas">
                <X size={18}/>
              </button>
            </div>

            <header className="notification-letter-header">
              <div>
                <p className="notification-letter-kicker">Correspondência mágica</p>
                <h2 id="notification-letter-title">Suas cartas</h2>
              </div>
              <div className="notification-letter-header-actions">
                <span>{naoLidas} não lida{naoLidas === 1 ? "" : "s"}</span>
                {naoLidas > 0 && (
                  <button
                    type="button"
                    className="notification-read-all"
                    onClick={() => void lerTodas()}
                    disabled={marcandoTodas}
                    title="Marcar todas as cartas como lidas"
                  >
                    <CheckCheck size={17}/>
                    {marcandoTodas ? "Marcando..." : "Ler todas"}
                  </button>
                )}
              </div>
            </header>

            <div className="notification-letter-body">
              {notificacoes.length === 0 ? (
                <div className="notification-empty-letter">
                  <MascotSprite src={mascote.url} nome={mascote.nome} size={78} frames={6} />
                  <strong>Nenhuma carta por enquanto</strong>
                  <p>Quando surgir uma conquista, compra ou lembrete de estudo, seu mascote entregará a mensagem aqui.</p>
                </div>
              ) : (
                <div className="notification-letter-list">
                  {notificacoes.map((item) => (
                    <button type="button" key={item.id} className={`notification-letter-item ${item.lida ? "" : "unread"}`} onClick={() => void abrirNotificacao(item)}>
                      <span className="notification-letter-seal" />
                      <span>
                        <strong>{item.titulo}</strong>
                        <small>{item.mensagem}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
