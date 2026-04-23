const path = require("path");
const express = require("express");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, "database.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS professores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    matricula TEXT DEFAULT '',
    regime TEXT DEFAULT '',
    categoria TEXT DEFAULT '',
    disciplinas TEXT DEFAULT '',
    chs TEXT DEFAULT '',
    ha TEXT DEFAULT '',
    ead TEXT DEFAULT '',
    hae_o TEXT DEFAULT '',
    hae_c TEXT DEFAULT '',
    dias_presenciais TEXT DEFAULT '[]',
    grade_horaria TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

const colunasProfessores = db.prepare("PRAGMA table_info(professores)").all();
const temGradeHoraria = colunasProfessores.some((coluna) => coluna.name === "grade_horaria");

if (!temGradeHoraria) {
  db.exec("ALTER TABLE professores ADD COLUMN grade_horaria TEXT DEFAULT '{}'");
}

const adminExiste = db.prepare("SELECT id FROM admins WHERE username = ?").get("admin");

if (!adminExiste) {
  db.prepare("INSERT INTO admins (username, password) VALUES (?, ?)").run("admin", "1234");
}

const listarProfessores = db.prepare(`
  SELECT
    id,
    nome,
    matricula,
    regime,
    categoria,
    disciplinas,
    chs,
    ha,
    ead,
    hae_o,
    hae_c,
    dias_presenciais,
    grade_horaria
  FROM professores
  ORDER BY nome COLLATE NOCASE
`);

const buscarProfessor = db.prepare(`
  SELECT
    id,
    nome,
    matricula,
    regime,
    categoria,
    disciplinas,
    chs,
    ha,
    ead,
    hae_o,
    hae_c,
    dias_presenciais,
    grade_horaria
  FROM professores
  WHERE id = ?
`);

const inserirProfessor = db.prepare(`
  INSERT INTO professores (
    nome,
    matricula,
    regime,
    categoria,
    disciplinas,
    chs,
    ha,
    ead,
    hae_o,
    hae_c,
    dias_presenciais,
    grade_horaria,
    updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
`);

const atualizarProfessor = db.prepare(`
  UPDATE professores
  SET
    nome = ?,
    matricula = ?,
    regime = ?,
    categoria = ?,
    disciplinas = ?,
    chs = ?,
    ha = ?,
    ead = ?,
    hae_o = ?,
    hae_c = ?,
    dias_presenciais = ?,
    grade_horaria = ?,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

const excluirProfessor = db.prepare(`
  DELETE FROM professores
  WHERE id = ?
`);

function mapearProfessorBanco(professor) {
  let gradeHoraria = {};

  try {
    gradeHoraria = JSON.parse(professor.grade_horaria || "{}");
  } catch (_erro) {
    gradeHoraria = {};
  }

  return {
    id: String(professor.id),
    nome: professor.nome,
    matricula: professor.matricula || "",
    regime: professor.regime || "",
    categoria: professor.categoria || "",
    disciplinas: professor.disciplinas || "",
    chs: professor.chs || "",
    ha: professor.ha || "",
    ead: professor.ead || "",
    haeO: professor.hae_o || "",
    haeC: professor.hae_c || "",
    diasPresenciais: JSON.parse(professor.dias_presenciais || "[]"),
    gradeHoraria,
  };
}

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "tabela.html"));
});

app.get("/api/status", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/login", (req, res) => {
  const password = String(req.body?.password || "");
  const admin = db.prepare("SELECT id FROM admins WHERE username = ? AND password = ?").get("admin", password);

  if (!admin) {
    res.status(401).json({ error: "Senha incorreta." });
    return;
  }

  res.json({ ok: true, username: "admin" });
});

app.get("/api/professores", (_req, res) => {
  const professores = listarProfessores.all().map(mapearProfessorBanco);
  res.json(professores);
});

app.get("/api/professores/:id", (req, res) => {
  const professor = buscarProfessor.get(req.params.id);

  if (!professor) {
    res.status(404).json({ error: "Professor nao encontrado." });
    return;
  }

  res.json(mapearProfessorBanco(professor));
});

app.delete("/api/professores/:id", (req, res) => {
  const professor = buscarProfessor.get(req.params.id);

  if (!professor) {
    res.status(404).json({ error: "Professor nao encontrado para exclusao." });
    return;
  }

  excluirProfessor.run(req.params.id);
  res.json({ ok: true });
});

app.post("/api/professores", (req, res) => {
  const dados = req.body || {};
  const nome = String(dados.nome || "").trim();

  if (!nome) {
    res.status(400).json({ error: "O nome do professor e obrigatorio." });
    return;
  }

  const professor = {
    nome,
    matricula: String(dados.matricula || "").trim(),
    regime: String(dados.regime || "").trim(),
    categoria: String(dados.categoria || "").trim(),
    disciplinas: String(dados.disciplinas || "").trim(),
    chs: String(dados.chs || "").trim(),
    ha: String(dados.ha || "").trim(),
    ead: String(dados.ead || "").trim(),
    haeO: String(dados.haeO || "").trim(),
    haeC: String(dados.haeC || "").trim(),
    gradeHoraria: dados.gradeHoraria && typeof dados.gradeHoraria === "object" ? dados.gradeHoraria : {},
  };

  const diasPresenciais = Object.entries(professor.gradeHoraria)
    .flatMap(([, dias]) => Object.entries(dias || {}))
    .filter(([, horarios]) => Array.isArray(horarios) && horarios.some(Boolean))
    .map(([dia]) => dia)
    .filter((dia, indice, lista) => lista.indexOf(dia) === indice);

  let id = dados.id ? Number(dados.id) : null;

  if (id) {
    const existe = buscarProfessor.get(id);

    if (!existe) {
      res.status(404).json({ error: "Professor nao encontrado para edicao." });
      return;
    }

    atualizarProfessor.run(
      professor.nome,
      professor.matricula,
      professor.regime,
      professor.categoria,
      professor.disciplinas,
      professor.chs,
      professor.ha,
      professor.ead,
      professor.haeO,
      professor.haeC,
      JSON.stringify(diasPresenciais),
      JSON.stringify(professor.gradeHoraria),
      id,
    );
  } else {
    const resultado = inserirProfessor.run(
      professor.nome,
      professor.matricula,
      professor.regime,
      professor.categoria,
      professor.disciplinas,
      professor.chs,
      professor.ha,
      professor.ead,
      professor.haeO,
      professor.haeC,
      JSON.stringify(diasPresenciais),
      JSON.stringify(professor.gradeHoraria),
    );

    id = resultado.lastInsertRowid;
  }

  const salvo = buscarProfessor.get(id);
  res.json(mapearProfessorBanco(salvo));
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado em http://localhost:${PORT}`);
  console.log(`Banco local em ${dbPath}`);
  console.log("Login admin padrao: senha 1234");
});
