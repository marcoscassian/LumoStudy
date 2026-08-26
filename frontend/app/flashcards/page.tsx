"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/sidebar";
import Header from "../components/header";
import "../trilha/trilha.css";
import styles from "./flashcards.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
type Flashcard = { id: number; frente: string; verso: string; disciplina: string; conteudo_principal: string };

export default function FlashcardsPage() {
	const router = useRouter();
	const [cards, setCards] = useState<Flashcard[]>([]);
	const [flipped, setFlipped] = useState<Set<number>>(new Set());
	const [disciplina, setDisciplina] = useState("");

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
	function toggle(id: number) { setFlipped((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }

	return (
		<div className="page">
			<Header />
			<Sidebar />
			<main className={styles.content}>
				<header className={styles.head}><h1>Flashcards</h1><p>Clique em um cartão para revelar a resposta.</p></header>
				<div className={styles.filters}><select value={disciplina} onChange={(e) => setDisciplina(e.target.value)}><option value="">Todas as disciplinas</option>{disciplinas.map((value) => <option key={value}>{value}</option>)}</select></div>
				{filtered.length ? <div className={styles.grid}>{filtered.map((item) => <button type="button" className={styles.card} key={item.id} onClick={() => toggle(item.id)} aria-label="Virar flashcard"><span className={`${styles.inner} ${flipped.has(item.id) ? styles.flipped : ""}`}><span className={`${styles.face} ${styles.front}`}><span className={styles.meta}>{item.disciplina} · {item.conteudo_principal}</span><h2>{item.frente}</h2><span className={styles.hint}>Clique para ver a resposta</span></span><span className={`${styles.face} ${styles.back}`}><span className={styles.meta}>Resposta</span><h2>{item.verso}</h2><span className={styles.hint}>Clique para voltar</span></span></span></button>)}</div> : <div className={styles.empty}>Ainda não há flashcards ativos para esta seleção.</div>}
			</main>
		</div>
	);
}
