# Filmes

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/mannowell/Filmes)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-orange)](https://github.com/mannowell/Filmes/releases)
[![HTML](https://img.shields.io/badge/HTML5-E34F26?logo=html5)](https://developer.mozilla.org/pt-BR/docs/Web/HTML)
[![CSS](https://img.shields.io/badge/CSS3-1572B6?logo=css3)](https://developer.mozilla.org/pt-BR/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)
[![API](https://img.shields.io/badge/TMDB-API-01d277?logo=themoviedb)](https://www.themoviedb.org/documentation/api)

Catálogo de filmes e séries web, com busca via API do TMDB, lista pessoal, filtros, estatísticas e exportação de dados.

---

## 🛠️ Tecnologias

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **API:** [The Movie Database (TMDB)](https://www.themoviedb.org/documentation/api)
- **Ícones:** Font Awesome 6
- **Armazenamento:** LocalStorage

---

## ✨ Funcionalidades

- 🔍 **Busca** — Pesquise filmes e séries pela API do TMDB com sugestões em tempo real
- 📋 **Lista Pessoal** — Adicione filmes à sua lista pessoal
- 🏷️ **Categorias** — Filtre por categorias/gêneros
- ⭐ **Avaliações** — Visualize notas e filtre por faixa de avaliação
- 📊 **Estatísticas** — Média de notas, distribuição por categoria e gráficos
- 💾 **Persistência** — Dados salvos no LocalStorage
- 📤 **Exportação** — Exporte sua lista em JSON, CSV ou TXT
- 📱 **Responsivo** — Layout adaptável para desktop e mobile
- 🎨 **Visualizações** — Alterne entre visualização em grade e lista
- 🔄 **Cache** — Cache de buscas e detalhes para melhor performance

---

## 📋 Pré-requisitos

- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Chave de API do TMDB (gratuita em [themoviedb.org](https://www.themoviedb.org/settings/api))

---

## 🚀 Instalação e Execução

```bash
# Clonar o repositório
git clone https://github.com/mannowell/Filmes.git
cd Filmes
```

### Opção 1: Abrir diretamente

Abra o arquivo `index.html` no navegador.

### Opção 2: Servidor local (recomendado)

```bash
# Com Python
python3 -m http.server 8080

# Com Node.js (npx)
npx serve .
```

Acesse `http://localhost:8080` no navegador.

### Configurar API Key:

Edite o arquivo `script.js` e substitua a chave da API:

```javascript
const API_KEY = 'SUA_CHAVE_AQUI';
```

---

## 📁 Estrutura do Projeto

```
Filmes/
├── index.html                 # Página principal do catálogo
├── lista.html                 # Página da lista pessoal
├── script.js                  # Lógica do catálogo e busca
├── lista.js                   # Lógica da lista pessoal
├── styles.css                 # Estilos CSS
└── README.md
```

---

## 📖 Uso

### Catálogo (`index.html`)

1. **Buscar** — Digite o nome de um filme ou série e clique em "Buscar"
2. **Adicionar** — Clique em "Adicionar" nos resultados para salvar na sua lista
3. **Detalhes** — Clique em "Detalhes" para ver informações completas
4. **Categorias** — Use a barra lateral para filtrar por gênero
5. **Ordenação** — Ordene por título, nota, mais recente ou mais antigo

### Lista Pessoal (`lista.html`)

1. **Visualizar** — Veja todos os filmes adicionados
2. **Filtrar** — Filtre por categoria ou faixa de nota
3. **Exportar** — Exporte sua lista em JSON, CSV ou TXT
4. **Backup** — Faça backup completo dos seus dados
5. **Limpar** — Remova todos os filmes da lista

---

## 🔌 API

Este projeto utiliza a [API do TMDB](https://developer.themoviedb.org/reference/intro/getting-request):

| Endpoint | Uso |
|----------|-----|
| `/search/movie` | Busca de filmes por termo |
| `/movie/{id}` | Detalhes completos do filme |
| `/movie/{id}/credits` | Créditos (diretor, elenco) |

---

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas alterações (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---

## 👤 Autor

**Wellison Oliveira (mannowell)**

- GitHub: [@mannowell](https://github.com/mannowell)

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](./LICENSE) para mais detalhes.
