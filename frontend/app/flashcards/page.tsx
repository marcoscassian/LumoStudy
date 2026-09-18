"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Layers3, Plus, RotateCcw, Sparkles, X } from "lucide-react";
import Sidebar from "../components/sidebar";
import Header from "../components/header";
import "../trilha/trilha.css";
import styles from "./flashcards.module.css";
import { API_BASE as API } from "../lib/api";

type Flashcard = { id: number; frente: string; verso: string; disciplina: string; conteudo_principal: string };

type FlashcardForm = {
  frente: string;
  verso: string;
  disciplina: string;
  conteudo_principal: string;
};

const MATERIAS = ["Linguagens", "Ciências Humanas", "Matemática", "Ciências da Natureza"];
const REVISOES = [
  { value: "errei", label: "Errei" },
  { value: "dificil", label: "Difícil" },
  { value: "bom", label: "Bom" },
  { value: "facil", label: "Fácil" },
];

const currentTimestamp = () => Date.now();

const emptyForm: FlashcardForm = {
  frente: "",
  verso: "",
  disciplina: "Matemática",
  conteudo_principal: "",
};

export default function FlashcardsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [disciplina, setDisciplina] = useState("");
  const [reviewed, setReviewed] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [form, setForm] = useState<FlashcardForm>(emptyForm);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
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

  async function criarFlashcard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login?next=/flashcards");
      return;
    }

    const payload = {
      frente: form.frente.trim(),
      verso: form.verso.trim(),
      disciplina: form.disciplina.trim(),
      conteudo_principal: form.conteudo_principal.trim() || "Geral",
    };

    if (!payload.frente || !payload.verso || !payload.disciplina || !payload.conteudo_principal) {
      alert("Preencha frente, resposta, matéria e tema antes de salvar.");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`${API}/flashcards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || "Não foi possível criar o flashcard.");
      }

      setCards((current) => [data, ...current]);
      setForm(emptyForm);
      setShowCreateForm(false);
      setDisciplina(data.disciplina || "");
      window.dispatchEvent(new Event("lumostudy:stats-changed"));
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Não foi possível criar o flashcard.");
    } finally {
      setCreating(false);
    }
  }

  function toggle(id: number) {
    setFlipped((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        startedAt.current[id] = currentTimestamp();
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
      const inicio = startedAt.current[id] || currentTimestamp();
      const tempo = Math.max(1, Math.round((currentTimestamp() - inicio) / 1000));
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
      startedAt.current[id] = currentTimestamp();
      window.dispatchEvent(new Event("lumostudy:stats-changed"));
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Não foi possível registrar a revisão.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <main className="dashboard">
      <Header />
      <div className={`dashboard-body ${styles.dashboardBody}`}>
        <Sidebar />

        <section className={styles.content}>
          <div className={styles.shell}>
            <section className={styles.hero}>
              <div className={styles.heroCopy}>
                <span className={styles.eyebrow}><Sparkles size={14} /> Revisão inteligente</span>
                <h1>Flashcards</h1>
                <p>Revise os conteúdos, vire o cartão para conferir a resposta e registre como foi seu desempenho.</p>
              </div>

              <div className={styles.heroStats} aria-label="Resumo dos flashcards">
                <div className={styles.statCard}>
                  <span className={styles.statIcon}><Layers3 size={19} /></span>
                  <div>
                    <strong>{cards.length}</strong>
                    <span>{cards.length === 1 ? "flashcard" : "flashcards"}</span>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statIcon}><BookOpen size={19} /></span>
                  <div>
                    <strong>{filtered.length}</strong>
                    <span>na seleção</span>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.toolbar}>
              <div className={styles.filterControl}>
                <label htmlFor="flashcard-disciplina">Filtrar por disciplina</label>
                <select id="flashcard-disciplina" value={disciplina} onChange={(e) => setDisciplina(e.target.value)}>
                  <option value="">Todas as disciplinas</option>
                  {disciplinas.map((value) => <option key={value}>{value}</option>)}
                </select>
              </div>

              <button type="button" className={styles.createToggle} onClick={() => setShowCreateForm((value) => !value)}>
                {showCreateForm ? <X size={18} /> : <Plus size={18} />}
                {showCreateForm ? "Cancelar" : "Criar flashcard"}
              </button>
            </section>

            {showCreateForm && (
              <form onSubmit={criarFlashcard} className={styles.createForm}>
                <div className={styles.formHeading}>
                  <div>
                    <span>Novo cartão</span>
                    <h2>Crie seu próprio flashcard</h2>
                  </div>
                  <p>Preencha a pergunta, a resposta e organize por matéria e tema.</p>
                </div>

                <div className={styles.fieldGroup}>
                  <label>
                    Frente
                    <textarea value={form.frente} onChange={(e) => setForm((current) => ({ ...current, frente: e.target.value }))} placeholder="Ex.: Qual é a fórmula do perímetro?" required />
                  </label>
                  <label>
                    Resposta
                    <textarea value={form.verso} onChange={(e) => setForm((current) => ({ ...current, verso: e.target.value }))} placeholder="Ex.: P = 2 × (a + b)" required />
                  </label>
                </div>
                <div className={styles.fieldGroup}>
                  <label>
                    Matéria
                    <select value={form.disciplina} onChange={(e) => setForm((current) => ({ ...current, disciplina: e.target.value }))}>
                      {MATERIAS.map((value) => <option key={value} value={value}>{value}</option>)}
                      <option value="Outro">Outro</option>
                    </select>
                  </label>
                  <label>
                    Tema
                    <input
                      value={form.conteudo_principal}
                      onChange={(e) => setForm((current) => ({ ...current, conteudo_principal: e.target.value }))}
                      placeholder="Ex.: Geometria, Literatura, Ecologia..."
                    />
                  </label>
                </div>
                <div className={styles.actionsRow}>
                  <button type="submit" disabled={creating}>
                    {creating ? "Salvando..." : "Salvar flashcard"}
                  </button>
                </div>
              </form>
            )}

            {filtered.length ? (
              <div className={styles.grid}>
                {filtered.map((item, index) => (
                  <article className={styles.cardWrap} key={item.id}>
                    <button type="button" className={styles.card} onClick={() => toggle(item.id)} aria-label="Virar flashcard">
                      <span className={`${styles.inner} ${flipped.has(item.id) ? styles.flipped : ""}`}>
                        <span className={`${styles.face} ${styles.front}`}>
                          <span className={styles.cardTopline}>
                            <span className={styles.meta}>{item.disciplina}</span>
                            <span className={styles.cardNumber}>#{String(index + 1).padStart(2, "0")}</span>
                          </span>
                          <span className={styles.topic}>{item.conteudo_principal}</span>
                          <h2>{item.frente}</h2>
                          <span className={styles.hint}><RotateCcw size={14} /> Clique para ver a resposta</span>
                        </span>
                        <span className={`${styles.face} ${styles.back}`}>
                          <span className={styles.cardTopline}>
                            <span className={styles.meta}>Resposta</span>
                            <span className={styles.cardNumber}>#{String(index + 1).padStart(2, "0")}</span>
                          </span>
                          <h2>{item.verso}</h2>
                          <span className={styles.hint}><RotateCcw size={14} /> Clique para voltar à pergunta</span>
                        </span>
                      </span>
                    </button>

                    {flipped.has(item.id) && (
                      <div className={styles.reviewBox}>
                        <div className={styles.reviewHeading}>
                          <div>
                            <span>Como foi sua revisão?</span>
                            <small>Escolha uma opção para salvar no seu progresso.</small>
                          </div>
                        </div>
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
                        {reviewed[item.id] && <p className={styles.savedMessage}>Revisão registrada no seu perfil.</p>}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}><BookOpen size={24} /></span>
                <h2>Nenhum flashcard encontrado</h2>
                <p>Ainda não há flashcards ativos para esta seleção.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
