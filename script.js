// script.js
const API_KEY = '72ecdc0034e00fd6ba323913c7823084';
const API_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';

let catalogo = JSON.parse(localStorage.getItem('catalogo')) || [];
let filmesExibidos = [];
let resultadosBusca = [];
let paginaAtualBusca = 1;
let pesquisaAtiva = false;
let cacheBusca = {};
let cacheDetalhes = {};

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    atualizarEstatisticas();
    atualizarContadorLista();
});

function initApp() {
    // Carregar estado salvo
    carregarEstado();
    
    // Configurar event listeners
    configurarEventListeners();
    
    // Carregar categorias
    carregarCategorias();
    
    // Exibir todos os filmes inicialmente
    mostrarTodosFilmes();
    
    // Configurar gêneros populares
    configurarGenerosPopulares();
    
    // Atualizar estatísticas rápidas
    atualizarQuickStats();
}

function carregarEstado() {
    // Carregar view preference
    const viewPref = localStorage.getItem('viewPreference') || 'grid';
    document.querySelector(`.view-btn[data-view="${viewPref}"]`)?.classList.add('active');
    document.querySelector(`.view-btn[data-view="${viewPref !== 'grid' ? 'grid' : 'list'}"]`)?.classList.remove('active');
    
    // Aplicar view
    aplicarView(viewPref);
}

function configurarEventListeners() {
    // Busca
    document.getElementById('buscar').addEventListener('click', buscarNaAPI);
    document.getElementById('busca').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') buscarNaAPI();
    });
    
    // Sugestões de busca
    document.getElementById('busca').addEventListener('input', (e) => {
        mostrarSugestoes(e.target.value);
    });
    
    // Filtros
    document.getElementById('mostrarTodos').addEventListener('click', () => mostrarTodosFilmes());
    document.getElementById('ordenar').addEventListener('change', ordenarFilmes);
    document.getElementById('buscaCategoria').addEventListener('input', filtrarCategorias);
    
    // View options
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            e.target.closest('.view-btn').classList.add('active');
            const view = e.target.closest('.view-btn').dataset.view;
            aplicarView(view);
            localStorage.setItem('viewPreference', view);
        });
    });
    
    // Modais
    document.querySelector('.close-modal')?.addEventListener('click', fecharModal);
    document.getElementById('confirmCancel')?.addEventListener('click', () => {
        document.getElementById('modalConfirmacao').style.display = 'none';
    });
    
    // Navegação
    document.getElementById('verLista').addEventListener('click', () => {
        window.location.href = 'lista.html';
    });
    
    document.getElementById('buscarVazio')?.addEventListener('click', () => {
        document.getElementById('busca').focus();
    });
    
    // Carregar mais resultados
    document.getElementById('carregarMais')?.addEventListener('click', carregarMaisResultados);
}

function configurarGenerosPopulares() {
    document.querySelectorAll('.genre-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            const genero = tag.dataset.genre;
            document.getElementById('busca').value = genero;
            buscarNaAPI();
        });
    });
}

