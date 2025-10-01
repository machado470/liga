# ⚽ Liga da Firma 2025

Aplicação web completa para organizar e gerenciar campeonatos internos de futebol entre amigos, empresas ou times amadores.  
Inclui **gestão de atletas, escalação tática, registro de partidas, calendário com histórico, ranking automático e estatísticas.**

---

## 🚀 Funcionalidades principais

- 🧑‍🦱 **Cadastro de atletas** — adicione e gerencie jogadores rapidamente.
- 📋 **Campo tático interativo** — visualize as formações em estilo videogame.
- 🗒️ **Registro de partidas** — salve resultados com placares e observações.
- 📅 **Calendário inteligente** — acompanhe o histórico de jogos por data.
- 📊 **Ranking automático** — calcula estatísticas completas por atleta.
- 📈 **Gráficos e projeções** *(em breve)* — evolução de desempenho e pontos.
- 🏆 **Modo histórico anual** *(em breve)* — ranking global por temporada.

---

## 🧱 Estrutura do projeto

liga-da-firma-2025/
│
├─ 📁 public/ # arquivos estáticos que vão pro navegador
│ ├─ index.html # HTML raiz minimalista
│ └─ 📁 assets/
│ └─ styles.css # estilos globais do tema
│
├─ 📁 src/ # código-fonte modular
│ ├─ main.js # ponto de entrada do app
│ │
│ ├─ 📁 core/ # utilitários base
│ │ ├─ dom.js # seletores, delegação e helpers de UI
│ │ ├─ format.js # datas, placares e percentuais
│ │ ├─ math.js # estatísticas e cálculos de pontuação
│ │ ├─ storage.js # persistência com localStorage
│ │ └─ config.js # chaves globais e constantes
│ │
│ ├─ 📁 modules/ # lógica de cada área do sistema
│ │ ├─ athletes.js # atletas e elencos
│ │ ├─ pitch.js # campo tático
│ │ ├─ matches.js # registro de partidas
│ │ ├─ calendar.js # calendário e histórico
│ │ ├─ ranking.js # ranking e estatísticas
│ │ └─ router.js # roteador de páginas
│ │
│ ├─ 📁 ui/ # componentes visuais reutilizáveis
│ │ ├─ toast.js # notificações
│ │ ├─ modal.js # modais (futuro)
│ │ └─ chart.js # gráficos (futuro)
│ │
│ └─ 📁 data/ # presets, mocks e dados fixos
│ └─ sample.json
│
└─ README.md

