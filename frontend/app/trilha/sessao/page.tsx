"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, ChevronLeft, ChevronRight, X } from "lucide-react";

import "../trilha.css";
import "../questoes.css";

import Header from "../../components/header";
import { API_BASE } from "../../lib/api";

type Alternativa = {
  letra: string;
  texto: string;
  imagem?: string | null;
};

type Questao = {
  prova: string;
  index: string;
  assunto?: string;
  enunciado?: string;
  imagens: string[];
  comando?: string;
  alternativas: Alternativa[];
};

type Resultado = {
  correta: boolean;
  gabarito: string;
  resolucao?: string;
};

function formatarTempo(totalSegundos: number) {
  const segundos = Math.max(0, totalSegundos);
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return `${String(minutos).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

function SessaoDeQuestoesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const area = searchParams.get("area");
  const quantidade = searchParams.get("quantidade") || "10";

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [indiceAtual, setIndiceAtual] = useState(0);

  const [selecionadas, setSelecionadas] = useState<Record<number, string>>({});
  const [riscadas, setRiscadas] = useState<Record<number, Set<string>>>({});
  const [resultados, setResultados] = useState<Record<number, Resultado>>({});

  const [corrigindo, setCorrigindo] = useState(false);
  const [finalizado, setFinalizado] = useState(false);
  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  const inicioQuestaoRef = useRef(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login?next=/trilha");
      return;
    }
    setCheckingAuth(false);
  }, [router]);

  useEffect(() => {
    if (checkingAuth) return;

    if (!area) {
      router.replace("/trilha");
      return;
    }

    async function carregarQuestoes() {
      setLoading(true);
      setErro("");

      try {
        const areaValida = area ?? "";
        const params = new URLSearchParams({ area: areaValida, quantidade });
        const response = await fetch(`${API_BASE}/questoes/gerar?${params.toString()}`);

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.detail || "Não foi possível carregar as questões.");
        }

        const data = await response.json();
        setQuestoes(data.questoes || []);
      } catch (err: unknown) {
        console.error(err);
        const mensagem = err instanceof Error ? err.message : "Não foi possível conectar ao servidor.";
        setErro(mensagem);
      } finally {
        setLoading(false);
      }
    }

    carregarQuestoes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingAuth, area, quantidade]);

  useEffect(() => {
    inicioQuestaoRef.current = Date.now();
  }, [indiceAtual, questoes.length]);

  useEffect(() => {
    if (loading || erro || finalizado || questoes.length === 0) return;

    const intervalo = setInterval(() => {
      setTempoDecorrido((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(intervalo);
  }, [loading, erro, finalizado, questoes.length]);

  const questaoAtual = questoes[indiceAtual];
  const totalQuestoes = questoes.length;
  const resultadoAtual = resultados[indiceAtual];
  const letraSelecionada = selecionadas[indiceAtual];
  const riscadasAtuais = riscadas[indiceAtual] || new Set();

  const acertos = Object.values(resultados).filter((r) => r.correta).length;
  const respondidas = Object.keys(resultados).length;

  const toggleRiscada = useCallback((indice: number, letra: string) => {
    setRiscadas((prev) => {
      const atual = new Set(prev[indice] || []);
      if (atual.has(letra)) atual.delete(letra);
      else atual.add(letra);
      return { ...prev, [indice]: atual };
    });
    setSelecionadas((prev) => {
      if (prev[indice] !== letra) return prev;
      const copia = { ...prev };
      delete copia[indice];
      return copia;
    });
  }, []);

  function handleSelecionar(letra: string) {
    if (resultadoAtual || riscadasAtuais.has(letra)) return;
    setSelecionadas((prev) => ({ ...prev, [indiceAtual]: letra }));
  }

  async function handleResponder() {
    if (!questaoAtual || !letraSelecionada || resultadoAtual || corrigindo) return;

    setCorrigindo(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/questoes/corrigir`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          respostas: [
            {
              prova: questaoAtual.prova,
              index: questaoAtual.index,
              letra: letraSelecionada,
              tempo_segundos: Math.max(1, Math.round((Date.now() - inicioQuestaoRef.current) / 1000)),
            },
          ],
        }),
      });

      const data = await response.json();
      const detalhe = data.detalhes?.[0];

      if (!detalhe) throw new Error("Não foi possível corrigir a questão.");

      setResultados((prev) => ({ ...prev, [indiceAtual]: detalhe }));
      window.dispatchEvent(new Event("lumostudy:stats-changed"));
    } catch (err) {
      console.error(err);
      setErro("Não foi possível corrigir sua resposta. Tente novamente.");
    } finally {
      setCorrigindo(false);
    }
  }

  function handleAnterior() {
    setIndiceAtual((prev) => Math.max(0, prev - 1));
  }

  function handleProxima() {
    if (indiceAtual + 1 >= totalQuestoes) {
      setFinalizado(true);
      return;
    }
    setIndiceAtual((prev) => prev + 1);
  }

  function handleSair() {
    const confirmar = window.confirm("Tem certeza que deseja sair? Seu progresso nesta sessão será perdido.");
    if (confirmar) router.push("/trilha");
  }

  if (checkingAuth) return null;

  return (
    <main className="dashboard">
      <Header />
      <div className="dashboard-body dashboard-body--quiz">
        <section className="content content--quiz">
          {loading && (
            <div className="quiz-loading">
              <p>Preparando suas questões...</p>
            </div>
          )}

          {!loading && erro && !finalizado && (
            <div className="quiz-error">
              <p>{erro}</p>
              <button type="button" onClick={() => router.push("/trilha")}>
                Voltar para a trilha
              </button>
            </div>
          )}

          {!loading && !erro && !finalizado && questaoAtual && (
            <div className="quiz-panel">
              <div className="quiz-topbar">
                <div className="quiz-timer">
                  <Clock size={16} />
                  <span>{formatarTempo(tempoDecorrido)}</span>
                </div>
                <button type="button" className="quiz-sair" onClick={handleSair}>
                  Sair
                </button>
              </div>

              <div className="quiz-card">
                <div className="quiz-nav-header">
                  <button
                    type="button"
                    className="quiz-nav-link"
                    onClick={handleAnterior}
                    disabled={indiceAtual === 0}
                  >
                    <ChevronLeft size={16} /> Questão Anterior
                  </button>

                  <span className="quiz-nav-title">Questão {indiceAtual + 1} de {totalQuestoes}</span>

                  <button type="button" className="quiz-nav-link" onClick={handleProxima}>
                    {indiceAtual + 1 >= totalQuestoes ? "Finalizar" : "Próxima Questão"} <ChevronRight size={16} />
                  </button>
                </div>

                {questaoAtual.assunto && (
                  <span className="quiz-assunto-tag">{questaoAtual.assunto}</span>
                )}

                {questaoAtual.enunciado && (
                  <p className="quiz-context">{questaoAtual.enunciado}</p>
                )}

                {questaoAtual.imagens.length > 0 && (
                  <div className="quiz-images">
                    {questaoAtual.imagens.map((src) => (
                      <img key={src} src={`${API_BASE}${src}`} alt="" />
                    ))}
                  </div>
                )}

                {questaoAtual.comando && (
                  <p className="quiz-comando">{questaoAtual.comando}</p>
                )}

                <div className="quiz-alternatives">
                  {questaoAtual.alternativas.map((alternativa) => {
                    const estaRiscada = riscadasAtuais.has(alternativa.letra);
                    const estaSelecionada = letraSelecionada === alternativa.letra;

                    let classe = "";
                    if (resultadoAtual) {
                      if (alternativa.letra === resultadoAtual.gabarito) classe = "correta";
                      else if (alternativa.letra === letraSelecionada) classe = "errada";
                    } else if (estaSelecionada) {
                      classe = "selecionada";
                    }

                    return (
                      <div
                        key={alternativa.letra}
                        className={`quiz-alternative ${classe} ${estaRiscada ? "riscada" : ""}`}
                        onClick={() => handleSelecionar(alternativa.letra)}
                      >
                        <span className="quiz-alternative-letter">{alternativa.letra}</span>
                        <span className="quiz-alternative-texto">
                          {alternativa.texto}
                          {alternativa.imagem && (
                            <img src={`${API_BASE}${alternativa.imagem}`} alt="" />
                          )}
                        </span>

                        {!resultadoAtual && (
                          <button
                            type="button"
                            className="quiz-alternative-riscar"
                            title={estaRiscada ? "Desfazer" : "Riscar alternativa"}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRiscada(indiceAtual, alternativa.letra);
                            }}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {resultadoAtual && (
                  <div className={`quiz-feedback ${resultadoAtual.correta ? "acertou" : "errou"}`}>
                    {resultadoAtual.correta
                      ? "Boa! Você acertou essa questão."
                      : `Você errou. A alternativa correta era a "${resultadoAtual.gabarito}".`}
                  </div>
                )}

                {resultadoAtual?.resolucao && (
                  <div className="quiz-feedback">
                    <strong>Resolução comentada</strong>
                    <p style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{resultadoAtual.resolucao}</p>
                  </div>
                )}

                {!resultadoAtual && (
                  <button
                    type="button"
                    className="quiz-responder-btn"
                    disabled={!letraSelecionada || corrigindo}
                    onClick={handleResponder}
                  >
                    {corrigindo ? "Corrigindo..." : "Responder Questão"}
                  </button>
                )}
              </div>
            </div>
          )}

          {finalizado && (
            <div className="quiz-summary">
              <p>Você concluiu a sessão!</p>
              <div className="quiz-summary-score">
                {acertos}/{totalQuestoes}
              </div>
              <p>
                {respondidas < totalQuestoes
                  ? `Você respondeu ${respondidas} de ${totalQuestoes} questões. `
                  : ""}
                {totalQuestoes > 0 ? Math.round((acertos / totalQuestoes) * 100) : 0}% de aproveitamento neste bloco.
              </p>
              <div className="quiz-summary-actions">
                <button type="button" className="primario" onClick={() => router.push("/trilha")}>
                  Voltar para a trilha
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function SessaoDeQuestoesPage() {
  return (
    <Suspense fallback={null}>
      <SessaoDeQuestoesPageContent />
    </Suspense>
  );
}