async function buscarNaAPI() {
    const busca = document.getElementById('busca').value.trim();
    const buscarBtn = document.getElementById('buscar');
    const loadingSpinner = document.getElementById('buscarLoading');
    
    if (!busca) {
        mostrarToast('Digite um termo para buscar', 'warning');
        document.getElementById('busca').focus();
        return;
    }
    
    // Mostrar loading
    buscarBtn.disabled = true;
    loadingSpinner.style.display = 'inline-block';
    paginaAtualBusca = 1;
    pesquisaAtiva = true;
    
    // Limpar sugestões
    document.getElementById('suggestions').innerHTML = '';
    
    try {
        // Verificar cache
        const cacheKey = `${busca.toLowerCase()}_page${paginaAtualBusca}`;
        if (cacheBusca[cacheKey] && (Date.now() - cacheBusca[cacheKey].timestamp) < 300000) { // 5 minutos
            resultadosBusca = cacheBusca[cacheKey].data;
            exibirResultadosBusca(resultadosBusca);
        } else {
            const response = await fetch(
                `${API_BASE}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(busca)}&language=pt-BR&page=${paginaAtualBusca}`
            );
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            resultadosBusca = data.results;
            
            // Salvar no cache
            cacheBusca[cacheKey] = {
                data: resultadosBusca,
                timestamp: Date.now(),
                totalPages: data.total_pages
            };
            
            exibirResultadosBusca(resultadosBusca);
        }
        
        mostrarToast(`Encontrados ${resultadosBusca.length} resultados`, 'success');
    } catch (error) {
        console.error('Erro na busca:', error);
        mostrarToast('Erro ao buscar filmes. Tente novamente.', 'error');
        
        const buscaResultados = document.getElementById('buscaResultados');
        const resultadosLista = document.getElementById('resultadosLista');
        
        resultadosLista.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle fa-3x"></i>
                <h3>Erro na Busca</h3>
                <p>Não foi possível conectar ao servidor. Verifique sua conexão.</p>
                <button onclick="buscarNaAPI()" class="btn-search">
                    <i class="fas fa-redo"></i> Tentar Novamente
                </button>
            </div>
        `;
        
        buscaResultados.style.display = 'block';
    } finally {
        buscarBtn.disabled = false;
        loadingSpinner.style.display = 'none';
    }
}

async function mostrarSugestoes(termo) {
    const suggestionsContainer = document.getElementById('suggestions');
    
    if (termo.length < 2) {
        suggestionsContainer.innerHTML = '';
        return;
    }
    
    try {
        // Cache para sugestões
        const cacheKey = `suggest_${termo.toLowerCase()}`;
        if (cacheBusca[cacheKey] && (Date.now() - cacheBusca[cacheKey].timestamp) < 60000) {
            exibirSugestoes(cacheBusca[cacheKey].data);
            return;
        }
        
        const response = await fetch(
            `${API_BASE}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(termo)}&language=pt-BR&page=1`
        );
        
        if (!response.ok) return;
        
        const data = await response.json();
        const sugestoes = data.results.slice(0, 5);
        
        cacheBusca[cacheKey] = {
            data: sugestoes,
            timestamp: Date.now()
        };
        
        exibirSugestoes(sugestoes);
    } catch (error) {
        // Silenciar erros em sugestões
    }
}

function exibirSugestoes(sugestoes) {
    const suggestionsContainer = document.getElementById('suggestions');
    
    if (sugestoes.length === 0) {
        suggestionsContainer.innerHTML = '';
        return;
    }
    
    suggestionsContainer.innerHTML = sugestoes.map(filme => `
        <div class="suggestion-item" onclick="selecionarSugestao('${filme.title}')">
            <i class="fas fa-film"></i>
            <span>${filme.title} (${filme.release_date ? filme.release_date.substring(0,4) : 'N/A'})</span>
        </div>
    `).join('');
    
    suggestionsContainer.style.display = 'block';
}

function selecionarSugestao(titulo) {
    document.getElementById('busca').value = titulo;
    document.getElementById('suggestions').innerHTML = '';
    buscarNaAPI();
}

function exibirResultadosBusca(resultados) {
    const resultadosLista = document.getElementById('resultadosLista');
    const buscaResultados = document.getElementById('buscaResultados');
    const lista = document.getElementById('lista');
    const infoFilme = document.getElementById('infoFilme');
    const carregarMaisBtn = document.getElementById('carregarMais');
    
    resultadosLista.innerHTML = '';
    buscaResultados.style.display = 'block';
    lista.style.display = 'none';
    infoFilme.style.display = 'none';
    
    if (resultados.length > 0) {
        document.getElementById('categoriaAtual').textContent = `Resultados para: "${document.getElementById('busca').value}"`;
        document.getElementById('contadorResultados').textContent = `${resultados.length} resultados`;
        
        resultados.forEach(filme => {
            const item = document.createElement('div');
            item.className = 'result-card';
            
            const ano = filme.release_date ? filme.release_date.substring(0,4) : 'N/A';
            const nota = filme.vote_average ? filme.vote_average.toFixed(1) : 'N/A';
            const sinopse = filme.overview ? 
                (filme.overview.length > 120 ? filme.overview.substring(0, 120) + '...' : filme.overview) : 
                'Sinopse não disponível.';
            
            item.innerHTML = `
                <div class="result-card-image">
                    <img src="${filme.poster_path ? IMG_BASE + filme.poster_path : 'https://via.placeholder.com/300x450?text=No+Image'}" 
                         alt="${filme.title}"
                         onerror="this.src='https://via.placeholder.com/300x450?text=Imagem+Não+Disponível'">
                    <div class="result-rating ${getClasseNota(filme.vote_average)}">${nota}</div>
                </div>
                <div class="result-card-content">
                    <h4>${filme.title} <span class="year">(${ano})</span></h4>
                    <div class="result-overview">${sinopse}</div>
                    <div class="result-actions">
                        <button onclick="mostrarDetalhesFilme(${filme.id})" class="btn-details">
                            <i class="fas fa-info-circle"></i> Detalhes
                        </button>
                        <button onclick="adicionarFilmeAPI(${filme.id})" class="btn-add">
                            <i class="fas fa-plus"></i> Adicionar
                        </button>
                    </div>
                </div>
            `;
            
            resultadosLista.appendChild(item);
        });
        
        // Mostrar botão "Carregar Mais" se houver mais páginas
        const cacheKey = `${document.getElementById('busca').value.toLowerCase()}_page${paginaAtualBusca}`;
        if (cacheBusca[cacheKey]?.totalPages > paginaAtualBusca) {
            carregarMaisBtn.style.display = 'block';
        } else {
            carregarMaisBtn.style.display = 'none';
        }
    } else {
        resultadosLista.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search fa-3x"></i>
                <h3>Nenhum resultado encontrado</h3>
                <p>Tente usar termos diferentes ou verificar a ortografia.</p>
            </div>
        `;
        carregarMaisBtn.style.display = 'none';
    }
}

