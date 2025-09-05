// Storage Manager Sınıfı
class StorageManager {
    constructor() {
        this.storageType = localStorage.getItem('storageType') || 'localStorage';
        this.supabaseClient = null;
        this.isRealtimeEnabled = false;
        this.realtimeSubscription = null;
        this.initializeStorage();
    }

    async initializeStorage() {
        if (this.storageType === 'supabase') {
            await this.initializeSupabase();
        }
    }

    async initializeSupabase() {
        const config = this.getSupabaseConfig();
        if (config.url && config.key) {
            try {
                this.supabaseClient = window.supabase.createClient(config.url, config.key);
                await this.setupRealtimeSubscription();
                console.log('Supabase initialized successfully');
            } catch (error) {
                console.error('Supabase initialization failed:', error);
                this.storageType = 'localStorage';
            }
        } else {
            this.storageType = 'localStorage';
        }
    }

    getSupabaseConfig() {
        return {
            url: localStorage.getItem('supabaseUrl') || '',
            key: localStorage.getItem('supabaseKey') || ''
        };
    }

    async testSupabaseConnection(url, key) {
        try {
            const client = window.supabase.createClient(url, key);
            const { data, error } = await client.from('todos').select('count').limit(1);
            return { success: !error, error: error?.message };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async setupRealtimeSubscription() {
        if (!this.supabaseClient || this.isRealtimeEnabled) return;

        try {
            this.realtimeSubscription = this.supabaseClient
                .channel('todos-changes')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'todos' },
                    (payload) => {
                        if (window.todoManager) {
                            window.todoManager.handleRealtimeUpdate(payload);
                        }
                    }
                )
                .subscribe();
            
            this.isRealtimeEnabled = true;
            console.log('Real-time subscription enabled');
        } catch (error) {
            console.error('Real-time setup failed:', error);
        }
    }

    async loadTodos() {
        if (this.storageType === 'supabase' && this.supabaseClient) {
            try {
                const { data, error } = await this.supabaseClient
                    .from('todos')
                    .select('*')
                    .order('order_index', { ascending: true })
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                return data || [];
            } catch (error) {
                console.error('Supabase load error:', error);
                return this.loadFromLocalStorage();
            }
        } else {
            return this.loadFromLocalStorage();
        }
    }

    loadFromLocalStorage() {
        try {
            return JSON.parse(localStorage.getItem('glassmorphism-todos')) || [];
        } catch {
            return [];
        }
    }

    async saveTodos(todos) {
        if (this.storageType === 'supabase' && this.supabaseClient) {
            // Supabase otomatik olarak real-time güncellemeler yapar
            // Bu method artık sadece localStorage için kullanılacak
        } else {
            localStorage.setItem('glassmorphism-todos', JSON.stringify(todos));
        }
    }

    async addTodo(todo) {
        if (this.storageType === 'supabase' && this.supabaseClient) {
            try {
                const { data, error } = await this.supabaseClient
                    .from('todos')
                    .insert([{
                        text: todo.text,
                        completed: todo.completed || false,
                        category: todo.category || 'genel',
                        priority: todo.priority || 'orta',
                        due_date: todo.dueDate || null,
                        order_index: todo.orderIndex || 0,
                        created_at: new Date().toISOString()
                    }])
                    .select()
                    .single();
                
                if (error) throw error;
                return data;
            } catch (error) {
                console.error('Supabase add error:', error);
                throw error;
            }
        } else {
            // localStorage için mevcut logic
            todo.id = Date.now();
            todo.createdAt = new Date().toISOString();
            return todo;
        }
    }

    async updateTodo(id, updates) {
        if (this.storageType === 'supabase' && this.supabaseClient) {
            try {
                const { data, error } = await this.supabaseClient
                    .from('todos')
                    .update({
                        text: updates.text,
                        completed: updates.completed,
                        category: updates.category,
                        priority: updates.priority,
                        due_date: updates.dueDate,
                        order_index: updates.orderIndex,
                        completed_at: updates.completed ? new Date().toISOString() : null
                    })
                    .eq('id', id)
                    .select()
                    .single();
                
                if (error) throw error;
                return data;
            } catch (error) {
                console.error('Supabase update error:', error);
                throw error;
            }
        }
        // localStorage için mevcut logic TodoManager'da kalacak
    }

