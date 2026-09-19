"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, CircleHelp, Clock3, GraduationCap, Layers, Lock, Mail, Moon, Palette, PawPrint, Save, Settings2, ShoppingBag, Sun, Target, User } from "lucide-react";

import "../trilha/trilha.css";
import "../sidebar-pages.css";
import "./configuracoes.css";
import Sidebar from "../components/sidebar";
import Header from "../components/header";
import { aplicarTema } from "../components/theme-provider";
import { API_BASE, formatApiError } from "../lib/api";
import MascotSprite from "../components/mascot-sprite";
import { NOMES_CASAS, NOMES_CURSOS } from "../lib/identidade";

type Periodo = "diario" | "semanal" | "mensal";
type MetaTipo = "tempo_estudo" | "flashcards" | "questoes";
type MetasForm = Record<Periodo, Record<MetaTipo, number>>;

type PerfilResponse = {
  nome?: string;
  email?: string;
  modo_escuro?: boolean;
  tema_roxo_padrao?: boolean;
  curso?: string;
  casa?: string;
  avatar_url?: string;
  mascote_slug?: string;
  mascote_url?: string;
  access_token?: string;
  detail?: unknown;
};

type MetaApiItem = {
  tipo?: MetaTipo;
  total?: number;
};

type ItemLoja = {
  id: number;
  nome: string;
  arquivo: string;
  tipo: string;
  casa?: string | null;
  comprado: boolean;
  equipado: boolean;
};

type LojaResponse = {
  itens?: ItemLoja[];
  avatar_url?: string;
  mascote_slug?: string;
  mascote_url?: string;
  curso?: string;
  casa?: string;
  tema_roxo_padrao?: boolean;
  detail?: unknown;
};

const METAS_PADRAO: MetasForm = {
  diario: { tempo_estudo: 60, flashcards: 15, questoes: 25 },
  semanal: { tempo_estudo: 360, flashcards: 90, questoes: 150 },
  mensal: { tempo_estudo: 1500, flashcards: 400, questoes: 600 },
};

const PERIODOS: Array<{ key: Periodo; label: string }> = [
  { key: "diario", label: "Diário" },
  { key: "semanal", label: "Semanal" },
  { key: "mensal", label: "Mensal" },
];

const TIPOS: Array<{ key: MetaTipo; label: string; unidade: string; icon: typeof Clock3 }> = [
  { key: "tempo_estudo", label: "Tempo de estudo", unidade: "min", icon: Clock3 },
  { key: "flashcards", label: "Flashcards", unidade: "cards", icon: Layers },
  { key: "questoes", label: "Questões", unidade: "questões", icon: CircleHelp },
];

