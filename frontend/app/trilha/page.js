
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import "./trilha.css";

import Sidebar from "./components/sidebar";
import Header from "./components/header";
import SubjectCard from "./components/subjectcard";
import ProgressCard from "./components/progresscard";
import StreakCard from "./components/streakcard";
import RewardCard from "./components/rewardcard";

export default function TrilhaPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <main className="dashboard">

      {/* HEADER */}
      <Header />

      {/* CONTEÚDO */}
      <div className="dashboard-body">

        <Sidebar />

        <section className="content">

          <div className="title-area">
            <h1>Trilha de Estudos</h1>
            <p>Estude por módulos, complete níveis e avance na sua jornada.</p>
          </div>

          <div className="timeline">

            <SubjectCard
              color="purple"
              image="/linguagenscard.png"
              title="Linguagens, Códigos e suas Tecnologias"
              description="Interpretação de textos..."
              progress={58}
              completed="24/35 concluídos"
            />

            <SubjectCard
              color="green"
              image="/cienciashumanas.png"
              title="Ciências Humanas"
              description="História, Geografia..."
              progress={40}
              completed="18/32 concluídos"
            />

            <SubjectCard
              color="blue"
              image="/matematica.png"
              title="Matemática"
              description="Geometria, álgebra..."
              progress={62}
              completed="21/33 concluídos"
            />

            <SubjectCard
              color="yellow"
              image="/natureza.png"
              title="Ciências da Natureza"
              description="Biologia, Física..."
              progress={48}
              completed="16/31 concluídos"
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
