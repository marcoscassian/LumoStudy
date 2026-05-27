import Link from "next/link";
import { Mail, Lock, Eye, LogIn } from "lucide-react";
import "../auth.css";

export default function LoginPage() {
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

        <form>
          <label>E-mail</label>
          <div className="input-box">
            <Mail size={16} />
            <input type="email" placeholder="seu@email.com" />
          </div>

          <label>Senha</label>
          <div className="input-box">
            <Lock size={16} />
            <input type="password" placeholder="••••••••" />
            <Eye size={16} />
          </div>

          <div className="row">
            <label className="check">
              <input type="checkbox" />
              Lembrar de mim
            </label>

            <Link href="#">Esqueci a senha</Link>
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