    async deleteTodo(id) {
        if (this.storageType === 'supabase' && this.supabaseClient) {
            try {
                const { error } = await this.supabaseClient
                    .from('todos')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
                return true;
            } catch (error) {
                console.error('Supabase delete error:', error);
                throw error;
            }
        }
        // localStorage için mevcut logic TodoManager'da kalacak
    }

    async updateTodosOrder(todos) {
        if (this.storageType === 'supabase' && this.supabaseClient) {
            try {
                const updates = todos.map((todo, index) => ({
                    id: todo.id,
                    order_index: index
                }));

                for (const update of updates) {
                    await this.supabaseClient
                        .from('todos')
                        .update({ order_index: update.order_index })
                        .eq('id', update.id);
                }
                return true;
            } catch (error) {
                console.error('Supabase order update error:', error);
                throw error;
            }
        }
        // localStorage için mevcut logic
    }

    async migrateToSupabase(todos) {
        if (!this.supabaseClient) return false;

        try {
            // Mevcut Supabase verilerini temizle
            await this.supabaseClient.from('todos').delete().gte('id', 0);
            
            // LocalStorage verilerini Supabase'e aktar
            if (todos.length > 0) {
                const supabaseTodos = todos.map(todo => ({
                    text: todo.text,
                    completed: todo.completed || false,
                    category: todo.category || 'genel',
                    priority: todo.priority || 'orta',
                    due_date: todo.dueDate || null,
                    order_index: todo.orderIndex || 0,
                    created_at: todo.createdAt || new Date().toISOString(),
                    completed_at: todo.completedAt || null
                }));

                const { error } = await this.supabaseClient
                    .from('todos')
                    .insert(supabaseTodos);
                
                if (error) throw error;
            }

            console.log('Migration to Supabase completed');
            return true;
        } catch (error) {
            console.error('Migration to Supabase failed:', error);
            return false;
        }
    }

    async migrateToLocalStorage(todos) {
        try {
            localStorage.setItem('glassmorphism-todos', JSON.stringify(todos));
            console.log('Migration to localStorage completed');
            return true;
        } catch (error) {
            console.error('Migration to localStorage failed:', error);
            return false;
        }
    }

    setStorageType(type) {
        this.storageType = type;
        localStorage.setItem('storageType', type);
    }

    saveSupabaseConfig(url, key) {
        localStorage.setItem('supabaseUrl', url);
        localStorage.setItem('supabaseKey', key);
    }

    disconnect() {
        if (this.realtimeSubscription) {
            this.realtimeSubscription.unsubscribe();
            this.isRealtimeEnabled = false;
        }
        this.supabaseClient = null;
    }
}

