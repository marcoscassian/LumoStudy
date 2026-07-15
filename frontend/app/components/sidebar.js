"use client";

import Link from "next/link";
import {
  BookOpen,
  Target,
  BarChart3,
  Trophy,
  StickyNote,
  Settings,
  Zap,
  Award,
  ShoppingCart
} from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="sidebar">

      <div className="profile-card profile-card--compact">

        <img src="/coruja.png" alt="Coruja" className="owl" />

        <div className="profile-text">
          <h3>Olá, Bruxo.</h3>
          <p>Continue sua jornada em busca da aprovação.</p>
        </div>

      </div>

      <nav>
        <Link href="#" className="menu active">
          <BookOpen size={20} />
          <span>Trilha de Estudos</span>
        </Link>

        <Link href="#" className="menu">
          <Target size={20} />
          <span>Questões</span>
        </Link>

        <Link href="#" className="menu">
          <BarChart3 size={20} />
          <span>Flashcards</span>
        </Link>

        <Link href="#" className="menu">
          <Zap size={20} />
          <span>Simulados</span>
        </Link>

        <Link href="#" className="menu">
          <Trophy size={20} />
          <span>Ranking</span>
        </Link>

        <Link href="#" className="menu">
          <ShoppingCart size={20} />
          <span>Loja</span>
        </Link>

        <Link href="#" className="menu">
          <Award size={20} />
          <span>Conquistas</span>
        </Link>

        <Link href="#" className="menu">
          <Settings size={20} />
          <span>Configurações</span>
        </Link>
      </nav>

      <div className="magic-card">
        <img src="/pocao.png" alt="" />
        <p>Sua jornada é mágica quando você é constante.</p>
        <button>Definir meta</button>
      </div>

      <div className="sidebar-footer">Perfil</div>

    </aside>
  );
}
