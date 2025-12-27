// lista.js
let catalogo = JSON.parse(localStorage.getItem('catalogo')) || [];
let catalogoBackup = JSON.parse(localStorage.getItem('catalogoBackup')) || [];
let filtroAtivo = null;
let filtroNota = { min: 0, max: 10 };

document.addEventListener('DOMContentLoaded', () => {
    initLista();
});

function initLista() {
    // Event listeners
    document.getElementById('voltar').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    document.getElementById('exportar').addEventListener('click', mostrarModalExportacao);
    document.getElementById('backup').addEventListener('click', criarBackup);
    document.getElementById('limpar').addEventListener('click', confirmarLimparLista);
    document.getElementById('ordenarLista').addEventListener('change', ordenarLista);
    document.getElementById('limparFiltros').addEventListener('click', limparFiltros);
    
    // Filtros de nota
    document.querySelectorAll('.rating-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.rating-filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const min = parseFloat(e.target.dataset.min);
            const max = parseFloat(e.target.dataset.max);
            filtroNota = { min, max };
            aplicarFiltros();
        });
    });
    
    // View options
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            e.target.closest('.view-btn').classList.add('active');
            const view = e.target.closest('.view-btn').dataset.view;
            aplicarView(view);
            localStorage.setItem('listaViewPreference', view);
        });
    });
    
    // Modais
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('modalExportacao').style.display = 'none';
            document.getElementById('modalConfirmacao').style.display = 'none';
        });
    });
    
    document.getElementById('confirmCancel')?.addEventListener('click', () => {
        document.getElementById('modalConfirmacao').style.display = 'none';
    });
    
    document.getElementById('confirmarExportacao')?.addEventListener('click', exportarLista);
    
    // Opções de exportação
    document.querySelectorAll('.export-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.export-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
        });
    });
    
    // Carregar view preference
    const viewPref = localStorage.getItem('listaViewPreference') || 'grid';
    document.querySelector(`.view-btn[data-view="${viewPref}"]`)?.classList.add('active');
    document.querySelector(`.view-btn[data-view="${viewPref !== 'grid' ? 'grid' : 'list'}"]`)?.classList.remove('active');
    
    // Inicializar
    exibirListaCompleta();
    gerarFiltrosCategoria();
    atualizarResumo();
    criarGraficos();
}

