"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";

import "../trilha/trilha.css";
import "./usuario.css";

import Sidebar from "../components/sidebar";
import Header from "../components/header";
import ProfileHero from "./components/profilehero";
import StatCard from "./components/statcard";
import MasteryCard from "./components/masterycard";
import RecentActivities from "./components/recentactivities";
import GoalsCard from "./components/goalscard";

const mockOverview = [
  { icon: BookOpen, value: "1.235", label: "Questões respondidas", color: "purple" },
  { icon: Layers, value: "125", label: "Flashcards revisados", color: "green" },
  { icon: TrendingUp, value: "76%", label: "Taxa de acertos", color: "blue" },
  { icon: FileText, value: "23", label: "Simulados resolvido", color: "yellow" },
  { icon: Award, value: "56", label: "Temas concluídos", color: "pink" },
];

const mockMastery = [
  { title: "Linguagens, Códigos e suas Tecnologias", image: "/linguagenscard.png", percent: 76, color: "purple" },
  { title: "Ciências Humanas e suas Tecnologias", image: "/cienciashumanas.png", percent: 76, color: "green" },
  { title: "Matemática e suas Tecnologias", image: "/matematica.png", percent: 76, color: "blue" },
  { title: "Ciências da Natureza e suas Tecnologias", image: "/natureza.png", percent: 76, color: "yellow" },
  { title: "Geral", image: null, percent: 86, color: "purple", general: true },
];

const mockActivities = [
  { id: 1, icon: CheckCircle2, color: "blue", title: "Você respondeu 20 questões de Matemática sem cometer nenhum erro", subject: "Matemática e suas tecnologias", time: "Hoje" },
  { id: 2, icon: FileText, color: "purple", title: "Você concluiu o simulado do ENEM 2024", subject: "Simulados", time: "Hoje" },
  { id: 3, icon: Layers, color: "green", title: "Você respondeu 100 flashcards de ciências da natureza", subject: "Ciências da natureza e suas tecnologias", time: "Ontem" },
  { id: 4, icon: BookOpen, color: "yellow", title: "Você escreveu 1 redação", subject: "Redações", time: "06/07" },
  { id: 5, icon: CheckCircle2, color: "blue", title: "Você completou um bloco de Ciências Humanas", subject: "Ciências Humanas", time: "05/07" },
  { id: 6, icon: BookOpen, color: "purple", title: "Você iniciou uma nova sequência de estudos", subject: "Linguagens", time: "04/07" },
];

const mockGoals = {
  Diário: [
    { label: "Tempo de estudo", current: 40, total: 60, icon: BookOpen, color: "purple" },
    { label: "Flashcards", current: 13, total: 15, icon: Layers, color: "red" },
    { label: "Questões", current: 20, total: 25, icon: HelpCircle, color: "green" },
  ],
  Semanal: [
    { label: "Tempo de estudo", current: 210, total: 360, icon: BookOpen, color: "purple" },
    { label: "Flashcards", current: 68, total: 90, icon: Layers, color: "red" },
    { label: "Questões", current: 95, total: 150, icon: HelpCircle, color: "green" },
  ],
  Mensal: [
    { label: "Tempo de estudo", current: 840, total: 1500, icon: BookOpen, color: "purple" },
    { label: "Flashcards", current: 260, total: 400, icon: Layers, color: "red" },
    { label: "Questões", current: 410, total: 600, icon: HelpCircle, color: "green" },
  ],
};

export default function UsuarioPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login?next=/usuario");
      return;
    }

    async function loadProfile() {
      try {
        const response = await fetch("http://127.0.0.1:8000/usuarios/me/perfil", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          localStorage.removeItem("token");
          router.replace("/login?next=/usuario");
          return;
        }

        if (!response.ok) throw new Error("Não foi possível carregar o perfil");
        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  function openQuestions(area: string) {
    router.push(`/questoes?area=${encodeURIComponent(area)}`);
  }

  if (loading) {
    return <main className="dashboard"><Header /><div className="content"><p>Carregando perfil...</p></div></main>;
  }

  if (!user) return null;

  const currentXp = Number(user.xp || 0);
  const level = Math.floor(currentXp / 100) + 1;
  const nextLevelXp = level * 100;

  const profileUser = {
    name: user.nome,
    avatar: "/avatar.png",
    house: "Corvinal",
    houseSlug: "corvinal",
    level,
    currentXp,
    nextLevelXp,
    coins: Number(user.coins || 0),
    streak: Number(user.streak || 0),
  };

  return (
    <main className="dashboard">
      <Header />
      <div className="dashboard-body dashboard-body--profile">
        <Sidebar />
        <section className="content profile-content">
          <ProfileHero user={profileUser} />

          <div>
            <div className="section-title"><Star size={18} />Seu progresso geral</div>
            <div className="stats-grid">
              {mockOverview.map((stat) => <StatCard key={stat.label} {...stat} />)}
            </div>
          </div>

          <div>
            <div className="section-title">Domínio por área</div>
            <div className="mastery-grid">
              {mockMastery.map((area) => (
                <MasteryCard
                  key={area.title}
                  {...area}
                  onContinue={() => openQuestions(area.title)}
                />
              ))}
            </div>
          </div>

          <div className="profile-panels">
            <RecentActivities activities={mockActivities} />
            <GoalsCard goalsByPeriod={mockGoals} />
          </div>
        </section>
      </div>
    </main>
  );
}