function normalizarMetas(dados: unknown): MetasForm {
  const resultado: MetasForm = {
    diario: { ...METAS_PADRAO.diario },
    semanal: { ...METAS_PADRAO.semanal },
    mensal: { ...METAS_PADRAO.mensal },
  };

  if (!dados || typeof dados !== "object") return resultado;
  const bruto = dados as Record<string, MetaApiItem[]>;
  const rotulos: Record<Periodo, string> = {
    diario: "Diário",
    semanal: "Semanal",
    mensal: "Mensal",
  };

  PERIODOS.forEach(({ key }) => {
    const itens = Array.isArray(bruto[rotulos[key]]) ? bruto[rotulos[key]] : [];
    itens.forEach((item) => {
      if (!item?.tipo || !(item.tipo in resultado[key])) return;
      const valor = Number(item.total || 0);
      if (Number.isFinite(valor) && valor > 0) resultado[key][item.tipo] = valor;
    });
  });

  return resultado;
}

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvandoMetas, setSalvandoMetas] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [modoEscuro, setModoEscuro] = useState(false);
  const [temaRoxoPadrao, setTemaRoxoPadrao] = useState(false);
  const [curso, setCurso] = useState("informatica");
  const [casa, setCasa] = useState("grifinoria");
  const [avatarUrl, setAvatarUrl] = useState("/avatar.png");
  const [avataresLoja, setAvataresLoja] = useState<ItemLoja[]>([]);
  const [mascoteSlug, setMascoteSlug] = useState("coruja");
  const [mascoteUrl, setMascoteUrl] = useState("/sprites/mascotes/coruja.png");
  const [mascotesLoja, setMascotesLoja] = useState<ItemLoja[]>([]);
  const [alterandoAvatar, setAlterandoAvatar] = useState<number | "padrao" | null>(null);
  const [alterandoMascote, setAlterandoMascote] = useState<number | "padrao" | null>(null);
  const [metas, setMetas] = useState<MetasForm>(METAS_PADRAO);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login?next=/configuracoes");
      return;
    }

    async function carregar() {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [perfilResponse, metasResponse, lojaResponse] = await Promise.all([
          fetch(`${API_BASE}/usuarios/me/perfil`, { headers, cache: "no-store" }),
          fetch(`${API_BASE}/usuarios/me/metas`, { headers, cache: "no-store" }),
          fetch(`${API_BASE}/loja`, { headers, cache: "no-store" }),
        ]);

        if (perfilResponse.status === 401 || metasResponse.status === 401 || lojaResponse.status === 401) {
          localStorage.removeItem("token");
          router.replace("/login?next=/configuracoes");
          return;
        }

        const perfil = (await perfilResponse.json().catch(() => ({}))) as PerfilResponse;
        const metasData = await metasResponse.json().catch(() => ({}));
        const lojaData = (await lojaResponse.json().catch(() => ({}))) as LojaResponse;

        if (!perfilResponse.ok) {
          throw new Error(formatApiError(perfil.detail, "Não foi possível carregar seu perfil."));
        }
        if (!metasResponse.ok) {
          const detail = metasData && typeof metasData === "object" ? (metasData as { detail?: unknown }).detail : undefined;
          throw new Error(formatApiError(detail, "Não foi possível carregar suas metas."));
        }
        if (!lojaResponse.ok) {
          throw new Error(formatApiError(lojaData.detail, "Não foi possível carregar suas fotos de perfil."));
        }

        const dark = Boolean(perfil.modo_escuro);
        const roxo = Boolean(perfil.tema_roxo_padrao);
        const cursoRecebido = perfil.curso || "informatica";
        const casaRecebida = perfil.casa || "grifinoria";
        const avatarRecebido = perfil.avatar_url || "/avatar.png";
        const mascoteSlugRecebido = perfil.mascote_slug || "coruja";
        const mascoteUrlRecebido = perfil.mascote_url || "/sprites/mascotes/coruja.png";

        setNome(perfil.nome || "");
        setEmail(perfil.email || "");
        setModoEscuro(dark);
        setTemaRoxoPadrao(roxo);
        setCurso(cursoRecebido);
        setCasa(casaRecebida);
        setAvatarUrl(avatarRecebido);
        setMascoteSlug(mascoteSlugRecebido);
        setMascoteUrl(mascoteUrlRecebido);
        const itens = Array.isArray(lojaData.itens) ? lojaData.itens : [];
        setAvataresLoja(itens.filter((item) => item.tipo === "avatar"));
        setMascotesLoja(itens.filter((item) => item.tipo === "mascote"));
        setMetas(normalizarMetas(metasData));
        aplicarTema(dark, casaRecebida, roxo, avatarRecebido);
      } catch (error) {
        setTipoMensagem("erro");
        setMensagem(error instanceof Error ? error.message : "Não foi possível carregar suas configurações.");
      } finally {
        setLoading(false);
      }
    }

    void carregar();
  }, [router]);

  function escolherModoEscuro(valor: boolean) {
    setModoEscuro(valor);
    aplicarTema(valor, casa, temaRoxoPadrao, avatarUrl);
  }

  function escolherCorDoTema(usarRoxoPadrao: boolean) {
    setTemaRoxoPadrao(usarRoxoPadrao);
    aplicarTema(modoEscuro, casa, usarRoxoPadrao, avatarUrl);
  }

  async function selecionarAvatar(item?: ItemLoja) {
    if (item && !item.comprado) {
      router.push("/loja");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login?next=/configuracoes");
      return;
    }

    const idAcao: number | "padrao" = item?.id ?? "padrao";
    setAlterandoAvatar(idAcao);
    setMensagem("");
    setTipoMensagem("");

    try {
      const endpoint = item ? `${API_BASE}/loja/${item.id}/equipar` : `${API_BASE}/loja/equipar-padrao`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await response.json().catch(() => ({}))) as LojaResponse & { mensagem?: string };
      if (!response.ok) {
        throw new Error(formatApiError(data.detail, "Não foi possível trocar a foto de perfil."));
      }

      const novoAvatar = data.avatar_url || item?.arquivo || "/avatar.png";
      const novaCasa = data.casa || item?.casa || casa;
      const novoRoxo = Boolean(data.tema_roxo_padrao);

      setAvatarUrl(novoAvatar);
      setCasa(novaCasa);
      setTemaRoxoPadrao(novoRoxo);
      if (Array.isArray(data.itens)) {
        setAvataresLoja(data.itens.filter((lojaItem) => lojaItem.tipo === "avatar"));
        setMascotesLoja(data.itens.filter((lojaItem) => lojaItem.tipo === "mascote"));
      }
      aplicarTema(modoEscuro, novaCasa, novoRoxo, novoAvatar);
      setTipoMensagem("sucesso");
      setMensagem(data.mensagem || "Foto de perfil atualizada!");
      window.dispatchEvent(new Event("lumostudy:stats-changed"));
    } catch (error) {
      setTipoMensagem("erro");
      setMensagem(error instanceof Error ? error.message : "Não foi possível trocar a foto de perfil.");
    } finally {
      setAlterandoAvatar(null);
    }
  }

  async function selecionarMascote(item?: ItemLoja) {
    if (item && !item.comprado) { router.push("/loja"); return; }
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login?next=/configuracoes"); return; }

    const idAcao: number | "padrao" = item?.id ?? "padrao";
    setAlterandoMascote(idAcao);
    setMensagem("");
    setTipoMensagem("");
    try {
      const endpoint = item ? `${API_BASE}/loja/${item.id}/equipar` : `${API_BASE}/loja/equipar-mascote-padrao`;
      const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = (await response.json().catch(() => ({}))) as LojaResponse & { mensagem?: string };
      if (!response.ok) throw new Error(formatApiError(data.detail, "Não foi possível trocar o mascote."));

      setMascoteSlug(data.mascote_slug || (item ? item.nome.toLowerCase() : "coruja"));
      setMascoteUrl(data.mascote_url || item?.arquivo || "/sprites/mascotes/coruja.png");
      if (Array.isArray(data.itens)) {
        setAvataresLoja(data.itens.filter((lojaItem) => lojaItem.tipo === "avatar"));
        setMascotesLoja(data.itens.filter((lojaItem) => lojaItem.tipo === "mascote"));
      }
      setTipoMensagem("sucesso");
      setMensagem(data.mensagem || "Mascote atualizado!");
      window.dispatchEvent(new Event("lumostudy:mascot-changed"));
      window.dispatchEvent(new Event("lumostudy:stats-changed"));
    } catch (error) {
      setTipoMensagem("erro");
      setMensagem(error instanceof Error ? error.message : "Não foi possível trocar o mascote.");
    } finally { setAlterandoMascote(null); }
  }

  async function handleSalvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem("");
    setTipoMensagem("");

    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim();
    if (!nomeLimpo || !emailLimpo) {
      setTipoMensagem("erro");
      setMensagem("Nome e e-mail são obrigatórios.");
      return;
    }

    const querTrocarSenha = novaSenha.trim().length > 0 || confirmarSenha.trim().length > 0;
    if (querTrocarSenha) {
      if (!senhaAtual) { setTipoMensagem("erro"); setMensagem("Informe sua senha atual."); return; }
      if (novaSenha.length < 6) { setTipoMensagem("erro"); setMensagem("A nova senha deve ter pelo menos 6 caracteres."); return; }
      if (novaSenha !== confirmarSenha) { setTipoMensagem("erro"); setMensagem("A confirmação de senha não confere."); return; }
    }

    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login?next=/configuracoes"); return; }

    const payload: Record<string, string | boolean> = {
      nome: nomeLimpo,
      email: emailLimpo,
      modo_escuro: modoEscuro,
      tema_roxo_padrao: temaRoxoPadrao,
    };
    if (querTrocarSenha) {
      payload.senha_atual = senhaAtual;
      payload.nova_senha = novaSenha;
    }

    setSalvando(true);
    try {
      const response = await fetch(`${API_BASE}/usuarios/me/perfil`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as PerfilResponse;
      if (!response.ok) throw new Error(formatApiError(data.detail, "Não foi possível salvar as alterações."));

      if (data.access_token) localStorage.setItem("token", data.access_token);

      const casaAtualizada = data.casa || casa;
      const avatarAtualizado = data.avatar_url || avatarUrl;
      const darkAtualizado = Boolean(data.modo_escuro);
      const roxoAtualizado = Boolean(data.tema_roxo_padrao);

      setNome(data.nome || nomeLimpo);
      setEmail(data.email || emailLimpo);
      setCurso(data.curso || curso);
      setCasa(casaAtualizada);
      setAvatarUrl(avatarAtualizado);
      setModoEscuro(darkAtualizado);
      setTemaRoxoPadrao(roxoAtualizado);
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
      aplicarTema(darkAtualizado, casaAtualizada, roxoAtualizado, avatarAtualizado);
      setTipoMensagem("sucesso");
      setMensagem("Configurações salvas com sucesso!");
      window.dispatchEvent(new Event("lumostudy:stats-changed"));
    } catch (error) {
      setTipoMensagem("erro");
      setMensagem(error instanceof Error ? error.message : "Não foi possível conectar ao servidor.");
    } finally {
      setSalvando(false);
    }
  }

  function alterarMeta(periodo: Periodo, tipo: MetaTipo, valor: string) {
    const numero = Math.max(1, Math.min(100000, Number(valor) || 1));
    setMetas((atual) => ({
      ...atual,
      [periodo]: { ...atual[periodo], [tipo]: numero },
    }));
  }

  async function handleSalvarMetas(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem("");
    setTipoMensagem("");

    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login?next=/configuracoes"); return; }

    const payload = {
      metas: PERIODOS.flatMap(({ key: periodo }) =>
        TIPOS.map(({ key: tipo }) => ({
          periodo,
          tipo,
          valor_meta: metas[periodo][tipo],
        }))
      ),
    };

    setSalvandoMetas(true);
    try {
      const response = await fetch(`${API_BASE}/usuarios/me/metas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      const detail = data && typeof data === "object" ? (data as { detail?: unknown }).detail : undefined;
      if (!response.ok) throw new Error(formatApiError(detail, "Não foi possível salvar as metas."));

      const novasMetas = data && typeof data === "object" ? (data as { metas?: unknown }).metas : undefined;
      if (novasMetas) setMetas(normalizarMetas(novasMetas));
      setTipoMensagem("sucesso");
      setMensagem("Metas atualizadas com sucesso!");
      window.dispatchEvent(new Event("lumostudy:stats-changed"));
    } catch (error) {
      setTipoMensagem("erro");
      setMensagem(error instanceof Error ? error.message : "Não foi possível salvar as metas.");
    } finally {
      setSalvandoMetas(false);
    }
  }

  return (
    <main className="dashboard">
      <Header />
      <div className="dashboard-body dashboard-body--sidebar-page">
        <Sidebar />
        <section className="sidebar-page-content">
          <div className="sidebar-page-shell">
            <span className="sidebar-page-kicker"><Settings2 size={14}/> Preferências</span>
            <h1 className="sidebar-page-title">Configurações</h1>
            <p className="sidebar-page-subtitle">Atualize sua conta, avatar, mascote, aparência e metas de estudo.</p>

            {mensagem && <div className={`inline-message ${tipoMensagem === "sucesso" ? "success" : "error"}`}>{mensagem}</div>}

            {loading ? (
              <div className="page-card" style={{padding:28, marginTop:22}}>Carregando suas configurações...</div>
            ) : (
              <>
                <form onSubmit={handleSalvar} className="settings-grid" style={{marginTop:22}}>
                  <div className="config-card" style={{maxWidth:"none"}}>
                    <h2 className="config-card-title">Conta</h2>
                    <div className="config-form">
                      <div className="config-field-group">
                        <label>Nome</label>
                        <div className="config-input"><User size={16}/><input value={nome} onChange={(e) => setNome(e.target.value)} required /></div>
                      </div>
                      <div className="config-field-group">
                        <label>E-mail</label>
                        <div className="config-input"><Mail size={16}/><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                      </div>

                      <div className="config-divider"><span>Alterar senha (opcional)</span></div>
                      <div className="config-field-group">
                        <label>Senha atual</label>
                        <div className="config-input"><Lock size={16}/><input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} placeholder="••••••••" /></div>
                      </div>
                      <div className="config-field-row">
                        <div className="config-field-group">
                          <label>Nova senha</label>
                          <div className="config-input"><Lock size={16}/><input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
                        </div>
                        <div className="config-field-group">
                          <label>Confirmar nova senha</label>
                          <div className="config-input"><Lock size={16}/><input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} placeholder="Repita a nova senha" /></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="settings-side-stack">
                    <div className="page-card course-identity-card">
                      <div className="page-card-header">
                        <div><h3><GraduationCap size={17}/> Identidade do curso</h3><p>Definida no cadastro e usada como tema principal.</p></div>
                      </div>
                      <div className={`course-identity-badge house-${casa}`}>
                        <strong>{NOMES_CURSOS[curso] || curso}</strong>
                        <span>{NOMES_CASAS[casa] || casa}</span>
                      </div>
                    </div>

                    <div className="page-card profile-avatar-card">
                      <div className="page-card-header">
                        <div>
                          <h3><Camera size={17}/> Foto de perfil</h3>
                          <p>Seu curso define sua casa e a cor do LumoStudy. Aqui você escolhe uma das quatro versões disponíveis para sua casa.</p>
                        </div>
                      </div>

                      <div className="current-avatar-preview">
                        <img src={avatarUrl} alt="Foto de perfil atual" onError={(e) => { e.currentTarget.src = "/avatar.png"; }} />
                        <div>
                          <strong>Foto atual</strong>
                          <small>O avatar não muda sua casa nem a cor do aplicativo.</small>
                        </div>
                      </div>

                      <div className="avatar-selector-grid">
                        <button
                          type="button"
                          className={`avatar-selector-option ${avatarUrl === "/avatar.png" ? "selected" : ""}`}
                          onClick={() => void selecionarAvatar()}
                          disabled={alterandoAvatar !== null}
                          title="Usar foto padrão"
                        >
                          <span className="avatar-selector-image"><img src="/avatar.png" alt="Padrão" /></span>
                          <span className="avatar-selector-name">Padrão</span>
                          {avatarUrl === "/avatar.png" && <Check size={15} className="avatar-selector-check"/>}
                        </button>

                        {avataresLoja.map((item) => {
                          const selecionado = avatarUrl === item.arquivo;
                          return (
                            <button
                              type="button"
                              key={item.id}
                              className={`avatar-selector-option ${selecionado ? "selected" : ""} ${!item.comprado ? "locked" : ""}`}
                              onClick={() => void selecionarAvatar(item)}
                              disabled={alterandoAvatar !== null}
                              title={item.comprado ? `Usar ${item.nome}` : `${item.nome} — desbloqueie na Loja`}
                            >
                              <span className="avatar-selector-image"><img src={item.arquivo} alt={item.nome} onError={(e) => { e.currentTarget.src = "/avatar.png"; }} /></span>
                              <span className="avatar-selector-name">{item.nome}</span>
                              {selecionado ? (
                                <Check size={15} className="avatar-selector-check"/>
                              ) : !item.comprado ? (
                                <Lock size={14} className="avatar-selector-lock"/>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>

                      <button type="button" className="avatar-shop-link" onClick={() => router.push("/loja")}>
                        <ShoppingBag size={15}/> Ver Loja
                      </button>
                    </div>

                    <div className="page-card profile-avatar-card mascot-settings-card">
                      <div className="page-card-header">
                        <div><h3><PawPrint size={17}/> Mascote de notificações</h3><p>A coruja é padrão. Mascotes extras são comprados na Loja.</p></div>
                      </div>
                      <div className="current-avatar-preview">
                        <MascotSprite src={mascoteUrl} nome={mascoteSlug} size={58} />
                        <div><strong>Mascote atual</strong><small>Ele aparece na lateral segurando suas cartas e avisos.</small></div>
                      </div>
                      <div className="avatar-selector-grid">
                        <button type="button" className={`avatar-selector-option ${mascoteSlug === "coruja" ? "selected" : ""}`} onClick={() => void selecionarMascote()} disabled={alterandoMascote !== null}>
                          <span className="avatar-selector-image mascot-option-image"><MascotSprite src="/sprites/mascotes/coruja.png" nome="Coruja" size={44}/></span>
                          <span className="avatar-selector-name">Coruja</span>
                          {mascoteSlug === "coruja" && <Check size={15} className="avatar-selector-check"/>}
                        </button>
                        {mascotesLoja.map((item) => {
                          const selecionado = mascoteUrl === item.arquivo;
                          return (
                            <button type="button" key={item.id} className={`avatar-selector-option ${selecionado ? "selected" : ""} ${!item.comprado ? "locked" : ""}`} onClick={() => void selecionarMascote(item)} disabled={alterandoMascote !== null}>
                              <span className="avatar-selector-image mascot-option-image"><MascotSprite src={item.arquivo} nome={item.nome} size={44}/></span>
                              <span className="avatar-selector-name">{item.nome}</span>
                              {selecionado ? <Check size={15} className="avatar-selector-check"/> : !item.comprado ? <Lock size={14} className="avatar-selector-lock"/> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="page-card appearance-card">
                      <div className="page-card-header">
                        <div><h3>Aparência</h3><p>Escolha a luminosidade e se o aplicativo usa o roxo clássico ou a cor da sua casa.</p></div>
                      </div>

                      <div className="appearance-option-label"><Sun size={15}/> Luminosidade</div>
                      <div className="theme-choice">
                        <button type="button" className={`theme-preview light ${!modoEscuro ? "selected" : ""}`} onClick={() => escolherModoEscuro(false)}>
                          <div className="theme-preview-canvas" />
                          <strong><Sun size={15} style={{verticalAlign:"-2px", marginRight:5}}/> Claro</strong>
                        </button>
                        <button type="button" className={`theme-preview dark ${modoEscuro ? "selected" : ""}`} onClick={() => escolherModoEscuro(true)}>
                          <div className="theme-preview-canvas" />
                          <strong><Moon size={15} style={{verticalAlign:"-2px", marginRight:5}}/> Escuro</strong>
                        </button>
                      </div>

                      <div className="appearance-option-label appearance-option-label--spaced"><Palette size={15}/> Cor principal</div>
                      <div className="theme-choice accent-theme-choice">
                        <button type="button" className={`theme-preview accent-theme-preview ${temaRoxoPadrao ? "selected" : ""}`} onClick={() => escolherCorDoTema(true)}>
                          <div className="accent-theme-swatch accent-theme-swatch--purple"><span/><span/><span/></div>
                          <strong>Roxo padrão</strong>
                          <small>Visual clássico do LumoStudy</small>
                        </button>
                        <button type="button" className={`theme-preview accent-theme-preview ${!temaRoxoPadrao ? "selected" : ""}`} onClick={() => escolherCorDoTema(false)}>
                          <div className={`accent-theme-swatch accent-theme-swatch--house house-${casa}`}><span/><span/><span/></div>
                          <strong>Cor da sua casa</strong>
                          <small>{NOMES_CASAS[casa] || casa}</small>
                        </button>
                      </div>
                    </div>

                    <button type="submit" className="primary-action" style={{width:"100%"}} disabled={salvando}>
                      <Save size={18}/>{salvando ? "Salvando..." : "Salvar configurações"}
                    </button>
                  </div>
                </form>

                <form className="page-card metas-settings-card" onSubmit={handleSalvarMetas}>
                  <div className="metas-settings-header">
                    <div>
                      <span className="sidebar-page-kicker"><Target size={14}/> Metas</span>
                      <h2>Objetivos de estudo</h2>
                      <p className="muted">Defina suas metas. O progresso é atualizado automaticamente conforme você estuda.</p>
                    </div>
                    <button type="submit" className="primary-action" disabled={salvandoMetas}>
                      <Save size={17}/>{salvandoMetas ? "Salvando..." : "Salvar metas"}
                    </button>
                  </div>

                  <div className="metas-settings-grid">
                    {PERIODOS.map(({ key: periodo, label }) => (
                      <section className="meta-period-card" key={periodo}>
                        <h3>{label}</h3>
                        {TIPOS.map(({ key: tipo, label: tipoLabel, unidade, icon: Icon }) => (
                          <label className="meta-config-row" key={tipo}>
                            <span><Icon size={16}/>{tipoLabel}</span>
                            <span className="meta-number-input">
                              <input
                                type="number"
                                min={1}
                                max={100000}
                                value={metas[periodo][tipo]}
                                onChange={(e) => alterarMeta(periodo, tipo, e.target.value)}
                              />
                              <small>{unidade}</small>
                            </span>
                          </label>
                        ))}
                      </section>
                    ))}
                  </div>
                </form>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
