// Todo Yönetici Sınıfı
class TodoManager {
    constructor() {
        this.version = 'v1.5.3';
        this.todos = this.loadTodos();
        this.currentFilter = 'all';
        this.currentCategory = 'all';
        this.editingId = null;
        this.currentView = this.loadViewMode();
        this.categories = {
            'genel': { icon: '📋', name: 'Genel', color: '#667eea' },
            'is': { icon: '💼', name: 'İş', color: '#4facfe' },
            'kisisel': { icon: '👤', name: 'Kişisel', color: '#43e97b' },
            'acil': { icon: '🚨', name: 'Acil', color: '#fa709a' },
            'alısveris': { icon: '🛒', name: 'Alışveriş', color: '#ffa726' },
            'saglik': { icon: '🏥', name: 'Sağlık', color: '#ef5350' },
            'egitim': { icon: '📚', name: 'Eğitim', color: '#ab47bc' }
        };
        this.priorities = {
            'yuksek': { icon: '🔴', name: 'Yüksek', color: '#ff4757', order: 1 },
            'orta': { icon: '📄', name: 'Orta', color: '#ffa726', order: 2 },
            'dusuk': { icon: '🟢', name: 'Düşük', color: '#2ed573', order: 3 }
        };
        this.init();
    }

    // Başlangıç fonksiyonu
    init() {
        this.bindEvents();
        this.initSortable();
        this.initShortcutsHelp();
        this.initViewMode();
        this.render();
        this.updateStats();
    }

    // Event listener'ları bağla
    bindEvents() {
        // Quick Add - Ana görev ekleme
        document.getElementById('quickAddBtn').addEventListener('click', () => this.quickAddTodo());
        document.getElementById('todoInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.quickAddTodo();
        });

        // Control butonları
        document.getElementById('filterToggle').addEventListener('click', () => this.toggleFilters());
        document.getElementById('advancedAdd').addEventListener('click', () => this.openAdvancedModal());
        document.getElementById('clearCompleted').addEventListener('click', () => this.clearCompleted());

        // Modal işlemleri
        document.getElementById('modalClose').addEventListener('click', () => this.closeModal());
        document.getElementById('modalCancel').addEventListener('click', () => this.closeModal());
        document.getElementById('modalAdd').addEventListener('click', () => this.addTodoFromModal());