async function carregarMaisResultados() {
    const busca = document.getElementById('busca').value.trim();
    paginaAtualBusca++;
    
    const carregarMaisBtn = document.getElementById('carregarMais');
    carregarMaisBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
    carregarMaisBtn.disabled = true;
    
    try {
        const cacheKey = `${busca.toLowerCase()}_page${paginaAtualBusca}`;
        let novosResultados;
        
        if (cacheBusca[cacheKey] && (Date.now() - cacheBusca[cacheKey].timestamp) < 300000) {
            novosResultados = cacheBusca[cacheKey].data;
        } else {
            const response = await fetch(
                `${API_BASE}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(busca)}&language=pt-BR&page=${paginaAtualBusca}`
            );
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            novosResultados = data.results;
            
            cacheBusca[cacheKey] = {
                data: novosResultados,
                timestamp: Date.now(),
                totalPages: data.total_pages
            };
        }
        
        resultadosBusca = [...resultadosBusca, ...novosResultados];
        exibirResultadosBusca(resultadosBusca);
        
        mostrarToast(`Mais ${novosResultados.length} resultados carregados`, 'info');
    } catch (error) {
        console.error('Erro ao carregar mais resultados:', error);
        mostrarToast('Erro ao carregar mais resultados', 'error');
        paginaAtualBusca--;
    } finally {
        carregarMaisBtn.innerHTML = '<i class="fas fa-plus"></i> Carregar Mais Resultados';
        carregarMaisBtn.disabled = false;
    }
}

async function mostrarDetalhesFilme(movieId) {
    const infoFilme = document.getElementById('infoFilme');
    const lista = document.getElementById('lista');
    const buscaResultados = document.getElementById('buscaResultados');
    
    infoFilme.style.display = 'block';
    lista.style.display = 'none';
    buscaResultados.style.display = 'none';
    
    // Mostrar loading
    infoFilme.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Carregando detalhes do filme...</p>
        </div>
    `;
    
    try {
        // Verificar cache
        if (cacheDetalhes[movieId] && (Date.now() - cacheDetalhes[movieId].timestamp) < 300000) {
            const filme = cacheDetalhes[movieId].data;
            exibirDetalhesFilme(filme);
            return;
        }
        
        const [filmeResponse, creditosResponse] = await Promise.all([
            fetch(`${API_BASE}/movie/${movieId}?api_key=${API_KEY}&language=pt-BR`),
            fetch(`${API_BASE}/movie/${movieId}/credits?api_key=${API_KEY}&language=pt-BR`)
        ]);
        
        if (!filmeResponse.ok || !creditosResponse.ok) {
            throw new Error('Erro ao carregar detalhes');
        }
        
        const filme = await filmeResponse.json();
        const creditos = await creditosResponse.json();
        
        // Salvar no cache
        cacheDetalhes[movieId] = {
            data: filme,
            timestamp: Date.now()
        };
        
        exibirDetalhesFilme(filme, creditos);
    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        infoFilme.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle fa-3x"></i>
                <h3>Erro ao carregar detalhes</h3>
                <p>Não foi possível carregar as informações do filme.</p>
                <button onclick="voltarParaLista()" class="btn-secondary">
                    <i class="fas fa-arrow-left"></i> Voltar
                </button>
            </div>
        `;
    }
}

