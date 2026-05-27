# DEMO_GUIDE — Cepelin KAM CRM

Internal demo guide for Key Account Managers and evaluators. Each company tells a specific story that exercises a different feature of the CRM.

---

## How to Run the Demo

1. Apply migrations `0007` and `0008` in Supabase SQL editor
2. Run `SEED_RESET=true SEED_KAM_EMAIL=your@email.com pnpm seed`
3. Log in at the live URL; your email triggers `provision_demo_kam()` automatically
4. Click "Actualizar scores" to generate AI health scores for all 15 companies

---

## Company Stories

### 🔴 GESTIONAR HOY

---

#### 1. Constructora Andes Ltda. (CL · Activa)

**Story:** Three `entregada_receptor` invoices are over 20 days old without acuse de recibo, which risks losing mérito ejecutivo. One Falabella invoice already has acuse de recibo — ready to factor. Two large invoices were previously lost to a competitor.

**Urgency:** 🔴 — `has_stale_entregada = true` (entregada_receptor > 15 days)

**Invoice states:**
- 1 × `acuse_recibo` — Falabella, CLP 34M — **ready to factor now**
- 3 × `entregada_receptor` — Cencosud/Sodimac/Walmart, CLP 19–28M — **at risk, must get acuse**
- 2 × `cedida_competencia` — lost volume

**Demo talking points:**
- _"Esta empresa tiene mérito ejecutivo en la factura de Falabella — podemos cederla hoy."_
- _"Las tres facturas de Cencosud, Sodimac y Walmart llevan más de 20 días sin acuse. Si el deudor no acusa antes de cumplir 8 días desde la entrega, perdemos el mérito ejecutivo."_
- _"El contexto de noticias muestra que Falabella ha reducido compras a proveedores de construcción — hay que apurar el acuse."_

**AI signals:** High churn risk due to stale invoices, competitor volume, inactive followup date

---

#### 2. Textil Sudamericana Ltda. (CL · Activa)

**Story:** Cencosud disputed a CLP 38M invoice within 8 days, triggering `reclamada` status. The invoice cannot be factored. Client has been silent for 45 days.

**Urgency:** 🔴 — `has_reclamada = true`

**Invoice states:**
- 1 × `reclamada` — Cencosud, CLP 38M — **cannot factor, investigate**
- 3 × `cobrada` — healthy history, now inactive

**Demo talking points:**
- _"Cencosud reclamó la factura por error en la descripción. El cliente está tramitando nota de crédito pero no responde hace 3 semanas."_
- _"Una vez resuelta la NC, el cliente puede volver a operar. El riesgo real es que se vaya a la competencia durante el silencio."_
- _"45 días sin nueva operación + factura reclamada = acción hoy."_

**AI signals:** `has_reclamada`, 45 days since last op, high churn risk

---

#### 3. Grupo Industrial Magallanes S.A. (CL · Recurrente)

**Story:** A CLP 95M Codelco invoice went to judicial proceedings (`protestada`). Client stopped responding 60 days ago.

**Urgency:** 🔴 — `churn_risk = high`, `days_since_last_op > 30`

**Invoice states:**
- 1 × `protestada` — Codelco, CLP 95M — **in judicial proceedings**
- 2 × `cobrada` — old healthy history

**Demo talking points:**
- _"Este era un cliente recurrente con CLP 45M+ en cesiones históricas. La factura protestada de Codelco es un evento grave."_
- _"60 días sin respuesta. Necesitamos evaluar si continuar la relación o escalar a recuperaciones."_
- _"El contexto de noticias indica que Codelco está revisando contratos en la región — el riesgo del cliente es sistémico."_

**AI signals:** `protestada`, 60 days inactive, high churn risk, news context negative

---

#### 4. Grupo Cemento del Norte (MX · Activa)

**Story:** Three `vigente` CFDIs have not been assigned after 35+ days. Client read WhatsApp messages but didn't reply. The construction sector in northern Mexico is contracting.

**Urgency:** 🔴 — overdue followup date + `days_since_last_op > 30`

**Invoice states:**
- 3 × `vigente` — Cemex, CLP ~740–920k — **ready to propose, not yet assigned**
- 1 × `cobrada` — old history

**Demo talking points:**
- _"El cliente tiene tres CFDIs válidos listos para ceder pero no nos ha contactado en 35 días."_
- _"El sector construcción en el norte de México está en contracción — hay que llamar antes de que el cliente decida no operar."_
- _"En México, el CFDI vigente es el equivalente al DTE emitido en Chile — aún no tiene mérito ejecutivo, por eso la urgencia."_

