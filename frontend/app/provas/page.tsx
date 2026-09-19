"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Files } from "lucide-react";

import "../trilha/trilha.css";
import "../sidebar-pages.css";
import "./provas.css";

import Header from "../components/header";
import Sidebar from "../components/sidebar";
import { API_BASE } from "../lib/api";

type ProvaResumo = {
  ano: number;
  codigo: string;
  quantidade_questoes: number;
};

type QuestaoResumo = {
  index: string;
  disciplina: string | null;
  idioma: string | null;
};

type DetalheProva = {
  ano: number;
  codigo: string;
  questoes: QuestaoResumo[];
};

type Questao = {
  prova: string;
  index: string;
  titulo: string | null;
  enunciado: string | null;
  comando: string | null;
  imagens: string[];
  alternativas: { letra: string; texto: string; imagem: string | null }[];
  gabarito: string | null;
  disciplinaOriginal: string | null;
};

const NOMES_AREAS: Record<string, string> = {
  linguagens: "Linguagens",
  "ciencias-humanas": "Ciências Humanas",
  matematica: "Matemática",
  "ciencias-natureza": "Ciências da Natureza",
};

function nomeQuestao(index: string) {
  const [numero, idioma] = index.split("-");
  if (idioma === "ingles") return `${numero} · Inglês`;
  if (idioma === "espanhol") return `${numero} · Espanhol`;
  return index;
}

async function obterJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === "string" ? data.detail : "Não foi possível carregar o acervo.");
  }
  return response.json();
}

