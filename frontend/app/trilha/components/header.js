
"use client";

import {
  Home,
  BookOpen,
  FileQuestion,
  Trophy,
  Flame,
  Coins,
  ChevronDown
} from "lucide-react";

export default function Header() {

  return (

    <header className="header">

      <div className="navigation">

        <button>
          <Home size={18}/>
          <span>Início</span>
        </button>

        <button className="selected">
          <BookOpen size={18}/>
          <span>Trilha</span>
        </button>

        <button>
          <FileQuestion size={18}/>
          <span>Questões</span>
        </button>

        <button>
          <BookOpen size={18}/>
          <span>Flashcards</span>
        </button>

        <button>
          <Trophy size={18}/>
          <span>Ranking</span>
        </button>

      </div>

      <div className="user-info">

        <div className="coins">
          <Coins size={16}/>
          <span>1.250</span>
        </div>

        <div className="streak">
          <Flame size={16}/>
          <span>12 dias</span>
        </div>

        <img
          src="/avatar.png"
          className="avatar"
          alt=""
        />

        <ChevronDown size={18}/>

      </div>

    </header>

  );
}
