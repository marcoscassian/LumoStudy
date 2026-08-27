"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Moon, Palette, Save, Settings2, Sparkles, Sun, User } from "lucide-react";

import "../trilha/trilha.css";
import "../sidebar-pages.css";
import "./configuracoes.css";
import Sidebar from "../components/sidebar";
import Header from "../components/header";
import { aplicarTema, casaDaFoto } from "../components/theme-provider";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const NOME_CASA: Record<string, string> = {
  corvinal: "Corvinal",
  "lufa-lufa": "Lufa-Lufa",
  sonserina: "Sonserina",
  grifinoria: "Grifinória",
};

const COR_CASA: Record<string, string> = {
  corvinal: "#2563a6",
  "lufa-lufa": "#d39a00",
  sonserina: "#237a4d",
  grifinoria: "#a52338",
};

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [modoEscuro, setModoEscuro] = useState(false);
  const [temaRoxoPadrao, setTemaRoxoPadrao] = useState(false);
  const [casa, setCasa] = useState("corvinal");
  const [avatarUrl, setAvatarUrl] = useState("/avatar.png");
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");

  const casaDaFotoAtual = useMemo(() => casaDaFoto(avatarUrl), [avatarUrl]);
  const nomeCasaAtual = casaDaFotoAtual ? NOME_CASA[casaDaFotoAtual] : null;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login?next=/configuracoes"); return; }

    fetch(`${API_BASE}/usuarios/me/perfil`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    })
      .then(async (response) => {
        if (response.status === 401) {
          localStorage.removeItem("token");
          router.replace("/login?next=/configuracoes");
          return null;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.detail || "Não foi possível carregar seu perfil.");
        return data;
      })
      .then((data) => {
        if (!data) return;
        const dark = Boolean(data.modo_escuro);
        const roxo = Boolean(data.tema_roxo_padrao);
        const casaRecebida = data.casa || "corvinal";
        const avatarRecebido = data.avatar_url || "/avatar.png";

        setNome(data.nome || "");
        setEmail(data.email || "");
        setModoEscuro(dark);
        setTemaRoxoPadrao(roxo);
        setCasa(casaRecebida);
        setAvatarUrl(avatarRecebido);
        aplicarTema(dark, casaRecebida, roxo, avatarRecebido);
      })
      .catch((error) => {
        setTipoMensagem("erro");
        setMensagem(error.message || "Não foi possível carregar seu perfil.");
      })
      .finally(() => setLoading(false));
  }, [router]);

  function escolherModoEscuro(valor: boolean) {
    setModoEscuro(valor);
    aplicarTema(valor, casa, temaRoxoPadrao, avatarUrl);
  }

  function escolherTemaRoxo(valor: boolean) {
    setTemaRoxoPadrao(valor);
    aplicarTema(modoEscuro, casa, valor, avatarUrl);
  }

  async function handleSalvar(e: any) {
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

    const payload: any = {
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
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Não foi possível salvar as alterações.");

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
    } catch (error: any) {
      setTipoMensagem("erro");
      setMensagem(error?.message || "Não foi possível conectar ao servidor.");
    } finally {
      setSalvando(false);
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
            <p className="sidebar-page-subtitle">Atualize sua conta e escolha como o LumoStudy deve aparecer para você.</p>

            {mensagem && <div className={`inline-message ${tipoMensagem === "sucesso" ? "success" : "error"}`}>{mensagem}</div>}

            {loading ? (
              <div className="page-card" style={{padding:28, marginTop:22}}>Carregando suas configurações...</div>
            ) : (
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
                  <div className="page-card appearance-card">
                    <div className="page-card-header">
                      <div><h3>Aparência</h3><p>Escolha entre claro e escuro.</p></div>
                    </div>
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
                  </div>

                  <div className="page-card appearance-card accent-settings-card">
                    <div className="page-card-header">
                      <div>
                        <h3><Palette size={18} style={{verticalAlign:"-3px", marginRight:7}}/> Cor do LumoStudy</h3>
                        <p>A cor pode acompanhar a foto equipada.</p>
                      </div>
                    </div>

                    <div className="accent-choice">
                      <button
                        type="button"
                        className={`accent-option ${!temaRoxoPadrao ? "selected" : ""}`}
                        onClick={() => escolherTemaRoxo(false)}
                      >
                        <span className="accent-option-icon auto"><Sparkles size={19}/></span>
                        <span>
                          <strong>Tema da foto</strong>
                          <small>{nomeCasaAtual ? `${nomeCasaAtual} será usada como tema` : "Equipe uma foto da loja para ativar a cor da casa"}</small>
                        </span>
                        <span
                          className="current-house-dot"
                          style={{background: casaDaFotoAtual ? COR_CASA[casaDaFotoAtual] : "#6e42f5"}}
                          aria-hidden="true"
                        />
                      </button>

                      <button
                        type="button"
                        className={`accent-option ${temaRoxoPadrao ? "selected" : ""}`}
                        onClick={() => escolherTemaRoxo(true)}
                      >
                        <span className="accent-option-icon purple"><Palette size={19}/></span>
                        <span>
                          <strong>Roxo padrão</strong>
                          <small>Mantém o visual roxo original mesmo trocando a foto.</small>
                        </span>
                        <span className="current-house-dot purple-dot" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="house-theme-legend">
                      <span><i className="house-dot raven"/> Ludimila · Corvinal</span>
                      <span><i className="house-dot huffle"/> Ícaro · Lufa-Lufa</span>
                      <span><i className="house-dot slytherin"/> Alex · Sonserina</span>
                      <span><i className="house-dot gryff"/> Marcos · Grifinória</span>
                    </div>
                    <p className="theme-help">A preferência fica salva no MySQL e é aplicada automaticamente em todas as páginas.</p>
                  </div>

                  <button type="submit" className="primary-action" style={{width:"100%"}} disabled={salvando}>
                    <Save size={18}/>{salvando ? "Salvando..." : "Salvar configurações"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
