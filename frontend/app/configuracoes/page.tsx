"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { CircleHelp, Clock3, Layers, Lock, Mail, Moon, Palette, Save, Settings2, Sun, Target, User } from "lucide-react";

import "../trilha/trilha.css";
import "../sidebar-pages.css";
import "./configuracoes.css";
import Sidebar from "../components/sidebar";
import Header from "../components/header";
import { aplicarTema } from "../components/theme-provider";
import { API_BASE, formatApiError } from "../lib/api";

type Periodo = "diario" | "semanal" | "mensal";
type MetaTipo = "tempo_estudo" | "flashcards" | "questoes";
type MetasForm = Record<Periodo, Record<MetaTipo, number>>;
type ConfigTab = "conta" | "personalizacao" | "metas";

type PerfilResponse = {
  nome?: string;
  email?: string;
  modo_escuro?: boolean;
  tema_roxo_padrao?: boolean;
  casa?: string;
  avatar_url?: string;
  access_token?: string;
  detail?: unknown;
};

type MetaApiItem = {
  tipo?: MetaTipo;
  total?: number;
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

const CONFIG_TABS: Array<{ key: ConfigTab; label: string; icon: typeof User }> = [
  { key: "conta", label: "Conta", icon: User },
  { key: "personalizacao", label: "Personalização", icon: Palette },
  { key: "metas", label: "Metas", icon: Target },
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
  const [casa, setCasa] = useState("grifinoria");
  const [avatarUrl, setAvatarUrl] = useState("/avatar.png");
  const [metas, setMetas] = useState<MetasForm>(METAS_PADRAO);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");
  const [abaAtiva, setAbaAtiva] = useState<ConfigTab>("conta");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login?next=/configuracoes");
      return;
    }

    async function carregar() {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [perfilResponse, metasResponse] = await Promise.all([
          fetch(`${API_BASE}/usuarios/me/perfil`, { headers, cache: "no-store" }),
          fetch(`${API_BASE}/usuarios/me/metas`, { headers, cache: "no-store" }),
        ]);

        if (perfilResponse.status === 401 || metasResponse.status === 401) {
          localStorage.removeItem("token");
          router.replace("/login?next=/configuracoes");
          return;
        }

        const perfil = (await perfilResponse.json().catch(() => ({}))) as PerfilResponse;
        const metasData = await metasResponse.json().catch(() => ({}));

        if (!perfilResponse.ok) {
          throw new Error(formatApiError(perfil.detail, "Não foi possível carregar seu perfil."));
        }
        if (!metasResponse.ok) {
          const detail = metasData && typeof metasData === "object" ? (metasData as { detail?: unknown }).detail : undefined;
          throw new Error(formatApiError(detail, "Não foi possível carregar suas metas."));
        }
        const dark = Boolean(perfil.modo_escuro);
        const roxo = Boolean(perfil.tema_roxo_padrao);
        const casaRecebida = perfil.casa || "grifinoria";
        const avatarRecebido = perfil.avatar_url || "/avatar.png";

        setNome(perfil.nome || "");
        setEmail(perfil.email || "");
        setModoEscuro(dark);
        setTemaRoxoPadrao(roxo);
        setCasa(casaRecebida);
        setAvatarUrl(avatarRecebido);
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

  function selecionarAba(aba: ConfigTab) {
    setAbaAtiva(aba);
    setMensagem("");
    setTipoMensagem("");
  }

  function navegarAbas(event: KeyboardEvent<HTMLButtonElement>, abaAtual: ConfigTab) {
    const indiceAtual = CONFIG_TABS.findIndex(({ key }) => key === abaAtual);
    let proximoIndice = indiceAtual;

    if (event.key === "ArrowRight") proximoIndice = (indiceAtual + 1) % CONFIG_TABS.length;
    else if (event.key === "ArrowLeft") proximoIndice = (indiceAtual - 1 + CONFIG_TABS.length) % CONFIG_TABS.length;
    else if (event.key === "Home") proximoIndice = 0;
    else if (event.key === "End") proximoIndice = CONFIG_TABS.length - 1;
    else return;

    event.preventDefault();
    const proximaAba = CONFIG_TABS[proximoIndice].key;
    selecionarAba(proximaAba);
    requestAnimationFrame(() => document.getElementById(`settings-tab-${proximaAba}`)?.focus());
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
            <p className="sidebar-page-subtitle">Gerencie sua conta, personalização e metas de estudo em espaços separados.</p>

            {mensagem && <div className={`inline-message ${tipoMensagem === "sucesso" ? "success" : "error"}`}>{mensagem}</div>}

            {loading ? (
              <div className="page-card" style={{padding:28, marginTop:22}}>Carregando suas configurações...</div>
            ) : (
              <>
                <div className="settings-tabs" role="tablist" aria-label="Seções das configurações">
                  {CONFIG_TABS.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      id={`settings-tab-${key}`}
                      type="button"
                      role="tab"
                      aria-selected={abaAtiva === key}
                      aria-controls={`settings-panel-${key}`}
                      tabIndex={abaAtiva === key ? 0 : -1}
                      className={`settings-tab ${abaAtiva === key ? "active" : ""}`}
                      onClick={() => selecionarAba(key)}
                      onKeyDown={(event) => navegarAbas(event, key)}
                    >
                      <Icon size={17}/>{label}
                    </button>
                  ))}
                </div>

                {abaAtiva === "conta" && (
                  <form
                    id="settings-panel-conta"
                    role="tabpanel"
                    aria-labelledby="settings-tab-conta"
                    onSubmit={handleSalvar}
                    className="settings-tab-panel"
                  >
                    <div className="config-card settings-section-card">
                      <div className="settings-section-heading">
                        <h2 className="config-card-title">Dados da conta</h2>
                        <p>Atualize seus dados de acesso e sua senha.</p>
                      </div>
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
                      <div className="settings-panel-actions">
                        <button type="submit" className="primary-action" disabled={salvando}>
                          <Save size={18}/>{salvando ? "Salvando..." : "Salvar conta"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {abaAtiva === "personalizacao" && (
                  <form
                    id="settings-panel-personalizacao"
                    role="tabpanel"
                    aria-labelledby="settings-tab-personalizacao"
                    onSubmit={handleSalvar}
                    className="settings-tab-panel"
                  >
                    <div className="page-card appearance-card settings-section-card">
                      <div className="page-card-header">
                        <div>
                          <h3><Palette size={17}/> Personalização</h3>
                          <p>Escolha a luminosidade e o estilo de cores do LumoStudy.</p>
                        </div>
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

                      <div className="appearance-option-label appearance-option-label--spaced"><Palette size={15}/> Estilo do tema</div>
                      <div className="theme-style-choice">
                        <button
                          type="button"
                          className={`theme-style-option ${temaRoxoPadrao ? "selected" : ""}`}
                          onClick={() => escolherCorDoTema(true)}
                        >
                          <span className="theme-style-visual theme-style-visual--classic">
                            <span/><span/><span/>
                          </span>
                          <span className="theme-style-copy">
                            <strong>Clássico</strong>
                            <small>Usa o roxo original do LumoStudy.</small>
                          </span>
                        </button>

                        <button
                          type="button"
                          className={`theme-style-option ${!temaRoxoPadrao ? "selected" : ""}`}
                          onClick={() => escolherCorDoTema(false)}
                        >
                          <span className="theme-style-visual theme-style-visual--avatar">
                            <img src={avatarUrl} alt="Foto de perfil" onError={(e) => { e.currentTarget.src = "/avatar.png"; }} />
                          </span>
                          <span className="theme-style-copy">
                            <strong>Foto de perfil</strong>
                            <small>Usa as cores ligadas à sua foto de perfil atual.</small>
                          </span>
                        </button>

                        <button
                          type="button"
                          className="theme-style-option theme-style-option--disabled"
                          disabled
                          title="Em breve"
                        >
                          <span className="theme-style-visual theme-style-visual--custom"><Palette size={24}/></span>
                          <span className="theme-style-copy">
                            <strong>Personalizado</strong>
                            <small>Em breve você poderá montar suas próprias cores.</small>
                          </span>
                          <span className="theme-coming-soon">Em breve</span>
                        </button>
                      </div>

                      <div className="settings-panel-actions">
                        <button type="submit" className="primary-action" disabled={salvando}>
                          <Save size={18}/>{salvando ? "Salvando..." : "Salvar personalização"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {abaAtiva === "metas" && (
                  <form
                    id="settings-panel-metas"
                    role="tabpanel"
                    aria-labelledby="settings-tab-metas"
                    className="page-card metas-settings-card settings-tab-panel"
                    onSubmit={handleSalvarMetas}
                  >
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
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
