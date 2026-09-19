"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, PlayCircle, Sparkles, Zap, Flame, Shuffle } from "lucide-react";

import "../trilha/trilha.css";
import "./questoes.css";

import Sidebar from "../components/sidebar";
import Header from "../components/header";

const AREAS = [
  {
    value: "linguagens",
    title: "Linguagens, Códigos e suas Tecnologias",
    description: "Interpretação de textos, literatura, gramática e artes.",
    image: "/linguagenscard.png",
    color: "purple",
  },
  {
    value: "ciencias-humanas",
    title: "Ciências Humanas e suas Tecnologias",
    description: "História, Geografia, Filosofia e Sociologia.",
    image: "/cienciashumanas.png",
    color: "green",
  },
  {
    value: "matematica",
    title: "Matemática e suas Tecnologias",
    description: "Álgebra, geometria, estatística e raciocínio lógico.",
    image: "/matematica.png",
    color: "blue",
  },
  {
    value: "ciencias-natureza",
    title: "Ciências da Natureza e suas Tecnologias",
    description: "Biologia, Física e Química.",
    image: "/natureza.png",
    color: "yellow",
  },
];

const QUANTIDADES = [5, 10, 15, 20, 25];

const NIVEIS = [
  { value: "misto", label: "Misto", icon: Shuffle, color: "nivel-misto" },
  { value: "facil", label: "Fácil", icon: Sparkles, color: "nivel-facil" },
  { value: "medio", label: "Médio", icon: Zap, color: "nivel-medio" },
  { value: "dificil", label: "Difícil", icon: Flame, color: "nivel-dificil" },
];

type Area = (typeof AREAS)[number];

function encontrarAreaPorTexto(texto: string | null): Area | null {
  if (!texto) return null;
  const normalizado = texto.toLowerCase();

  if (normalizado.includes("natureza")) return AREAS[3];
  if (normalizado.includes("human")) return AREAS[1];
  if (normalizado.includes("matem")) return AREAS[2];
  if (normalizado.includes("lingua")) return AREAS[0];

  return null;
}

function QuestoesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const areaInicial = encontrarAreaPorTexto(searchParams.get("area"));
  const quantidadeInicial = Number(searchParams.get("quantidade"));
  const nivelInicial = searchParams.get("nivel");

  const [selectedArea, setSelectedArea] = useState<Area | null>(areaInicial);
  const [quantidade, setQuantidade] = useState(QUANTIDADES.includes(quantidadeInicial) ? quantidadeInicial : 10);
  const [nivel, setNivel] = useState(NIVEIS.some((item) => item.value === nivelInicial) ? (nivelInicial || "medio") : "medio");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login?next=/questoes");
      return;
    }
  }, [router]);


  const step = selectedArea ? "config" : "area";

  const handleIniciar = () => {
    if (!selectedArea) return;
    const params = new URLSearchParams({
      area: selectedArea.value,
      quantidade: String(quantidade),
      nivel,
    });
    router.push(`/questoes/sessao?${params.toString()}`);
  };

  return (
    <main className="dashboard">
      <Header />
      <div className="dashboard-body dashboard-body--questoes">
        <Sidebar />
        <section className="content">
          <div className="title-area">
            <div className="title-row">
              <h1>Questões</h1>
            </div>
            <p>Escolha uma área, defina a quantidade e o nível para praticar.</p>
          </div>

          {step === "area" && (
            <div className="area-grid">
              {AREAS.map((area) => (
                <button
                  key={area.value}
                  type="button"
                  className={`area-card area-${area.color}`}
                  onClick={() => setSelectedArea(area)}
                >
                  <img src={area.image} alt={area.title} className="area-card-image" />
                  <h3>{area.title}</h3>
                  <p>{area.description}</p>
                  <span className="area-card-cta">Escolher</span>
                </button>
              ))}
            </div>
          )}

          {step === "config" && selectedArea && (
            <div className="config-panel">
              <button type="button" className="config-back" onClick={() => setSelectedArea(null)}>
                <ArrowLeft size={16} /> Trocar área
              </button>

              <div className={`config-area-summary area-${selectedArea.color}`}>
                <img src={selectedArea.image} alt={selectedArea.title} />
                <div>
                  <h2>{selectedArea.title}</h2>
                  <p>{selectedArea.description}</p>
                </div>
              </div>

              <div className="config-block">
                <h4>Quantas questões?</h4>
                <div className="chip-row">
                  {QUANTIDADES.map((valor) => (
                    <button
                      key={valor}
                      type="button"
                      className={`chip ${quantidade === valor ? "chip-active" : ""}`}
                      onClick={() => setQuantidade(valor)}
                    >
                      {valor}
                    </button>
                  ))}
                </div>
              </div>

              <div className="config-block">
                <h4>Qual o nível?</h4>
                <div className="chip-row">
                  {NIVEIS.map(({ value, label, icon: Icon, color }) => (
                    <button
                      key={value}
                      type="button"
                      className={`chip chip-nivel ${color} ${nivel === value ? "chip-active" : ""}`}
                      onClick={() => setNivel(value)}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" className="config-start-btn" onClick={handleIniciar}>
                <PlayCircle size={20} />
                Iniciar {quantidade} questões
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function QuestoesPage() {
  return (
    <Suspense fallback={null}>
      <QuestoesPageContent />
    </Suspense>
  );
}