export default function ProvasPage() {
  const router = useRouter();
  const [provas, setProvas] = useState<ProvaResumo[]>([]);
  const [ano, setAno] = useState<number | null>(null);
  const [detalhe, setDetalhe] = useState<DetalheProva | null>(null);
  const [index, setIndex] = useState<string | null>(null);
  const [questao, setQuestao] = useState<Questao | null>(null);
  const [mostrarGabarito, setMostrarGabarito] = useState(false);
  const [carregandoProvas, setCarregandoProvas] = useState(true);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [carregandoQuestao, setCarregandoQuestao] = useState(false);
  const [erroProvas, setErroProvas] = useState("");
  const [erroDetalhe, setErroDetalhe] = useState("");
  const [erroQuestao, setErroQuestao] = useState("");
  const [recarregarQuestao, setRecarregarQuestao] = useState(0);

  function selecionarAno(novoAno: number) {
    if (novoAno === ano) return;
    setAno(novoAno);
    setDetalhe(null);
    setQuestao(null);
    setIndex(null);
    setErroDetalhe("");
    setErroQuestao("");
    setCarregandoDetalhe(true);
    setCarregandoQuestao(false);
  }

  function selecionarQuestao(novoIndex: string) {
    setQuestao(null);
    setMostrarGabarito(false);
    setErroQuestao("");
    setCarregandoQuestao(true);
    if (novoIndex === index) setRecarregarQuestao((atual) => atual + 1);
    else setIndex(novoIndex);
  }

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.replace("/login?next=/provas");
      return;
    }

    const controller = new AbortController();
    obterJson<ProvaResumo[]>(`${API_BASE}/questoes/provas`, controller.signal)
      .then((dados) => {
        if (controller.signal.aborted) return;
        setProvas(dados);
        if (dados.length > 0) setCarregandoDetalhe(true);
        setAno(dados[0]?.ano ?? null);
      })
      .catch((erro) => {
        if (!controller.signal.aborted) setErroProvas(erro.message || "Não foi possível carregar as provas.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregandoProvas(false);
      });
    return () => controller.abort();
  }, [router]);

  useEffect(() => {
    if (ano === null) return;
    const controller = new AbortController();
    obterJson<DetalheProva>(`${API_BASE}/questoes/provas/${ano}`, controller.signal)
      .then((dados) => {
        if (controller.signal.aborted) return;
        setDetalhe(dados);
        setIndex(dados.questoes[0]?.index ?? null);
        setCarregandoQuestao(dados.questoes.length > 0);
      })
      .catch((erro) => {
        if (!controller.signal.aborted) setErroDetalhe(erro.message || "Não foi possível carregar a prova.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregandoDetalhe(false);
      });
    return () => controller.abort();
  }, [ano]);

  useEffect(() => {
    if (ano === null || detalhe?.ano !== ano || index === null) return;
    const controller = new AbortController();
    obterJson<Questao>(`${API_BASE}/questoes/provas/${ano}/questoes/${encodeURIComponent(index)}`, controller.signal)
      .then((dados) => {
        if (!controller.signal.aborted) setQuestao(dados);
      })
      .catch((erro) => {
        if (!controller.signal.aborted) setErroQuestao(erro.message || "Não foi possível carregar a questão.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregandoQuestao(false);
      });
    return () => controller.abort();
  }, [ano, detalhe, index, recarregarQuestao]);

  const questoes = detalhe?.ano === ano ? detalhe.questoes : [];
  const posicao = questoes.findIndex((item) => item.index === index);
  const questaoVisivel = questao?.prova === `ENEM${ano}` && questao.index === index ? questao : null;
  const resumoAtual = questoes[posicao];

  return (
    <main className="dashboard">
      <Header />
      <div className="dashboard-body dashboard-body--sidebar-page">
        <Sidebar />
        <section className="sidebar-page-content">
          <div className="sidebar-page-shell">
            <span className="sidebar-page-kicker"><Files size={14} /> Acervo ENEM</span>
            <h1 className="sidebar-page-title">Provas por ano</h1>
            <p className="sidebar-page-subtitle">Escolha um ano para visualizar todas as questões disponíveis daquela prova, na ordem original.</p>

            <section className="page-card provas-seletor" aria-label="Escolher ano da prova">
              <h2>Escolha o ano</h2>
              {carregandoProvas && <p className="muted">Carregando provas...</p>}
              {erroProvas && <p className="inline-message error" role="alert">{erroProvas}</p>}
              {!carregandoProvas && !erroProvas && provas.length === 0 && <p className="muted">Nenhuma prova disponível no acervo.</p>}
              <div className="provas-anos">
                {provas.map((prova) => (
                  <button
                    key={prova.codigo}
                    type="button"
                    className={`provas-ano ${ano === prova.ano ? "selecionado" : ""}`}
                    onClick={() => selecionarAno(prova.ano)}
                    aria-pressed={ano === prova.ano}
                  >
                    <strong>{prova.ano}</strong>
                    <span>{prova.quantidade_questoes} questões disponíveis</span>
                  </button>
                ))}
              </div>
            </section>

            {ano !== null && (
              <div className="provas-layout">
                <article className="page-card provas-questao">
                  {carregandoDetalhe && <p className="muted">Carregando prova de {ano}...</p>}
                  {erroDetalhe && <p className="inline-message error" role="alert">{erroDetalhe}</p>}
                  {!carregandoDetalhe && !erroDetalhe && questoes.length === 0 && <p className="muted">Esta prova não possui questões disponíveis.</p>}
                  {questoes.length > 0 && (
                    <>
                      <div className="provas-questao-topo">
                        <div>
                          <span className="provas-etiqueta">ENEM {ano} · Questão {nomeQuestao(index || "")}</span>
                          <h2>{resumoAtual?.disciplina ? NOMES_AREAS[resumoAtual.disciplina] || resumoAtual.disciplina : "Questão"}</h2>
                        </div>
                        <span className="muted">{posicao + 1} de {questoes.length}</span>
                      </div>

                      {!questaoVisivel && !erroQuestao && <p className="muted">{carregandoQuestao ? "Carregando questão..." : "Selecione uma questão."}</p>}
                      {erroQuestao && <p className="inline-message error" role="alert">{erroQuestao}</p>}
                      {questaoVisivel && (
                        <div className="provas-enunciado">
                          {questaoVisivel.enunciado && <p>{questaoVisivel.enunciado}</p>}
                          {questaoVisivel.imagens.length > 0 && (
                            <div className="provas-imagens">
                              {questaoVisivel.imagens.map((src) => <img key={src} src={`${API_BASE}${src}`} alt={`Imagem da questão ${nomeQuestao(questaoVisivel.index)}`} />)}
                            </div>
                          )}
                          {questaoVisivel.comando && <p className="provas-comando">{questaoVisivel.comando}</p>}
                          <div className="provas-alternativas">
                            {questaoVisivel.alternativas.map((alternativa) => (
                              <div key={alternativa.letra} className={`provas-alternativa ${mostrarGabarito && alternativa.letra === questaoVisivel.gabarito ? "correta" : ""}`}>
                                <strong>{alternativa.letra}</strong>
                                <span>{alternativa.texto}{alternativa.imagem && <img src={`${API_BASE}${alternativa.imagem}`} alt={`Imagem da alternativa ${alternativa.letra}`} />}</span>
                              </div>
                            ))}
                          </div>
                          {questaoVisivel.gabarito && (
                            <button type="button" className="secondary-action provas-gabarito" onClick={() => setMostrarGabarito((atual) => !atual)} aria-expanded={mostrarGabarito}>
                              {mostrarGabarito ? `Ocultar gabarito · ${questaoVisivel.gabarito}` : "Ver gabarito"}
                            </button>
                          )}
                        </div>
                      )}
                      <div className="provas-navegacao">
                        <button type="button" className="secondary-action" disabled={posicao <= 0} onClick={() => selecionarQuestao(questoes[posicao - 1].index)}><ChevronLeft size={17} /> Anterior</button>
                        <button type="button" className="primary-action" disabled={posicao < 0 || posicao >= questoes.length - 1} onClick={() => selecionarQuestao(questoes[posicao + 1].index)}>Próxima <ChevronRight size={17} /></button>
                      </div>
                    </>
                  )}
                </article>

                <aside className="page-card provas-indice">
                  <h2>Questões de {ano}</h2>
                  <p className="muted">Selecione um número para ir direto à questão.</p>
                  <div className="provas-mapa">
                    {questoes.map((item) => (
                      <button
                        key={item.index}
                        type="button"
                        className={item.index === index ? "atual" : ""}
                        onClick={() => selecionarQuestao(item.index)}
                        aria-label={`Questão ${nomeQuestao(item.index)}${item.disciplina ? `, ${NOMES_AREAS[item.disciplina] || item.disciplina}` : ""}`}
                        aria-current={item.index === index ? "true" : undefined}
                        title={`Questão ${nomeQuestao(item.index)}`}
                      >
                        {item.index.replace("-ingles", " I").replace("-espanhol", " E")}
                      </button>
                    ))}
                  </div>
                </aside>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
