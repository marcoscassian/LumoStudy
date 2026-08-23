"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, LogIn } from "lucide-react";
import "../auth.css";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");

  async function handleLogin(e: any) {
    e.preventDefault();

    const formData = new FormData();

    formData.append("username", email);
    formData.append("password", password);

    try {
      const response = await fetch("http://127.0.0.1:8000/login/", {
        method: "POST",
        body: formData,
      });

      // If server returned non-JSON (e.g. HTML error), guard against parse errors
      let data: any = {};
      try {
        data = await response.json();
      } catch (err) {
        data = {};
      }

      if (response.ok && data.access_token) {
        setTipoMensagem("sucesso");
        localStorage.setItem("token", data.access_token);
        router.push(nextUrl || "/trilha");
      } else {
        setTipoMensagem("erro");
        setMensagem(data.detail || "E-mail ou senha inválidos.");
      }
    } catch (err) {
      // Network or CORS error
      setTipoMensagem("erro");
      setMensagem(
        "Não foi possível conectar ao servidor. Verifique se o backend está rodando em http://127.0.0.1:8000"
      );
      console.error("Login fetch error:", err);
    }
  }

  return (
    <main className="auth-page">
      <div className="brand">
        <img src="/chapeu.png" alt="Logo" className="logo" />
        <h1>LumoStudy</h1>
      </div>

      <section className="auth-card">
        <span className="badge">Acesso seguro</span>

        <h2>Bem-vindo de volta</h2>
        <p>Entre com suas credenciais para acessar o site.</p>

        {mensagem && (
          <div className={`mensagem ${tipoMensagem}`}>
            {mensagem}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <label>E-mail</label>

          <div className="input-box">
            <Mail size={16} />
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <label>Senha</label>

          <div className="input-box">
            <Lock size={16} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Eye
              size={16}
              onClick={() => setShowPassword(!showPassword)}
              style={{ cursor: "pointer" }}
            />
          </div>

          <button type="submit">
            <LogIn size={17} />
            Entrar na conta
          </button>
        </form>
      </section>

      <p className="bottom-text">
        Não tem uma conta? <Link href="/cadastro">Criar conta grátis</Link>
      </p>
    </main>
  );
}