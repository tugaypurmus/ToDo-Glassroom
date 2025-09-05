// Todo Yönetici Sınıfı
class TodoManager {
    constructor() {
        this.todos = this.loadTodos();
        this.currentFilter = 'all';
        this.editingId = null;
        this.init();
    }

    // Başlangıç fonksiyonu
    init() {
        this.bindEvents();
        this.render();
        this.updateStats();
    }

    // Event listener'ları bağla
    bindEvents() {
        // Görev ekleme
        document.getElementById('addBtn').addEventListener('click', () => this.addTodo());
        document.getElementById('todoInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });

        // Filtre butonları
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setFilter(e.target.dataset.filter));
        });

        // Tamamlananları temizle
        document.getElementById('clearCompleted').addEventListener('click', () => this.clearCompleted());

        // Todo listesi event delegation
        document.getElementById('todoList').addEventListener('click', (e) => this.handleTodoClick(e));
        document.getElementById('todoList').addEventListener('change', (e) => this.handleTodoChange(e));
    }

    // Yeni görev ekle
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

        const todo = {
            id: Date.now(),
            text: text,
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
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        this.render();
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
        switch (this.currentFilter) {
            case 'active':
                return this.todos.filter(t => !t.completed);
            case 'completed':
                return this.todos.filter(t => t.completed);
            default:
                return this.todos;
        }
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

        todoList.innerHTML = filteredTodos.map(todo => `
            <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" data-id="${todo.id}">
                </div>
                <div class="todo-text ${todo.completed ? 'completed' : ''}">${this.escapeHtml(todo.text)}</div>
                <div class="todo-actions">
                    <button class="todo-btn edit-btn" data-action="edit" data-id="${todo.id}" title="Düzenle">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="todo-btn delete-btn" data-action="delete" data-id="${todo.id}" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </li>
        `).join('');
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
    console.log('🌟 Glassmorphism Todo App başarıyla yüklendi!');
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
    // Ctrl/Cmd + Enter: Hızlı görev ekleme
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const input = document.getElementById('todoInput');
        if (document.activeElement !== input) {
            input.focus();
        } else {
            window.todoManager.addTodo();
        }
    }
    
    // Esc: Input'u temizle
    if (e.key === 'Escape') {
        const input = document.getElementById('todoInput');
        if (document.activeElement === input) {
            input.value = '';
            input.blur();
        }
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