// Todo Yönetici Sınıfı
class TodoManager {
    constructor() {
        this.version = 'v1.6.0';
        this.storageManager = new StorageManager();
        this.todos = [];
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
    async init() {
        this.bindEvents();
        this.initSortable();
        this.initShortcutsHelp();
        this.initViewMode();
        await this.loadTodos();
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

        // Settings modal events
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettingsModal());
        document.getElementById('settingsCancel').addEventListener('click', () => this.closeSettingsModal());
        document.querySelector('#settingsModal .modal-close').addEventListener('click', () => this.closeSettingsModal());
        document.getElementById('settingsSave').addEventListener('click', () => this.saveSettings());
        
        // Settings modal dışına tıklama
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('settingsModal')) {
                this.closeSettingsModal();
            }
        });

        // Storage type değişimi
        document.querySelectorAll('input[name="storageType"]').forEach(radio => {
            radio.addEventListener('change', () => this.handleStorageTypeChange());
        });

        // Supabase config events
        document.getElementById('testConnection').addEventListener('click', () => this.testSupabaseConnection());
        document.getElementById('toggleKey').addEventListener('click', () => this.togglePasswordVisibility());
        
        // Migration events
        document.getElementById('migrateData').addEventListener('click', () => this.migrateData());
        document.getElementById('skipMigration').addEventListener('click', () => this.skipMigration());

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

        // View Toggle Navigation (Sidebar - Mini Buttons)
        document.querySelectorAll('.view-mini-btn[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => this.setViewMode(e.target.closest('.view-mini-btn').dataset.view));
        });

        // Mobile View Icon Buttons
        document.querySelectorAll('.mobile-view-icon[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => this.setViewMode(e.target.closest('.mobile-view-icon').dataset.view));
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
        // Sidebar view mini buttons
        document.querySelectorAll('.view-mini-btn').forEach(btn => {
            const isActive = btn.dataset.view === this.currentView;
            btn.classList.toggle('active', isActive);
        });

        // Mobile view icon buttons
        document.querySelectorAll('.mobile-view-icon').forEach(btn => {
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
    async loadTodos() {
        try {
            this.todos = await this.storageManager.loadTodos();
            return this.todos;
        } catch (error) {
            console.error('Todo yükleme hatası:', error);
            this.todos = [];
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

    // Settings Modal Yönetimi
    openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        const currentStorage = this.storageManager.storageType;
        
        // Mevcut ayarları yükle
        document.getElementById(currentStorage).checked = true;
        this.handleStorageTypeChange();
        
        // Supabase config varsa yükle
        if (currentStorage === 'supabase') {
            const config = this.storageManager.getSupabaseConfig();
            document.getElementById('supabaseUrl').value = config.url;
            document.getElementById('supabaseKey').value = config.key;
        }
        
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeSettingsModal() {
        document.getElementById('settingsModal').style.display = 'none';
        document.body.style.overflow = '';
        
        // Form temizle
        document.getElementById('connectionStatus').textContent = '';
        document.getElementById('connectionStatus').className = 'connection-status';
        document.getElementById('migrationSection').style.display = 'none';
    }

    handleStorageTypeChange() {
        const selectedType = document.querySelector('input[name="storageType"]:checked').value;
        const supabaseConfig = document.getElementById('supabaseConfig');
        const migrationSection = document.getElementById('migrationSection');
        
        if (selectedType === 'supabase') {
            supabaseConfig.style.display = 'block';
        } else {
            supabaseConfig.style.display = 'none';
        }

        // Migration section'ı storage type değişikliğinde göster
        if (selectedType !== this.storageManager.storageType) {
            migrationSection.style.display = 'block';
        } else {
            migrationSection.style.display = 'none';
        }
    }

    async testSupabaseConnection() {
        const url = document.getElementById('supabaseUrl').value.trim();
        const key = document.getElementById('supabaseKey').value.trim();
        const status = document.getElementById('connectionStatus');
        const testBtn = document.getElementById('testConnection');
        
        if (!url || !key) {
            status.textContent = 'Lütfen URL ve API anahtarını girin';
            status.className = 'connection-status error';
            return;
        }

        testBtn.disabled = true;
        status.textContent = 'Bağlantı test ediliyor...';
        status.className = 'connection-status loading';

        try {
            const result = await this.storageManager.testSupabaseConnection(url, key);
            
            if (result.success) {
                status.textContent = '✅ Bağlantı başarılı!';
                status.className = 'connection-status success';
            } else {
                status.textContent = `❌ Bağlantı hatası: ${result.error}`;
                status.className = 'connection-status error';
            }
        } catch (error) {
            status.textContent = `❌ Test hatası: ${error.message}`;
            status.className = 'connection-status error';
        } finally {
            testBtn.disabled = false;
        }
    }

    togglePasswordVisibility() {
        const keyInput = document.getElementById('supabaseKey');
        const toggleBtn = document.getElementById('toggleKey');
        const icon = toggleBtn.querySelector('i');
        
        if (keyInput.type === 'password') {
            keyInput.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            keyInput.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    async saveSettings() {
        const selectedType = document.querySelector('input[name="storageType"]:checked').value;
        const saveBtn = document.getElementById('settingsSave');
        
        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kaydediliyor...';

            if (selectedType === 'supabase') {
                const url = document.getElementById('supabaseUrl').value.trim();
                const key = document.getElementById('supabaseKey').value.trim();
                
                if (!url || !key) {
                    throw new Error('Supabase URL ve API anahtarı gerekli');
                }

                // Bağlantıyı test et
                const result = await this.storageManager.testSupabaseConnection(url, key);
                if (!result.success) {
                    throw new Error(`Supabase bağlantısı başarısız: ${result.error}`);
                }

                // Config'i kaydet
                this.storageManager.saveSupabaseConfig(url, key);
                
                // Storage type'ı değiştir
                this.storageManager.setStorageType('supabase');
                await this.storageManager.initializeSupabase();
            } else {
                // LocalStorage'a geçiş
                this.storageManager.disconnect();
                this.storageManager.setStorageType('localStorage');
            }

            this.showNotification('Ayarlar başarıyla kaydedildi!', 'success');
            this.closeSettingsModal();

            // Verileri yeniden yükle
            await this.loadTodos();
            this.render();
            this.updateStats();

        } catch (error) {
            this.showNotification(`Ayar kaydetme hatası: ${error.message}`, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Kaydet';
        }
    }

    async migrateData() {
        const selectedType = document.querySelector('input[name="storageType"]:checked').value;
        const currentType = this.storageManager.storageType;
        const migrateBtn = document.getElementById('migrateData');
        
        try {
            migrateBtn.disabled = true;
            migrateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aktarılıyor...';

            if (selectedType === 'supabase' && currentType === 'localStorage') {
                // LocalStorage'dan Supabase'e migration
                const success = await this.storageManager.migrateToSupabase(this.todos);
                if (!success) throw new Error('Supabase migration başarısız');
                
            } else if (selectedType === 'localStorage' && currentType === 'supabase') {
                // Supabase'den localStorage'a migration
                const success = await this.storageManager.migrateToLocalStorage(this.todos);
                if (!success) throw new Error('LocalStorage migration başarısız');
            }

            this.showNotification('Veriler başarıyla aktarıldı!', 'success');
            document.getElementById('migrationSection').style.display = 'none';

        } catch (error) {
            this.showNotification(`Migration hatası: ${error.message}`, 'error');
        } finally {
            migrateBtn.disabled = false;
            migrateBtn.innerHTML = '<i class="fas fa-upload"></i> Verileri Aktar';
        }
    }

    skipMigration() {
        document.getElementById('migrationSection').style.display = 'none';
        this.showNotification('Migration atlandı', 'info');
    }

    // Real-time güncelleme işleyici
    handleRealtimeUpdate(payload) {
        console.log('Real-time update:', payload);
        
        switch (payload.eventType) {
            case 'INSERT':
                this.todos.push(this.convertSupabaseTodo(payload.new));
                break;
            case 'UPDATE':
                const updateIndex = this.todos.findIndex(t => t.id === payload.new.id);
                if (updateIndex !== -1) {
                    this.todos[updateIndex] = this.convertSupabaseTodo(payload.new);
                }
                break;
            case 'DELETE':
                this.todos = this.todos.filter(t => t.id !== payload.old.id);
                break;
        }
        
        this.render();
        this.updateStats();
        this.showNotification('Veriler real-time olarak güncellendi', 'info');
    }

    // Supabase todo formatını local formata çevir
    convertSupabaseTodo(supabaseTodo) {
        return {
            id: supabaseTodo.id,
            text: supabaseTodo.text,
            completed: supabaseTodo.completed,
            category: supabaseTodo.category,
            priority: supabaseTodo.priority,
            dueDate: supabaseTodo.due_date,
            createdAt: supabaseTodo.created_at,
            completedAt: supabaseTodo.completed_at,
            orderIndex: supabaseTodo.order_index
        };
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