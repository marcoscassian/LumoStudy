"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mail,
  Lock,
  Eye,
  UserRound,
  UserPlus,
} from "lucide-react";

import "../auth.css";

export default function CadastroPage() {

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleRegister(e: any) {
    e.preventDefault();

    const response = await fetch("http://127.0.0.1:8000/usuarios/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nome: username,
        email: email,
        senha_hash: password,
      }),
    });

    const data = await response.json();

    alert(data.mensagem || data.detail || "Usuário cadastrado!");
  }

  return (
    <main className="auth-page">

      <div className="brand">
        <img src="/chapeu.png" alt="Logo" className="logo" />
        <h1>LumoStudy</h1>
      </div>

      <section className="auth-card register">

        <span className="badge">Nova conta</span>

        <h2>Crie sua conta</h2>

        <p>
          Preencha os dados abaixo para começar.
        </p>

        <form onSubmit={handleRegister}>

          <label>Nome</label>

          <div className="input-box">
            <UserRound size={16} />

            <input
              type="text"
              placeholder="Seu nome"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

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
            <UserPlus size={17} />
            Criar conta
          </button>

        </form>

      </section>

      <p className="bottom-text">
        Já possui conta? <Link href="/login">Entrar</Link>
      </p>

    </main>
  );
}