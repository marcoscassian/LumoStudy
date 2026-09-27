"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Star,
  BookOpen,
  Layers,
  TrendingUp,
  FileText,
  Award,
  CheckCircle2,
  HelpCircle,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import "../trilha/trilha.css";
import "./usuario.css";

import Sidebar from "../components/sidebar";
import Header from "../components/header";
import ProfileHero from "./components/profilehero";
import StatCard from "./components/statcard";
import MasteryCard from "./components/masterycard";
import RecentActivities from "./components/recentactivities";
import GoalsCard from "./components/goalscard";
import { API_BASE } from "../lib/api";

const AREA_VISUAL: Record<string, { image: string; color: string }> = {
  linguagens: { image: "/linguagenscard.png", color: "purple" },
  "ciencias-humanas": { image: "/cienciashumanas.png", color: "green" },
  matematica: { image: "/matematica.png", color: "blue" },
  "ciencias-natureza": { image: "/natureza.png", color: "yellow" },
};

type Dashboard = {
  usuario?: { nome?: string; avatar_url?: string; casa?: string; xp?: number; coins?: number; streak?: number };
  visao_geral?: { questoes_respondidas?: number; flashcards_revisados?: number; taxa_acertos?: number; simulados_resolvidos?: number; temas_concluidos?: number };
  dominio_areas?: { nome: string; slug: string; percentual: number }[];
  dominio_geral?: number;
  atividades_recentes?: { id: string; tipo: string; title: string; subject: string; ocorrido_em: string }[];
  metas?: Record<string, { tipo: string; label: string; current: number; total: number }[]>;
};
type MasteryItem = { title: string; slug: string; image: string | null; percent: number; color: string; general?: boolean };
type ActivityItem = { id: string; icon: LucideIcon; color: string; title: string; subject: string; time: string };
type GoalItem = { label: string; current: number; total: number; icon: LucideIcon; color: string };

const CASA_NOME: Record<string, string> = {
  corvinal: "Corvinal",
  grifinoria: "Grifinória",
  sonserina: "Sonserina",
  lufalufa: "Lufa-Lufa",
  "lufa-lufa": "Lufa-Lufa",
};

const GOAL_VISUAL: Record<string, { icon: LucideIcon; color: string }> = {
  tempo_estudo: { icon: BookOpen, color: "purple" },
  flashcards: { icon: Layers, color: "red" },
  questoes: { icon: HelpCircle, color: "green" },
};

const ACTIVITY_VISUAL: Record<string, { icon: LucideIcon; color: string }> = {
  questao_correta: { icon: CheckCircle2, color: "blue" },
  questao_errada: { icon: XCircle, color: "yellow" },
  flashcard: { icon: Layers, color: "green" },
  simulado: { icon: FileText, color: "purple" },
};

