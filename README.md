# 📋 THER-INV | Sistema de Invoicing Semanal & Payroll para Agencia

Sistema moderno, seguro, privado y responsive diseñado para la gestión y emisión semanal de facturas (invoices) correspondientes a los ciclos de payroll de la agencia, con control de personal activo, invitaciones por roles (Admin, Therina/Manager, Viewer) y despliegue automatizado en servidor Kali Linux con Hermes.

---

## ✨ Características Principales

- **Gestión Semanal de Invoices**:
  - Creación rápida de facturas alineadas al ciclo de nómina semanal.
  - Selección de personal desde el directorio de la agencia con autocompletado de tarifas por hora y roles.
  - Cálculo instantáneo de horas regulares, horas extra, tarifas diferenciadas, subtotal, impuestos y total.
  - Impresión optimizada y exportación limpia a PDF con diseño profesional de agencia (`@media print`).
- **Control de Personal / Trabajadores**:
  - Directorio completo de profesionales de la salud y personal de apoyo (RN, PT, CNA, OT, LPN, SLP).
  - Tarifas por hora personalizadas, cargos, teléfonos, correos y notas operativas.
  - Filtros por estado activo / inactivo.
- **Seguridad y Privacidad por Roles**:
  - **Administrador (Roger)**: Control total del sistema, configuración, eliminación y gestión de usuarios.
  - **Principal Manager (Therina)**: Emisión y edición de facturas semanales, gestión de trabajadores y envío de invitaciones a nuevos miembros.
  - **Viewer (Observador)**: Acceso seguro de solo lectura a invoices y reportes.
- **Sistema de Invitaciones Seguras**:
  - Enlaces de invitación únicos con expiración y asignación de rol predeterminada.
- **Avanzada Estética Visual**:
  - Diseño con fondo claro ("light mode"), alto contraste, tipografía moderna (Plus Jakarta Sans & Inter), tarjetas limpias, micro-animaciones y badges de estado.
  - 100% Responsive para Smartphones, Tablets y Computadoras de Escritorio.

---

## 🛠️ Stack Tecnológico

- **Frontend & Backend**: Next.js 15 (App Router, Server API Routes, Standalone production).
- **Base de Datos**: MongoDB + Mongoose con pool de conexiones optimizado.
- **Estilos**: Vanilla CSS con variables de diseño, layout modular y hoja de estilos de impresión.
- **Autenticación**: JWT (JSON Web Tokens) con HTTP-only Cookies seguras y contraseñas cifradas con `bcryptjs`.
- **Despliegue & CI/CD**: Docker, Docker Compose, Bash Deploy Script y Webhook para Hermes en Kali Linux.

---

## 🚀 Inicio Rápido en Desarrollo Local

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Variables de Entorno**:
   El proyecto incluye un `.env.local` preconfigurado:
   ```env
   MONGODB_URI=mongodb://localhost:27017/ther_inv
   JWT_SECRET=super_secret_jwt_ther_inv_key_change_in_production_2026
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Iniciar Servidor de Desarrollo**:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🔑 Credenciales Iniciales Preconfiguradas

| Usuario | Rol | Correo Electrónico | Contraseña |
|---|---|---|---|
| **Therina** (Principal) | Manager | `therina@agency.com` | `therina123456` |
| **Roger** (Admin) | Admin | `roger@admin.com` | `admin123456` |

*(Nota: En la pantalla de login dispones de botones de acceso rápido de 1 clic para probar inmediatamente ambas cuentas).*

---

## 📦 Despliegue en Kali Linux con Hermes

Consulta el archivo [HERMES_PROMPT.md](file:///c:/Users/roger/Desktop/THER-INV/HERMES_PROMPT.md) para copiar y pegar el prompt listo para Hermes en tu servidor.
El archivo contiene todas las instrucciones paso a paso para que Hermes prepare Docker, levante MongoDB, configure el auto-deploy y vincule el Webhook de GitHub.
