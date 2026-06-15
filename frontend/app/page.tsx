import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";
import "./auth.css";

export default function HomePage() {
  return (
    <main className="home-page">
      <header className="home-header">
        <div className="home-logo">
          <img src="/chapeu.png" alt="Logo LumoStudy" />
          <span>LumoStudy</span>
        </div>

        <nav className="home-nav">
          <Link href="/cadastro" className="btn-outline">
            Criar Conta <UserPlus size={16} />
          </Link>

          <Link href="/login" className="btn-primary-small">
            Entrar <LogIn size={16} />
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-text">
          <span className="hero-badge">
            Plataforma gratuita para o ENEM
          </span>

          <h1>
            Prepare-se para o ENEM de um jeito{" "}
            <strong>mágico</strong>
          </h1>

          <p>
            Trilhas de estudo, gamificação, simulados e flashcards — tudo em
            uma plataforma inspirada no universo de Harry Potter.
          </p>

          <div className="hero-buttons">
            <Link href="/cadastro" className="btn-primary">
              Começar agora
            </Link>

            <Link href="#" className="btn-outline">
              Ver como funciona
            </Link>
          </div>
        </div>

        <div className="hero-image">
          <img
            src="castelo.png"
            alt="Castelo de Hogwarts"
          />
        </div>
      </section>
    </main>
  );
}