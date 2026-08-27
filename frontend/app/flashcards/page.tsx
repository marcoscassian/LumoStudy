"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/sidebar";
import Header from "../components/header";
import "../trilha/trilha.css";
import styles from "./flashcards.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
type Flashcard = { id: number; frente: string; verso: string; disciplina: string; conteudo_principal: string };

const REVISOES = [
  { value: "errei", label: "Errei" },
  { value: "dificil", label: "Difícil" },
  { value: "bom", label: "Bom" },
  { value: "facil", label: "Fácil" },
];

export default function FlashcardsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [disciplina, setDisciplina] = useState("");
  const [reviewed, setReviewed] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const startedAt = useRef<Record<number, number>>({});

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login?next=/flashcards"); return; }
    fetch(`${API}/flashcards`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then(setCards)
      .catch(() => setCards([]));
  }, [router]);

  const disciplinas = useMemo(() => Array.from(new Set(cards.map((item) => item.disciplina))).sort(), [cards]);
  const filtered = disciplina ? cards.filter((item) => item.disciplina === disciplina) : cards;

  function toggle(id: number) {
    setFlipped((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        startedAt.current[id] = Date.now();
      }
      return next;
    });
  }

  async function registrarRevisao(id: number, resultado: string) {
    if (saving === id) return;
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login?next=/flashcards"); return; }

    setSaving(id);
    try {
      const inicio = startedAt.current[id] || Date.now();
      const tempo = Math.max(1, Math.round((Date.now() - inicio) / 1000));
      const response = await fetch(`${API}/flashcards/${id}/revisoes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resultado, tempo_segundos: tempo }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Não foi possível registrar a revisão.");
      }
      setReviewed((current) => ({ ...current, [id]: resultado }));
      startedAt.current[id] = Date.now();
      window.dispatchEvent(new Event("lumostudy:stats-changed"));
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Não foi possível registrar a revisão.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="page">
      <Header />
      <Sidebar />
      <main className={styles.content}>
        <header className={styles.head}>
          <h1>Flashcards</h1>
          <p>Vire o cartão e informe como foi sua revisão. O resultado fica salvo no seu progresso.</p>
        </header>
        <div className={styles.filters}>
          <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)}>
            <option value="">Todas as disciplinas</option>
            {disciplinas.map((value) => <option key={value}>{value}</option>)}
          </select>
        </div>

        {filtered.length ? (
          <div className={styles.grid}>
            {filtered.map((item) => (
              <div className={styles.cardWrap} key={item.id}>
                <button type="button" className={styles.card} onClick={() => toggle(item.id)} aria-label="Virar flashcard">
                  <span className={`${styles.inner} ${flipped.has(item.id) ? styles.flipped : ""}`}>
                    <span className={`${styles.face} ${styles.front}`}>
                      <span className={styles.meta}>{item.disciplina} · {item.conteudo_principal}</span>
                      <h2>{item.frente}</h2>
                      <span className={styles.hint}>Clique para ver a resposta</span>
                    </span>
                    <span className={`${styles.face} ${styles.back}`}>
                      <span className={styles.meta}>Resposta</span>
                      <h2>{item.verso}</h2>
                      <span className={styles.hint}>Agora avalie sua revisão abaixo</span>
                    </span>
                  </span>
                </button>

                {flipped.has(item.id) && (
                  <div className={styles.reviewBox}>
                    <span>Como foi?</span>
                    <div className={styles.reviewActions}>
                      {REVISOES.map((review) => (
                        <button
                          type="button"
                          key={review.value}
                          disabled={saving === item.id}
                          className={reviewed[item.id] === review.value ? styles.reviewSelected : ""}
                          onClick={() => registrarRevisao(item.id, review.value)}
                        >
                          {review.label}
                        </button>
                      ))}
                    </div>
                    {reviewed[item.id] && <small>Revisão registrada no seu perfil.</small>}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>Ainda não há flashcards ativos para esta seleção.</div>
        )}
      </main>
    </div>
  );
}
