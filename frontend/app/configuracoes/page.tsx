"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Mail, Lock, Save } from "lucide-react";

import "../trilha/trilha.css";
import "./configuracoes.css";

import Sidebar from "../components/sidebar";
import Header from "../components/header";

const API_BASE = "http://127.0.0.1:8000";

export default function ConfiguracoesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login?next=/configuracoes");
      return;
    }

    async function carregarPerfil() {
      try {
        const response = await fetch(`${API_BASE}/usuarios/me/perfil`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          localStorage.removeItem("token");
          router.replace("/login?next=/configuracoes");
          return;
        }

        if (!response.ok) throw new Error("Não foi possível carregar seu perfil.");

        const data = await response.json();
        setNome(data.nome || "");
        setEmail(data.email || "");
      } catch (error) {
        console.error(error);
        setTipoMensagem("erro");
        setMensagem("Não foi possível carregar seu perfil.");
      } finally {
        setLoading(false);
      }
    }

    carregarPerfil();
  }, [router]);

  async function handleSalvar(e) {
    e.preventDefault();
    setMensagem("");
    setTipoMensagem("");

    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim();

    if (!nomeLimpo) {
      setTipoMensagem("erro");
      setMensagem("O nome não pode ficar vazio.");
      return;
    }

    if (!emailLimpo) {
      setTipoMensagem("erro");
      setMensagem("O e-mail não pode ficar vazio.");
      return;
    }

    const querTrocarSenha = novaSenha.trim().length > 0 || confirmarSenha.trim().length > 0;

    if (querTrocarSenha) {
      if (!senhaAtual) {
        setTipoMensagem("erro");
        setMensagem("Informe sua senha atual para definir uma nova senha.");
        return;
      }

      if (novaSenha.length < 6) {
        setTipoMensagem("erro");
        setMensagem("A nova senha deve ter pelo menos 6 caracteres.");
        return;
      }

      if (novaSenha !== confirmarSenha) {
        setTipoMensagem("erro");
        setMensagem("A confirmação de senha não é igual à nova senha.");
        return;
      }
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login?next=/configuracoes");
      return;
    }

    const payload = { nome: nomeLimpo, email: emailLimpo };
    if (querTrocarSenha) {
      payload.senha_atual = senhaAtual;
      payload.nova_senha = novaSenha;
    }

    setSalvando(true);

    try {
      const response = await fetch(`${API_BASE}/usuarios/me/perfil`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setTipoMensagem("erro");
        setMensagem(data.detail || "Não foi possível salvar as alterações.");
        return;
      }

      setNome(data.nome || "");
      setEmail(data.email || "");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
      setTipoMensagem("sucesso");
      setMensagem("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error(error);
      setTipoMensagem("erro");
      setMensagem("Não foi possível conectar ao servidor.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="dashboard">
      <Header />
      <div className="dashboard-body dashboard-body--config">
        <Sidebar />
        <section className="content">
          <div className="title-area">
            <div className="title-row">
              <h1>Configurações</h1>
            </div>
            <p>Edite as informações do seu perfil.</p>
          </div>

          {loading ? (
            <div className="config-card">
              <p>Carregando seus dados...</p>
            </div>
          ) : (
            <div className="config-card">
              <Link href="/usuario" className="config-back-link">
                <ArrowLeft size={16} /> Voltar para o perfil
              </Link>

              <h2 className="config-card-title">Editar perfil</h2>

              {mensagem && <div className={`mensagem ${tipoMensagem}`}>{mensagem}</div>}

              <form onSubmit={handleSalvar} className="config-form">
                <div className="config-field-group">
                  <label>Nome</label>
                  <div className="config-input">
                    <User size={16} />
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Seu nome"
                      required
                    />
                  </div>
                </div>

                <div className="config-field-group">
                  <label>E-mail</label>
                  <div className="config-input">
                    <Mail size={16} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="config-divider">
                  <span>Alterar senha (opcional)</span>
                </div>

                <div className="config-field-group">
                  <label>Senha atual</label>
                  <div className="config-input">
                    <Lock size={16} />
                    <input
                      type="password"
                      value={senhaAtual}
                      onChange={(e) => setSenhaAtual(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="config-field-row">
                  <div className="config-field-group">
                    <label>Nova senha</label>
                    <div className="config-input">
                      <Lock size={16} />
                      <input
                        type="password"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                  </div>

                  <div className="config-field-group">
                    <label>Confirmar nova senha</label>
                    <div className="config-input">
                      <Lock size={16} />
                      <input
                        type="password"
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        placeholder="Repita a nova senha"
                      />
                    </div>
                  </div>
                </div>

                <button type="submit" className="config-save-btn" disabled={salvando}>
                  <Save size={18} />
                  {salvando ? "Salvando..." : "Salvar alterações"}
                </button>
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