---

#### 5. Transportes Pacífico MX (MX · Activa)

**Story:** Two Walmart México CFDIs were cancelled by the debtor (`cancelada`). Client is frustrated. Overdue followup.

**Urgency:** 🔴 — overdue followup + `churn_risk = high`

**Invoice states:**
- 2 × `cancelada` — Walmart México — **CFDI cancelled, cannot factor**
- 2 × `cobrada` — old history

**Demo talking points:**
- _"Walmart MX canceló dos CFDIs por disputa de servicio. El cliente no puede ceder estas facturas."_
- _"El cliente está frustrado. La prioridad es hacer una llamada de contención y ver si hay otras facturas de FEMSA disponibles."_
- _"En México, una factura cancelada no se puede recuperar para factoring. Hay que esperar nuevos CFDIs."_

---

### 🟡 GESTIONAR ESTA SEMANA

---

#### 6. Sociedad Agrícola del Norte S.A. (CL · Recurrente)

**Story:** Excellent client with 100% Xepelin SOW. Upcoming followup in 3 days for monthly review and line increase evaluation.

**Urgency:** 🟡 — followup date within 7 days

**Invoice states:**
- 3 × `cedida_xepelin` — active healthy volume
- 1 × `en_cobranza`
- 2 × `cobrada`

**Demo talking points:**
- _"Cliente ancla. Reunión de revisión mensual en 3 días. Venir preparado con propuesta de aumento de línea."_
- _"100% de SOW en Xepelin. Este cliente no cede nada a la competencia."_
- _"El contexto indica nuevos contratos con Walmart Chile para Q3 — hay crecimiento de volumen esperado."_

---

#### 7. Importadora Tecnológica S.A. (CL · Activa)

**Story:** Only 17% SOW — 5 of 6 invoices go to BancoEstado Factoring. Rate comparison meeting coming this week.

**Urgency:** 🟡 — `sow_percentage < 40`

**Invoice states:**
- 1 × `cedida_xepelin` — only Xepelin invoice
- 5 × `cedida_competencia` — competitor (BancoEstado)

**Demo talking points:**
- _"El cliente cedió el 83% de su volumen a BancoEstado en los últimos meses."_
- _"Reunión de comparativa de tasas agendada para la próxima semana. Preparar propuesta para facturas de Cencosud y Falabella."_
- _"Si no actuamos ahora, este cliente se irá por completo."_

---

#### 8. Alimentos del Sur Ltda. (CL · Activa)

**Story:** Falabella invoice with `acuse_recibo` is ready to factor. Walmart invoices went to competitor twice. Meeting coming in 4 days.

**Urgency:** 🟡 — followup within 7 days

**Invoice states:**
- 1 × `acuse_recibo` — Falabella, CLP 33M — **ready to factor**
- 2 × `cedida_competencia` — Walmart lost

**Demo talking points:**
- _"La factura de Falabella tiene acuse de recibo — mérito ejecutivo confirmado. Es el momento de proponer la cesión."_
- _"Walmart Chile se cedió a la competencia dos veces. Hay que entender por qué y diferenciarse para la próxima."_

---

#### 9. Distribuidora El Pacífico S.A. (CL · Recurrente)

**Story:** Two invoices with `merito_ejecutivo` (irrevocably accepted) are ready for immediate factoring. Followup in 6 days.

**Urgency:** 🟡 — followup within 7 days

**Invoice states:**
- 2 × `merito_ejecutivo` — Sodimac + Falabella — **irrevocably accepted, safe to factor**
- 2 × `cedida_xepelin` — active volume
- 1 × `cobrada`

**Demo talking points:**
- _"Mérito ejecutivo es la situación ideal: el deudor ya no puede reclamar la factura. Estos documentos son los más seguros para factorizar."_
- _"Este cliente tiene 8 días sin reclamo del deudor en dos facturas — son activos de bajo riesgo."_

---

#### 10. Comercializadora Azteca (MX · Activa)

**Story:** Low SOW in MX. FEMSA volume (80%) all goes to competitor. Rate comparison coming.

**Urgency:** 🟡 — `sow_percentage < 40`

**Invoice states:**
- 1 × `cedida_mx` — Arca Continental
- 3 × `cedida_competencia` — FEMSA all to competitor

