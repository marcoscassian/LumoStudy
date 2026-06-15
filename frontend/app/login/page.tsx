"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, Eye, LogIn } from "lucide-react";
import "../auth.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e: any) {
    e.preventDefault();

    const formData = new FormData();

    formData.append("username", email);
    formData.append("password", password);

    const response = await fetch("http://127.0.0.1:8000/login/", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.access_token) {
      alert("Login realizado com sucesso!");
    } else {
      alert(data.detail || "Erro ao fazer login");
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

        <p>
          Entre com suas credenciais para acessar o site.
        </p>

        <form onSubmit={handleLogin}>
          <label>E-mail</label>

          <div className="input-box">
            <Mail size={16} />

            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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