function formatarQuando(valor: string) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";

  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const inicioData = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const diferencaDias = Math.round((inicioHoje.getTime() - inicioData.getTime()) / 86400000);

  if (diferencaDias === 0) return "Hoje";
  if (diferencaDias === 1) return "Ontem";
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function UsuarioPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login?next=/usuario");
      return;
    }

    async function loadDashboard() {
      try {
        setError("");
        const response = await fetch(`${API_BASE}/usuarios/me/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (response.status === 401) {
          localStorage.removeItem("token");
          router.replace("/login?next=/usuario");
          return;
        }

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.detail || "Não foi possível carregar o perfil");
        }

        setDashboard(await response.json());
      } catch (err: unknown) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Falha ao carregar o perfil.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  function openQuestions(areaSlug: string) {
    if (!areaSlug) return;
    router.push(`/trilha?area=${encodeURIComponent(areaSlug)}`);
  }

  const viewModel = useMemo(() => {
    if (!dashboard) return null;

    const user = dashboard.usuario || {};
    const overview = dashboard.visao_geral || {};
    const currentXp = Number(user.xp || 0);
    const level = Math.floor(currentXp / 1000) + 1;
    const nextLevelXp = level * 1000;
    const casaSlug = String(user.casa || "grifinoria").toLowerCase();

    const profileUser = {
      name: user.nome || "Bruxo",
      avatar: user.avatar_url || "/avatar.png",
      house: CASA_NOME[casaSlug] || user.casa || "Corvinal",
      houseSlug: casaSlug,
      level,
      currentXp,
      nextLevelXp,
      coins: Number(user.coins || 0),
      streak: Number(user.streak || 0),
    };

    const overviewCards = [
      { icon: BookOpen, value: Number(overview.questoes_respondidas || 0).toLocaleString("pt-BR"), label: "Questões respondidas", color: "purple" },
      { icon: Layers, value: Number(overview.flashcards_revisados || 0).toLocaleString("pt-BR"), label: "Flashcards revisados", color: "green" },
      { icon: TrendingUp, value: `${Number(overview.taxa_acertos || 0)}%`, label: "Taxa de acertos", color: "blue" },
      { icon: FileText, value: Number(overview.simulados_resolvidos || 0).toLocaleString("pt-BR"), label: "Simulados resolvidos", color: "yellow" },
      { icon: Award, value: Number(overview.temas_concluidos || 0).toLocaleString("pt-BR"), label: "Temas concluídos", color: "pink" },
    ];

    const mastery: MasteryItem[] = (dashboard.dominio_areas || []).map((area) => ({
      title: area.nome,
      slug: area.slug,
      image: AREA_VISUAL[area.slug]?.image || null,
      percent: Number(area.percentual || 0),
      color: AREA_VISUAL[area.slug]?.color || "purple",
    }));
    mastery.push({
      title: "Geral",
      slug: "",
      image: null,
      percent: Number(dashboard.dominio_geral || 0),
      color: "purple",
      general: true,
    });

    const activities: ActivityItem[] = (dashboard.atividades_recentes || []).map((activity) => {
      const visual = ACTIVITY_VISUAL[activity.tipo] || ACTIVITY_VISUAL.questao_correta;
      return {
        id: activity.id,
        icon: visual.icon,
        color: visual.color,
        title: activity.title,
        subject: activity.subject,
        time: formatarQuando(activity.ocorrido_em),
      };
    });

    const goals: Record<string, GoalItem[]> = {};
    Object.entries(dashboard.metas || {}).forEach(([period, items]) => {
      goals[period] = items.map((goal) => {
        const visual = GOAL_VISUAL[goal.tipo] || GOAL_VISUAL.questoes;
        return {
          label: goal.label,
          current: Number(goal.current || 0),
          total: Number(goal.total || 0),
          icon: visual.icon,
          color: visual.color,
        };
      });
    });

    return { profileUser, overviewCards, mastery, activities, goals };
  }, [dashboard]);

  if (loading) {
    return (
      <main className="dashboard">
        <Header />
        <div className="dashboard-body dashboard-body--profile">
          <Sidebar />
          <section className="content profile-content"><p>Carregando perfil...</p></section>
        </div>
      </main>
    );
  }

  if (error || !viewModel) {
    return (
      <main className="dashboard">
        <Header />
        <div className="dashboard-body dashboard-body--profile">
          <Sidebar />
          <section className="content profile-content"><p>{error || "Não foi possível carregar o perfil."}</p></section>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <Header />
      <div className="dashboard-body dashboard-body--profile">
        <Sidebar />
        <section className="content profile-content">
          <ProfileHero user={viewModel.profileUser} />

          <div>
            <div className="section-title"><Star size={18} />Seu progresso geral</div>
            <div className="stats-grid">
              {viewModel.overviewCards.map((stat) => <StatCard key={stat.label} {...stat} />)}
            </div>
          </div>

          <div>
            <div className="section-title">Domínio por área</div>
            <div className="mastery-grid">
              {viewModel.mastery.map((area) => (
                <MasteryCard
                  key={area.title}
                  {...area}
                  onContinue={() => area.slug && openQuestions(area.slug)}
                />
              ))}
            </div>
          </div>

          <div className="profile-panels">
            <RecentActivities activities={viewModel.activities} />
            <GoalsCard goalsByPeriod={viewModel.goals} />
          </div>
        </section>
      </div>
    </main>
  );
}
