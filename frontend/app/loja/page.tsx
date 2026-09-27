"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Coins, Crown, MousePointer2, PawPrint, ShoppingBag, Sparkles, UserRound, WandSparkles, X } from "lucide-react";

import "../trilha/trilha.css";
import "../sidebar-pages.css";
import Header from "../components/header";
import Sidebar from "../components/sidebar";
import MascotSprite from "../components/mascot-sprite";
import { API_BASE } from "../lib/api";
import { aplicarTema } from "../components/theme-provider";
import { NOMES_CASAS } from "../lib/identidade";

type ItemLoja = {
  id: number;
  nome: string;
  slug: string;
  descricao?: string;
  preco_coins: number;
  arquivo: string;
  arquivo_legado?: string | null;
  tipo: "avatar" | "mascote" | "cursor" | string;
  casa?: string | null;
  comprado: boolean;
  equipado: boolean;
  arquivo_personalizado?: string | null;
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

const CASAS_PERSONALIZACAO = [
  { slug: "corvinal", sufixo: "c", cor: "#477db6", detalhe: "Azul e bronze", lema: "Ideias que iluminam" },
  { slug: "grifinoria", sufixo: "g", cor: "#bd4250", detalhe: "Vermelho e dourado", lema: "Coragem para criar" },
  { slug: "sonserina", sufixo: "s", cor: "#398568", detalhe: "Verde e prata", lema: "Elegância e ambição" },
  { slug: "lufa-lufa", sufixo: "l", cor: "#d0a33a", detalhe: "Amarelo e preto", lema: "Lealdade em cada detalhe" },
];

const ROUPAS = [
  { slug: "uniforme", nome: "Uniforme clássico", descricao: "Camisa da casa e sobretudo", icone: "✦" },
  { slug: "sobre-tudo", nome: "Sobre-tudo", descricao: "Visual de inverno com cachecol", icone: "◈" },
  { slug: "casual", nome: "Casual mágico", descricao: "Conforto para estudar", icone: "✧" },
  { slug: "noite", nome: "Cerimônia", descricao: "Um toque especial para ocasiões", icone: "✺" },
] as const;

const PASTAS_CASAS: Record<string, string> = {
  corvinal: "corvinal",
  grifinoria: "grifinoria",
  sonserina: "sonserina",
  "lufa-lufa": "luflufa",
};

type RoupaAvatar = (typeof ROUPAS)[number]["slug"];

function caminhoAvatar(personagem: string, casa: string, roupa: RoupaAvatar) {
  const casaInfo = CASAS_PERSONALIZACAO.find((item) => item.slug === casa) || CASAS_PERSONALIZACAO[0];
  const pasta = PASTAS_CASAS[casaInfo.slug];
  const base = `/loja/avatares/${pasta}/${personagem}${casaInfo.sufixo}`;
  return roupa === "uniforme" ? `${base}.png` : `${base}-${roupa}.png`;
}

function caminhoFotoNeutra(item: ItemLoja) {
  const personagem = item.slug.replace(/^avatar-/, "").split("-")[0];
  return `/loja/avatares/fotosneutras/${personagem}d.png`;
}

function AvatarLoja({ src, nome, fallbacks = [] }: { src: string; nome: string; fallbacks?: string[] }) {
  const [tentativa, setTentativa] = useState(0);
  const fontes = [src, ...fallbacks].filter((fonte, indice, todas) => fonte && todas.indexOf(fonte) === indice);
  const falhou = tentativa >= fontes.length;
  return (
    <div className="shop-avatar-wrap">
      {!falhou ? <img src={fontes[tentativa]} alt={nome} className="shop-avatar" onError={() => setTentativa((valor) => valor + 1)} /> : <div className="shop-avatar-fallback">{nome.slice(0, 1).toUpperCase()}</div>}
    </div>
  );
}

export default function LojaPage() {
  const router = useRouter();
  const [dados, setDados] = useState<LojaDados | null>(null);
  const [loading, setLoading] = useState(true);
  const [acao, setAcao] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: string; texto: string } | null>(null);
  const [itemPersonalizando, setItemPersonalizando] = useState<ItemLoja | null>(null);
  const [casaVisual, setCasaVisual] = useState("corvinal");
  const [roupaVisual, setRoupaVisual] = useState<RoupaAvatar>("uniforme");

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
  const cursores = useMemo(() => (dados?.itens || []).filter((item) => item.tipo === "cursor"), [dados]);

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
      if (item.tipo === "cursor") window.dispatchEvent(new Event("lumostudy:cursor-changed"));
      window.dispatchEvent(new Event("lumostudy:stats-changed"));
      window.dispatchEvent(new Event("lumostudy:mascot-changed"));
      window.dispatchEvent(new Event("lumostudy:notifications-changed"));
    } catch (err) {
      setMensagem({ tipo: "error", texto: err instanceof Error ? err.message : "Não foi possível concluir a ação." });
    } finally { setAcao(null); }
  }

  function abrirPersonalizador(item: ItemLoja) {
    setCasaVisual("corvinal");
    setRoupaVisual("uniforme");
    setItemPersonalizando(item);
    setMensagem(null);
  }

  async function comprarPersonalizado() {
    if (!itemPersonalizando) return;
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login?next=/loja"); return; }
    setAcao(itemPersonalizando.id);
    setMensagem(null);
    try {
      const response = await fetch(`${API_BASE}/loja/${itemPersonalizando.id}/comprar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ casa: casaVisual, roupa: roupaVisual }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Não foi possível comprar este avatar.");
      setDados(data as LojaDados);
      const dark = localStorage.getItem("lumostudy_theme") === "dark";
        aplicarTema(dark, data.casa || "corvinal", Boolean(data.tema_roxo_padrao), data.avatar_url);
      setMensagem({ tipo: "success", texto: data.mensagem || "Seu novo visual está pronto!" });
      setItemPersonalizando(null);
      window.dispatchEvent(new Event("lumostudy:stats-changed"));
      window.dispatchEvent(new Event("lumostudy:avatar-changed"));
      window.dispatchEvent(new Event("lumostudy:notifications-changed"));
    } catch (err) {
      setMensagem({ tipo: "error", texto: err instanceof Error ? err.message : "Não foi possível comprar este avatar." });
    } finally {
      setAcao(null);
    }
  }

  function ItemCard({ item }: { item: ItemLoja }) {
    const semSaldo = Number(dados?.coins || 0) < Number(item.preco_coins);
    return (
      <article className="page-card shop-card">
        {item.tipo === "mascote" ? (
          <div className="shop-avatar-wrap shop-mascot-wrap"><MascotSprite src={item.arquivo} nome={item.nome} size={88} /></div>
        ) : item.tipo === "cursor" ? (
          <div className="shop-avatar-wrap shop-cursor-wrap"><img src={item.arquivo} alt={item.nome} /></div>
        ) : (
          <AvatarLoja src={caminhoFotoNeutra(item)} nome={item.nome} />
        )}
        <div className="shop-name-row">
          <h3>{item.nome}</h3>
          {item.casa && <span className={`shop-house-badge house-${item.casa}`}>{NOMES_CASAS[item.casa] || item.casa}</span>}
        </div>
        <p>{item.tipo === "avatar" ? `Foto padrão de ${item.nome} para personalizar com a casa que você escolher.` : item.descricao}</p>
        <div className="shop-card-footer">
          <div>{item.equipado ? <span className="shop-status"><Check size={13} /> Em uso</span> : <span className="price"><Coins size={15}/>{item.preco_coins}</span>}</div>
          {!item.comprado ? (
            <button className="primary-action" disabled={acao === item.id || (item.tipo !== "avatar" && semSaldo)} onClick={() => item.tipo === "avatar" ? abrirPersonalizador(item) : void executar(item, "comprar")}>{item.tipo === "avatar" ? <><WandSparkles size={15}/> Personalizar</> : "Comprar"}</button>
          ) : item.equipado ? (
            <button className="secondary-action" disabled><Check size={15}/> Equipado</button>
          ) : (
            <button className="secondary-action" disabled={acao === item.id} onClick={() => void executar(item, "equipar")}>{item.tipo === "mascote" ? <PawPrint size={15}/> : item.tipo === "cursor" ? <MousePointer2 size={15}/> : <UserRound size={15}/>} Usar</button>
          )}
        </div>
      </article>
    );
  }

  const slugPersonalizado = itemPersonalizando?.slug.replace(/^avatar-/, "").split("-")[0] || "alex";
  const arquivoPreview = caminhoAvatar(slugPersonalizado, casaVisual, roupaVisual);
  const arquivoCasa = caminhoAvatar(slugPersonalizado, casaVisual, "uniforme");
  const casaSelecionada = CASAS_PERSONALIZACAO.find((casa) => casa.slug === casaVisual) || CASAS_PERSONALIZACAO[0];
  const nomeComCasa = `${itemPersonalizando?.nome || "Alex"} ${NOMES_CASAS[casaVisual] || casaVisual}`;
  const semSaldoPersonalizacao = Number(dados?.coins || 0) < Number(itemPersonalizando?.preco_coins || 0);
  const avatarParaCriar = avatares.find((item) => !item.comprado);

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
              <p>O curso não escolhe sua casa. Escolha um dos quatro retratos e use o Ateliê para combinar sua casa, a cor da camisa e o resto do visual.</p>
              <div className="hero-stat-row">
                <span className="hero-pill"><Coins size={16}/> Saldo: {Number(dados?.coins || 0).toLocaleString("pt-BR")}</span>
                <span className="hero-pill"><Sparkles size={16}/> Sua casa é escolha sua</span>
              </div>
            </div>

            <section className="shop-studio-callout" aria-label="Ateliê de avatares">
              <div className="shop-studio-callout-mark"><WandSparkles size={24} /></div>
              <div className="shop-studio-callout-copy">
                <span>ATELIÊ DE AVATARES</span>
                <h2>Monte seu visual antes de comprar</h2>
                <p>Escolha qualquer casa e combine as cores com diferentes roupas. Sua escolha é independente do curso.</p>
              </div>
              <button type="button" className="shop-studio-callout-button" disabled={!avatarParaCriar} onClick={() => avatarParaCriar && abrirPersonalizador(avatarParaCriar)}>
                Criar meu visual <ChevronRight size={17} />
              </button>
            </section>

            {mensagem && <div className={`inline-message ${mensagem.tipo}`}>{mensagem.texto}</div>}
            {loading && <div className="page-card" style={{ padding: 24 }}>Carregando itens...</div>}

            {!loading && (
              <>
                <div className="shop-head">
                  <div><h2 style={{ fontSize: 22 }}>Avatares para personalizar</h2><p className="muted" style={{ marginTop: 4 }}>Escolha um retrato-base e crie um visual único para ele.</p></div>
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

                <div className="shop-head shop-section-gap">
                  <div><h2 style={{ fontSize: 22 }}>Ponteiro do mouse</h2><p className="muted" style={{ marginTop: 4 }}>Equipe uma varinha para substituir a seta padrão.</p></div>
                  <MousePointer2 size={24}/>
                </div>
                <div className="shop-grid">{cursores.map((item) => <ItemCard item={item} key={item.id} />)}</div>
              </>
            )}
          </div>
        </section>
      </div>
      {itemPersonalizando && (
        <div className="avatar-studio-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && acao === null) setItemPersonalizando(null); }}>
          <section className="avatar-studio" role="dialog" aria-modal="true" aria-labelledby="avatar-studio-title">
            <header className="avatar-studio-header">
              <div><span className="sidebar-page-kicker"><WandSparkles size={14}/> ATELIÊ DE AVATARES</span><h2 id="avatar-studio-title">Seu estilo, suas regras</h2><p>Escolha uma casa e monte um visual que tenha a sua cara.</p></div>
              <button className="avatar-studio-close" type="button" aria-label="Fechar personalização" disabled={acao !== null} onClick={() => setItemPersonalizando(null)}><X size={20}/></button>
            </header>

            <div className="avatar-studio-layout">
              <div className="avatar-studio-preview-column">
                <div className={`avatar-studio-preview house-${casaVisual}`} style={{ "--studio-color": casaSelecionada.cor } as React.CSSProperties}>
                  <div className="avatar-studio-preview-glow" />
                  <div className="avatar-studio-character">
                    <AvatarLoja key={arquivoPreview} src={arquivoPreview} nome={nomeComCasa} fallbacks={[arquivoCasa, itemPersonalizando.arquivo, itemPersonalizando.arquivo_legado || ""]} />
                    <span className="avatar-studio-spark avatar-studio-spark--one">✦</span><span className="avatar-studio-spark avatar-studio-spark--two">✧</span>
                  </div>
                  <span className="avatar-studio-preview-label">PRÉVIA DO VISUAL</span>
                </div>
                <div className="avatar-studio-selected-house"><span className="avatar-studio-house-dot" style={{ background: casaSelecionada.cor }} /><div><strong>{nomeComCasa}</strong><small>{ROUPAS.find((roupa) => roupa.slug === roupaVisual)?.nome} · {casaSelecionada.detalhe}</small></div><Crown size={19}/></div>
              </div>

              <div className="avatar-studio-options">
                <div className="avatar-studio-step"><span>01</span><div><h3>Escolha as cores da sua casa</h3><p>A camisa e os detalhes do uniforme acompanham essa escolha.</p></div></div>
                <div className="avatar-studio-houses">
                  {CASAS_PERSONALIZACAO.map((casa) => (
                    <button type="button" key={casa.slug} className={`avatar-studio-house ${casaVisual === casa.slug ? "selected" : ""}`} style={{ "--studio-color": casa.cor } as React.CSSProperties} onClick={() => setCasaVisual(casa.slug)} aria-pressed={casaVisual === casa.slug}>
                      <span className="avatar-studio-house-swatch" /> <span><strong>{NOMES_CASAS[casa.slug]}</strong><small>{casa.detalhe}</small></span>{casaVisual === casa.slug && <Check size={16}/>}
                    </button>
                  ))}
                </div>

                <div className="avatar-studio-step avatar-studio-step--clothes"><span>02</span><div><h3>Monte a roupa</h3><p>O acabamento ganha as cores da casa selecionada.</p></div></div>
                <div className="avatar-studio-outfits">
                  {ROUPAS.map((roupa) => (
                    <button type="button" key={roupa.slug} className={`avatar-studio-outfit ${roupaVisual === roupa.slug ? "selected" : ""}`} onClick={() => setRoupaVisual(roupa.slug)} aria-pressed={roupaVisual === roupa.slug}>
                      <span className="avatar-studio-outfit-art" style={{ "--studio-color": casaSelecionada.cor } as React.CSSProperties}><i>{roupa.icone}</i></span>
                      <span><strong>{roupa.nome}</strong><small>{roupa.descricao}</small></span>
                      {roupaVisual === roupa.slug && <Check className="avatar-studio-outfit-check" size={15}/>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <footer className="avatar-studio-footer">
              <div className="avatar-studio-price"><span>Seu novo visual</span><strong><Coins size={17}/>{itemPersonalizando.preco_coins} moedas</strong></div>
              <button type="button" className="avatar-studio-buy" disabled={acao === itemPersonalizando.id || semSaldoPersonalizacao} onClick={() => void comprarPersonalizado()}>{acao === itemPersonalizando.id ? "Preparando seu visual…" : semSaldoPersonalizacao ? "Moedas insuficientes" : <>Comprar e equipar <ChevronRight size={17}/></>}</button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
