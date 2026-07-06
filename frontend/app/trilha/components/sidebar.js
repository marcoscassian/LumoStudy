
"use client";

import Link from "next/link";
import {
  BookOpen,
  Target,
  BarChart3,
  Trophy,
  StickyNote,
  Settings
} from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="sidebar">

      <div className="logo">
        <img src="/chapeu.png" alt="Logo" />
        <span>LumoStudy</span>
      </div>

      <div className="profile-card">

        <img
          src="/coruja.png"
          alt="Coruja"
          className="owl"
        />

        <h3>Olá, bruxo!</h3>

        <p>
          Continue sua jornada
          <br />
          em busca da aprovação.
        </p>

      </div>

      <nav>

        <Link href="#" className="menu active">
          <BookOpen size={18}/>
          Trilha de Estudos
        </Link>

        <Link href="#" className="menu">
          <Target size={18}/>
          Metas diárias
        </Link>

        <Link href="#" className="menu">
          <BarChart3 size={18}/>
          Desempenho
        </Link>

        <Link href="#" className="menu">
          <Trophy size={18}/>
          Conquistas
        </Link>

        <Link href="#" className="menu">
          <StickyNote size={18}/>
          Notas
        </Link>

        <Link href="#" className="menu">
          <Settings size={18}/>
          Configurações
        </Link>

      </nav>

      <div className="magic-card">

        <img src="/pocao.png" alt="" />

        <p>
          Sua jornada é mágica
          quando você é constante.
        </p>

        <button>Definir meta</button>

      </div>

    </aside>
  );
}