function exibirDetalhesFilme(filme, creditos) {
    const infoFilme = document.getElementById('infoFilme');
    
    const diretor = creditos?.crew?.find(p => p.job === 'Director')?.name || 'N/A';
    const elencoPrincipal = creditos?.cast?.slice(0, 5).map(a => a.name).join(', ') || 'N/A';
    const generos = filme.genres?.map(g => g.name).join(', ') || 'N/A';
    const nota = filme.vote_average ? filme.vote_average.toFixed(1) : 'N/A';
    const notaClasse = getClasseNota(filme.vote_average);
    
    infoFilme.innerHTML = `
        <div class="movie-details-content">
            <div class="details-header">
                <h2>${filme.title}</h2>
                <div class="details-meta">
                    <span class="movie-rating ${notaClasse}">${nota}</span>
                    <span class="movie-year">${filme.release_date ? filme.release_date.substring(0,4) : 'N/A'}</span>
                    <span class="movie-duration">${filme.runtime ? filme.runtime + ' min' : 'N/A'}</span>
                </div>
            </div>
            
            <div class="details-body">
                <div class="details-poster">
                    <img src="${filme.poster_path ? IMG_BASE + filme.poster_path : 'https://via.placeholder.com/300x450?text=No+Image'}" 
                         alt="${filme.title}"
                         onerror="this.src='https://via.placeholder.com/300x450?text=Imagem+Não+Disponível'">
                </div>
                
                <div class="details-info">
                    <div class="details-section">
                        <h3><i class="fas fa-align-left"></i> Sinopse</h3>
                        <p class="synopsis">${filme.overview || 'Sinopse não disponível.'}</p>
                    </div>
                    
                    <div class="details-grid">
                        <div class="detail-item">
                            <i class="fas fa-calendar-alt"></i>
                            <div>
                                <strong>Lançamento</strong>
                                <span>${filme.release_date || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-film"></i>
                            <div>
                                <strong>Gêneros</strong>
                                <span>${generos}</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-user-tie"></i>
                            <div>
                                <strong>Diretor</strong>
                                <span>${diretor}</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-users"></i>
                            <div>
                                <strong>Elenco</strong>
                                <span class="truncate">${elencoPrincipal}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="details-tags">
                        ${filme.genres?.map(g => `<span class="detail-tag">${g.name}</span>`).join('') || ''}
                    </div>
                    
                    <div class="details-actions">
                        <button onclick="adicionarFilmeAPI(${filme.id})" class="btn-primary">
                            <i class="fas fa-plus"></i> Adicionar à Lista
                        </button>
                        <button onclick="voltarParaLista()" class="btn-secondary">
                            <i class="fas fa-arrow-left"></i> Voltar
                        </button>
                        <a href="https://www.themoviedb.org/movie/${filme.id}" target="_blank" class="btn-external">
                            <i class="fas fa-external-link-alt"></i> Ver no TMDB
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function adicionarFilmeAPI(movieId) {
    try {
        // Verificar cache
        let filme;
        if (cacheDetalhes[movieId]) {
            filme = cacheDetalhes[movieId].data;
        } else {
            const response = await fetch(`${API_BASE}/movie/${movieId}?api_key=${API_KEY}&language=pt-BR`);
            if (!response.ok) throw new Error('Erro ao carregar filme');
            filme = await response.json();
        }
        
        const dadosFilme = {
            id: filme.id,
            title: filme.title,
            category: filme.genres?.map(g => g.name).join(', ') || 'Geral',
            rating: filme.vote_average || 0,
            poster_path: filme.poster_path || '',
            overview: filme.overview || '',
            release_date: filme.release_date || '',
            dataAdicao: new Date().toLocaleDateString('pt-BR'),
            tmdb_id: filme.id
        };
        
        adicionarFilme(dadosFilme);
    } catch (error) {
        console.error('Erro ao adicionar filme:', error);
        mostrarToast('Erro ao adicionar filme', 'error');
    }
}

function carregarCategorias() {
    const categoriasContainer = document.getElementById('categorias');
    const categoriasSet = new Set();
    
    catalogo.forEach(filme => {
        if (filme.category) {
            filme.category.split(',').forEach(cat => {
                const categoriaLimpa = cat.trim();
                if (categoriaLimpa) categoriasSet.add(categoriaLimpa);
            });
        }
    });
    
    const categorias = Array.from(categoriasSet).sort();
    
    categoriasContainer.innerHTML = '';
    
    if (categorias.length > 0) {
        categorias.forEach(categoria => {
            const contador = catalogo.filter(filme => 
                filme.category?.toLowerCase().includes(categoria.toLowerCase())
            ).length;
            
            const li = document.createElement('li');
            li.innerHTML = `
                <i class="fas fa-tag"></i>
                <span class="category-name">${categoria}</span>
                <span class="category-count">${contador}</span>
            `;
            li.addEventListener('click', () => filtrarPorCategoria(categoria, li));
            categoriasContainer.appendChild(li);
        });
        
        document.getElementById('totalCategorias').querySelector('strong').textContent = categorias.length;
    } else {
        categoriasContainer.innerHTML = `
            <li class="no-categories">
                <i class="fas fa-info-circle"></i>
                <span>Nenhuma categoria ainda</span>
            </li>
        `;
    }
    
    document.getElementById('mostrarTodos').querySelector('.category-count').textContent = `(${catalogo.length})`;
}

function filtrarCategorias() {
    const termo = document.getElementById('buscaCategoria').value.toLowerCase();
    const itensCategoria = document.querySelectorAll('#categorias li');
    
    itensCategoria.forEach(item => {
        const nomeCategoria = item.querySelector('.category-name')?.textContent.toLowerCase();
        if (nomeCategoria && nomeCategoria.includes(termo)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function filtrarPorCategoria(categoria, elemento) {
    filmesExibidos = catalogo.filter(filme => 
        filme.category?.toLowerCase().includes(categoria.toLowerCase())
    );
    
    document.getElementById('categoriaAtual').textContent = `Categoria: ${categoria}`;
    document.getElementById('contadorExibicao').textContent = `Exibindo ${filmesExibidos.length} de ${catalogo.length} filmes`;
    
    document.querySelectorAll('#categorias li').forEach(li => li.classList.remove('active'));
    elemento.classList.add('active');
    document.getElementById('mostrarTodos').classList.remove('active');
    
    exibirFilmes(filmesExibidos);
}

function mostrarTodosFilmes() {
    filmesExibidos = [...catalogo];
    document.getElementById('categoriaAtual').textContent = 'Todos os Filmes';
    document.getElementById('contadorExibicao').textContent = `Exibindo ${filmesExibidos.length} de ${catalogo.length} filmes`;
    
    document.querySelectorAll('#categorias li').forEach(li => li.classList.remove('active'));
    document.getElementById('mostrarTodos').classList.add('active');
    
    document.getElementById('buscaResultados').style.display = 'none';
    document.getElementById('lista').style.display = 'grid';
    document.getElementById('infoFilme').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('loadingState').style.display = 'none';
    
    exibirFilmes(filmesExibidos);
}

function exibirFilmes(filmes) {
    const lista = document.getElementById('lista');
    const emptyState = document.getElementById('emptyState');
    
    if (filmes.length === 0) {
        lista.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    lista.style.display = 'grid';
    emptyState.style.display = 'none';
    lista.innerHTML = '';
    
    filmes.forEach((filme, index) => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        
        const categoriaPrincipal = filme.category?.split(',')[0]?.trim() || 'Geral';
        const nota = parseFloat(filme.rating).toFixed(1);
        const notaClasse = getClasseNota(filme.rating);
        const dataAdicao = filme.dataAdicao || 'N/A';
        
        card.innerHTML = `
            <div class="movie-card-inner">
                <div class="movie-poster-container">
                    <img src="${filme.poster_path ? IMG_BASE + filme.poster_path : 'https://via.placeholder.com/300x450?text=No+Image'}" 
                         class="movie-poster" alt="${filme.title}"
                         onerror="this.src='https://via.placeholder.com/300x450?text=Imagem+Não+Disponível'">
                    <div class="movie-rating-badge ${notaClasse}">${nota}</div>
                    <div class="movie-overlay">
                        <button class="btn-quick-view" onclick="mostrarDetalhesDoCatalogo(${index})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
                
                <div class="movie-info">
                    <div class="movie-header">
                        <h3 class="movie-title" title="${filme.title}">${filme.title}</h3>
                        <div class="movie-meta">
                            <span class="movie-category">
                                <i class="fas fa-tag"></i> ${categoriaPrincipal}
                            </span>
                            <span class="movie-date">
                                <i class="fas fa-calendar-plus"></i> ${dataAdicao}
                            </span>
                        </div>
                    </div>
                    
                    <div class="movie-footer">
                        <div class="movie-actions">
                            <button class="action-btn edit-btn" onclick="editarFilme(${index})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete-btn" onclick="excluirFilme(${index})" title="Remover">
                                <i class="fas fa-trash"></i>
                            </button>
                            <button class="action-btn favorite-btn" onclick="alternarFavorito(${index})" title="Favorito">
                                <i class="fas fa-star"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        lista.appendChild(card);
    });
    
    // Aplicar view atual
    const viewPref = localStorage.getItem('viewPreference') || 'grid';
    aplicarView(viewPref);
}

