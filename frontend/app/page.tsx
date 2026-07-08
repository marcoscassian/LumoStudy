import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";
import "./home.css";

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
          <div className="hero-badge-container">
            <span className="hero-badge">
              Plataforma gratuita para o ENEM
            </span>
          </div>

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
      <section className="study-section">

    <div className="study-left">

        <span>TRILHA DE ESTUDOS</span>

        <h2>
            Seu caminho para a <strong>aprovação</strong>
        </h2>

        <p>
            Cada passo concluído desbloqueia o próximo nível.
            Com um sistema inspirado em RPG, seu progresso fica
            visível e cada conquista motiva a continuar.
        </p>

    </div>

    <div className="study-card">

        <div className="step done">
            <span>✔</span>
            <div>
                <h4>Números e Operações</h4>
                <small>Álgebra</small>
            </div>
        </div>

        <div className="step done">
            <span>✔</span>
            <div>
                <h4>Funções</h4>
                <small>Álgebra</small>
            </div>
        </div>

        <div className="step current">
            <span>3</span>
            <div>
                <h4>Geometria Plana</h4>
                <small>Fase atual</small>
            </div>
        </div>

        <div className="step lock">
            <span>🔒</span>
            <div>
                <h4>Probabilidade</h4>
                <small>Bloqueado</small>
            </div>
        </div>

    </div>

</section>

<section className="houses">

    <span>CASAS DE HOGWARTS</span>

    <h2>
        Qual bruxo <strong>é você?</strong>
    </h2>

    <p>
        Seu perfil de estudante define sua casa.
        Cada uma tem seu estilo único de aprendizagem.
    </p>

    <div className="houses-grid">

        <div className="house gry">
            <div className="emoji">🦁</div>
            <h3>Grifinória</h3>
            <h4>Coragem</h4>
            <p>Enfrenta os assuntos mais difíceis sem recuar.</p>
        </div>

        <div className="house sly">
            <div className="emoji">🐍</div>
            <h3>Sonserina</h3>
            <h4>Determinação</h4>
            <p>Foco total. Nada desvia do objetivo.</p>
        </div>

        <div className="house rav">
            <div className="emoji">🦅</div>
            <h3>Corvinal</h3>
            <h4>Sabedoria</h4>
            <p>Curiosidade e inteligência em cada estudo.</p>
        </div>

        <div className="house huf">
            <div className="emoji">🦡</div>
            <h3>Lufa-Lufa</h3>
            <h4>Dedicação</h4>
            <p>Esforço e constância todos os dias.</p>
        </div>

    </div>

</section>
    </main>
  );
}