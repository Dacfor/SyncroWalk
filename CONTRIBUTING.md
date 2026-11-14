# Contributing to SyncroWalk 🪐

First off, thank you for considering contributing to **SyncroWalk**! Open-source collaboration is at the heart of space exploration and scientific discovery.

This project was built for the **NASA Space Apps Challenge** (*Interplanetary Survival Guide: Martian Map*), addressing rapid multi-role EVA mission planning and Bayesian decision support on Mars.

---

## 🧭 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Workflow](#development-workflow)
  - [1. Fork & Branch](#1-fork--branch)
  - [2. Environment Setup](#2-environment-setup)
  - [3. Running Locally](#3-running-locally)
- [Coding & Quality Standards](#coding--quality-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Submitting a Pull Request](#submitting-a-pull-request)

---

## 📜 Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment for everyone. Please be respectful, constructive, and open to feedback.

---

## 🛠️ How Can I Contribute?

- **Report Bugs:** Open an issue describing the bug, reproduction steps, expected behavior, and browser/OS details.
- **Suggest Features:** Have ideas for Martian GIS layers, astronaut HUD ergonomics, or Bayesian fusion models? Open a feature request issue!
- **Submit Pull Requests:** Bug fixes, documentation improvements, new NASA PDS data parsers, and UI enhancements are all welcome.

---

## 🔄 Development Workflow

### 1. Fork & Branch

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/SyncroWalk.git
   cd SyncroWalk
   ```
3. Create a descriptive feature branch (never work directly on `main`):
   ```bash
   # For new features
   git checkout -b feature/crism-posterior-layer

   # For personal dev branches
   git checkout -b dev_yourname

   # For bug fixes
   git checkout -b fix/elevation-range-parser
   ```

### 2. Environment Setup

* **Frontend:** Node.js ($\ge 18$) and npm.
  ```bash
  npm install
  ```

* **Backend Proxy (Optional):** Python ($\ge 3.10$).
  * **Windows:**
    ```powershell
    python -m venv .venv
    .\.venv\Scripts\Activate.ps1
    # Note: If PowerShell scripts are restricted, run:
    # Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    pip install -r requirements.txt
    ```
  * **macOS / Linux:**
    ```bash
    chmod +x setup_env.sh
    ./setup_env.sh
    ```

### 3. Running Locally

* **Frontend:**
  ```bash
  npm run dev
  ```
  App starts at `http://localhost:5173`.

* **Proxy (Optional):**
  ```bash
  uvicorn proxy:app --host 127.0.0.1 --port 8000 --reload
  # Or directly: .\.venv\Scripts\python -m uvicorn proxy:app --port 8000 --reload
  ```

---

## 📐 Coding & Quality Standards

Before committing, verify your changes pass all linters and compilation checks:

1. **Linting:**
   ```bash
   npm run lint
   ```
2. **Typecheck & Production Build:**
   ```bash
   npm run build
   ```
   Ensure the TypeScript compiler passes with **0 errors**.

### Design Principles:
- **Astronaut HUD:** Touch targets must remain glove-friendly ($\ge 64\text{ px}$) and readable in $<3\text{ seconds}$.
- **GIS Canvas:** The Leaflet map instance must remain persistent across role switches (`Scientist` $\leftrightarrow$ `Mission Control` $\leftrightarrow$ `Astronaut HUD`).
- **Telemetry & Badges:** Every planetary layer must clearly state its **Mission + Instrument + Spatial Resolution**.

---

## 📝 Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` A new feature (e.g., `feat: add THEMIS thermal inertia overlay`)
- `fix:` A bug fix (e.g., `fix: correct byte-range header forwarding in proxy`)
- `docs:` Documentation changes (e.g., `docs: update setup guide in README`)
- `style:` Formatting changes that do not affect code logic
- `refactor:` Code restructuring without adding features or fixing bugs
- `test:` Adding or updating tests
- `chore:` Maintenance tasks, dependency updates, configuration tweaks

---

## 🚀 Submitting a Pull Request

1. Ensure all tests and builds pass (`npm run build`).
2. Push your branch to your GitHub fork:
   ```bash
   git push origin <your-branch-name>
   ```
3. Open a Pull Request against the `main` branch of `Dacfor/SyncroWalk`.
4. Fill in the PR description template:
   - What does this PR do?
   - How did you test it?
   - Any screenshots or GIFs of UI changes.
5. Wait for review from project maintainers.

Thank you for helping astronauts navigate Mars safely! 🚀
