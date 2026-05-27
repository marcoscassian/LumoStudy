import Link from "next/link";
import { Mail, Lock, Eye, UserRound, UserPlus } from "lucide-react";
import "../auth.css";

export default function CadastroPage() {
  return (
    <main className="auth-page">
      <div className="brand">
        <img src="/chapeu.png" alt="Logo" className="logo" />
        <h1>LumoStudy</h1>
      </div>

      <section className="auth-card register">
        <span className="badge">Nova conta</span>

        <h2>Crie sua conta</h2>
        <p>Preencha os dados abaixo para começar a usar o site.</p>

        <form>
          <label>Nome de Usuário</label>
          <div className="input-box">
            <UserRound size={16} />
            <input type="text" placeholder="alexbruno" />
          </div>

          <label>E-mail</label>
          <div className="input-box">
            <Mail size={16} />
            <input type="email" placeholder="seu@email.com" />
          </div>

          <small>Você receberá um e-mail de confirmação.</small>

          <label>Senha</label>
          <div className="input-box">
            <Lock size={16} />
            <input type="password" placeholder="Mín. 8 caracteres" />
            <Eye size={16} />
          </div>

          <button type="submit">
            <UserPlus size={17} />
            Criar minha conta
          </button>
        </form>
      </section>

      <p className="bottom-text">
        Já tem uma conta? <Link href="/login">Fazer login</Link>
      </p>
    </main>
  );
}