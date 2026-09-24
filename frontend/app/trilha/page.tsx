"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Info } from "lucide-react";
import "./trilha.css";

import Sidebar from "../components/sidebar";
import Header from "../components/header";
import SubjectCard from "./components/subjectcard";
import ProgressCard from "./components/progresscard";
import StreakCard from "./components/streakcard";
import RewardCard from "./components/rewardcard";
import StudyChoiceModal from "./components/StudyChoiceModal";
import { API_BASE } from "../lib/api";

type TrailArea = { slug: string; progresso: number };
type TrailProgress = {
  progresso_geral: number;
  taxa_acertos: number;
  areas: TrailArea[];
  sequencia: { dias: number; semana: { estudou: boolean }[] };
};

const EMPTY_TRAIL: TrailProgress = {
  progresso_geral: 0,
  taxa_acertos: 0,
  areas: [],
  sequencia: {
    dias: 0,
    semana: Array.from({ length: 7 }, () => ({ estudou: false })),
  },
};

const AREAS = new Set(["linguagens", "ciencias-humanas", "matematica", "ciencias-natureza"]);

function TrilhaPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const areaParam = searchParams.get("area") || "";
  const areaSelecionada = AREAS.has(areaParam) ? areaParam : null;
  const quantidadeParam = Number(searchParams.get("quantidade"));
  const quantidadeInicial = [5, 10, 15, 20].includes(quantidadeParam) ? quantidadeParam : 10;
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [trail, setTrail] = useState<TrailProgress>(EMPTY_TRAIL);
  const [loadingTrail, setLoadingTrail] = useState(true);
  const [trailError, setTrailError] = useState("");

  const loadTrail = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login?next=/trilha");
      return;
    }

    try {
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
      setTrailError("");
    } catch (error: unknown) {
      console.error("Erro ao carregar a trilha:", error);
      setTrailError(error instanceof Error ? error.message : "Não foi possível carregar a trilha.");
    } finally {
      setLoadingTrail(false);
    }
  }, [router]);

  useEffect(() => {
    const inicial = window.setTimeout(() => { void loadTrail(); }, 0);
    window.addEventListener("lumostudy:stats-changed", loadTrail);
    return () => {
      window.clearTimeout(inicial);
      window.removeEventListener("lumostudy:stats-changed", loadTrail);
    };
  }, [loadTrail]);

  const areasBySlug = useMemo(() => {
    const result: Record<string, TrailArea> = {};
    (trail?.areas || []).forEach((area) => {
      result[area.slug] = area;
    });
    return result;
  }, [trail]);

  const handleSubjectContinue = (area: string) => {
    router.push(`/trilha?area=${encodeURIComponent(area)}`, { scroll: false });
  };

  const closeStudyChoice = useCallback(() => {
    router.replace("/trilha", { scroll: false });
  }, [router]);

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
            <p>Escolha uma área para praticar questões ou fazer um simulado.</p>
            {trailError && <p className="trail-error">{trailError}</p>}
          </div>

          <div className="timeline">
            <SubjectCard
              area="linguagens"
              color="purple"
              image="/linguagenscard.png"
              title="Linguagens, Códigos e suas Tecnologias"
              description="Interpretação de textos, semântica, literatura, artes e linguas (inglês e Espanhol)"
              progress={areasBySlug["linguagens"]?.progresso || 0}
              completed={`${areasBySlug["linguagens"]?.progresso || 0}%`}
              onTrain={handleSubjectContinue}
            />

            <SubjectCard
              area="ciencias-humanas"
              color="green"
              image="/cienciashumanas.png"
              title="Ciências Humanas"
              description="História, Geografia, Sociologia e Filosofia para entender o mundo."
              progress={areasBySlug["ciencias-humanas"]?.progresso || 0}
              completed={`${areasBySlug["ciencias-humanas"]?.progresso || 0}%`}
              onTrain={handleSubjectContinue}
            />

            <SubjectCard
              area="matematica"
              color="blue"
              image="/matematica.png"
              title="Matemática"
              description="Matemática básica, estatística, geometria, razão, proporção e financeira, etc..."
              progress={areasBySlug["matematica"]?.progresso || 0}
              completed={`${areasBySlug["matematica"]?.progresso || 0}%`}
              onTrain={handleSubjectContinue}
            />

            <SubjectCard
              area="ciencias-natureza"
              color="yellow"
              image="/natureza.png"
              title="Ciências da Natureza"
              description="Biologia, Química, e Física para compreender  as leis da natureza."
              progress={areasBySlug["ciencias-natureza"]?.progresso || 0}
              completed={`${areasBySlug["ciencias-natureza"]?.progresso || 0}%`}
              onTrain={handleSubjectContinue}
            />
          </div>
        </section>

        <aside className="right-column">
          <ProgressCard
            progress={trail?.progresso_geral || 0}
            taxaAcertos={trail?.taxa_acertos || 0}
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
      {areaSelecionada && (
        <StudyChoiceModal
          key={areaSelecionada}
          area={areaSelecionada}
          quantidadeInicial={quantidadeInicial}
          onClose={closeStudyChoice}
        />
      )}
    </main>
  );
}

export default function TrilhaPage() {
  return (
    <Suspense fallback={null}>
      <TrilhaPageContent />
    </Suspense>
  );
}
