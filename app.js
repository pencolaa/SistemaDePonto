const GRADE_CONFIG = {
  manha: {
    titulo: "Manhã",
    horarios: ["07:40", "08:30", "09:20", "10:10", "11:00", "11:50"],
    tbodyId: "gradeManha",
  },
  tarde: {
    titulo: "Tarde",
    horarios: ["13:10", "14:00", "14:50", "15:40", "16:30", "17:20"],
    tbodyId: "gradeTarde",
  },
  noite: {
    titulo: "Noite",
    horarios: ["19:00", "19:50", "20:40", "21:30"],
    tbodyId: "gradeNoite",
  },
};

const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

let professores = [];

const elementos = {
  loginDiv: document.getElementById("loginDiv"),
  app: document.getElementById("app"),
  senhaInput: document.getElementById("senhaInput"),
  profSelect: document.getElementById("profSelect"),
  profRel: document.getElementById("profRel"),
  cadastroStatus: document.getElementById("cadastroStatus"),
  nome: document.getElementById("nome"),
  matricula: document.getElementById("matricula"),
  regime: document.getElementById("regime"),
  categoria: document.getElementById("categoria"),
  disciplinas: document.getElementById("disciplinas"),
  chs: document.getElementById("chs"),
  ha: document.getElementById("ha"),
  ead: document.getElementById("ead"),
  haeO: document.getElementById("haeO"),
  haeC: document.getElementById("haeC"),
  nomeAss2: document.getElementById("nomeAss2"),
  cargoAss2: document.getElementById("cargoAss2"),
  nomeAss3: document.getElementById("nomeAss3"),
  cargoAss3: document.getElementById("cargoAss3"),
  doc: document.getElementById("doc"),
};

function criarGradeVazia() {
  return Object.fromEntries(
    Object.entries(GRADE_CONFIG).map(([periodo, config]) => [
      periodo,
      Object.fromEntries(DIAS_SEMANA.map((dia) => [dia, Array(config.horarios.length).fill(false)])),
    ]),
  );
}

function normalizarGrade(grade) {
  const base = criarGradeVazia();

  if (!grade || typeof grade !== "object") {
    return base;
  }

  Object.entries(GRADE_CONFIG).forEach(([periodo, config]) => {
    DIAS_SEMANA.forEach((dia) => {
      const linha = grade?.[periodo]?.[dia];
      base[periodo][dia] = config.horarios.map((_, indice) => Boolean(linha?.[indice]));
    });
  });

  return base;
}

function criarGradeAPartirDosDias(diasPresenciais = []) {
  const grade = criarGradeVazia();
  const diasSet = new Set(diasPresenciais);

  Object.entries(GRADE_CONFIG).forEach(([periodo, config]) => {
    DIAS_SEMANA.forEach((dia) => {
      const chaveLegada = dia === "Sábado" ? dia : `${dia}-feira`;

      if (diasSet.has(dia) || diasSet.has(chaveLegada)) {
        grade[periodo][dia] = config.horarios.map(() => true);
      }
    });
  });

  return grade;
}

function montarGradeCadastro() {
  Object.entries(GRADE_CONFIG).forEach(([periodo, config]) => {
    const tbody = document.getElementById(config.tbodyId);

    tbody.innerHTML = DIAS_SEMANA.map((dia) => {
      const colunas = config.horarios
        .map(
          (horario, indice) => `
            <td>
              <label class="schedule-toggle">
                <input
                  type="checkbox"
                  data-periodo="${periodo}"
                  data-dia="${dia}"
                  data-indice="${indice}"
                  data-horario="${horario}"
                />
                <span>X</span>
              </label>
            </td>`,
        )
        .join("");

      return `<tr><th class="schedule-day">${dia}</th>${colunas}</tr>`;
    }).join("");
  });
}

