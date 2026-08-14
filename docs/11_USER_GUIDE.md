# Guía de usuario — Plataforma de financiación de Abraham

Esta guía es para usar la plataforma sin conocimientos técnicos. Si algo no
funciona como se describe aquí, contactar a Abraham.

## Estado actual: red de pruebas (Sepolia), no la red final

Esta guía describe la plataforma **tal como funciona hoy, en la red de
pruebas Sepolia** — no la versión final de producción. Mientras el proyecto
no se despliegue en la red definitiva (Base, ver `04_STATUS.md`), el ETH que
se usa aquí **no tiene valor real**, es solo para probar que todo funciona
correctamente antes de mover dinero de verdad. Cuando exista el despliegue
final, esta guía se actualizará con la dirección del contrato y los enlaces
reales.

## Qué es esto, en una frase

Una plataforma para crear campañas de financiación colectiva donde el dinero
aportado queda guardado en un contrato inteligente (código público en la
blockchain), no en una cuenta bancaria ni en manos de una persona — nadie,
ni siquiera el equipo que construyó esto, puede tocar esos fondos salvo
según las reglas ya fijadas de antemano (ver "Cómo protege esto tu dinero"
más abajo).

## Antes de empezar

1. **Instalar una wallet.** Se recomienda [MetaMask](https://metamask.io)
   (extensión de navegador o app móvil). Es gratis y es donde vas a guardar
   tu ETH y firmar tus transacciones.
2. **Conseguir ETH de prueba (Sepolia).** Mientras la plataforma esté en la
   red de pruebas, el ETH que necesitás es gratuito, se pide en un "faucet"
   (grifo) como `sepoliafaucet.com` o el faucet oficial de Google Cloud para
   Sepolia. No uses dinero real para esto.
3. **Configurar MetaMask en la red Sepolia.** MetaMask ya trae Sepolia entre
   sus redes de prueba disponibles (activar "mostrar redes de prueba" en
   Configuración → Avanzado si no aparece).

## 1. Conectar tu wallet

Al entrar al sitio, buscá el botón **"Connect wallet"** en la parte superior.
MetaMask te va a pedir confirmar la conexión — revisá que el sitio sea el
correcto y aceptá. Si tu wallet está en una red distinta a Sepolia, el sitio
te va a avisar y pedirte que cambies de red.

## 2. Crear un proyecto (campaña)

1. Hacé clic en **"+ Nuevo proyecto"**.
2. Completá: título, descripción, una imagen (opcional) y un documento
   adjunto (opcional, PDF o texto — por ejemplo un plan de negocio).
3. Definí la **meta** en ETH: el monto mínimo que necesitás recaudar para
   poder retirar los fondos.
4. Confirmá la transacción en tu wallet. Esto tiene un pequeño costo de "gas"
   (la comisión de la red, no un cobro de la plataforma) — en Sepolia es
   gratis porque el ETH de prueba no vale dinero real.

**Importante:** este proyecto **no tiene fecha límite**. Sigue aceptando
aportes indefinidamente, incluso después de llegar a la meta, hasta que vos
mismo decidas retirar los fondos ("Claim funds"). Ver la sección de
advertencias más abajo sobre qué significa esto en la práctica.

## 3. Aportar a un proyecto (pledge)

1. Entrá al detalle del proyecto que te interesa.
2. Ingresá el monto en ETH que querés aportar y confirmá en tu wallet.
3. Tu aporte queda registrado en el contrato — podés ver el progreso de la
   meta actualizarse en la barra de la página del proyecto.

## 4. Retirar los fondos como creador (Claim funds)

El botón **"Claim funds"** solo aparece si:
- Sos el creador del proyecto, y
- Se alcanzó la meta (o se superó), y
- Todavía no retiraste los fondos antes.

Al confirmar, el total recaudado se transfiere a tu wallet en una sola
transacción. Una vez que retirás, el proyecto queda cerrado: ya no acepta
nuevos aportes.

## 5. Pedir un reembolso (Request refund)

Si aportaste a un proyecto y te arrepentís, podés pedir tu reembolso **en
cualquier momento**, siempre que el creador todavía no haya retirado los
fondos (no hace falta esperar a que "falle" la campaña — es tu decisión).
El botón **"Request refund"** aparece automáticamente en el detalle del
proyecto si tenés un aporte activo ahí.

## 6. Eliminar un proyecto (Delete project)

Como creador, podés eliminar un proyecto propio si:
- todavía nadie aportó nada, o
- ya retiraste los fondos (`Claim funds` ya hecho).

Si hay aportes sin reclamar, la plataforma **no permite** eliminarlo — así
se garantiza que nadie pierda la posibilidad de pedir su reembolso.

## Cómo protege esto tu dinero

- El contrato guarda los fondos, no una persona ni una empresa. Ni Abraham
  ni Claudio pueden mover, congelar o retirar el dinero de otro proyecto.
- Siempre existe una salida: mientras no se reclamó, cualquiera que aportó
  puede pedir su reembolso cuando quiera.
- Todo queda registrado públicamente en la blockchain — cualquiera puede
  verificar los aportes y retiros de un proyecto de forma independiente.

## Advertencias importantes (leer antes de usar dinero real)

- **Este contrato no tiene "botón de pausa" ni forma de revertir una
  transacción.** Es una decisión de seguridad deliberada (para que nadie,
  ni el propio equipo, pueda bloquear los fondos), pero también significa
  que si alguna vez se encuentra un error crítico después de lanzar en la
  red definitiva, no hay forma de "congelar" el contrato mientras se
  soluciona — la única protección real es que vos mismo pidas tu reembolso
  a tiempo. El sitio muestra este aviso en el formulario de crear proyecto y
  de aportar.
- **No hay fecha límite.** Un proyecto sigue vivo indefinidamente hasta que
  el creador retira los fondos. Si aportaste a un proyecto y pasó mucho
  tiempo sin actividad nueva, el sitio te va a mostrar un aviso — pero el
  reembolso siempre está disponible, tengas o no ese aviso.
- **Las transacciones son irreversibles.** Una vez confirmada una operación
  en tu wallet, no se puede deshacer. Revisá bien los montos antes de
  confirmar.

## ¿Dónde pedir ayuda?

Contactar a Abraham por el canal ya acordado. Si el problema es sobre una
transacción específica, tener a mano el "hash" de la transacción (aparece
en pantalla tras confirmar) ayuda mucho a diagnosticar más rápido.
