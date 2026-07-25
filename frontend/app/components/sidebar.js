"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  const isActive = (href) => {
    if (!href || href === "#") {
      return false;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className="sidebar">

      <div className="profile-card profile-card--compact">

        <img src="/sidebar/coruja.png" alt="Coruja" className="owl" />

        <div className="profile-text">
          <h3>Olá, Bruxo.</h3>
          <p>Continue sua jornada em busca da aprovação.</p>
        </div>

      </div>

      <nav>
        <Link href="/trilha" className={`menu ${isActive("/trilha") ? "active" : ""}`}>
          <BookOpen size={20} />
          <span>Trilha de Estudos</span>
        </Link>

        <Link href="/questoes" className={`menu ${isActive("/questoes") ? "active" : ""}`}>
          <Target size={20} />
          <span>Questões</span>
        </Link>

        <Link href="/flashcards" className={`menu ${isActive("/flashcards") ? "active" : ""}`}>
          <BarChart3 size={20} />
          <span>Flashcards</span>
        </Link>

        <Link href="/simulados" className={`menu ${isActive("/simulados") ? "active" : ""}`}>
          <Zap size={20} />
          <span>Simulados</span>
        </Link>

        <Link href="/ranking" className={`menu ${isActive("/ranking") ? "active" : ""}`}>
          <Trophy size={20} />
          <span>Ranking</span>
        </Link>

        <Link href="/loja" className={`menu ${isActive("/loja") ? "active" : ""}`}>
          <ShoppingCart size={20} />
          <span>Loja</span>
        </Link>

        <Link href="/conquistas" className={`menu ${isActive("/conquistas") ? "active" : ""}`}>
          <Award size={20} />
          <span>Conquistas</span>
        </Link>

        <Link href="/configuracoes" className={`menu ${isActive("/configuracoes") ? "active" : ""}`}>
          <Settings size={20} />
          <span>Configurações</span>
        </Link>
      </nav>
    </aside>
  );
}
