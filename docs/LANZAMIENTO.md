# Guía de lanzamiento — PaydayCal 🚀

Guía paso a paso para el dueño. El sitio ya está construido, verificado y subido a GitHub
(`github.com/joseangel2510/paycheck-calendar`).

> **Actualización 2026-07-03:** Pasos 1 y 2 COMPLETADOS — el sitio está vivo en https://paydaycal.com.
> Datos de AdSense verificados contra la documentación oficial de Google (julio 2026):
> - El **país de la cuenta AdSense es tu país de residencia** (donde recibes correo postal). Es PERMANENTE — elegir "United States" porque la audiencia es gringa es el error clásico y obliga a cerrar la cuenta.
> - Enviar el **formulario fiscal W-8BEN** apenas se abra la cuenta (Payments → Payments info → Manage settings → United States tax info). Con W-8BEN válido, la retención de EE.UU. para un publisher web fuera de EE.UU. es normalmente 0%; sin él, Google puede retener 24–30%.
> - **No aplicar el día 1**: dominio recién nacido + revisión = riesgo de "Low value content". Aplicar tras 2–3 semanas de indexación y promoción.
> - Tras la aprobación, activar en **Privacy & messaging** los DOS mensajes de consentimiento sin código: "European regulations" (obligatorio desde ene-2024 para visitas EEA/UK) y "US state regulations" (activar el toggle "All current and future supported US states").
> - Verificación del sitio: combo snippet en `<head>` + `ads.txt` (línea exacta: `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`).
> - Pagos: PIN postal al llegar a $10 (tarda ~3 semanas), umbral de cobro $100, transferencia a banco de TU país (~día 21 del mes siguiente).
> - Search Console: propiedad tipo **Dominio** (verificación TXT); luego importar el sitio a Bing en https://www.bing.com/webmasters (botón Import, 2 min).
> - **El dominio se compró en HOSTINGER** (nameservers dns-parking.com confirmados). Todos los registros DNS se agregan en hPanel: hpanel.hostinger.com → Domains → paydaycal.com → DNS / Nameservers.
> - Email de contacto: Hostinger NO regala forwarding con dominio solo (su email es de pago). Solución gratis: **ImprovMX** (improvmx.com, plan free-forever, solo recepción/reenvío) — agregar sus 2 registros MX + 1 TXT (SPF) en el DNS de Hostinger y contact@paydaycal.com reenvía al Gmail del dueño.

---

## Paso 1 — Desplegar en Vercel (gratis, ~5 minutos)

1. Entra a **vercel.com** y crea cuenta con el botón **"Continue with GitHub"** (usa tu cuenta joseangel2510).
2. En el dashboard: **Add New… → Project**.
3. En la lista de repositorios, busca **paycheck-calendar** y dale **Import**.
   - Si no aparece, clic en "Adjust GitHub App Permissions" y autoriza el repo.
4. Vercel detecta **Astro** automáticamente. No cambies nada. Clic en **Deploy**.
5. En ~1 minuto tendrás el sitio vivo en `paycheck-calendar-xxxx.vercel.app`. Pruébalo.

Desde ahora, **cada push a GitHub redespliega solo** — yo hago cambios, tú no tocas nada.

## Paso 2 — Comprar el dominio (~$10/año)

AdSense en la práctica **no aprueba** dominios `*.vercel.app`; necesitas dominio propio.

1. Ve a **porkbun.com** (o namecheap.com — cualquiera sirve).
2. Busca en este orden y compra el primero disponible: `paydaycal.com` → `mypaycheckcalendar.com` → `threepaycheckfinder.com`. (.com, ~$10-11/año; ignora los upsells, solo activa el WHOIS privacy que es gratis.)
3. En Vercel: tu proyecto → **Settings → Domains → Add**, escribe tu dominio.
4. Vercel te muestra 2 registros DNS (un A y un CNAME). En Porkbun: **DNS Records** del dominio → borra los que vienen y agrega esos 2.
5. Espera 5–30 min. Cuando Vercel muestre ✅, tu sitio está en tu dominio con HTTPS.

**⚠️ Avísame cuando tengas el dominio:** debo actualizar `SITE_URL` en `src/config.ts` (y el email de contacto) y hacer push. Es 1 minuto.

## Paso 3 — Google Search Console (para que Google te indexe YA)

1. Ve a **search.google.com/search-console** con tu cuenta de Google.
2. Add property → **Domain** → tu dominio. Verifica con el registro TXT que te da (se agrega en Porkbun DNS igual que en el paso 2.4).
3. Una vez verificado: **Sitemaps** → envía `https://tudominio.com/sitemap-index.xml`.
4. En **URL Inspection**, pega la home y dale "Request Indexing". Haz lo mismo con `/3-paycheck-months-2026/`.