        // Modal dışına tıklama
        document.getElementById('advancedModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('advancedModal')) {
                this.closeModal();
            }
        });

        // Compact filter butonları
        document.querySelectorAll('.mini-btn[data-filter]').forEach(btn => {
            btn.addEventListener('click', (e) => this.setFilter(e.target.dataset.filter));
        });

        // Kategori filtre butonları
        document.querySelectorAll('.category-mini[data-category]').forEach(btn => {
            btn.addEventListener('click', (e) => this.setCategoryFilter(e.target.dataset.category));
        });

        // Desktop Sidebar Navigation
        document.querySelectorAll('.nav-item[data-filter]').forEach(btn => {
            btn.addEventListener('click', (e) => this.setSidebarFilter(e.target.closest('.nav-item').dataset.filter));
        });
        document.querySelectorAll('.category-nav[data-category]').forEach(btn => {
            btn.addEventListener('click', (e) => this.setSidebarCategory(e.target.closest('.category-nav').dataset.category));
        });

        // View Toggle Navigation (Sidebar)
        document.querySelectorAll('.view-toggle[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => this.setViewMode(e.target.closest('.view-toggle').dataset.view));
        });

        // Mobile View Toggle Buttons
        document.querySelectorAll('.view-toggle-btn[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => this.setViewMode(e.target.closest('.view-toggle-btn').dataset.view));
        });

        // Todo listesi event delegation
        document.getElementById('todoList').addEventListener('click', (e) => this.handleTodoClick(e));
        document.getElementById('todoList').addEventListener('change', (e) => this.handleTodoChange(e));

        // Shortcuts help
        document.getElementById('shortcutsClose').addEventListener('click', () => this.hideShortcutsHelp());
        document.getElementById('helpButton').addEventListener('click', () => this.toggleShortcutsHelp());
    }

    // Drag & Drop sıralama başlat
    initSortable() {
        const todoList = document.getElementById('todoList');
        
        if (typeof Sortable !== 'undefined') {
            this.sortable = Sortable.create(todoList, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                handle: '.drag-handle',
                onEnd: (evt) => {
                    this.handleSortEnd(evt);
                },
                onStart: (evt) => {
                    this.showNotification('Görev sürükleniyor...', 'info');
                }
            });
        }
    }

    // Shortcuts help sistemi başlat
    initShortcutsHelp() {
        // 1 saniye sonra otomatik göster
        setTimeout(() => {
            this.showShortcutsHelpAuto();
        }, 1000);
    }

    // Otomatik shortcuts help göster (3 saniye sonra gizle)
    showShortcutsHelpAuto() {
        const shortcutsHelp = document.getElementById('shortcutsHelp');
        const helpButton = document.getElementById('helpButton');
        
        shortcutsHelp.classList.add('auto-hide');
        
        // 10 saniye sonra gizle ve help butonunu göster
        setTimeout(() => {
            shortcutsHelp.classList.remove('auto-hide');
            helpButton.classList.add('visible');
        }, 10000);
    }

    // Shortcuts help'i toggle et
    toggleShortcutsHelp() {
        const shortcutsHelp = document.getElementById('shortcutsHelp');
        
        if (shortcutsHelp.classList.contains('show')) {
            this.hideShortcutsHelp();
        } else {
            this.showShortcutsHelp();
        }
    }

    // Shortcuts help göster
    showShortcutsHelp() {
        const shortcutsHelp = document.getElementById('shortcutsHelp');
        shortcutsHelp.classList.add('show');
    }

    // Shortcuts help gizle
    hideShortcutsHelp() {
        const shortcutsHelp = document.getElementById('shortcutsHelp');
        shortcutsHelp.classList.remove('show');
    }

    // Sıralama bittiğinde çalışacak fonksiyon
    handleSortEnd(evt) {
        const oldIndex = evt.oldIndex;
        const newIndex = evt.newIndex;
        
        if (oldIndex === newIndex) return;
        
        // Mevcut filtrelenmiş todos'u al
        const filteredTodos = this.getFilteredTodos();
        
        // Hareket edilen elemanı bul
        const movedTodo = filteredTodos[oldIndex];
        
        // Ana todos dizisinden elemanın pozisyonunu bul
        const todoIndex = this.todos.findIndex(t => t.id === movedTodo.id);
        
        // Ana dizinden elemanı çıkar
        const [todo] = this.todos.splice(todoIndex, 1);
        
        // Yeni pozisyonu hesapla
        let targetIndex;
        if (newIndex === 0) {
            targetIndex = 0;
        } else {
            const targetTodo = filteredTodos[newIndex - (newIndex > oldIndex ? 0 : 1)];
            targetIndex = this.todos.findIndex(t => t.id === targetTodo.id);
            if (newIndex > oldIndex) targetIndex++;
        }
        
        // Yeni pozisyona ekle
        this.todos.splice(targetIndex, 0, todo);
        
        this.saveTodos();
        this.showNotification('Görev sırası güncellendi!', 'success');
    }

    // Hızlı görev ekleme
    quickAddTodo() {
        const input = document.getElementById('todoInput');
        const text = input.value.trim();

        if (!text) {
            this.showNotification('Lütfen bir görev giriniz!', 'error');
            return;
        }

        if (text.length > 100) {
            this.showNotification('Görev metni çok uzun! (Max 100 karakter)', 'error');
            return;
        }

        // Smart defaults - basit AI benzeri mantık
        let category = 'genel';
        let priority = 'orta';

        // Anahtar kelimelerle kategori tahmini
        const lowercaseText = text.toLowerCase();
        if (lowercaseText.includes('iş') || lowercaseText.includes('toplantı') || lowercaseText.includes('proje')) {
            category = 'is';
        } else if (lowercaseText.includes('alışveriş') || lowercaseText.includes('market') || lowercaseText.includes('satın')) {
            category = 'alısveris';
        } else if (lowercaseText.includes('doktor') || lowercaseText.includes('hastane') || lowercaseText.includes('ilaç')) {
            category = 'saglik';
        } else if (lowercaseText.includes('acil') || lowercaseText.includes('önemli') || text.includes('!')) {
            category = 'acil';
            priority = 'yuksek';
        }

        const todo = {
            id: Date.now(),
            text: text,
            category: category,
            priority: priority,
            dueDate: null,
            completed: false,
            createdAt: new Date().toLocaleDateString('tr-TR'),
            createdTime: new Date().toLocaleTimeString('tr-TR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        };

        this.todos.unshift(todo);
        this.saveTodos();
        this.render();
        this.updateStats();
        
        input.value = '';
        input.focus();
        
        this.showNotification('Görev hızla eklendi! 🚀', 'success');
    }

    // Detaylı görev ekleme (eski addTodo)
    addTodo() {
        const input = document.getElementById('todoInput');
        const text = input.value.trim();

        if (!text) {
            this.showNotification('Lütfen bir görev giriniz!', 'error');
            return;
        }

        if (text.length > 100) {
            this.showNotification('Görev metni çok uzun! (Max 100 karakter)', 'error');
            return;
        }

        const categorySelect = document.getElementById('categorySelect');
        const prioritySelect = document.getElementById('prioritySelect');
        const dueDateInput = document.getElementById('dueDateInput');
        const category = categorySelect.value;
        const priority = prioritySelect.value;
        const dueDate = dueDateInput.value;
        
        const todo = {
            id: Date.now(),
            text: text,
            category: category,
            priority: priority,
            dueDate: dueDate || null,
            completed: false,
            createdAt: new Date().toLocaleDateString('tr-TR'),
            createdTime: new Date().toLocaleTimeString('tr-TR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        };

        this.todos.unshift(todo);
        this.saveTodos();
        this.render();
        this.updateStats();
        
        input.value = '';
        dueDateInput.value = '';
        input.focus();
        
        this.showNotification('Görev başarıyla eklendi!', 'success');
    }

    // Görev durumunu değiştir
    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            todo.completedAt = todo.completed ? new Date().toLocaleDateString('tr-TR') : null;
            this.saveTodos();
            this.render();
            this.updateStats();
            
            const message = todo.completed ? 'Görev tamamlandı!' : 'Görev aktif duruma getirildi!';
            this.showNotification(message, 'success');
        }
    }

    // Görev sil
    deleteTodo(id) {
        if (confirm('Bu görevi silmek istediğinizden emin misiniz?')) {
            this.todos = this.todos.filter(t => t.id !== id);
            this.saveTodos();
            this.render();
            this.updateStats();
            this.showNotification('Görev silindi!', 'success');
        }
    }

    // Görev düzenle
    editTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        const newText = prompt('Görevini düzenle:', todo.text);
        if (newText !== null && newText.trim() !== '') {
            if (newText.trim().length > 100) {
                this.showNotification('Görev metni çok uzun! (Max 100 karakter)', 'error');
                return;
            }
            
            todo.text = newText.trim();
            todo.updatedAt = new Date().toLocaleDateString('tr-TR');
            this.saveTodos();
            this.render();
            this.showNotification('Görev güncellendi!', 'success');
        }
    }

    // Filtre ayarla
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Aktif filtre butonunu güncelle
        document.querySelectorAll('.mini-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.mini-btn[data-filter="${filter}"]`).classList.add('active');
        
        this.render();
    }

    // Kategori filtresi ayarla
    setCategoryFilter(category) {
        this.currentCategory = category;
        
        // Aktif kategori filtre butonunu güncelle
        document.querySelectorAll('.category-mini').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.category-mini[data-category="${category}"]`).classList.add('active');
        
        this.render();
    }

    // Sidebar filtre ayarla
    setSidebarFilter(filter) {
        this.currentFilter = filter;
        
        // Sidebar aktif filtre butonunu güncelle
        document.querySelectorAll('.nav-item[data-filter]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.nav-item[data-filter="${filter}"]`).classList.add('active');
        
        // Mobil filtreleri de güncelle
        document.querySelectorAll('.mini-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const mobileBtn = document.querySelector(`.mini-btn[data-filter="${filter}"]`);
        if (mobileBtn) mobileBtn.classList.add('active');
        
        this.render();
        this.updateSidebarStats();
    }

    // Sidebar kategori filtresi ayarla
    setSidebarCategory(category) {
        this.currentCategory = category;
        
        // Sidebar aktif kategori butonunu güncelle  
        document.querySelectorAll('.category-nav').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.category-nav[data-category="${category}"]`).classList.add('active');
        
        // Mobil kategori filtrelerini de güncelle
        document.querySelectorAll('.category-mini').forEach(btn => {
            btn.classList.remove('active');
        });
        const mobileCatBtn = document.querySelector(`.category-mini[data-category="${category}"]`);
        if (mobileCatBtn) mobileCatBtn.classList.add('active');
        
        this.render();
        this.updateSidebarStats();
    }

    // Filtreleri toggle et
    toggleFilters() {
        const filtersPanel = document.getElementById('filtersPanel');
        const filterToggle = document.getElementById('filterToggle');
        
        filtersPanel.classList.toggle('active');
        filterToggle.style.background = filtersPanel.classList.contains('active') 
            ? 'rgba(120, 220, 232, 0.3)' 
            : 'rgba(255, 255, 255, 0.1)';
    }

    // Advanced modal aç
    openAdvancedModal() {
        const modal = document.getElementById('advancedModal');
        modal.classList.add('active');
        document.getElementById('modalTodoInput').focus();
    }

    // Modal kapat
    closeModal() {
        const modal = document.getElementById('advancedModal');
        modal.classList.remove('active');
        
        // Form alanlarını temizle
        document.getElementById('modalTodoInput').value = '';
        document.getElementById('modalCategorySelect').value = 'genel';
        document.getElementById('modalPrioritySelect').value = 'orta';
        document.getElementById('modalDueDateInput').value = '';
    }

    // Modal'dan görev ekle
    addTodoFromModal() {
        const text = document.getElementById('modalTodoInput').value.trim();
        const category = document.getElementById('modalCategorySelect').value;
        const priority = document.getElementById('modalPrioritySelect').value;
        const dueDate = document.getElementById('modalDueDateInput').value;

        if (!text) {
            this.showNotification('Lütfen bir görev giriniz!', 'error');
            return;
        }

        if (text.length > 100) {
            this.showNotification('Görev metni çok uzun! (Max 100 karakter)', 'error');
            return;
        }

        const todo = {
            id: Date.now(),
            text: text,
            category: category,
            priority: priority,
            dueDate: dueDate || null,
            completed: false,
            createdAt: new Date().toLocaleDateString('tr-TR'),
            createdTime: new Date().toLocaleTimeString('tr-TR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        };

        this.todos.unshift(todo);
        this.saveTodos();
        this.render();
        this.updateStats();
        this.closeModal();
        
        this.showNotification('Detaylı görev eklendi! ✨', 'success');
    }

    // Tamamlanan görevleri temizle
    clearCompleted() {
        const completedCount = this.todos.filter(t => t.completed).length;
        
        if (completedCount === 0) {
            this.showNotification('Temizlenecek tamamlanmış görev yok!', 'info');
            return;
        }

        if (confirm(`${completedCount} tamamlanmış görevi silmek istediğinizden emin misiniz?`)) {
            this.todos = this.todos.filter(t => !t.completed);
            this.saveTodos();
            this.render();
            this.updateStats();
            this.showNotification(`${completedCount} tamamlanmış görev temizlendi!`, 'success');
        }
    }

    // Filtrelenmiş todoları getir
    getFilteredTodos() {
        let filtered = this.todos;
        
        // Durum filtresini uygula
        switch (this.currentFilter) {
            case 'active':
                filtered = filtered.filter(t => !t.completed);
                break;
            case 'completed':
                filtered = filtered.filter(t => t.completed);
                break;
        }
        
        // Kategori filtresini uygula
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(t => t.category === this.currentCategory);
        }
        
        // Öncelik sırasına göre sırala (yüksek öncelik üstte)
        filtered.sort((a, b) => {
            const priorityA = this.priorities[a.priority || 'orta'].order;
            const priorityB = this.priorities[b.priority || 'orta'].order;
            return priorityA - priorityB;
        });
        
        return filtered;
    }

    // Todo listesini render et
    render() {
        const todoList = document.getElementById('todoList');
        const emptyState = document.getElementById('emptyState');
        const filteredTodos = this.getFilteredTodos();

        if (filteredTodos.length === 0) {
            todoList.innerHTML = '';
            emptyState.classList.remove('hidden');
            
            // Boş durumu filtreye göre güncelle
            const emptyMessages = {
                'all': {
                    icon: 'fas fa-clipboard-list',
                    title: 'Henüz görev yok',
                    description: 'Yukarıdan yeni bir görev ekleyebilirsiniz'
                },
                'active': {
                    icon: 'fas fa-check-circle',
                    title: 'Aktif görev yok',
                    description: 'Tüm görevleriniz tamamlanmış!'
                },
                'completed': {
                    icon: 'fas fa-tasks',
                    title: 'Tamamlanmış görev yok',
                    description: 'Henüz hiç görev tamamlanmamış'
                }
            };

            const message = emptyMessages[this.currentFilter];
            emptyState.innerHTML = `
                <i class="${message.icon}"></i>
                <h3>${message.title}</h3>
                <p>${message.description}</p>
            `;
            return;
        }

        emptyState.classList.add('hidden');

        todoList.innerHTML = filteredTodos.map(todo => {
            const category = this.categories[todo.category || 'genel'];
            const priority = this.priorities[todo.priority || 'orta'];
            return `
            <li class="todo-item ${todo.completed ? 'completed' : ''} priority-${todo.priority || 'orta'}" data-id="${todo.id}">
                <div class="drag-handle">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" data-id="${todo.id}">
                </div>
                <div class="todo-priority" title="${priority.name} Öncelik">
                    ${priority.icon}
                </div>
                <div class="todo-category" title="${category.name}">
                    ${category.icon}
                </div>
                <div class="todo-text ${todo.completed ? 'completed' : ''}">${this.escapeHtml(todo.text)}</div>
                ${todo.dueDate ? `<div class="todo-due-date ${this.isDueDateOverdue(todo.dueDate) && !todo.completed ? 'overdue' : ''}" title="Son tarih: ${this.formatDueDate(todo.dueDate)}">
                    <i class="fas fa-calendar-alt"></i>
                    ${this.formatDueDate(todo.dueDate)}
                </div>` : ''}
                <div class="todo-actions">
                    <button class="todo-btn edit-btn" data-action="edit" data-id="${todo.id}" title="Düzenle">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="todo-btn delete-btn" data-action="delete" data-id="${todo.id}" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </li>`;
        }).join('');
        
        // Sortable'ı yeniden başlat (DOM güncellendiği için)
        if (this.sortable) {
            this.sortable.destroy();
        }
        this.initSortable();
    }

    // İstatistikleri güncelle
    updateStats() {
        const total = this.todos.length;
        const completed = this.todos.filter(t => t.completed).length;
        
        document.getElementById('totalCount').textContent = total;
        document.getElementById('completedCount').textContent = completed;
        
        // Temizle butonunu göster/gizle
        const clearBtn = document.getElementById('clearCompleted');
        clearBtn.style.display = completed > 0 ? 'flex' : 'none';

        // Sidebar istatistiklerini güncelle
        this.updateSidebarStats();
    }

    // Sidebar istatistiklerini güncelle  
    updateSidebarStats() {
        const total = this.todos.length;
        const active = this.todos.filter(t => !t.completed).length;
        const completed = this.todos.filter(t => t.completed).length;

        // Durum istatistikleri
        const allCountEl = document.getElementById('sidebarAllCount');
        const activeCountEl = document.getElementById('sidebarActiveCount');
        const completedCountEl = document.getElementById('sidebarCompletedCount');
        
        if (allCountEl) allCountEl.textContent = total;
        if (activeCountEl) activeCountEl.textContent = active;
        if (completedCountEl) completedCountEl.textContent = completed;

        // Kategori istatistikleri
        const allCatCountEl = document.getElementById('sidebarAllCatCount');
        if (allCatCountEl) allCatCountEl.textContent = total;

        // Her kategori için sayıları güncelle
        const categoryIds = {
            'is': 'sidebarIsCount',
            'kisisel': 'sidebarKisiselCount', 
            'acil': 'sidebarAcilCount',
            'alısveris': 'sidebarAlisverisCount',
            'saglik': 'sidebarSaglikCount',
            'egitim': 'sidebarEgitimCount'
        };

        Object.entries(categoryIds).forEach(([category, id]) => {
            const count = this.todos.filter(t => t.category === category).length;
            const countEl = document.getElementById(id);
            if (countEl) countEl.textContent = count;
        });
    }

    // View Mode Functions
    loadViewMode() {
        return localStorage.getItem('todoAppViewMode') || 'auto';
    }

    saveViewMode() {
        localStorage.setItem('todoAppViewMode', this.currentView);
    }

    initViewMode() {
        this.applyViewMode();
        this.updateViewButtons();
    }

    setViewMode(view) {
        this.currentView = view;
        this.saveViewMode();
        this.applyViewMode();
        this.updateViewButtons();
        this.showNotification(`Görünüm modu: ${this.getViewDisplayName(view)}`, 'success');
    }

    applyViewMode() {
        const body = document.body;
        
        // Mevcut sınıfları temizle
        body.classList.remove('force-mobile', 'force-desktop');
        
        // Yeni sınıfı uygula
        if (this.currentView === 'mobile') {
            body.classList.add('force-mobile');
        } else if (this.currentView === 'desktop') {
            body.classList.add('force-desktop');
        }
        // 'auto' için hiçbir sınıf eklenmez, responsive CSS devreye girer
    }

    updateViewButtons() {
        // Sidebar view toggle buttons
        document.querySelectorAll('.view-toggle').forEach(btn => {
            const isActive = btn.dataset.view === this.currentView;
            btn.classList.toggle('active', isActive);
            
            const indicator = btn.querySelector('.view-indicator');
            if (indicator) {
                indicator.classList.toggle('active', isActive);
            }
        });

        // Mobile view toggle buttons
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
            const isActive = btn.dataset.view === this.currentView;
            btn.classList.toggle('active', isActive);
        });
    }

    getViewDisplayName(view) {
        const names = {
            'auto': 'Otomatik',
            'desktop': 'Desktop',
            'mobile': 'Mobil'
        };
        return names[view] || view;
    }

    // Todo list click handler
    handleTodoClick(e) {
        const id = parseInt(e.target.dataset.id);
        const action = e.target.dataset.action;

        if (e.target.classList.contains('todo-checkbox')) {
            this.toggleTodo(id);
        } else if (action === 'edit') {
            this.editTodo(id);
        } else if (action === 'delete') {
            this.deleteTodo(id);
        }
    }

    // Todo change handler (checkbox için)
    handleTodoChange(e) {
        if (e.target.type === 'checkbox') {
            const id = parseInt(e.target.dataset.id);
            this.toggleTodo(id);
        }
    }

    // HTML escape
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Due date formatla
    formatDueDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        // Sadece tarihi karşılaştır, saati ignore et
        const dueDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
        
        if (dueDateOnly.getTime() === todayOnly.getTime()) {
            return 'Bugün';
        } else if (dueDateOnly.getTime() === tomorrowOnly.getTime()) {
            return 'Yarın';
        } else {
            return date.toLocaleDateString('tr-TR', { 
                day: 'numeric', 
                month: 'short' 
            });
        }
    }

    // Due date geçmiş mi kontrolü
    isDueDateOverdue(dateString) {
        const dueDate = new Date(dateString);
        const today = new Date();
        
        // Sadece tarihi karşılaştır
        const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        return dueDateOnly < todayOnly;
    }

    // Local storage'a kaydet
    saveTodos() {
        try {
            localStorage.setItem('glassmorphism-todos', JSON.stringify(this.todos));
        } catch (error) {
            console.error('Todo kaydetme hatası:', error);
            this.showNotification('Veriler kaydedilemedi!', 'error');
        }
    }

    // Local storage'dan yükle
    loadTodos() {
        try {
            const saved = localStorage.getItem('glassmorphism-todos');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Todo yükleme hatası:', error);
            return [];
        }
    }

    // Bildirim göster
    showNotification(message, type = 'info') {
        // Önceki bildirimleri temizle
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        // Notification CSS'i ekle
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 10px;
                    color: white;
                    font-weight: 500;
                    z-index: 1000;
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    animation: slideInNotification 0.3s ease, slideOutNotification 0.3s ease 2.7s forwards;
                    min-width: 250px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                }
                .notification.success { background: rgba(76, 175, 80, 0.9); }
                .notification.error { background: rgba(244, 67, 54, 0.9); }
                .notification.info { background: rgba(33, 150, 243, 0.9); }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                @keyframes slideInNotification {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutNotification {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // 3 saniye sonra otomatik kaldır
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    // Bildirim ikonu getir
    getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'info': 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    // İstatistik bilgileri (gelecek özellik için)
    getStats() {
        const now = new Date();
        const today = now.toLocaleDateString('tr-TR');
        
        return {
            total: this.todos.length,
            completed: this.todos.filter(t => t.completed).length,
            active: this.todos.filter(t => !t.completed).length,
            todayCreated: this.todos.filter(t => t.createdAt === today).length,
            todayCompleted: this.todos.filter(t => t.completedAt === today).length
        };
    }

    // Export/Import fonksiyonları (gelecek özellik)
    exportTodos() {
        const data = {
            todos: this.todos,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `todos-${new Date().toLocaleDateString('tr-TR')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Görevler dışa aktarıldı!', 'success');
    }

    importTodos(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.todos && Array.isArray(data.todos)) {
                    this.todos = data.todos;
                    this.saveTodos();
                    this.render();
                    this.updateStats();
                    this.showNotification('Görevler içe aktarıldı!', 'success');
                } else {
                    throw new Error('Geçersiz dosya formatı');
                }
            } catch (error) {
                this.showNotification('Dosya içe aktarılamadı!', 'error');
            }
        };
        reader.readAsText(file);
    }
}

