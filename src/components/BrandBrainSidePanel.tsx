import { useMemo } from "react";
import { useBrandBrain } from "@/hooks/useBrandBrain";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Mic, Layers, CheckCircle2, Ban, Quote, Palette, StickyNote } from "lucide-react";

interface BrandBrainSidePanelProps {
  clientId: string | null | undefined;
  highlightedPillarId?: string | null;
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{title}</span>
      </div>
      <div className="text-xs text-foreground space-y-1.5">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] italic text-muted-foreground">{children}</p>;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value || !value.trim()) return null;
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xs text-foreground whitespace-pre-wrap">{value}</div>
    </div>
  );
}

export function BrandBrainSidePanel({ clientId, highlightedPillarId }: BrandBrainSidePanelProps) {
  const { loading, brain, vocabulary, pillars, voice, avoid, expressions, visuals } = useBrandBrain(
    clientId || undefined,
  );

  const approvedVocab = useMemo(() => vocabulary.filter((v) => v.status === "approved"), [vocabulary]);
  const forbiddenVocab = useMemo(() => vocabulary.filter((v) => v.status !== "approved"), [vocabulary]);

  if (!clientId) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        Selecione um cliente para visualizar o Brand Brain.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const hasAnyData =
    brain || voice || pillars.length || vocabulary.length || avoid.length || expressions.length || visuals.length;

  if (!hasAnyData) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        <Sparkles className="mx-auto mb-2 h-5 w-5 opacity-50" />
        Este cliente ainda não possui Brand Brain cadastrado.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Voz da Marca */}
      <Section icon={Mic} title="Voz da Marca">
        {voice ? (
          <>
            <Field label="Tom emocional" value={voice.emotional_tone} />
            <Field label="Arquétipo" value={voice.archetype} />
            <Field label="Ritmo de escrita" value={voice.writing_rhythm} />
            <Field label="Formalidade" value={voice.formality_level} />
            <Field label="O que evitar" value={voice.things_to_avoid} />
            {!voice.emotional_tone && !voice.archetype && !voice.writing_rhythm && !voice.formality_level && (
              <Empty>Nenhum tom de voz cadastrado.</Empty>
            )}
          </>
        ) : (
          <Empty>Nenhum tom de voz cadastrado.</Empty>
        )}
      </Section>

      {/* Pilares */}
      <Section icon={Layers} title="Pilares de Conteúdo">
        {pillars.length === 0 && <Empty>Nenhum pilar cadastrado.</Empty>}
        {pillars.map((p) => {
          const highlighted = highlightedPillarId === p.id;
          return (
            <div
              key={p.id}
              className={`rounded-md border p-2 transition-all ${
                highlighted ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-xs text-foreground">{p.name}</div>
                {highlighted && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">
                    Selecionado
                  </Badge>
                )}
              </div>
              {p.objective && (
                <div className="mt-1 text-[11px] text-muted-foreground line-clamp-3">{p.objective}</div>
              )}
              <div className="mt-1.5 flex flex-wrap gap-1">
                {p.main_emotion && (
                  <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
                    💗 {p.main_emotion}
                  </Badge>
                )}
                {p.suggested_frequency && (
                  <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
                    📅 {p.suggested_frequency}
                  </Badge>
                )}
              </div>
              {highlighted && p.themes?.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {p.themes.map((t, i) => (
                    <Badge key={i} variant="secondary" className="h-4 px-1.5 text-[9px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
              {highlighted && p.notes && (
                <p className="mt-1.5 text-[10px] italic text-muted-foreground">{p.notes}</p>
              )}
            </div>
          );
        })}
      </Section>

      {/* Vocabulário Aprovado */}
      <Section icon={CheckCircle2} title="Vocabulário Aprovado">
        {approvedVocab.length === 0 ? (
          <Empty>Nenhuma palavra aprovada cadastrada.</Empty>
        ) : (
          <div className="flex flex-wrap gap-1">
            {approvedVocab.map((v) => (
              <Badge
                key={v.id}
                variant="secondary"
                className="h-5 px-1.5 text-[10px] bg-success/15 text-success border-success/30"
                title={v.notes || v.category}
              >
                {v.term}
              </Badge>
            ))}
          </div>
        )}
      </Section>

      {/* Evitar */}
      <Section icon={Ban} title="Evitar">
        {avoid.length === 0 && forbiddenVocab.length === 0 ? (
          <Empty>Nenhuma palavra a evitar cadastrada.</Empty>
        ) : (
          <div className="space-y-1.5">
            {[...avoid, ...forbiddenVocab.map((v) => ({
              id: v.id,
              word: v.term,
              reason: v.notes,
              recommended_alternative: "",
              category: v.category,
            }))].map((w: any) => (
              <div key={w.id} className="rounded border border-destructive/30 bg-destructive/5 p-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="h-4 px-1.5 text-[10px] border-destructive/40 text-destructive">
                    {w.word}
                  </Badge>
                  {w.recommended_alternative && (
                    <span className="text-[10px] text-muted-foreground">
                      → use <span className="font-semibold text-success">{w.recommended_alternative}</span>
                    </span>
                  )}
                </div>
                {w.reason && <p className="mt-0.5 text-[10px] italic text-muted-foreground">{w.reason}</p>}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Expressões */}
      <Section icon={Quote} title="Expressões Aprovadas">
        {expressions.length === 0 ? (
          <Empty>Nenhuma expressão aprovada.</Empty>
        ) : (
          <div className="space-y-1">
            {expressions.map((e) => (
              <div key={e.id} className="rounded bg-muted/40 px-2 py-1">
                <div className="text-xs italic text-foreground">"{e.expression}"</div>
                {(e.usage_context || e.emotion) && (
                  <div className="text-[10px] text-muted-foreground">
                    {e.usage_context}
                    {e.usage_context && e.emotion ? " · " : ""}
                    {e.emotion}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Direção Visual */}
      <Section icon={Palette} title="Direção Visual">
        {visuals.length === 0 ? (
          <Empty>Nenhuma direção visual cadastrada.</Empty>
        ) : (
          <div className="space-y-2">
            {visuals.map((v) => (
              <div key={v.id} className="rounded border border-border/60 p-2">
                {v.category && (
                  <Badge variant="outline" className="h-4 px-1.5 text-[9px] mb-1">
                    {v.category}
                  </Badge>
                )}
                {v.direction && <div className="text-xs text-foreground">{v.direction}</div>}
                {v.colors?.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {v.colors.map((c, i) => (
                      <div
                        key={i}
                        className="h-4 w-4 rounded-full border border-border"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                )}
                {(v.image_style || v.lighting || v.composition) && (
                  <div className="mt-1 grid grid-cols-1 gap-0.5 text-[10px] text-muted-foreground">
                    {v.image_style && <div><b>Estilo:</b> {v.image_style}</div>}
                    {v.lighting && <div><b>Luz:</b> {v.lighting}</div>}
                    {v.composition && <div><b>Composição:</b> {v.composition}</div>}
                  </div>
                )}
                {v.things_to_avoid && (
                  <div className="mt-1 text-[10px] italic text-destructive/80">Evitar: {v.things_to_avoid}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Observações estratégicas */}
      {brain?.summary && (
        <Section icon={StickyNote} title="Observações Estratégicas">
          <div className="whitespace-pre-wrap text-xs">{brain.summary}</div>
        </Section>
      )}
    </div>
  );
}
