"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";
import "./trilha.css";

import Sidebar from "../components/sidebar";
import Header from "../components/header";
import SubjectCard from "./components/subjectcard";
import ProgressCard from "./components/progresscard";
import StreakCard from "./components/streakcard";
import RewardCard from "./components/rewardcard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const EMPTY_TRAIL = {
  progresso_geral: 0,
  temas_concluidos: 0,
  total_temas: 0,
  areas: [],
  sequencia: {
    dias: 0,
    semana: Array.from({ length: 7 }, () => ({ estudou: false })),
  },
};

export default function TrilhaPage() {
  const router = useRouter();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [trail, setTrail] = useState<any>(EMPTY_TRAIL);
  const [loadingTrail, setLoadingTrail] = useState(true);
  const [trailError, setTrailError] = useState("");

  const loadTrail = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login?next=/trilha");
      return;
    }

    try {
      setTrailError("");
      const response = await fetch(`${API_BASE}/trilha/progresso`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        router.replace("/login?next=/trilha");
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Não foi possível carregar a trilha");
      }

      setTrail(await response.json());
    } catch (error: any) {
      console.error("Erro ao carregar a trilha:", error);
      setTrailError(error?.message || "Não foi possível carregar a trilha.");
    } finally {
      setLoadingTrail(false);
    }
  }, [router]);

  useEffect(() => {
    loadTrail();
    window.addEventListener("lumostudy:stats-changed", loadTrail);
    return () => window.removeEventListener("lumostudy:stats-changed", loadTrail);
  }, [loadTrail]);

  const areasBySlug = useMemo(() => {
    const result: Record<string, any> = {};
    (trail?.areas || []).forEach((area: any) => {
      result[area.slug] = area;
    });
    return result;
  }, [trail]);

  const handleSubjectContinue = ({ title }: { title: string }) => {
    router.push(`/questoes?area=${encodeURIComponent(title)}`);
  };

  const handleInfoButtonClick = () => {
    setIsInfoOpen((prev) => !prev);
  };

  const handleTitleAreaMouseLeave = () => {
    setIsInfoOpen(false);
  };

  return (
    <main className="dashboard">
      <Header />

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
            {trailError && <p className="trail-error">{trailError}</p>}
          </div>

          <div className="timeline">
            <SubjectCard
              color="purple"
              image="/linguagenscard.png"
              title="Linguagens, Códigos e suas Tecnologias"
              description="Interpretação de textos..."
              progress={areasBySlug["linguagens"]?.progresso || 0}
              completed={`${areasBySlug["linguagens"]?.progresso || 0}%`}
              onTrain={handleSubjectContinue}
            />

            <SubjectCard
              color="green"
              image="/cienciashumanas.png"
              title="Ciências Humanas"
              description="História, Geografia..."
              progress={areasBySlug["ciencias-humanas"]?.progresso || 0}
              completed={`${areasBySlug["ciencias-humanas"]?.progresso || 0}%`}
              onTrain={handleSubjectContinue}
            />

            <SubjectCard
              color="blue"
              image="/matematica.png"
              title="Matemática"
              description="Geometria, álgebra..."
              progress={areasBySlug["matematica"]?.progresso || 0}
              completed={`${areasBySlug["matematica"]?.progresso || 0}%`}
              onTrain={handleSubjectContinue}
            />

            <SubjectCard
              color="yellow"
              image="/natureza.png"
              title="Ciências da Natureza"
              description="Biologia, Física..."
              progress={areasBySlug["ciencias-natureza"]?.progresso || 0}
              completed={`${areasBySlug["ciencias-natureza"]?.progresso || 0}%`}
              onTrain={handleSubjectContinue}
            />
          </div>
        </section>

        <aside className="right-column">
          <ProgressCard
            progress={trail?.progresso_geral || 0}
            completed={trail?.temas_concluidos || 0}
            total={trail?.total_temas || 0}
            loading={loadingTrail}
          />

          <StreakCard
            streak={trail?.sequencia?.dias || 0}
            week={trail?.sequencia?.semana || []}
            loading={loadingTrail}
          />

          <RewardCard />
        </aside>
      </div>
    </main>
  );
}
