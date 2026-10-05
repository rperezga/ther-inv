# 🤖 PROMPT PARA HERMES EN EL SERVIDOR KALI

Copia y pega el siguiente prompt directamente en **Hermes** en tu servidor Kali Linux para que prepare el entorno, configure MongoDB, clone el repositorio y active el auto-deploy continuo mediante GitHub Webhook:

```text
Hola Hermes, necesito que configures y despliegues nuestra aplicación web "THER-INV" (Sistema de Invoices y Nómina Semanal) en este servidor Kali Linux, y configures el auto-deploy continuo cada vez que hagamos un commit/push a GitHub.

Por favor realiza las siguientes tareas de manera autónoma y confirma cada paso:

1. REQUISITOS DEL SISTEMA:
   - Verifica si Docker y Docker Compose están instalados en este servidor Kali. Si no lo están, instálalos usando apt (`apt update && apt install -y docker.io docker-compose`).
   - Asegúrate de que el servicio de Docker esté activo y habilitado en el arranque (`systemctl enable --now docker`).
   - Verifica si Git y curl están instalados.

2. CLONACIÓN DEL REPOSITORIO:
   - Por favor clona nuestro repositorio de GitHub en la ruta `/opt/ther-inv` (o `~/ther-inv` si prefieres).
   - [INSERTA AQUÍ TU REPOSITORIO DE GITHUB, ej: git clone https://github.com/TU_USUARIO/THER-INV.git /opt/ther-inv]
   - Entra en el directorio `/opt/ther-inv`.

3. VARIABLES DE ENTORNO (.env):
   - Crea el archivo `.env` dentro de la carpeta con las variables necesarias:
     MONGODB_URI=mongodb://mongodb:27017/ther_inv
     JWT_SECRET=genera_un_secreto_seguro_aqui_2026
     NEXT_PUBLIC_APP_URL=http://[IP_DE_ESTE_SERVIDOR_KALI]:3000
     ADMIN_EMAIL=roger@admin.com
     ADMIN_PASSWORD=admin123456
     ADMIN_NAME="Roger (Admin)"
     MANAGER_EMAIL=therina@agency.com
     MANAGER_PASSWORD=therina123456
     MANAGER_NAME="Therina"

4. DESPLIEGUE INICIAL CON DOCKER COMPOSE:
   - Ejecuta: `docker-compose up -d --build`
   - Verifica con `docker-compose ps` que los contenedores `ther_inv_app` y `ther_inv_mongo` estén en estado RUNNING (Up).
   - Ejecuta un curl a la API de inicialización para cargar a Therina, Roger y los trabajadores iniciales:
     `curl -X POST http://localhost:3000/api/seed`

5. CONFIGURACIÓN DEL AUTO-DEPLOY CON GITHUB:
   - Necesitamos que cada commit que subamos a GitHub active el re-despliegue automático de la aplicación.
   - Configura un Webhook Listener ligero (por ejemplo usando el paquete `webhook` de Debian/Kali o un script systemd de monitoreo/webhook en el puerto 9000):
     - Comando para instalar: `apt install -y webhook`
     - Configura el webhook para que al recibir la petición POST de GitHub en `http://[IP_KALI]:9000/hooks/deploy-ther-inv` ejecute el script `/opt/ther-inv/deploy.sh`.
     - Inicia y habilita el webhook como servicio de systemd (`systemctl enable --now webhook`).
   - Si no deseas abrir un puerto para el Webhook externo, configura un servicio cron o systemd timer que haga `git pull` y ejecute `deploy.sh` si detecta nuevos commits en la rama `main`.

6. REPORTE FINAL:
   - Indícame:
     a) La URL completa para acceder al sistema desde el navegador (http://[IP_KALI]:3000).
     b) La URL del Webhook para configurarla en los Webhooks de GitHub (Settings -> Webhooks).
     c) El estado de los contenedores Docker y MongoDB.
     d) Confirmación de que las credenciales de Therina y Roger están listas para ingresar.
```