## Paso 4 — Google AdSense (el dinero)

**Cuándo aplicar:** espera 2–4 semanas después del lanzamiento, cuando ya tengas algo de tráfico de la promoción (Paso 5). AdSense rechaza menos cuando el sitio muestra actividad. El sitio ya cumple todo lo demás: contenido original, Privacy Policy, Terms, About, Contact, navegación clara.

1. Ve a **adsense.google.com** → Get started → usa tu dominio.
2. AdSense te da un **código de verificación** (un `<script>` o un meta tag) → me lo pasas y lo agrego al sitio (1 push).
3. AdSense te da tu **Publisher ID** (`ca-pub-XXXXXXXXXXXXXXXX`) → me lo pasas:
   - Lo pongo en `ADSENSE_CLIENT_ID` en `src/config.ts` (los espacios de anuncio ya están construidos y se activan solos).
   - Actualizo `public/ads.txt` con la línea que AdSense te indique.
4. En AdSense: activa **Auto ads** para el sitio y en Privacy & messaging activa el **mensaje de consentimiento (GDPR/CCPA)** — es un interruptor, sin código.
5. Revisión: 1–14 días. Si rechazan (pasa ~30% de las veces la primera vez), leen el motivo, corregimos y reaplicamos — se puede reintentar ilimitadamente.

**Cobros:** configura tus datos de pago en AdSense; pagan a partir de $100 acumulados, por transferencia.

## Paso 5 — Promoción (las primeras visitas, semana 1)

El sitio está diseñado para esto: la **share card** descargable, el **calendario imprimible** y el dato del **31 de diciembre** que nadie más tiene.

**Reddit** (no hagas spam; aporta y enlaza como fuente):
- r/MiddleClassFinance, r/budget, r/povertyfinance (lee las reglas de cada uno primero)
- Formato que funciona: post útil tipo "PSA: October is a 3-paycheck month if you're on the Oct 2 schedule — here's how to check yours" y el link como herramienta, no como anuncio.
- r/personalfinance NO permite self-promo — ahí solo responde comentarios donde alguien pregunte por meses de 3 cheques, con el link si viene al caso.

**Pinterest** (el canal más natural para esto):
- Crea cuenta business gratis → pin del calendario imprimible + pin de "3 paycheck months 2026" con la share card.
- Los pines de "paycheck budget printables" son un nicho establecido — 2-3 pines/semana.

**TikTok** (si te animas — el formato probado):
- Video de 20s: pantalla del sitio + voz: "Did you know some months you get 3 paychecks? Enter your last payday… boom — mine are October and January". Hashtags: #paycheck #budgettok #personalfinance #3paycheckmonth
- El gancho del 31 de diciembre ("your January 1st check actually lands in December") es contenido que nadie más está haciendo.

**Momentos clave del calendario** (¡ya vienen!):
- **Finales de septiembre 2026:** octubre es mes de 3 cheques (familia B) → ola de búsquedas y prensa. Publica pines/posts esos días.
- **Octubre–noviembre 2026:** los medios aún no publican sus artículos "2027" → nuestras páginas 2027 ya están vivas desde hoy (ventaja).
- **Enero 2027:** pico anual de "3 paycheck months 2027" + enero es mes de 3 cheques (familia A).

## Paso 6 — Mantenimiento (casi cero)

- **Octubre de cada año:** me pides "agrega el año siguiente" → agrego las páginas del nuevo año (30 min) y el sitio se mantiene fresco cuando los medios abandonan sus artículos viejos.
- Nada más. No hay servidor, ni base de datos, ni dependencias que se rompan en producción.

## Expectativas honestas de ingresos

| Etapa | Tráfico mensual | Ingreso estimado AdSense |
|---|---|---|
| Mes 1–2 (promoción) | 500–3,000 visitas | $5–30 |
| Mes 3–6 (SEO arranca) | 3,000–15,000 | $30–150 |
| Mes 6–12 (posicionado + picos estacionales) | 15,000–50,000+ | $150–600+ |

Con RPM de finanzas personales ($8–20 por 1,000 visitas US). Los picos (enero, meses que califican) pueden duplicar el mes. No hay garantías — pero el plan del portafolio es exactamente este: 3 sitios como este sumando.

---

**Siguiente sitio del portafolio:** cuando esto esté desplegado y con AdSense en revisión, arrancamos el **#2: Mortgage Recast Calculator** (investigación ya hecha y guardada).
