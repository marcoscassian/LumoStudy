
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";
import "./trilha.css";

import Sidebar from "../components/sidebar";
import Header from "../components/header";
import SubjectCard from "./components/subjectcard";
import ProgressCard from "./components/progresscard";
import StreakCard from "./components/streakcard";
import RewardCard from "./components/rewardcard";

export default function TrilhaPage() {
  const router = useRouter();
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  const handleInfoButtonClick = () => {
    setIsInfoOpen((prev) => !prev);
  };

  const handleTitleAreaMouseLeave = () => {
    setIsInfoOpen(false);
  };

  return (
    <main className="dashboard">

      {/* HEADER */}
      <Header />

      {/* CONTEÚDO */}
      <div className="dashboard-body">

        <Sidebar />

        <section className="content">

          <div className="title-area" onMouseLeave={handleTitleAreaMouseLeave}>
            <div className="title-row">
              <h1>Trilha de Estudos</h1>
              <button
                type="button"
                className="title-info-button"
                onClick={handleInfoButtonClick}
                aria-label="Informações sobre a trilha"
                aria-expanded={isInfoOpen}
              >
                <Info size={18} />
              </button>
            </div>
            {isInfoOpen && (
              <div className="title-info-popup" role="dialog" aria-label="Descrição da trilha">
                <p>A trilha reúne os conteúdos essenciais para o seu estudo, organizando módulos, progresso e metas em uma jornada guiada.</p>
              </div>
            )}
            <p>Estude por módulos, complete níveis e avance na sua jornada.</p>
          </div>

          <div className="timeline">

            <SubjectCard
              color="purple"
              image="/linguagenscard.png"
              title="Linguagens, Códigos e suas Tecnologias"
              description="Interpretação de textos..."
            />

            <SubjectCard
              color="green"
              image="/cienciashumanas.png"
              title="Ciências Humanas"
              description="História, Geografia..."
            />

            <SubjectCard
              color="blue"
              image="/matematica.png"
              title="Matemática"
              description="Geometria, álgebra..."
            />

            <SubjectCard
              color="yellow"
              image="/natureza.png"
              title="Ciências da Natureza"
              description="Biologia, Física..."
            />

          </div>

        </section>

        <aside className="right-column">

          <ProgressCard />

          <StreakCard />

          <RewardCard />

        </aside>

      </div>

    </main>
  );
}