function exibirListaCompleta() {
    const lista = document.getElementById('lista');
    const totalElement = document.getElementById('totalLista');
    const totalFavoritosElement = document.getElementById('totalFavoritos');
    
    totalElement.querySelector('strong').textContent = catalogo.length;
    
    const favoritos = catalogo.filter(filme => filme.favorito).length;
    totalFavoritosElement.querySelector('strong').textContent = favoritos;
    
    if (catalogo.length === 0) {
        lista.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px;">
                <i class="fas fa-film fa-4x" style="color: #4cc9f0; margin-bottom: 20px; opacity: 0.5;"></i>
                <h3>Sua lista está vazia</h3>
                <p>Volte ao catálogo para adicionar filmes!</p>
                <button onclick="window.location.href='index.html'" class="btn-search" style="margin-top: 20px;">
                    <i class="fas fa-plus"></i> Adicionar Filmes
                </button>
            </div>
        `;
        
        // Limpar estatísticas
        document.getElementById('melhorFilme').querySelector('strong').textContent = '-';
        document.getElementById('piorFilme').querySelector('strong').textContent = '-';
        document.getElementById('contadorFiltrados').textContent = 'Exibindo 0 de 0 filmes';
        return;
    }
    
    // Calcular melhor e pior filme
    const filmesOrdenados = [...catalogo].sort((a, b) => b.rating - a.rating);
    const melhorFilme = filmesOrdenados[0];
    const piorFilme = filmesOrdenados[filmesOrdenados.length - 1];
    
    document.getElementById('melhorFilme').querySelector('strong').textContent = 
        `${melhorFilme.title} (${parseFloat(melhorFilme.rating).toFixed(1)})`;
    document.getElementById('piorFilme').querySelector('strong').textContent = 
        `${piorFilme.title} (${parseFloat(piorFilme.rating).toFixed(1)})`;
    
    // Aplicar filtros
    let filmesFiltrados = [...catalogo];
    
    if (filtroAtivo) {
        filmesFiltrados = filmesFiltrados.filter(filme => 
            filme.category?.toLowerCase().includes(filtroAtivo.toLowerCase())
        );
    }
    
    filmesFiltrados = filmesFiltrados.filter(filme => 
        parseFloat(filme.rating) >= filtroNota.min && parseFloat(filme.rating) <= filtroNota.max
    );
    
    document.getElementById('contadorFiltrados').textContent = 
        `Exibindo ${filmesFiltrados.length} de ${catalogo.length} filmes`;
    
    if (filmesFiltrados.length === 0) {
        lista.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px;">
                <i class="fas fa-filter fa-4x" style="color: #4cc9f0; margin-bottom: 20px; opacity: 0.5;"></i>
                <h3>Nenhum filme encontrado</h3>
                <p>Nenhum filme corresponde aos filtros aplicados.</p>
                <button onclick="limparFiltros()" class="btn-search" style="margin-top: 20px;">
                    <i class="fas fa-times"></i> Limpar Filtros
                </button>
            </div>
        `;
        return;
    }
    
    // Exibir filmes
    lista.innerHTML = '';
    filmesFiltrados.forEach((filme, index) => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        
        const categoriaPrincipal = filme.category?.split(',')[0]?.trim() || 'Geral';
        const nota = parseFloat(filme.rating).toFixed(1);
        const notaClasse = getClasseNota(filme.rating);
        const dataAdicao = filme.dataAdicao || 'N/A';
        const isFavorito = filme.favorito ? 'fas fa-star' : 'far fa-star';
        
        card.innerHTML = `
            <div class="movie-card-inner">
                <div class="movie-poster-container">
                    <img src="${filme.poster_path ? 'https://image.tmdb.org/t/p/w500' + filme.poster_path : 'https://via.placeholder.com/300x450?text=No+Image'}" 
                         class="movie-poster" alt="${filme.title}"
                         onerror="this.src='https://via.placeholder.com/300x450?text=Imagem+Não+Disponível'">
                    <div class="movie-rating-badge ${notaClasse}">${nota}</div>
                    <div class="movie-overlay">
                        <button class="btn-quick-view" onclick="mostrarDetalhesNaLista(${catalogo.indexOf(filme)})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                    ${filme.favorito ? `
                        <div class="movie-favorite-badge" title="Favorito">
                            <i class="fas fa-star"></i>
                        </div>
                    ` : ''}
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
                            <button class="action-btn edit-btn" onclick="editarNaLista(${catalogo.indexOf(filme)})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete-btn" onclick="excluirNaLista(${catalogo.indexOf(filme)})" title="Remover">
                                <i class="fas fa-trash"></i>
                            </button>
                            <button class="action-btn favorite-btn ${filme.favorito ? 'active' : ''}" 
                                    onclick="alternarFavoritoNaLista(${catalogo.indexOf(filme)})" title="Favorito">
                                <i class="${isFavorito}"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        lista.appendChild(card);
    });
    
    // Aplicar view
    const viewPref = localStorage.getItem('listaViewPreference') || 'grid';
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

function getClasseNota(nota) {
    nota = parseFloat(nota);
    if (nota >= 8) return 'rating-excellent';
    if (nota >= 6) return 'rating-good';
    if (nota >= 4) return 'rating-average';
    return 'rating-poor';
}

function gerarFiltrosCategoria() {
    const filtrosContainer = document.getElementById('filtrosCategoria');
    const categorias = [...new Set(catalogo.flatMap(filme => 
        filme.category?.split(',').map(cat => cat.trim()).filter(cat => cat) || []
    ).filter(cat => cat))];
    
    filtrosContainer.innerHTML = '';
    
    if (categorias.length === 0) {
        filtrosContainer.innerHTML = '<p class="no-filters">Nenhuma categoria disponível</p>';
        return;
    }
    
    // Botão "Todos"
    const btnTodos = document.createElement('span');
    btnTodos.className = 'genre-tag active';
    btnTodos.innerHTML = '<i class="fas fa-layer-group"></i> Todos';
    btnTodos.addEventListener('click', () => {
        filtroAtivo = null;
        aplicarFiltros();
        document.querySelectorAll('.genre-tag').forEach(tag => tag.classList.remove('active'));
        btnTodos.classList.add('active');
    });
    filtrosContainer.appendChild(btnTodos);
    
    // Contar filmes por categoria
    const contagemCategorias = {};
    catalogo.forEach(filme => {
        const cats = filme.category?.split(',').map(cat => cat.trim()) || [];
        cats.forEach(cat => {
            if (cat) {
                contagemCategorias[cat] = (contagemCategorias[cat] || 0) + 1;
            }
        });
    });
    
    // Botões para cada categoria
    categorias.sort().forEach(categoria => {
        const contador = contagemCategorias[categoria] || 0;
        
        const tag = document.createElement('span');
        tag.className = 'genre-tag';
        tag.innerHTML = `
            <span class="tag-text">${categoria}</span>
            <span class="tag-count">${contador}</span>
        `;
        tag.title = `${contador} filme${contador !== 1 ? 's' : ''}`;
        
        tag.addEventListener('click', () => {
            filtroAtivo = categoria;
            aplicarFiltros();
            document.querySelectorAll('.genre-tag').forEach(tag => tag.classList.remove('active'));
            tag.classList.add('active');
        });
        
        filtrosContainer.appendChild(tag);
    });
}

function aplicarFiltros() {
    exibirListaCompleta();
}

function filtrarListaPorCategoria(categoria, elemento) {
    filtroAtivo = categoria;
    aplicarFiltros();
    document.querySelectorAll('.genre-tag').forEach(tag => tag.classList.remove('active'));
    elemento.classList.add('active');
}

function ordenarLista() {
    const criterio = document.getElementById('ordenarLista').value;
    
    switch(criterio) {
        case 'titulo':
            catalogo.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'nota':
            catalogo.sort((a, b) => b.rating - a.rating);
            break;
        case 'categoria':
            catalogo.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
            break;
        case 'recente':
            catalogo.sort((a, b) => {
                const dataA = new Date(a.dataAdicao || 0);
                const dataB = new Date(b.dataAdicao || 0);
                return dataB - dataA;
            });
            break;
        case 'favoritos':
            catalogo.sort((a, b) => (b.favorito ? 1 : 0) - (a.favorito ? 1 : 0));
            break;
    }
    
    localStorage.setItem('catalogo', JSON.stringify(catalogo));
    exibirListaCompleta();
    gerarFiltrosCategoria();
}

function limparFiltros() {
    filtroAtivo = null;
    filtroNota = { min: 0, max: 10 };
    
    document.querySelectorAll('.genre-tag').forEach(tag => tag.classList.remove('active'));
    document.querySelectorAll('.genre-tag').forEach(tag => {
        if (tag.querySelector('.tag-text')?.textContent === 'Todos') {
            tag.classList.add('active');
        }
    });
    
    document.querySelectorAll('.rating-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.min === '0' && btn.dataset.max === '10') {
            btn.classList.add('active');
        }
    });
    
    aplicarFiltros();
}

function mostrarDetalhesNaLista(index) {
    const filme = catalogo[index];
    const lista = document.getElementById('lista');
    
    lista.innerHTML = `
        <div class="movie-details" style="grid-column: 1 / -1;">
            <div class="movie-details-content">
                <div class="details-header">
                    <h2>${filme.title}</h2>
                    <div class="details-meta">
                        <span class="movie-rating ${getClasseNota(filme.rating)}">
                            ${parseFloat(filme.rating).toFixed(1)}
                        </span>
                        <span class="movie-date">
                            <i class="fas fa-calendar-plus"></i> ${filme.dataAdicao || 'N/A'}
                        </span>
                    </div>
                </div>
                
                <div class="details-body">
                    <div class="details-poster">
                        <img src="${filme.poster_path ? 'https://image.tmdb.org/t/p/w500' + filme.poster_path : 'https://via.placeholder.com/300x450?text=No+Image'}" 
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
                            <div class="detail-item">
                                <i class="fas fa-heart"></i>
                                <div>
                                    <strong>Status</strong>
                                    <span>${filme.favorito ? '⭐ Favorito' : 'Normal'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="details-tags">
                            ${filme.category?.split(',').map(cat => 
                                `<span class="detail-tag">${cat.trim()}</span>`
                            ).join('') || ''}
                        </div>
                        
                        <div class="details-actions">
                            <button onclick="editarNaLista(${index})" class="btn-primary">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button onclick="excluirNaLista(${index})" class="btn-secondary">
                                <i class="fas fa-trash"></i> Remover
                            </button>
                            <button onclick="alternarFavoritoNaLista(${index})" class="${filme.favorito ? 'btn-secondary' : 'btn-primary'}">
                                <i class="${filme.favorito ? 'fas fa-star' : 'far fa-star'}"></i> 
                                ${filme.favorito ? 'Remover Favorito' : 'Adicionar Favorito'}
                            </button>
                            <button onclick="exibirListaCompleta()" class="btn-secondary">
                                <i class="fas fa-arrow-left"></i> Voltar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function editarNaLista(index) {
    const filme = catalogo[index];
    const modal = document.getElementById('modalEdicao');
    
    // Criar modal de edição dinâmico (similar ao do script.js)
    // Por brevidade, usaremos um prompt simples
    const novaNota = prompt(`Editar nota para "${filme.title}" (0-10):`, filme.rating);
    
    if (novaNota !== null) {
        const notaNum = parseFloat(novaNota);
        if (!isNaN(notaNum) && notaNum >= 0 && notaNum <= 10) {
            const novasCategorias = prompt(`Editar categorias para "${filme.title}" (separadas por vírgula):`, filme.category);
            
            if (novasCategorias !== null) {
                catalogo[index].rating = notaNum;
                catalogo[index].category = novasCategorias;
                salvarCatalogo();
                mostrarToast('Filme atualizado com sucesso!', 'success');
            }
        } else {
            mostrarToast('Por favor, insira um número válido entre 0 e 10.', 'warning');
        }
    }
}

function alternarFavoritoNaLista(index) {
    catalogo[index].favorito = !catalogo[index].favorito;
    salvarCatalogo();
    
    const mensagem = catalogo[index].favorito ? 
        'Adicionado aos favoritos!' : 'Removido dos favoritos!';
    mostrarToast(mensagem, 'info');
}

function excluirNaLista(index) {
    showConfirmation(
        'Remover Filme',
        `Tem certeza que deseja remover "${catalogo[index].title}" da sua lista?`,
        () => {
            catalogo.splice(index, 1);
            salvarCatalogo();
            mostrarToast('Filme removido com sucesso!', 'success');
        }
    );
}

function confirmarLimparLista() {
    if (catalogo.length === 0) {
        mostrarToast('A lista já está vazia!', 'warning');
        return;
    }
    
    showConfirmation(
        'Limpar Lista',
        `Tem certeza que deseja limpar TODA a sua lista de filmes?\nEsta ação removerá ${catalogo.length} filme${catalogo.length !== 1 ? 's' : ''} e não pode ser desfeita.`,
        limparLista
    );
}

function limparLista() {
    // Criar backup antes de limpar
    catalogoBackup = [...catalogo];
    localStorage.setItem('catalogoBackup', JSON.stringify(catalogoBackup));
    
    catalogo = [];
    salvarCatalogo();
    mostrarToast('Lista limpa com sucesso! Um backup foi criado.', 'success');
}

function criarBackup() {
    if (catalogo.length === 0) {
        mostrarToast('Não há filmes para fazer backup!', 'warning');
        return;
    }
    
    catalogoBackup = [...catalogo];
    localStorage.setItem('catalogoBackup', JSON.stringify(catalogoBackup));
    
    mostrarToast(`Backup criado com ${catalogo.length} filmes!`, 'success');
}

function mostrarModalExportacao() {
    if (catalogo.length === 0) {
        mostrarToast('Não há filmes para exportar!', 'warning');
        return;
    }
    
    document.getElementById('modalExportacao').style.display = 'flex';
}

function exportarLista() {
    const formatoSelecionado = document.querySelector('.export-option.selected')?.dataset.format;
    
    if (!formatoSelecionado) {
        mostrarToast('Selecione um formato para exportação.', 'warning');
        return;
    }
    
    const incluirDetalhes = document.getElementById('incluirDetalhes').checked;
    const incluirPosters = document.getElementById('incluirPosters').checked;
    
    let dadosExportacao;
    const nomeArquivo = `minha-lista-filmes-${new Date().toISOString().split('T')[0]}`;
    
    switch(formatoSelecionado) {
        case 'json':
            dadosExportacao = {
                catalogo: catalogo.map(filme => ({
                    ...filme,
                    // Remover dados desnecessários se não solicitados
                    ...(!incluirDetalhes && { overview: undefined }),
                    ...(!incluirPosters && { poster_path: undefined })
                })),
                metadata: {
                    exportadoEm: new Date().toISOString(),
                    totalFilmes: catalogo.length,
                    mediaNotas: (catalogo.reduce((acc, filme) => acc + parseFloat(filme.rating), 0) / catalogo.length).toFixed(1),
                    totalFavoritos: catalogo.filter(f => f.favorito).length
                }
            };
            
            exportarJSON(dadosExportacao, `${nomeArquivo}.json`);
            break;
            
        case 'csv':
            const headers = ['Título', 'Nota', 'Categorias', 'Data de Adição', 'Favorito'];
            if (incluirDetalhes) headers.push('Descrição');
            if (incluirPosters) headers.push('Poster URL');
            
            const linhas = catalogo.map(filme => {
                const linha = [
                    `"${filme.title}"`,
                    filme.rating,
                    `"${filme.category}"`,
                    filme.dataAdicao,
                    filme.favorito ? 'Sim' : 'Não'
                ];
                
                if (incluirDetalhes) linha.push(`"${filme.overview || ''}"`);
                if (incluirPosters) linha.push(filme.poster_path ? `https://image.tmdb.org/t/p/w500${filme.poster_path}` : '');
                
                return linha.join(',');
            });
            
            const csvContent = [headers.join(','), ...linhas].join('\n');
            exportarCSV(csvContent, `${nomeArquivo}.csv`);
            break;
            
        case 'txt':
            let txtContent = `MINHA LISTA DE FILMES\n`;
            txtContent += `Exportado em: ${new Date().toLocaleDateString('pt-BR')}\n`;
            txtContent += `Total de filmes: ${catalogo.length}\n`;
            txtContent += `Média de notas: ${(catalogo.reduce((acc, filme) => acc + parseFloat(filme.rating), 0) / catalogo.length).toFixed(1)}\n\n`;
            
            catalogo.forEach((filme, index) => {
                txtContent += `${index + 1}. ${filme.title} (${parseFloat(filme.rating).toFixed(1)})\n`;
                txtContent += `   Categorias: ${filme.category}\n`;
                txtContent += `   Adicionado em: ${filme.dataAdicao}\n`;
                if (incluirDetalhes && filme.overview) {
                    txtContent += `   Descrição: ${filme.overview.substring(0, 100)}${filme.overview.length > 100 ? '...' : ''}\n`;
                }
                txtContent += '\n';
            });
            
            exportarTXT(txtContent, `${nomeArquivo}.txt`);
            break;
    }
    
    document.getElementById('modalExportacao').style.display = 'none';
    mostrarToast(`Lista exportada com ${catalogo.length} filmes!`, 'success');
}

function exportarJSON(dados, nomeArquivo) {
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportarCSV(conteudo, nomeArquivo) {
    const blob = new Blob(['\uFEFF' + conteudo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportarTXT(conteudo, nomeArquivo) {
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function atualizarResumo() {
    const resumoContainer = document.getElementById('resumoCategorias');
    const categorias = {};
    
    if (catalogo.length === 0) {
        resumoContainer.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 30px;">
                <i class="fas fa-chart-pie fa-3x" style="color: #4cc9f0; opacity: 0.5;"></i>
                <h4>Sem dados para exibir</h4>
                <p>Adicione filmes para ver estatísticas</p>
            </div>
        `;
        
        document.getElementById('totalCategoriasResumo').textContent = '0';
        document.getElementById('mediaGeralResumo').textContent = '0.0';
        return;
    }
    
    // Agrupar filmes por categoria
    catalogo.forEach(filme => {
        const cats = filme.category?.split(',').map(cat => cat.trim()) || ['Sem Categoria'];
        cats.forEach(cat => {
            if (!categorias[cat]) {
                categorias[cat] = {
                    count: 0,
                    totalRating: 0,
                    bestRating: 0,
                    bestMovie: '',
                    worstRating: 10,
                    worstMovie: '',
                    favoritos: 0
                };
            }
            categorias[cat].count++;
            const rating = parseFloat(filme.rating);
            categorias[cat].totalRating += rating;
            
            if (rating > categorias[cat].bestRating) {
                categorias[cat].bestRating = rating;
                categorias[cat].bestMovie = filme.title;
            }
            
            if (rating < categorias[cat].worstRating) {
                categorias[cat].worstRating = rating;
                categorias[cat].worstMovie = filme.title;
            }
            
            if (filme.favorito) {
                categorias[cat].favoritos++;
            }
        });
    });
    
    // Atualizar estatísticas gerais
    const totalCategorias = Object.keys(categorias).length;
    const mediaGeral = (catalogo.reduce((acc, filme) => acc + parseFloat(filme.rating), 0) / catalogo.length).toFixed(1);
    
    document.getElementById('totalCategoriasResumo').textContent = totalCategorias;
    document.getElementById('mediaGeralResumo').textContent = mediaGeral;
    
    // Exibir resumo por categoria
    resumoContainer.innerHTML = '';
    
    Object.entries(categorias).forEach(([categoria, dados]) => {
        const media = dados.totalRating / dados.count;
        const percentual = ((dados.count / catalogo.length) * 100).toFixed(1);
        
        const card = document.createElement('div');
        card.className = 'summary-card';
        card.innerHTML = `
            <div class="summary-card-header">
                <h4>${categoria}</h4>
                <span class="summary-percentage">${percentual}%</span>
            </div>
            <div class="summary-stats">
                <div class="stat-item">
                    <i class="fas fa-film"></i>
                    <div>
                        <span class="stat-value">${dados.count}</span>
                        <span class="stat-label">filme${dados.count !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                <div class="stat-item">
                    <i class="fas fa-star"></i>
                    <div>
                        <span class="stat-value">${media.toFixed(1)}</span>
                        <span class="stat-label">média</span>
                    </div>
                </div>
                <div class="stat-item">
                    <i class="fas fa-crown"></i>
                    <div>
                        <span class="stat-value" title="${dados.bestMovie}">${dados.bestRating.toFixed(1)}</span>
                        <span class="stat-label">melhor</span>
                    </div>
                </div>
                ${dados.favoritos > 0 ? `
                    <div class="stat-item">
                        <i class="fas fa-heart"></i>
                        <div>
                            <span class="stat-value">${dados.favoritos}</span>
                            <span class="stat-label">favorito${dados.favoritos !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                ` : ''}
            </div>
            <div class="summary-progress">
                <div class="progress-bar" style="width: ${percentual}%;"></div>
            </div>
        `;
        
        resumoContainer.appendChild(card);
    });
}

function criarGraficos() {
    const chartCategorias = document.getElementById('chartCategorias');
    const chartNotas = document.getElementById('chartNotas');
    
    if (catalogo.length === 0) {
        chartCategorias.innerHTML = '<p class="no-data">Sem dados para exibir</p>';
        chartNotas.innerHTML = '<p class="no-data">Sem dados para exibir</p>';
        return;
    }
    
    // Gráfico de categorias
    const categoriasContagem = {};
    catalogo.forEach(filme => {
        const cats = filme.category?.split(',').map(cat => cat.trim()) || ['Sem Categoria'];
        cats.forEach(cat => {
            categoriasContagem[cat] = (categoriasContagem[cat] || 0) + 1;
        });
    });
    
    const topCategorias = Object.entries(categoriasContagem)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    
    chartCategorias.innerHTML = `
        <div class="chart-bars">
            ${topCategorias.map(([categoria, quantidade]) => {
                const percentual = ((quantidade / catalogo.length) * 100).toFixed(1);
                return `
                    <div class="chart-bar">
                        <div class="bar-label">${categoria}</div>
                        <div class="bar-container">
                            <div class="bar-fill" style="width: ${percentual}%"></div>
                        </div>
                        <div class="bar-value">${quantidade} (${percentual}%)</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    // Gráfico de notas
    const distribuicaoNotas = {
        '0-2': 0, '2-4': 0, '4-6': 0, '6-8': 0, '8-10': 0
    };
    
    catalogo.forEach(filme => {
        const nota = parseFloat(filme.rating);
        if (nota >= 8) distribuicaoNotas['8-10']++;
        else if (nota >= 6) distribuicaoNotas['6-8']++;
        else if (nota >= 4) distribuicaoNotas['4-6']++;
        else if (nota >= 2) distribuicaoNotas['2-4']++;
        else distribuicaoNotas['0-2']++;
    });
    
    chartNotas.innerHTML = `
        <div class="chart-bars">
            ${Object.entries(distribuicaoNotas).map(([intervalo, quantidade]) => {
                const percentual = ((quantidade / catalogo.length) * 100).toFixed(1);
                return `
                    <div class="chart-bar">
                        <div class="bar-label">${intervalo}</div>
                        <div class="bar-container">
                            <div class="bar-fill" style="width: ${percentual}%"></div>
                        </div>
                        <div class="bar-value">${quantidade} (${percentual}%)</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function salvarCatalogo() {
    localStorage.setItem('catalogo', JSON.stringify(catalogo));
    exibirListaCompleta();
    gerarFiltrosCategoria();
    atualizarResumo();
    criarGraficos();
}

function showConfirmation(titulo, mensagem, callback) {
    const modal = document.getElementById('modalConfirmacao');
    const mensagemEl = document.getElementById('confirmMessage');
    
    document.getElementById('modalConfirmacao').querySelector('h3').textContent = titulo;
    mensagemEl.textContent = mensagem;
    
    const confirmBtn = document.getElementById('confirmOk');
    confirmBtn.onclick = () => {
        callback();
        modal.style.display = 'none';
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

// CSS adicional para a página de lista
const style = document.createElement('style');
style.textContent = `
    .action-buttons {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
    }
    
    .btn-small {
        padding: 8px 16px;
        font-size: 14px;
    }
    
    .filter-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
    }
    
    .filter-header h3 {
        margin: 0;
        color: var(--accent-blue);
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .filter-rating {
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .filter-rating label {
        display: block;
        color: var(--text-secondary);
        margin-bottom: 10px;
        font-size: 14px;
    }
    
    .rating-filter {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
    }
    
    .rating-filter-btn {
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-secondary);
        border: none;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        cursor: pointer;
        transition: var(--transition-default);
    }
    
    .rating-filter-btn:hover {
        background: rgba(255, 255, 255, 0.2);
    }
    
    .rating-filter-btn.active {
        background: var(--accent-blue);
        color: white;
    }
    
    .tag-count {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 11px;
        margin-left: 5px;
    }
    
    .movie-favorite-badge {
        position: absolute;
        top: 10px;
        left: 10px;
        background: var(--accent-yellow);
        color: #333;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2;
    }
    
    .favorite-btn.active {
        background: var(--accent-yellow);
        color: #333;
    }
    
    .summary {
        margin-top: 40px;
        background: var(--bg-card);
        border-radius: var(--border-radius);
        padding: 30px;
        backdrop-filter: blur(10px);
    }
    
    .summary-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 25px;
        padding-bottom: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .summary-header h3 {
        margin: 0;
        color: var(--accent-blue);
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .summary-stats {
        display: flex;
        gap: 15px;
    }
    
    .stat-badge {
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-secondary);
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    
    .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 20px;
    }
    
    .summary-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: var(--border-radius);
        padding: 20px;
        transition: var(--transition-default);
    }
    
    .summary-card:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-5px);
    }
    
    .summary-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
    }
    
    .summary-card-header h4 {
        margin: 0;
        color: var(--text-primary);
        font-size: 16px;
    }
    
    .summary-percentage {
        background: var(--accent-blue);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
    }
    
    .summary-stats {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
        margin-bottom: 15px;
    }
    
    .summary-stats .stat-item {
        display: flex;
        align-items: center;
        gap: 10px;
        background: none;
        padding: 0;
        backdrop-filter: none;
    }
    
    .summary-stats .stat-item i {
        font-size: 18px;
        color: var(--accent-blue);
    }
    
    .summary-stats .stat-value {
        font-size: 16px;
        font-weight: bold;
        color: var(--text-primary);
        display: block;
    }
    
    .summary-stats .stat-label {
        font-size: 12px;
        color: var(--text-secondary);
        display: block;
    }
    
    .summary-progress {
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        overflow: hidden;
        margin-top: 10px;
    }
    
    .progress-bar {
        height: 100%;
        background: var(--accent-blue);
        border-radius: 3px;
        transition: width 0.5s ease;
    }
    
    .charts {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 30px;
        margin-top: 40px;
    }
    
    .chart-container {
        background: var(--bg-card);
        border-radius: var(--border-radius);
        padding: 25px;
        backdrop-filter: blur(10px);
    }
    
    .chart-container h3 {
        margin: 0 0 20px 0;
        color: var(--accent-blue);
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 18px;
    }
    
    .chart {
        min-height: 200px;
    }
    
    .chart-bars {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }
    
    .chart-bar {
        display: flex;
        align-items: center;
        gap: 15px;
    }
    
    .bar-label {
        width: 60px;
        color: var(--text-secondary);
        font-size: 14px;
    }
    
    .bar-container {
        flex: 1;
        height: 20px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        overflow: hidden;
    }
    
    .bar-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--accent-blue), #4361ee);
        border-radius: 10px;
        transition: width 0.5s ease;
    }
    
    .bar-value {
        width: 80px;
        text-align: right;
        color: var(--text-secondary);
        font-size: 14px;
    }
    
    .no-data {
        text-align: center;
        color: var(--text-secondary);
        padding: 40px;
    }
    
    .no-filters {
        color: var(--text-secondary);
        font-style: italic;
        padding: 10px;
    }
    
    .export-options {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin: 20px 0;
    }
    
    .export-option {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 15px;
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: var(--border-radius);
        cursor: pointer;
        transition: var(--transition-default);
    }
    
    .export-option:hover {
        border-color: var(--accent-blue);
        background: rgba(76, 201, 240, 0.1);
    }
    
    .export-option.selected {
        border-color: var(--accent-blue);
        background: rgba(76, 201, 240, 0.2);
    }
    
    .export-option i {
        font-size: 24px;
        color: var(--accent-blue);
    }
    
    .export-option h4 {
        margin: 0 0 5px 0;
        color: var(--text-primary);
    }
    
    .export-option p {
        margin: 0;
        color: var(--text-secondary);
        font-size: 14px;
    }
    
    .export-advanced {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .export-advanced label {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--text-secondary);
        cursor: pointer;
    }
    
    .export-advanced input[type="checkbox"] {
        width: 18px;
        height: 18px;
        accent-color: var(--accent-blue);
    }
    
    @media (max-width: 768px) {
        .action-buttons {
            flex-direction: column;
            width: 100%;
        }
        
        .action-buttons button {
            width: 100%;
        }
        
        .charts {
            grid-template-columns: 1fr;
        }
        
        .summary-grid {
            grid-template-columns: 1fr;
        }
        
        .export-option {
            flex-direction: column;
            text-align: center;
        }
    }
`;

document.head.appendChild(style);

// Fechar modais ao clicar fora
window.addEventListener('click', (e) => {
    const modalExportacao = document.getElementById('modalExportacao');
    const modalConfirmacao = document.getElementById('modalConfirmacao');
    
    if (e.target === modalExportacao) {
        modalExportacao.style.display = 'none';
    }
    if (e.target === modalConfirmacao) {
        modalConfirmacao.style.display = 'none';
    }
});