**Demo talking points:**
- _"En México, la operación equivalente al 'cedida a Xepelin' es cedida_mx vía el registro de cesión del SAT."_
- _"FEMSA tiene un programa de descuento por pronto pago que compite directamente con nosotros. Necesitamos propuesta diferenciada."_

---

### 🟢 AL DÍA

---

#### 11. Minera Atacama SpA (CL · Recurrente)

**Story:** Strategic anchor client. CLP 300M credit line. Weekly WhatsApp communication with CFO. Codelco and Antofagasta portfolio.

**Demo talking points:**
- _"Cliente estratégico de alta frecuencia. Nunca tocar la tasa sin aprobación de dirección."_
- _"Precio del cobre en máximo histórico — el cliente tiene más volumen para factorizar en el corto plazo."_

---

#### 12. Walmart México Proveedores (MX · Recurrente)

**Story:** Anchor MX client. Predictable monthly cycles with Walmart and FEMSA.

**Demo talking points:**
- _"El flujo operacional de este cliente es completamente predecible — ciclos mensuales con Walmart MX."_
- _"Explorar producto de línea rotativa para reducir fricciones en cada cesión."_

---

#### 13. Alimentos Tropicales S.A. (MX · Recurrente)

**Story:** Healthy MX client with Bimbo and FEMSA portfolio. Line increase opportunity for Q3.

**Demo talking points:**
- _"Grupo Bimbo y FEMSA son los deudores más seguros en MX. Riesgo crediticio muy bajo."_
- _"Proponer aumento de línea a MXN 4.5M antes de la temporada alta."_

---

### ⚪ SIN ACCIÓN

---

#### 14. Logística Nacional SpA (CL · Enrolada)

**Story:** Enrolled 90 days ago. Three `emitida` invoices (SII-unvalidated) exist but never operated with Xepelin. Needs first-operation onboarding.

**Demo talking points:**
- _"Las facturas están en estado 'emitida' — el SII aún no las ha validado. Hasta que no estén 'aceptada_sii' como mínimo, no podemos cederlas."_
- _"Necesita guía para completar el ciclo DTE antes de su primera operación."_

---

#### 15. Empresa de Servicios Técnicos S.A. (CL · Enrolada)

**Story:** Enrolled 45 days ago. No invoices at all. Needs DTE onboarding from scratch.

**Demo talking points:**
- _"Cliente enrolado pero sin ninguna factura. Coordinar capacitación de primer DTE con el equipo de onboarding."_

---

## SII Invoice Lifecycle Cheat Sheet (CL)

| Status | Meaning | Can factor? |
|---|---|---|
| `emitida` | DTE sent to SII, not yet validated | ❌ |
| `aceptada_sii` | SII validated the document | ❌ (debtor must receive) |
| `entregada_receptor` | Debtor received, awaiting acknowledgment | ⚠️ (8-day clock starts) |
| `acuse_recibo` | Debtor confirmed receipt → mérito ejecutivo | ✅ |
| `reclamada` | Debtor disputed within 8 days | ❌ |
| `merito_ejecutivo` | 8+ days, no dispute — irrevocably accepted | ✅✅ (safest) |
| `cedida_xepelin` | Assigned to Xepelin via SII RTC | ✅ (in portfolio) |
| `cedida_competencia` | Assigned to another factoring company | ❌ (lost) |
| `en_cobranza` | Xepelin collecting from debtor | — (active) |
| `cobrada` | Invoice paid | ✅ (completed) |
| `protestada` | In judicial proceedings | ❌ |

## SAT CFDI Lifecycle Cheat Sheet (MX)

| Status | Meaning | Can factor? |
|---|---|---|
| `vigente` | Valid CFDI, active before SAT | ✅ (propose to client) |
| `cedida_mx` | Assigned to Xepelin via SAT assignment | ✅ (in portfolio) |
| `cedida_competencia` | Assigned to another financial institution | ❌ (lost) |
| `en_cobranza` | Xepelin MX collecting | — (active) |
| `cobrada` | Paid | ✅ (completed) |
| `cancelada` | Cancelled by issuer — cannot factor | ❌ |

---

## Urgency Label Logic

| Label | Triggers |
|---|---|
| 🔴 Gestionar hoy | Overdue followup date, OR `churn_risk=high` + >30 days inactive, OR `has_reclamada`, OR `has_stale_entregada` |
| 🟡 Esta semana | Followup within 7 days, OR 15–30 days inactive, OR SOW < 40% |
| 🟢 Al día | Active client with no triggers above |
| ⚪ Sin acción | Enrolled, never operated |
