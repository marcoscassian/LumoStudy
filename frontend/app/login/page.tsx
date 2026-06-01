"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, Eye, LogIn } from "lucide-react";
import "../auth.css";

export default function LoginPage() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: any) {
    e.preventDefault();

    const response = await fetch("http://127.0.0.1:8000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();
    
    alert(data.message || data.error);
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
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Eye size={16} />
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