function aplicarView(view) {
    const lista = document.getElementById('lista');
    
    if (view === 'list') {
        lista.classList.add('movie-list');
        lista.classList.remove('movie-grid');
    } else {
        lista.classList.add('movie-grid');
        lista.classList.remove('movie-list');
    }
}

function mostrarDetalhesDoCatalogo(filme, index) {
    if (typeof filme === 'number') {
        filme = catalogo[filme];
    }
    
    const infoFilme = document.getElementById('infoFilme');
    const lista = document.getElementById('lista');
    
    infoFilme.style.display = 'block';
    lista.style.display = 'none';
    
    const nota = parseFloat(filme.rating).toFixed(1);
    const notaClasse = getClasseNota(filme.rating);
    
    infoFilme.innerHTML = `
        <div class="movie-details-content">
            <div class="details-header">
                <h2>${filme.title}</h2>
                <div class="details-meta">
                    <span class="movie-rating ${notaClasse}">${nota}</span>
                    <span class="movie-date">
                        <i class="fas fa-calendar-plus"></i> ${filme.dataAdicao || 'N/A'}
                    </span>
                </div>
            </div>
            
            <div class="details-body">
                <div class="details-poster">
                    <img src="${filme.poster_path ? IMG_BASE + filme.poster_path : 'https://via.placeholder.com/300x450?text=No+Image'}" 
                         alt="${filme.title}"
                         onerror="this.src='https://via.placeholder.com/300x450?text=Imagem+Não+Disponível'">
                </div>
                
                <div class="details-info">
                    <div class="details-section">
                        <h3><i class="fas fa-align-left"></i> Descrição</h3>
                        <p class="synopsis">${filme.overview || 'Descrição não disponível.'}</p>
                    </div>
                    
                    <div class="details-grid">
                        <div class="detail-item">
                            <i class="fas fa-tags"></i>
                            <div>
                                <strong>Categorias</strong>
                                <span>${filme.category || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-calendar-alt"></i>
                            <div>
                                <strong>Data de Lançamento</strong>
                                <span>${filme.release_date || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="details-tags">
                        ${filme.category?.split(',').map(cat => 
                            `<span class="detail-tag">${cat.trim()}</span>`
                        ).join('') || ''}
                    </div>
                    
                    <div class="details-actions">
                        <button onclick="editarFilme(${typeof index === 'number' ? index : catalogo.indexOf(filme)})" class="btn-primary">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button onclick="excluirFilme(${typeof index === 'number' ? index : catalogo.indexOf(filme)})" class="btn-secondary">
                            <i class="fas fa-trash"></i> Remover
                        </button>
                        <button onclick="voltarParaLista()" class="btn-secondary">
                            <i class="fas fa-arrow-left"></i> Voltar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function voltarParaLista() {
    document.getElementById('infoFilme').style.display = 'none';
    document.getElementById('lista').style.display = 'grid';
    document.getElementById('buscaResultados').style.display = 'none';
}

function adicionarFilme(detalhes) {
    const filmeExistente = catalogo.find(f => f.id === detalhes.id || f.tmdb_id === detalhes.tmdb_id);
    
    if (filmeExistente) {
        showConfirmation(
            'Filme já na lista',
            `"${detalhes.title}" já está na sua lista. Deseja atualizá-lo?`,
            () => {
                Object.assign(filmeExistente, detalhes);
                salvarCatalogo();
                mostrarToast('Filme atualizado!', 'success');
            }
        );
        return;
    }
    
    catalogo.push(detalhes);
    salvarCatalogo();
    mostrarToast('Filme adicionado à lista!', 'success');
}

function salvarCatalogo() {
    localStorage.setItem('catalogo', JSON.stringify(catalogo));
    carregarCategorias();
    mostrarTodosFilmes();
    atualizarEstatisticas();
    atualizarContadorLista();
    atualizarQuickStats();
}

function editarFilme(index) {
    const filme = catalogo[index];
    const modal = document.getElementById('modalEdicao');
    const modalConteudo = document.getElementById('modalConteudo');
    
    modalConteudo.innerHTML = `
        <div class="edit-form">
            <div class="edit-header">
                <img src="${filme.poster_path ? IMG_BASE + filme.poster_path : 'https://via.placeholder.com/100x150?text=No+Image'}" 
                     alt="${filme.title}"
                     class="edit-poster"
                     onerror="this.src='https://via.placeholder.com/100x150?text=Imagem+Não+Disponível'">
                <div class="edit-title">
                    <h4>${filme.title}</h4>
                    <p class="edit-subtitle">Editar informações</p>
                </div>
            </div>
            
            <div class="form-group">
                <label for="novaNota">
                    <i class="fas fa-star"></i> Nota (0-10)
                </label>
                <div class="rating-input-container">
                    <input type="range" id="novaNotaRange" class="rating-slider" 
                           min="0" max="10" step="0.5" value="${filme.rating}">
                    <input type="number" id="novaNota" class="rating-input" 
                           min="0" max="10" step="0.1" value="${filme.rating}" required>
                    <span class="rating-preview ${getClasseNota(filme.rating)}">${parseFloat(filme.rating).toFixed(1)}</span>
                </div>
                <div class="rating-labels">
                    <span>0</span><span>2</span><span>4</span><span>6</span><span>8</span><span>10</span>
                </div>
            </div>
            
            <div class="form-group">
                <label for="novasCategorias">
                    <i class="fas fa-tags"></i> Categorias
                </label>
                <input type="text" id="novasCategorias" class="rating-input" 
                       value="${filme.category}" placeholder="Separadas por vírgula">
                <div class="category-suggestions">
                    <small>Exemplo: Ação, Drama, Ficção Científica</small>
                </div>
            </div>
            
            <div class="form-group">
                <label for="novaDescricao">
                    <i class="fas fa-align-left"></i> Descrição
                </label>
                <textarea id="novaDescricao" class="desc-input" 
                          placeholder="Adicione uma descrição...">${filme.overview || ''}</textarea>
            </div>
            
            <div class="form-actions">
                <button onclick="salvarEdicao(${index})" class="btn-save">
                    <i class="fas fa-save"></i> Salvar Alterações
                </button>
                <button onclick="fecharModal()" class="btn-cancel">
                    <i class="fas fa-times"></i> Cancelar
                </button>
            </div>
        </div>
    `;
    
    // Configurar slider
    const slider = document.getElementById('novaNotaRange');
    const input = document.getElementById('novaNota');
    const preview = document.querySelector('.rating-preview');
    
    slider.addEventListener('input', (e) => {
        const valor = e.target.value;
        input.value = valor;
        preview.textContent = parseFloat(valor).toFixed(1);
        preview.className = `rating-preview ${getClasseNota(valor)}`;
    });
    
    input.addEventListener('input', (e) => {
        const valor = e.target.value;
        slider.value = valor;
        preview.textContent = parseFloat(valor).toFixed(1);
        preview.className = `rating-preview ${getClasseNota(valor)}`;
    });
    
    modal.style.display = 'flex';
}

function salvarEdicao(index) {
    const novaNota = parseFloat(document.getElementById('novaNota').value);
    const novasCategorias = document.getElementById('novasCategorias').value.trim();
    const novaDescricao = document.getElementById('novaDescricao').value.trim();
    
    if (isNaN(novaNota) || novaNota < 0 || novaNota > 10) {
        mostrarToast('Por favor, insira uma nota válida entre 0 e 10.', 'warning');
        return;
    }
    
    if (!novasCategorias) {
        mostrarToast('Por favor, insira pelo menos uma categoria.', 'warning');
        return;
    }
    
    catalogo[index].rating = novaNota;
    catalogo[index].category = novasCategorias;
    if (novaDescricao) {
        catalogo[index].overview = novaDescricao;
    }
    
    salvarCatalogo();
    fecharModal();
    mostrarToast('Filme atualizado com sucesso!', 'success');
}

function excluirFilme(index) {
    const filme = catalogo[index];
    
    showConfirmation(
        'Remover Filme',
        `Tem certeza que deseja remover "${filme.title}" da sua lista?`,
        () => {
            catalogo.splice(index, 1);
            salvarCatalogo();
            voltarParaLista();
            mostrarToast('Filme removido com sucesso!', 'success');
        }
    );
}

function alternarFavorito(index) {
    catalogo[index].favorito = !catalogo[index].favorito;
    salvarCatalogo();
    
    const mensagem = catalogo[index].favorito ? 
        'Adicionado aos favoritos!' : 'Removido dos favoritos!';
    mostrarToast(mensagem, 'info');
}

function ordenarFilmes() {
    const criterio = document.getElementById('ordenar').value;
    
    switch(criterio) {
        case 'titulo':
            filmesExibidos.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'nota':
            filmesExibidos.sort((a, b) => b.rating - a.rating);
            break;
        case 'recente':
            filmesExibidos.sort((a, b) => {
                const dataA = new Date(a.dataAdicao || 0);
                const dataB = new Date(b.dataAdicao || 0);
                return dataB - dataA;
            });
            break;
        case 'antigo':
            filmesExibidos.sort((a, b) => {
                const dataA = new Date(a.dataAdicao || 0);
                const dataB = new Date(b.dataAdicao || 0);
                return dataA - dataB;
            });
            break;
    }
    
    exibirFilmes(filmesExibidos);
}

function atualizarEstatisticas() {
    const totalFilmes = catalogo.length;
    const mediaNotas = totalFilmes > 0 
        ? (catalogo.reduce((acc, filme) => acc + parseFloat(filme.rating), 0) / totalFilmes).toFixed(1)
        : '0.0';
    
    document.getElementById('totalFilmes').querySelector('strong').textContent = totalFilmes;
    document.getElementById('mediaNotas').querySelector('strong').textContent = mediaNotas;
}

function atualizarContadorLista() {
    const badge = document.getElementById('badgeContador');
    const contadorTexto = document.getElementById('contadorLista');
    
    badge.textContent = catalogo.length;
    
    if (catalogo.length > 0) {
        badge.style.display = 'inline-block';
        contadorTexto.textContent = 'Minha Lista';
    } else {
        badge.style.display = 'none';
        contadorTexto.textContent = 'Minha Lista';
    }
}

function atualizarQuickStats() {
    const quickStats = document.getElementById('quickStats');
    
    if (catalogo.length === 0) {
        quickStats.innerHTML = `
            <div class="stat-card">
                <i class="fas fa-info-circle"></i>
                <div>
                    <div class="stat-value">-</div>
                    <div class="stat-label">Adicione filmes</div>
                </div>
            </div>
        `;
        return;
    }
    
    const mediaNotas = (catalogo.reduce((acc, filme) => acc + parseFloat(filme.rating), 0) / catalogo.length).toFixed(1);
    const acimaDe8 = catalogo.filter(filme => parseFloat(filme.rating) >= 8).length;
    
    quickStats.innerHTML = `
        <div class="stat-card">
            <i class="fas fa-star-half-alt"></i>
            <div>
                <div class="stat-value">${mediaNotas}</div>
                <div class="stat-label">Nota Média</div>
            </div>
        </div>
        <div class="stat-card">
            <i class="fas fa-thumbs-up"></i>
            <div>
                <div class="stat-value">${acimaDe8}</div>
                <div class="stat-label">Acima de 8</div>
            </div>
        </div>
    `;
}

function getClasseNota(nota) {
    nota = parseFloat(nota);
    if (nota >= 8) return 'rating-excellent';
    if (nota >= 6) return 'rating-good';
    if (nota >= 4) return 'rating-average';
    return 'rating-poor';
}

function fecharModal() {
    document.getElementById('modalEdicao').style.display = 'none';
    document.getElementById('modalConfirmacao').style.display = 'none';
}

function showConfirmation(titulo, mensagem, callback) {
    const modal = document.getElementById('modalConfirmacao');
    const mensagemEl = document.getElementById('confirmMessage');
    
    document.getElementById('modalConfirmacao').querySelector('h3').textContent = titulo;
    mensagemEl.textContent = mensagem;
    
    const confirmBtn = document.getElementById('confirmOk');
    confirmBtn.onclick = () => {
        callback();
        fecharModal();
    };
    
    modal.style.display = 'flex';
}

function mostrarToast(mensagem, tipo = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    
    const icones = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    toast.innerHTML = `
        <div class="toast-content">
            <i class="${icones[tipo]}"></i>
            <span>${mensagem}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto-remover após 5 segundos
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Prevenir form submission
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', (e) => e.preventDefault());
});

// Fechar sugestões ao clicar fora
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-input-container')) {
        document.getElementById('suggestions').innerHTML = '';
    }
});

// Fechar modal ao clicar fora
window.addEventListener('click', (e) => {
    const modal = document.getElementById('modalEdicao');
    const confirmModal = document.getElementById('modalConfirmacao');
    
    if (e.target === modal) {
        fecharModal();
    }
    if (e.target === confirmModal) {
        fecharModal();
    }
});