async function apiFetch(url, options = {}) {
  let resposta;

  try {
    resposta = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (_erro) {
    throw new Error(
      "Nao foi possivel conectar ao servidor local. Inicie com 'npm start' e abra o sistema em http://localhost:3000.",
    );
  }

  if (!resposta.ok) {
    let mensagem = "Erro ao processar a requisicao.";

    try {
      const erro = await resposta.json();
      mensagem = erro.error || mensagem;
    } catch (_erro) {
      mensagem = resposta.statusText || mensagem;
    }

    throw new Error(mensagem);
  }

  return resposta.json();
}

function atualizarStatusCadastro(texto) {
  elementos.cadastroStatus.textContent = texto;
}

function obterGradeSelecionada() {
  const grade = criarGradeVazia();

  document.querySelectorAll("#gradeCadastro input[type='checkbox']").forEach((checkbox) => {
    const { periodo, dia, indice } = checkbox.dataset;
    grade[periodo][dia][Number(indice)] = checkbox.checked;
  });

  return grade;
}

function preencherGrade(grade) {
  const gradeNormalizada = normalizarGrade(grade);

  document.querySelectorAll("#gradeCadastro input[type='checkbox']").forEach((checkbox) => {
    const { periodo, dia, indice } = checkbox.dataset;
    checkbox.checked = Boolean(gradeNormalizada[periodo]?.[dia]?.[Number(indice)]);
  });
}

function resumirGrade(grade) {
  const linhas = [];

  Object.entries(GRADE_CONFIG).forEach(([periodo, config]) => {
    DIAS_SEMANA.forEach((dia) => {
      const horariosSelecionados = config.horarios.filter((_, indice) => grade[periodo][dia][indice]);

      if (horariosSelecionados.length > 0) {
        linhas.push(`${config.titulo}: ${dia} (${horariosSelecionados.join(", ")})`);
      }
    });
  });

  return linhas.length > 0 ? linhas.join(" | ") : "Nao informado";
}

function limparFormulario() {
  elementos.profSelect.value = "";
  elementos.nome.value = "";
  elementos.matricula.value = "";
  elementos.regime.value = "";
  elementos.categoria.value = "";
  elementos.disciplinas.value = "";
  elementos.chs.value = "";
  elementos.ha.value = "";
  elementos.ead.value = "";
  elementos.haeO.value = "";
  elementos.haeC.value = "";
  preencherGrade(criarGradeVazia());
  atualizarStatusCadastro("Novo cadastro");
}

function preencherFormulario(professor) {
  elementos.nome.value = professor.nome || "";
  elementos.matricula.value = professor.matricula || "";
  elementos.regime.value = professor.regime || "";
  elementos.categoria.value = professor.categoria || "";
  elementos.disciplinas.value = professor.disciplinas || "";
  elementos.chs.value = professor.chs || "";
  elementos.ha.value = professor.ha || "";
  elementos.ead.value = professor.ead || "";
  elementos.haeO.value = professor.haeO || "";
  elementos.haeC.value = professor.haeC || "";
  const gradeInicial =
    professor.gradeHoraria && Object.keys(professor.gradeHoraria).length > 0
      ? professor.gradeHoraria
      : criarGradeAPartirDosDias(professor.diasPresenciais || []);

  preencherGrade(gradeInicial);
}

function atualizarSelects() {
  elementos.profSelect.innerHTML = "<option value=''>Novo cadastro</option>";
  elementos.profRel.innerHTML = "<option value=''>Selecione um professor</option>";

  professores.forEach((professor) => {
    elementos.profSelect.add(new Option(professor.nome, professor.id));
    elementos.profRel.add(new Option(professor.nome, professor.id));
  });
}

async function carregarProfessores() {
  professores = await apiFetch("/api/professores");
  atualizarSelects();
}

async function login() {
  try {
    await apiFetch("/api/login", {
      method: "POST",
      body: JSON.stringify({
        password: elementos.senhaInput.value,
      }),
    });

    elementos.loginDiv.style.display = "none";
    elementos.app.classList.remove("hidden");
    await carregarProfessores();
  } catch (erro) {
    alert(erro.message);
  }
}

function carregar() {
  const professor = professores.find((item) => String(item.id) === elementos.profSelect.value);

  if (!professor) {
    limparFormulario();
    return;
  }

  preencherFormulario(professor);
  atualizarStatusCadastro("Editando cadastro");
}

async function excluirProfessor() {
  const id = elementos.profSelect.value;

  if (!id) {
    alert("Selecione um professor cadastrado para excluir.");
    return;
  }

  const professor = professores.find((item) => String(item.id) === String(id));
  const confirmarExclusao = window.confirm(
    `Deseja excluir o professor ${professor?.nome || ""}? Essa acao remove o cadastro do banco de dados.`,
  );

  if (!confirmarExclusao) {
    return;
  }

  try {
    await apiFetch(`/api/professores/${id}`, {
      method: "DELETE",
    });

    await carregarProfessores();
    limparFormulario();
    elementos.profRel.value = "";
    elementos.doc.innerHTML = `
      <div class="empty-state">
        Gere um documento para visualizar aqui a folha de frequência pronta.
      </div>
    `;
    alert("Professor excluido com sucesso.");
  } catch (erro) {
    alert(erro.message);
  }
}

async function salvar() {
  if (!elementos.nome.value.trim()) {
    alert("Preencha o nome do professor antes de salvar.");
    elementos.nome.focus();
    return;
  }

  const gradeHoraria = obterGradeSelecionada();

  const professor = {
    id: elementos.profSelect.value || undefined,
    nome: elementos.nome.value.trim(),
    matricula: elementos.matricula.value.trim(),
    regime: elementos.regime.value.trim(),
    categoria: elementos.categoria.value.trim(),
    disciplinas: elementos.disciplinas.value.trim(),
    chs: elementos.chs.value.trim(),
    ha: elementos.ha.value.trim(),
    ead: elementos.ead.value.trim(),
    haeO: elementos.haeO.value.trim(),
    haeC: elementos.haeC.value.trim(),
    gradeHoraria,
  };

  try {
    const salvo = await apiFetch("/api/professores", {
      method: "POST",
      body: JSON.stringify(professor),
    });

    await carregarProfessores();
    elementos.profSelect.value = String(salvo.id);
    elementos.profRel.value = String(salvo.id);
    preencherFormulario(salvo);
    atualizarStatusCadastro("Cadastro salvo");
    alert("Cadastro salvo com sucesso.");
  } catch (erro) {
    alert(erro.message);
  }
}

function escaparHtml(valor) {
  return String(valor || "").replace(/[&<>"']/g, (caractere) => {
    const mapa = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return mapa[caractere];
  });
}

function montarCabecalhoHorario(titulo, horarios) {
  return `<tr><th colspan="${horarios.length + 1}">${titulo}</th></tr>
    <tr><td class="small"><b>Aula</b></td>${horarios
      .map((hora) => `<td class="tiny">${hora}</td>`)
      .join("")}</tr>`;
}

function montarLinhasHorario(periodo, config, gradeHoraria) {
  return `${DIAS_SEMANA
    .map((dia) => {
      const colunas = config.horarios
        .map((_, indice) => `<td>${gradeHoraria[periodo][dia][indice] ? "X" : ""}</td>`)
        .join("");

      return `<tr><td class="left"><b>${dia}</b></td>${colunas}</tr>`;
    })
    .join("")}
    <tr><td class="small"><b>Horário de Aula</b></td>${"<td class='tiny'></td>".repeat(config.horarios.length)}</tr>
    <tr><td class="left"><b>Obs.</b></td>${"<td></td>".repeat(config.horarios.length)}</tr>`;
}

function blocoFrequencia(titulo, colunas, diasMes) {
  return `
    <table>
      <tr><th class="band" colspan="${colunas + 2}">${titulo}</th></tr>
      <tr>
        <th>Dia</th>
        <th>Assinatura</th>
        ${Array.from({ length: colunas }, (_, indice) => `<th>${indice + 1}ª</th>`).join("")}
      </tr>
      ${diasMes
        .map((dia) => {
          const domingo = [1, 8, 15, 22, 29].includes(dia);
          return `<tr class="${domingo ? "weekend" : ""}">
            <td>${String(dia).padStart(2, "0")}</td>
            <td class="left">${domingo ? "DOMINGO" : ""}</td>
            ${"<td class='line-cell'></td>".repeat(colunas)}
          </tr>`;
        })
        .join("")}
    </table>
  `;
}

function gerar() {
  const professor = professores.find((item) => String(item.id) === elementos.profRel.value);

  if (!professor) {
    alert("Selecione um professor para gerar o documento.");
    return;
  }

  const nomeAss2 = elementos.nomeAss2.value.trim();
  const cargoAss2 = elementos.cargoAss2.value.trim();
  const nomeAss3 = elementos.nomeAss3.value.trim();
  const cargoAss3 = elementos.cargoAss3.value.trim();
  const diasMes = Array.from({ length: 31 }, (_, indice) => indice + 1);
  const gradeBase =
    professor.gradeHoraria && Object.keys(professor.gradeHoraria).length > 0
      ? professor.gradeHoraria
      : criarGradeAPartirDosDias(professor.diasPresenciais || []);
  const gradeHoraria = normalizarGrade(gradeBase);
  const resumoGrade = resumirGrade(gradeHoraria);

  const html = `
    <div class="doc-layout">
      <div class="doc-page">
        <table>
          <tr>
            <td class="logo-cell" colspan="8">
              <div class="logo-wrap">
                <div>
                  <div class="cps-mark">cps</div>
                  <div class="cps-sub">Centro Paula<br />Souza</div>
                </div>
                <div class="gov-mark">
                  GOVERNO DO ESTADO<br />
                  <span style="font-size:18px;">SÃO PAULO</span>
                </div>
              </div>
            </td>
          </tr>
        </table>

        <table class="section">
          <tr>
            <td class="left"><b>FATEC:</b> FACULDADE DE TECNOLOGIA DE PRAIA GRANDE</td>
            <td class="left"><b>CIDADE:</b> PRAIA GRANDE</td>
            <td><b>Cód:</b> 128</td>
          </tr>
        </table>

        <table class="section">
          <tr>
            <td class="left"><b>PROF.:</b> ${escaparHtml(professor.nome)}</td>
            <td><b>MATRÍCULA:</b> ${escaparHtml(professor.matricula)}</td>
            <td><b>REGIME JURÍDICO:</b> CLT</td>
            <td><b>CATEGORIA:</b> ${escaparHtml(professor.categoria)}</td>
          </tr>
          <tr>
            <td class="left" colspan="2"><b>COMP. CURRICULARES:</b> ${escaparHtml(professor.disciplinas)}</td>
            <td class="left" colspan="2"><b>HAE-C / Coordenação:</b> ${escaparHtml(professor.haeC)}</td>
          </tr>
          <tr>
            <td class="left"><b>Carga horária semanal:</b> ${escaparHtml(professor.chs)}</td>
            <td><b>Hora atividade:</b> ${escaparHtml(professor.ha)}</td>
            <td><b>HAE-O:</b> ${escaparHtml(professor.haeO)}</td>
            <td><b>HAE-C:</b> ${escaparHtml(professor.haeC)}</td>
          </tr>
          <tr>
            <td class="left" colspan="4"><b>Horários cadastrados:</b> ${escaparHtml(resumoGrade)}</td>
          </tr>
        </table>

        <table class="section">
          <tr><th colspan="3" class="doc-title">GRADE HORÁRIA</th></tr>
          <tr>
            <td style="vertical-align:top;">
              <table>
                ${montarCabecalhoHorario("MANHÃ - HORÁRIO 07:40 às 13:00", GRADE_CONFIG.manha.horarios)}
                ${montarLinhasHorario("manha", GRADE_CONFIG.manha, gradeHoraria)}
              </table>
            </td>
            <td style="vertical-align:top;">
              <table>
                ${montarCabecalhoHorario("TARDE - HORÁRIO 13:10 às 18:20", GRADE_CONFIG.tarde.horarios)}
                ${montarLinhasHorario("tarde", GRADE_CONFIG.tarde, gradeHoraria)}
              </table>
            </td>
            <td style="vertical-align:top;">
              <table>
                ${montarCabecalhoHorario("NOITE - HORÁRIO 19:00 às 22:20", GRADE_CONFIG.noite.horarios)}
                ${montarLinhasHorario("noite", GRADE_CONFIG.noite, gradeHoraria)}
              </table>
            </td>
          </tr>
        </table>

        <table class="section">
          <tr>
            <th class="doc-title">FOLHA DE FREQUÊNCIA</th>
            <th class="doc-title">MÊS/ANO: ____ / ______</th>
          </tr>
        </table>

        <table class="section">
          <tr>
            <td style="vertical-align:top; width:33.33%;">${blocoFrequencia("MANHÃ", 6, diasMes)}</td>
            <td style="vertical-align:top; width:33.33%;">${blocoFrequencia("TARDE", 6, diasMes)}</td>
            <td style="vertical-align:top; width:33.33%;">${blocoFrequencia("NOITE", 4, diasMes)}</td>
          </tr>
        </table>

        <table class="section">
          <tr><th colspan="6">REPOSIÇÃO DE AULAS / R.I / SUBSTITUIÇÃO(S)</th></tr>
          <tr>
            <td><b>Hora Aula em Subst. ?</b></td>
            <td><b>Hora Aula</b></td>
            <td><b>Reposição</b></td>
            <td><b>Hora Aula c/ cálculo noturno</b></td>
            <td><b>Motivo</b></td>
            <td><b>Total mensal</b></td>
          </tr>
          <tr>
            ${"<td></td>".repeat(6)}
          </tr>
        </table>

        <table class="section">
          <tr>
            <td><b>Código</b></td>
            <td><b>CHS</b></td>
            <td><b>Código</b></td>
            <td><b>CHS</b></td>
            <td><b>Código</b></td>
            <td><b>CHS</b></td>
          </tr>
        </table>

        <table class="section">
          <tr>
            <td><b>A PARTIR DE</b> ____ / ____ / ______</td>
            <td><b>A PARTIR DE</b> ____ / ____ / ______</td>
            <td><b>A PARTIR DE</b> ____ / ____ / ______</td>
          </tr>
          <tr>
            <td style="vertical-align:top;">
              <table>
                ${montarCabecalhoHorario("MANHÃ - HORÁRIO", ["1ª", "2ª", "3ª", "4ª", "5ª", "6ª"])}
                ${montarLinhasHorario("manha", GRADE_CONFIG.manha, gradeHoraria)}
              </table>
            </td>
            <td style="vertical-align:top;">
              <table>
                ${montarCabecalhoHorario("TARDE - HORÁRIO", ["1ª", "2ª", "3ª", "4ª", "5ª", "6ª"])}
                ${montarLinhasHorario("tarde", GRADE_CONFIG.tarde, gradeHoraria)}
              </table>
            </td>
            <td style="vertical-align:top;">
              <table>
                ${montarCabecalhoHorario("NOITE - HORÁRIO", ["1ª", "2ª", "3ª", "4ª"])}
                ${montarLinhasHorario("noite", GRADE_CONFIG.noite, gradeHoraria)}
              </table>
            </td>
          </tr>
        </table>

        <table class="section">
          <tr>
            <th colspan="4">ALTERAÇÃO DA CARGA NO DECORRER DO MÊS A PARTIR DE ____ / ____ / ______</th>
          </tr>
          <tr>
            <td><b>Carga Horária Semanal:</b> ${escaparHtml(professor.chs)}</td>
            <td><b>Hora Atividade:</b> ${escaparHtml(professor.ha)}</td>
            <td><b>HAE-C (Coord):</b> ${escaparHtml(professor.haeC)}</td>
            <td><b>HAE-O (Projeto):</b> ${escaparHtml(professor.haeO)}</td>
          </tr>
        </table>

        <table class="section">
          <tr><th>LEGENDAS / RESUMO</th></tr>
          <tr>
            <td class="left">
              <b>F:</b> Falta médica &nbsp;&nbsp;
              <b>FA:</b> Falta abonada &nbsp;&nbsp;
              <b>R:</b> Reposição de aulas &nbsp;&nbsp;
              <b>S:</b> Substituição
            </td>
          </tr>
        </table>

        <table class="section">
          <tr><th>ASSINATURAS</th></tr>
          <tr>
            <td style="width:33.33%; padding-top:22px;">
              ___________________________<br />
              ${escaparHtml(professor.nome)}<br />
              Professor(a)
            </td>
            <td style="width:33.33%; padding-top:22px;">
              ___________________________<br />
              ${escaparHtml(nomeAss2)}<br />
              ${escaparHtml(cargoAss2)}
            </td>
            <td style="width:33.33%; padding-top:22px;">
              ___________________________<br />
              ${escaparHtml(nomeAss3)}<br />
              ${escaparHtml(cargoAss3)}
            </td>
          </tr>
        </table>

        <table class="section">
          <tr><th>OBSERVAÇÕES</th></tr>
          ${Array.from({ length: 8 }, () => "<tr><td class='obs-line'></td></tr>").join("")}
        </table>
      </div>

      <button class="btn-primary doc-print-button" onclick="window.print()">Imprimir</button>
    </div>
  `;

  elementos.doc.innerHTML = html;
}

montarGradeCadastro();
preencherGrade(criarGradeVazia());

elementos.senhaInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    login();
  }
});

window.login = login;
window.carregar = carregar;
window.salvar = salvar;
window.excluirProfessor = excluirProfessor;
window.gerar = gerar;
window.limparFormulario = limparFormulario;
