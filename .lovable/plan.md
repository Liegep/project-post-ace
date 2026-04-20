

## Drag & Drop para Reagendar Compromissos

Vou adicionar arrastar-e-soltar na sua agenda pessoal para você reagendar compromissos rapidamente, sem precisar abrir o diálogo de edição.

### Como vai funcionar

**Visualização Mês**
- Arrasta um compromisso de um dia para outro dia da grade
- Solta no dia destino → a data é atualizada (horário preservado)
- Feedback visual: a célula do dia destino fica destacada enquanto você arrasta

**Visualização Semana**
- Arrasta um compromisso entre os 7 dias da semana
- Mesmo comportamento: nova data, mesmo horário

**Visualização Dia**
- Drag-and-drop não se aplica (apenas um dia visível) — fica como está

**Toque (mobile)**
- Pressionar e segurar (~250ms) ativa o arrasto, evitando conflito com scroll

### Detalhes de UX

- Cursor muda para "grab" ao passar sobre o card; "grabbing" ao arrastar
- Card fica semi-transparente (opacity 50%) durante o arrasto
- Dia destino ganha borda destacada (ring) enquanto o card paira sobre ele
- Atualização **otimista**: a UI move o compromisso instantaneamente; se o backend falhar, reverte e mostra toast
- Compromissos completados ou cancelados também podem ser arrastados (mantêm o estado)

### Detalhes técnicos

- Biblioteca: `@dnd-kit/core` (já usada no projeto, ex: `ClientLinksPanel`, kanban). Sem dependência nova.
- Sensores: `PointerSensor` (distância 5px) + `TouchSensor` (delay 250ms, tolerance 5px)
- Estrutura:
  - `DndContext` envolve `MonthView` e `DayListView` (semana)
  - Cada card de compromisso vira `useDraggable` com `id = appointment.id`
  - Cada célula de dia vira `useDroppable` com `id = "yyyy-MM-dd"`
  - `onDragEnd`: extrai o `id` do droppable, chama `updateAppointment(appointmentId, { appointmentDate: newDate })`
- `updateAppointment` já existe em `useAppointments.ts` e faz update otimista + persiste no Supabase

### Fora do escopo (posso fazer depois se quiser)

- Arrastar para mudar **horário** (exigiria visualização com timeline horária)
- Duplicar com Alt+drag (copiar em vez de mover)
- Arrastar séries recorrentes inteiras (hoje cada ocorrência é uma linha independente)

### Arquivos afetados

- `src/pages/AgendaPage.tsx` — envolve as views em `DndContext`, adiciona handler `onDragEnd`
- Componentes internos `MonthView` e `DayListView` (mesmo arquivo) — cards viram draggable, células viram droppable

