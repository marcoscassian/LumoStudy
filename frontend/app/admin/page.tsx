"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { BookOpenCheck, CreditCard, LockKeyhole, Pencil, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const emptyCard = { frente: "", verso: "", disciplina: "", conteudo_principal: "", prova: "", numero_questao: "", ativo: true };

type Editorial = { resolucao?: string; disciplina?: string; conteudo_principal?: string };
type Original = { prova: string; index: string; titulo?: string; enunciado?: string; comando?: string; alternativas: { letra: string; texto: string }[]; gabarito?: string; disciplinaOriginal?: string };
type Flashcard = typeof emptyCard & { id: number };

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"questoes" | "flashcards">("questoes");
  const [anos, setAnos] = useState<number[]>([]);
  const [ano, setAno] = useState("");
  const [numero, setNumero] = useState("");
  const [original, setOriginal] = useState<Original | null>(null);
  const [editorial, setEditorial] = useState<Editorial>({});
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [card, setCard] = useState(emptyCard);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busca, setBusca] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = () => localStorage.getItem("token") || "";
  const authFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${API}${path}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}`, ...(init.headers || {}) } });
    if (response.status === 401) { router.push("/login?next=/admin"); throw new Error("Sessão expirada"); }
    if (response.status === 403) throw new Error("Seu usuário não possui permissão de administrador.");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || "Não foi possível concluir a operação.");
    return data;
  }, [router]);

  const loadCards = useCallback(async (term = "") => {
    const query = term ? `?busca=${encodeURIComponent(term)}` : "";
    setCards(await authFetch(`/admin/flashcards${query}`));
  }, [authFetch]);

  useEffect(() => {
    authFetch("/admin/provas").then((data) => { const values = data.map((item: { ano: number }) => item.ano); setAnos(values); setAno(String(values[0] || "")); }).catch((e) => setError(e.message));
    authFetch("/admin/flashcards").then(setCards).catch((e) => setError(e.message));
  }, [authFetch]);

  async function searchQuestion(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    try { const data = await authFetch(`/admin/questoes/buscar?ano=${ano}&numero=${encodeURIComponent(numero)}`); setOriginal(data.original); setEditorial(data.editorial || {}); }
    catch (e) { setOriginal(null); setError((e as Error).message); }
  }

  async function saveQuestion(event: FormEvent) {
    event.preventDefault(); if (!original) return;
    try { const data = await authFetch(`/admin/questoes/${original.prova}/${encodeURIComponent(original.index)}/editorial`, { method: "PUT", body: JSON.stringify(editorial) }); setEditorial(data); setMessage("Dados editoriais salvos."); setError(""); }
    catch (e) { setError((e as Error).message); }
  }

  async function saveCard(event: FormEvent) {
    event.preventDefault();
    try {
      const path = editingId ? `/admin/flashcards/${editingId}` : "/admin/flashcards";
      await authFetch(path, { method: editingId ? "PUT" : "POST", body: JSON.stringify({ ...card, prova: card.prova || null, numero_questao: card.numero_questao || null }) });
      setCard(emptyCard); setEditingId(null); setMessage(editingId ? "Flashcard atualizado." : "Flashcard criado."); setError(""); await loadCards(busca);
    } catch (e) { setError((e as Error).message); }
  }

  function editCard(item: Flashcard) { setEditingId(item.id); setCard({ frente: item.frente, verso: item.verso, disciplina: item.disciplina, conteudo_principal: item.conteudo_principal, prova: item.prova || "", numero_questao: item.numero_questao || "", ativo: item.ativo }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function toggleCard(item: Flashcard) { try { await authFetch(`/admin/flashcards/${item.id}/status?ativo=${!item.ativo}`, { method: "PATCH" }); await loadCards(busca); } catch (e) { setError((e as Error).message); } }

  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.topbar}><div><div className={styles.eyebrow}>Área restrita</div><h1 className={styles.title}>Painel editorial</h1><p className={styles.subtitle}>Classifique questões, escreva resoluções e gerencie flashcards.</p></div>
      <nav className={styles.nav}><button className={tab === "questoes" ? styles.active : ""} onClick={() => setTab("questoes")}><BookOpenCheck size={16}/> Questões</button><button className={tab === "flashcards" ? styles.active : ""} onClick={() => setTab("flashcards")}><CreditCard size={16}/> Flashcards</button></nav>
    </header>
    {message && <div className={styles.message}>{message}</div>}{error && <div className={`${styles.message} ${styles.error}`}>{error}</div>}
    {tab === "questoes" ? <>
      <form className={`${styles.card} ${styles.search}`} onSubmit={searchQuestion}><label className={styles.field}>Ano da prova<select value={ano} onChange={(e) => setAno(e.target.value)} required>{anos.map((value) => <option key={value}>{value}</option>)}</select></label><label className={styles.field}>Número da questão<input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ex.: 42 ou 91-ingles" required/></label><button className={styles.button}><Search size={18}/> Buscar</button></form>
      {original && <div className={styles.grid}><section className={`${styles.card} ${styles.readonly}`}><span className={styles.locked}><LockKeyhole size={14}/> Material oficial — somente leitura</span><h2>{original.titulo || `Questão ${original.index}`}</h2><p className={styles.meta}>{original.prova} · {original.disciplinaOriginal} · Gabarito {original.gabarito}</p><div className={styles.questionText}>{original.enunciado}</div><p className={styles.questionText}><strong>{original.comando}</strong></p><div className={styles.alternatives}>{original.alternativas.map((alt) => <div className={styles.alternative} key={alt.letra}><strong>{alt.letra})</strong> {alt.texto}</div>)}</div></section>
      <form className={`${styles.card} ${styles.editor} ${styles.form}`} onSubmit={saveQuestion}><h2>Dados editáveis</h2><label className={styles.field}>Disciplina<input value={editorial.disciplina || ""} onChange={(e) => setEditorial({...editorial, disciplina: e.target.value})} placeholder="Ex.: Geografia"/></label><label className={styles.field}>Conteúdo principal<input value={editorial.conteudo_principal || ""} onChange={(e) => setEditorial({...editorial, conteudo_principal: e.target.value})} placeholder="Ex.: Climatologia"/></label><label className={styles.field}>Resolução comentada<textarea value={editorial.resolucao || ""} onChange={(e) => setEditorial({...editorial, resolucao: e.target.value})} placeholder="Explique o raciocínio e por que a alternativa está correta."/></label><button className={styles.button}>Salvar alterações</button></form></div>}
    </> : <div className={styles.grid}><form className={`${styles.card} ${styles.form}`} onSubmit={saveCard}><h2>{editingId ? "Editar flashcard" : "Novo flashcard"}</h2><label className={styles.field}>Frente<textarea value={card.frente} onChange={(e) => setCard({...card, frente: e.target.value})} required/></label><label className={styles.field}>Verso<textarea value={card.verso} onChange={(e) => setCard({...card, verso: e.target.value})} required/></label><label className={styles.field}>Disciplina<input value={card.disciplina} onChange={(e) => setCard({...card, disciplina: e.target.value})} required/></label><label className={styles.field}>Conteúdo principal<input value={card.conteudo_principal} onChange={(e) => setCard({...card, conteudo_principal: e.target.value})} required/></label><div className={styles.search}><label className={styles.field}>Prova (opcional)<input value={card.prova} onChange={(e) => setCard({...card, prova: e.target.value.toUpperCase()})} placeholder="ENEM2013"/></label><label className={styles.field}>Questão<input value={card.numero_questao} onChange={(e) => setCard({...card, numero_questao: e.target.value})}/></label></div><label className={styles.checkbox}><input type="checkbox" checked={card.ativo} onChange={(e) => setCard({...card, ativo: e.target.checked})}/> Flashcard ativo</label><button className={styles.button}><Plus size={18}/>{editingId ? "Salvar edição" : "Criar flashcard"}</button>{editingId && <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => {setEditingId(null); setCard(emptyCard);}}>Cancelar</button>}</form>
    <section className={styles.card}><div className={styles.toolbar}><div><h2>Flashcards</h2><p className={styles.subtitle}>{cards.length} resultado(s)</p></div><label className={styles.field}>Buscar<input value={busca} onChange={(e) => {setBusca(e.target.value); loadCards(e.target.value).catch((err) => setError(err.message));}} placeholder="Frente ou verso"/></label></div><div className={styles.list}>{cards.map((item) => <article className={styles.item} key={item.id}><div><h3>{item.frente}</h3><p>{item.verso}</p><div className={styles.meta}>{item.disciplina} · {item.conteudo_principal} · {item.ativo ? "Ativo" : "Inativo"}</div></div><div className={styles.actions}><button className={`${styles.button} ${styles.secondary}`} onClick={() => editCard(item)}><Pencil size={15}/> Editar</button><button className={`${styles.button} ${item.ativo ? styles.danger : styles.secondary}`} onClick={() => toggleCard(item)}>{item.ativo ? "Desativar" : "Ativar"}</button></div></article>)}{cards.length === 0 && <div className={styles.empty}>Nenhum flashcard encontrado.</div>}</div></section></div>}
  </div></main>;
}
