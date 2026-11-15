# Contributing to SyncroWalk 🪐

First off, thank you for considering contributing to **SyncroWalk**! Open-source collaboration is at the heart of space exploration and scientific discovery.

This project was built for the **NASA Space Apps Challenge** (*Interplanetary Survival Guide: Martian Map*), addressing multi-role EVA mission planning and decision support for human crews on Mars.

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
- **Suggest Features:** Have ideas for Martian GIS layers, astronaut view ergonomics, or EVA safety models? Open a feature request issue!
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

Requirements: **Node.js 20.19+** (or 22.12+) and npm. No backend is needed.

```bash
npm install
```

### 3. Running Locally

```bash
npm run dev
```

The app starts at `http://localhost:5173`.

> THEMIS temperature files and Perseverance waypoints are loaded through the Vite proxy defined in `vite.config.ts`. Always test with `npm run dev` or `npm run preview`, not by opening the built files directly.

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
- **One persistent map:** the Leaflet map instance must survive role switches (`Scientist` ↔ `Mission Control` ↔ `Astronaut`).
- **Safety first:** terrain that has not been evaluated is shown in amber, never as safe, and a NO-GO plan must never reach the crew.
- **Provenance:** every map layer states its instrument and spatial resolution.
- **Honest data:** real NASA data and illustrative demo values must always be distinguishable.
- **Astronaut view:** keep it essential and readable at a glance, with no spectral or planning clutter.

---

## 📝 Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` A new feature (e.g., `feat: add THEMIS thermal inertia overlay`)
- `fix:` A bug fix (e.g., `fix: correct THEMIS row range over Jezero`)
- `docs:` Documentation changes (e.g., `docs: update setup guide in README`)
- `style:` Formatting changes that do not affect code logic
- `refactor:` Code restructuring without adding features or fixing bugs
- `test:` Adding or updating tests
- `chore:` Maintenance tasks, dependency updates, configuration tweaks

---

## 🚀 Submitting a Pull Request

1. Ensure the build and the linter pass (`npm run build` and `npm run lint`).
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
