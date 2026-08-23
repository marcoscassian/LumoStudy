"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, PlayCircle, Sparkles, Zap, Flame } from "lucide-react";

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
  { value: "facil", label: "Fácil", icon: Sparkles, color: "nivel-facil" },
  { value: "medio", label: "Médio", icon: Zap, color: "nivel-medio" },
  { value: "dificil", label: "Difícil", icon: Flame, color: "nivel-dificil" },
];

function encontrarAreaPorTexto(texto) {
  if (!texto) return null;
  const normalizado = texto.toLowerCase();

  if (normalizado.includes("natureza")) return AREAS[3];
  if (normalizado.includes("human")) return AREAS[1];
  if (normalizado.includes("matem")) return AREAS[2];
  if (normalizado.includes("lingua")) return AREAS[0];

  return null;
}

export default function QuestoesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedArea, setSelectedArea] = useState(null);
  const [quantidade, setQuantidade] = useState(10);
  const [nivel, setNivel] = useState("medio");
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login?next=/questoes");
      return;
    }
    setCheckingAuth(false);
  }, [router]);

  useEffect(() => {
    const areaParam = searchParams.get("area");
    const encontrada = encontrarAreaPorTexto(areaParam);
    if (encontrada) {
      setSelectedArea(encontrada);
    }
  }, [searchParams]);

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

  if (checkingAuth) {
    return null;
  }

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

          {step === "config" && (
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