// Sayfa yüklendiğinde uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    window.todoManager = new TodoManager();
    
    // Konsol mesajı
    console.log(`🌟 Glassmorphism Todo App ${window.todoManager.version} başarıyla yüklendi!`);
    console.log('📊 İstatistikler için: todoManager.getStats()');
    console.log('💾 Dışa aktarmak için: todoManager.exportTodos()');
});

// Service Worker kaydı (PWA için - gelecek özellik)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // navigator.serviceWorker.register('/sw.js')
        //     .then(registration => console.log('SW registered'))
        //     .catch(error => console.log('SW registration failed'));
    });
}

// Tema değiştirme fonksiyonu (gelecek özellik için)
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Modal açıkken shortcuts'ları devre dışı bırak
    if (document.getElementById('advancedModal').classList.contains('active')) {
        return;
    }
    
    // Ctrl/Cmd + Enter: Hızlı görev ekleme
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const input = document.getElementById('todoInput');
        if (document.activeElement !== input) {
            input.focus();
        } else {
            window.todoManager.quickAddTodo();
        }
    }
    
    // Ctrl/Cmd + D: Detaylı ekleme modal'ı aç
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        window.todoManager.openAdvancedModal();
    }
    
    // Ctrl/Cmd + M: Mobil görünüm
    if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        window.todoManager.setViewMode('mobile');
    }
    
    // Ctrl/Cmd + Shift + D: Desktop görünüm
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        window.todoManager.setViewMode('desktop');
    }
    
    // Ctrl/Cmd + R: Otomatik görünüm (Responsive)
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        window.todoManager.setViewMode('auto');
    }
    
    // Esc: Input'u temizle veya modal/shortcuts kapat
    if (e.key === 'Escape') {
        const input = document.getElementById('todoInput');
        const shortcutsHelp = document.getElementById('shortcutsHelp');
        
        if (shortcutsHelp.classList.contains('show')) {
            window.todoManager.hideShortcutsHelp();
        } else if (document.activeElement === input) {
            input.value = '';
            input.blur();
        }
    }
    
    // F1 veya ?: Help'i toggle et
    if (e.key === 'F1' || (e.shiftKey && e.key === '?')) {
        e.preventDefault();
        window.todoManager.toggleShortcutsHelp();
    }
});

// Görünürlük API'si ile performans optimizasyonu
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Sayfa görünür hale geldiğinde verileri yenile
        if (window.todoManager) {
            window.todoManager.render();
            window.todoManager.updateStats();
        }
    }
});